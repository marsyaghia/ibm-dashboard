/* =========================================================================
   SHEET — baca/tulis CSV & Excel (.xlsx) tanpa library eksternal.
   • writeXlsx(sheets)  → Blob .xlsx (bisa banyak sheet, header tebal, angka ribuan)
   • readWorkbook(file) → [{ name, rows: [[...]] }] dari .xlsx / .csv
   • toCSV(rows) / parseCSV(text)
   Pembaca .xlsx memakai DecompressionStream bawaan browser (Chrome/Edge/Firefox/Safari modern).
   ========================================================================= */

/* ---------- CSV ---------- */
export function toCSV(rows, sep = ',') {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map(r => r.map(esc).join(sep)).join('\r\n');
}

export function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0] || '';
  const count = (ch) => (first.match(new RegExp(ch === '\t' ? '\\t' : '\\' + ch, 'g')) || []).length;
  const sep = [',', ';', '\t'].sort((a, b) => count(b) - count(a))[0];
  const rows = []; let row = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(v => String(v).trim() !== ''));
}

/* ---------- ZIP (tulis: tanpa kompresi; baca: deflate via DecompressionStream) ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

function zip(files) {
  const enc = new TextEncoder();
  const parts = []; const central = []; let offset = 0;
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

async function unzip(buffer) {
  const u8 = new Uint8Array(buffer); const dv = new DataView(buffer);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Berkas bukan .xlsx yang valid');
  const count = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder(); const out = {};
  for (let k = 0; k < count; k++) {
    const method = dv.getUint16(p + 10, true); const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true); const xlen = dv.getUint16(p + 30, true); const clen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
    const raw = u8.subarray(start, start + csize);
    out[name] = { method, raw };
  }
  return {
    has: (n) => !!out[n],
    async text(n) {
      const f = out[n]; if (!f) return null;
      if (f.method === 0) return dec.decode(f.raw);
      if (typeof DecompressionStream === 'undefined') throw new Error('Browser belum mendukung pembacaan .xlsx. Simpan sebagai CSV lalu impor ulang.');
      const stream = new Blob([f.raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return await new Response(stream).text();
    },
  };
}

/* ---------- XLSX tulis ---------- */
const xmlEsc = (s) => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const colName = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

/**
 * sheets: [{ name, rows: [[...]], header?: true, widths?: [chars], numFmt?: { colIndex: 'money'|'decimal' } }]
 * Baris pertama dianggap header (tebal + freeze) kecuali header:false.
 * Sel bertipe {v, bold:true} juga didukung untuk baris total.
 */
