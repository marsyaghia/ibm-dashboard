/* =========================================================================
   IO — ekspor (CSV / Excel), impor (CSV / Excel) dengan pemetaan kolom,
   dan pratinjau isi berkas Excel/CSV lampiran (mis. penilaian OBE).
   ========================================================================= */
import { h, icon, toast, openModal, clear, toNumber, isoDate, batches, today } from './ui.js';
import { writeXlsx, toCSV, readWorkbook, excelDate, download } from './lib/sheet.js';
import { cellValue } from './table.js';
import { store } from './store.js';
import { parseTanggalID } from './jadwal-lib.js';

const stampName = (base) => `${base}_${today()}`.replace(/[^\w\-]+/g, '_');

/** Nilai mentah untuk ekspor dari sebuah kolom */
export function exportValue(col, row) {
  if (col.exportValue) return col.exportValue(row);
  const v = cellValue(col, row);
  if (v && typeof v === 'object') {
    if (Array.isArray(v)) return v.join(', ');
    if ('link' in v || 'file' in v) return [v.label, v.link || (v.file && v.file.name)].filter(Boolean).join(' — ');
    return '';
  }
  return v ?? '';
}

/** columns: kolom tabel (pakai label & exportValue). format: 'csv' | 'xlsx' */
export function exportRows(name, columns, rows, format = 'xlsx', { sheetName, extraSheets = [] } = {}) {
  const cols = columns.filter(c => c.export !== false);
  const data = [cols.map(c => c.exportLabel || c.label), ...rows.map(r => cols.map(c => exportValue(c, r)))];
  if (format === 'csv') {
    download(new Blob([toCSV(data)], { type: 'text/csv;charset=utf-8' }), `${stampName(name)}.csv`);
  } else {
    const numFmt = {}; cols.forEach((c, i) => { if (c.money) numFmt[i] = 'money'; else if (c.decimal) numFmt[i] = 'decimal'; });
    download(writeXlsx([{ name: sheetName || name, rows: data, numFmt }, ...extraSheets]), `${stampName(name)}.xlsx`);
  }
  toast(`${rows.length} baris diekspor ke ${format === 'csv' ? 'CSV' : 'Excel'}.`, 'ok');
}

/** Unduh workbook multi-sheet langsung */
export function exportWorkbook(name, sheets) {
  download(writeXlsx(sheets), `${stampName(name)}.xlsx`);
  toast('Laporan Excel berhasil dibuat.', 'ok');
}

/** Template impor kosong sesuai field */
export function downloadTemplate(name, fields) {
  const f = fields.filter(x => !['readonly'].includes(x.type) && x.key !== 'id');
  download(writeXlsx([{ name: 'Template', rows: [f.map(x => x.label)] }, { name: 'Petunjuk', header: true, rows: [['Kolom', 'Keterangan'], ...f.map(x => [x.label, hint(x)])] }]), `Template_${name.replace(/\W+/g, '_')}.xlsx`);
}
function hint(f) {
  switch (f.type) {
    case 'money': return 'Angka rupiah, mis. 1500000';
    case 'date': return 'Tanggal: 2026-10-28 atau 28/10/2026';
    case 'batch': return 'Nama batch (mis. Batch 1) atau tahun angkatan (mis. 2023)';
    case 'student': return 'Nama lengkap mahasiswa (harus sudah ada di Biodata Mahasiswa)';
    case 'select': case 'radio': return 'Salah satu: ' + (typeof f.options === 'function' ? '' : (f.options || []).map(o => o.label || o).join(' / '));
    case 'checks': return 'Pisahkan dengan koma';
    case 'checkbox': return 'Ya / Tidak';
    case 'attachment': case 'photo': return 'Link Google Drive (opsional)';
    default: return f.required ? 'Wajib diisi' : '';
  }
}

/* ---------- Impor ---------- */
const norm = (s) => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '');

function convert(f, v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') v = v.trim();
  switch (f.type) {
    case 'money': case 'decimal': case 'number': return v === '' ? '' : (typeof v === 'number' ? v : toNumber(v));
    case 'date': return typeof v === 'number' ? (excelDate(v) || '') : (parseTanggalID(v) || isoDate(v) || '');
    case 'checkbox': return typeof v === 'boolean' ? v : /^(ya|y|yes|true|1|v|✓|x)$/i.test(String(v));
    case 'checks': return String(v).split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    case 'attachment': case 'photo': { const s = String(v); const m = s.match(/https?:\/\/\S+/); return s ? { label: m ? s.replace(m[0], '').replace(/[—-]\s*$/, '').trim() : s, link: m ? m[0] : '' } : null; }
    case 'batch': {
      const s = String(v).toLowerCase(); if (!s) return '';
      if (/semua|all/.test(s)) return 'all';
      const b = batches().find(b => b.id.toLowerCase() === s || b.nama.toLowerCase() === s || String(b.angkatan) === s.replace(/\D/g, '') || s.includes(b.nama.toLowerCase()));
      return b ? b.id : '';
    }
    case 'student': {
      const s = String(v).toLowerCase().trim();
      const st = store.all('students').find(x => x.nama.toLowerCase() === s || (x.nim && x.nim === s));
      return st ? st.id : '';
    }
    case 'select': case 'radio': {
      const opts = (typeof f.options === 'function' ? f.options({}) : f.options || []).map(o => typeof o === 'object' ? o : { value: o, label: o });
      const n = norm(v);
      const hit = opts.find(o => norm(o.value) === n || norm(o.label) === n)
        || (n.length > 3 && opts.find(o => norm(o.label).endsWith(n) || norm(o.label).includes(n)));
      return hit ? hit.value : v;
    }
    default: return typeof v === 'number' ? String(v) : v;
  }
}

/**
 * Dialog impor. fields: definisi field form (datar). aliases: { key: ['Header lain', ...] }
 * onImport(records) → Promise
 * sectionKey: baris yang hanya berisi satu sel (mis. "BATCH 1 / 2023") menjadi nilai field ini
 *   untuk baris-baris di bawahnya. Judul kolom yang berulang dan baris tanpa field wajib dilewati.
 */
export function importDialog({ title, fields, aliases = {}, onImport, note, sectionKey }) {
  const flat = fields.filter(f => f.type !== 'readonly');
  const body = h('div', { class: 'stack' });
  const fileIn = h('input', { type: 'file', accept: '.xlsx,.csv,.tsv,.txt', class: 'input', style: { paddingTop: '6px' } });
  const area = h('div');
  const importBtn = h('button', { class: 'btn btn-primary', type: 'button', disabled: true }, icon('upload'), 'Impor data');
  const tmplBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => downloadTemplate(title, flat) }, icon('download'), 'Unduh template');
  body.append(
    h('div', { class: 'note' }, icon('info'), h('div', {}, note || 'Pilih berkas Excel (.xlsx) atau CSV. Baris pertama digunakan sebagai judul kolom; kolom akan dicocokkan secara otomatis dan dapat disesuaikan sebelum proses impor.')),
    h('div', { class: 'field' }, h('label', {}, 'Berkas'), fileIn), area);
  const { close } = openModal({ title: `Impor ${title}`, body, wide: true, footer: [h('div', { class: 'left' }, tmplBtn), h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => close() }, 'Batal'), importBtn] });

  let sheets = [], sheetIdx = 0, mapping = [], headerRow = 0;
  fileIn.addEventListener('change', async () => {
    const file = fileIn.files[0]; if (!file) return;
    try { sheets = await readWorkbook(file); sheetIdx = 0; prepare(); }
    catch (e) { toast(e.message || 'Berkas tidak dapat dibaca.', 'bad'); }
  });

  function prepare() {
    const rows = sheets[sheetIdx].rows;
    headerRow = Math.max(0, rows.findIndex(r => r.filter(v => String(v).trim()).length >= 2));
    const headers = rows[headerRow] || [];
    mapping = headers.map(hd => {
      const n = norm(hd); if (!n) return '';
      const f = flat.find(f => norm(f.label) === n || norm(f.key) === n || (aliases[f.key] || []).some(a => norm(a) === n))
        || flat.find(f => (f.type === 'attachment' || f.type === 'photo') && n === norm(`${f.key}_link`))
        || flat.find(f => n.length > 3 && (norm(f.label).startsWith(n) || n.startsWith(norm(f.label))));
      return f ? f.key : '';
    });
    renderMap();
  }

  function renderMap() {
    clear(area);
    const rows = sheets[sheetIdx].rows; const headers = rows[headerRow] || []; const dataRows = rows.slice(headerRow + 1);
    if (sheets.length > 1) {
      const sel = h('select', { class: 'select', style: { maxWidth: '320px' } }, sheets.map((s, i) => h('option', { value: i, selected: i === sheetIdx }, `${s.name} (${s.rows.length} baris)`)));
      sel.addEventListener('change', () => { sheetIdx = +sel.value; prepare(); });
      area.appendChild(h('div', { class: 'field', style: { marginBottom: '12px' } }, h('label', {}, 'Sheet'), sel));
    }
    const used = new Set(mapping.filter(Boolean));
    const tbl = h('table', { class: 'tbl compact' }, h('thead', {}, h('tr', {}, h('th', {}, 'Kolom di berkas'), h('th', {}, 'Contoh isi'), h('th', {}, 'Masuk ke field'))),
      h('tbody', {}, headers.map((hd, i) => {
        const sel = h('select', { class: 'select' }, h('option', { value: '' }, '— Abaikan —'), flat.map(f => h('option', { value: f.key, selected: mapping[i] === f.key }, f.label)));
        sel.addEventListener('change', () => { mapping[i] = sel.value; renderMap(); });
        const sample = dataRows.slice(0, 2).map(r => r[i]).filter(v => v !== '' && v !== undefined).join(' · ');
        return h('tr', {}, h('td', {}, h('span', { class: 'primary' }, String(hd || `Kolom ${i + 1}`))), h('td', { class: 'muted' }, String(sample).slice(0, 60)), h('td', {}, sel));
      })));
    const req = flat.filter(f => f.required && !used.has(f.key));
    area.append(...[
      h('p', { class: 'muted', style: { margin: '4px 0 10px' } }, `${dataRows.length} baris data ditemukan. ${used.size} kolom dipetakan.`),
      h('div', { class: 'card table-wrap', style: { maxHeight: '46vh' } }, tbl),
      req.length ? h('div', { class: 'note warn', style: { marginTop: '12px' } }, icon('alert'), h('div', {}, `Field wajib belum dipetakan: ${req.map(f => f.label).join(', ')}. Baris tetap diimpor dan dapat dilengkapi kemudian melalui formulir.`)) : null].filter(Boolean));
    importBtn.disabled = !used.size || !dataRows.length;
  }

  importBtn.addEventListener('click', async () => {
    const rows = sheets[sheetIdx].rows.slice(headerRow + 1);
    const secField = sectionKey && flat.find(f => f.key === sectionKey);
    const headKey = (r) => (r || []).map(norm).join('|');
    const reqMapped = flat.filter(f => f.required && mapping.includes(f.key)).map(f => f.key);
    let section = '';
    if (secField) { // judul bagian sebelum baris judul kolom, mis. "BATCH 1 / 2023"
      for (const r of sheets[sheetIdx].rows.slice(0, headerRow)) { const cells = r.filter(v => String(v ?? '').trim()); if (cells.length === 1) section = convert(secField, cells[0]) || section; }
    }
    const recs = rows.map(r => {
      if (secField) {
        const cells = r.filter(v => String(v ?? '').trim());
        if (cells.length === 1) { const v = convert(secField, cells[0]); if (v) { section = v; return null; } }
        if (headKey(r) === headKey(sheets[sheetIdx].rows[headerRow])) return null;
      }
      const rec = {};
      mapping.forEach((key, i) => {
        if (!key) return; const f = flat.find(x => x.key === key); const v = convert(f, r[i]);
        if (v !== '' && v !== null && !(Array.isArray(v) && !v.length)) rec[key] = v;
        else if (f.type === 'student' && String(r[i] ?? '').trim()) { const raw = String(r[i]).trim(); if (/^\d{5,}$/.test(raw)) rec.nim = raw; else rec.nama_mahasiswa = raw; }
      });
      if (secField) {
        if (reqMapped.length && !reqMapped.some(k => rec[k] !== undefined)) return null; // mis. baris total
        if (section && !rec[sectionKey]) rec[sectionKey] = section;
      }
      return rec;
    }).filter(r => r && Object.keys(r).length);
    if (!recs.length) return toast('Tidak ada baris yang dapat diimpor.', 'bad');
    importBtn.disabled = true; importBtn.textContent = 'Mengimpor…';
    try { await onImport(recs); toast(`${recs.length} baris berhasil diimpor.`, 'ok'); close(); }
    catch (e) { toast(e.message, 'bad'); importBtn.disabled = false; importBtn.textContent = 'Impor data'; }
  });
}