export function writeXlsx(sheets) {
  const safeName = (n, i) => (String(n || `Sheet${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)) || `Sheet${i + 1}`;
  const used = new Set();
  const names = sheets.map((s, i) => { let n = safeName(s.name, i); let k = 2; while (used.has(n)) n = `${n.slice(0, 28)} ${k++}`; used.add(n); return n; });

  const sheetXml = (s) => {
    const rows = s.rows || []; const hasHeader = s.header !== false;
    const widths = s.widths || (rows[0] || []).map((_, ci) => Math.min(60, Math.max(8, ...rows.slice(0, 200).map(r => String((r[ci] && r[ci].v !== undefined ? r[ci].v : r[ci]) ?? '').length + 2))));
    let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
    if (hasHeader && rows.length) x += '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
    x += '<cols>' + widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols><sheetData>';
    rows.forEach((r, ri) => {
      x += `<row r="${ri + 1}">`;
      r.forEach((cell, ci) => {
        let v = cell, bold = hasHeader && ri === 0;
        if (cell && typeof cell === 'object' && !(cell instanceof Date)) { v = cell.v; bold = bold || !!cell.bold; }
        if (v === null || v === undefined || v === '') return;
        const ref = colName(ci) + (ri + 1);
        if (typeof v === 'number' && isFinite(v)) {
          const fmt = s.numFmt && s.numFmt[ci];
          const style = bold ? (fmt ? 4 : 1) : fmt === 'decimal' ? 3 : fmt ? 2 : 0;
          x += `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
        } else if (typeof v === 'boolean') {
          x += `<c r="${ref}" t="inlineStr"${bold ? ' s="1"' : ''}><is><t>${v ? 'Ya' : 'Tidak'}</t></is></c>`;
        } else {
          x += `<c r="${ref}" t="inlineStr"${bold ? ' s="1"' : ' s="5"'}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
        }
      });
      x += '</row>';
    });
    x += '</sheetData>';
    if (hasHeader && rows.length > 1 && rows[0].length) x += `<autoFilter ref="A1:${colName(rows[0].length - 1)}${rows.length}"/>`;
    return x + '</worksheet>';
  };

  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + names.map((n, i) => `<sheet name="${xmlEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets>' + (() => { const d = names.map((n, i) => { const rows = sheets[i].rows || []; return sheets[i].header !== false && rows.length > 1 && rows[0].length ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xmlEsc(n).replace(/'/g, "''")}'!$A$1:$${colName(rows[0].length - 1)}$${rows.length}</definedName>` : ''; }).join(''); return d ? `<definedNames>${d}</definedNames>` : ''; })() + '</workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') + `<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF0F1A33"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDE4F2"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="0"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) })),
  ];
  return zip(files);
}

/* ---------- XLSX baca ---------- */
const byTag = (doc, tag) => Array.from(doc.getElementsByTagNameNS('*', tag));
const colIndex = (ref) => { const m = /^([A-Z]+)/.exec(ref || ''); if (!m) return -1; let n = 0; for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

export async function readXlsx(buffer) {
  const z = await unzip(buffer);
  const parse = (t) => new DOMParser().parseFromString(t, 'application/xml');
  const wb = parse(await z.text('xl/workbook.xml'));
  const relsDoc = parse(await z.text('xl/_rels/workbook.xml.rels'));
  const rels = Object.fromEntries(byTag(relsDoc, 'Relationship').map(r => [r.getAttribute('Id'), r.getAttribute('Target')]));
  let shared = [];
  if (z.has('xl/sharedStrings.xml')) {
    const ss = parse(await z.text('xl/sharedStrings.xml'));
    shared = byTag(ss, 'si').map(si => byTag(si, 't').map(t => t.textContent).join(''));
  }
  const out = [];
  for (const sh of byTag(wb, 'sheet')) {
    const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    let target = rels[rid] || ''; target = target.replace(/^\/?xl\//, '').replace(/^\//, '');
    const xml = await z.text('xl/' + target); if (!xml) continue;
    const doc = parse(xml); const rows = [];
    for (const r of byTag(doc, 'row')) {
      const ri = parseInt(r.getAttribute('r'), 10) - 1; const arr = [];
      for (const c of byTag(r, 'c')) {
        const ci = colIndex(c.getAttribute('r')); const t = c.getAttribute('t');
        const vEl = byTag(c, 'v')[0]; let v = vEl ? vEl.textContent : '';
        if (t === 's') v = shared[parseInt(v, 10)] ?? '';
        else if (t === 'inlineStr') v = byTag(c, 't').map(x => x.textContent).join('');
        else if (t === 'b') v = v === '1';
        else if (t !== 'str' && t !== 'e' && v !== '' && !isNaN(v)) v = Number(v);
        arr[ci < 0 ? arr.length : ci] = v;
      }
      rows[isNaN(ri) ? rows.length : ri] = Array.from(arr, x => x ?? '');
    }
    out.push({ name: sh.getAttribute('name'), rows: Array.from(rows, r => r || []).filter(r => r.some(v => String(v).trim() !== '')) });
  }
  return out;
}

/** Baca berkas .xlsx/.csv dari <input type=file> atau Blob */
export async function readWorkbook(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt') || (file.type || '').includes('csv')) {
    return [{ name: file.name || 'CSV', rows: parseCSV(await file.text()) }];
  }
  if (name.endsWith('.xls')) throw new Error('Format .xls lama belum didukung. Simpan ulang sebagai .xlsx atau .csv.');
  return readXlsx(await file.arrayBuffer());
}

/** Ubah nomor seri tanggal Excel → 'YYYY-MM-DD' */
export function excelDate(n) {
  if (typeof n !== 'number' || n < 20000 || n > 80000) return null;
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  return d.toISOString().slice(0, 10);
}

export function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