/* ---------- Pratinjau isi Excel/CSV lampiran ---------- */
export async function previewAttachment(att, title = 'Pratinjau berkas') {
  if (!att || !att.file) return;
  const body = h('div', {}, h('p', { class: 'muted' }, 'Membaca berkas…'));
  openModal({ title, subtitle: att.file.name, body, wide: true });
  try {
    const blob = await store.fileBlob(att.file);
    if (!blob) throw new Error('Berkas tidak ditemukan di penyimpanan.');
    const file = new File([blob], att.file.name, { type: att.file.type });
    const sheets = await readWorkbook(file);
    let idx = 0;
    const render = () => {
      clear(body);
      if (sheets.length > 1) body.appendChild(h('div', { class: 'tabs' }, sheets.map((s, i) => h('button', { type: 'button', 'aria-selected': String(i === idx), onclick: () => { idx = i; render(); } }, s.name))));
      const rows = sheets[idx].rows.slice(0, 300);
      const width = Math.max(1, ...rows.map(r => r.length));
      body.appendChild(h('div', { class: 'card table-wrap', style: { maxHeight: '62vh' } },
        h('table', { class: 'tbl compact' }, h('tbody', {}, rows.map((r, ri) => h('tr', {}, Array.from({ length: width }, (_, i) => {
          const v = r[i] ?? ''; return h(ri === 0 ? 'th' : 'td', {}, typeof v === 'boolean' ? (v ? 'Ya' : 'Tidak') : String(v));
        })))))));
      if (sheets[idx].rows.length > 300) body.appendChild(h('p', { class: 'muted' }, `Menampilkan 300 baris pertama dari ${sheets[idx].rows.length}.`));
    };
    render();
  } catch (e) { clear(body); body.appendChild(h('div', { class: 'note warn' }, icon('alert'), h('div', {}, e.message))); }
}
export const isSheetFile = (att) => !!(att && att.file && /\.(xlsx|csv|tsv)$/i.test(att.file.name));
