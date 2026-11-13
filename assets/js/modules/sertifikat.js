/* =========================================================================
   6. SERTIFIKAT MAHASISWA — satu halaman per batch
   • List Sertifikat        : sertifikat wajib tiap batch + berapa mahasiswa yang sudah terbit
                              (klik → siapa saja yang sudah / belum).
   • Progres per mahasiswa  : satu baris per mahasiswa, dikelompokkan per batch & urut absen (A–Z).
                              "Lihat detail" / klik baris → popup kartu semua sertifikat + tautan berkas
                              (satu-satunya tempat tambah/ubah/hapus sertifikat per mahasiswa).
   Sertifikat wajib satu batch = semua judul sertifikat yang tercatat di batch itu
   (dibuat sekaligus untuk seluruh mahasiswa lewat "Tambah jenis sertifikat").
   Tidak ada perubahan tabel Supabase: tetap memakai tabel `sertifikat`.
   ========================================================================= */
import { h, icon, clear, badge, docLink, hasAttachment, fmtDate, batchName, batchLabel, batches, batchSelect, firstBatch, findStudent, withStudent, avatar, dropdown, toast, openDrawer, openModal, confirmDialog, uniq, pct, byText, byBatch, pref } from '../ui.js';
import { kpiRow, flatFields, schemaExtras } from '../crud.js';
import { dataTable } from '../table.js';
import { buildForm } from '../form.js';
import { exportRows, exportWorkbook, importDialog } from '../io.js';
import { store } from '../store.js';

const JENIS_SERTIFIKAT = () => store.list('jenis_sertifikat');
const STATUS = ['Sudah Terbit', 'Proses', 'Belum'];
const DONE = 'Sudah Terbit';
const INACTIVE = /non-aktif|mengundurkan|drop/i;
const titleOf = (c) => String(c.nama_sertifikat || '').trim();
const cmpNat = (a, b) => a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
const owns = (c, s) => c.student_id === s.id || (!!c.nim && !!s.nim && String(c.nim) === String(s.nim));
const toneSt = (st) => st === DONE ? 'ok' : st === 'Proses' ? 'warn' : 'bad';

const sections = [
  { title: 'Mahasiswa', fields: [
    { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'half' },
    { key: 'student_id', label: 'Mahasiswa', type: 'student', batchKey: 'batch_id', required: true, col: 'half' },
  ] },
  { title: 'Sertifikat', fields: [
    { key: 'jenis', label: 'Jenis sertifikat', type: 'select', options: JENIS_SERTIFIKAT, required: true, col: 'half' },
    { key: 'status', label: 'Status', type: 'select', options: STATUS, col: 'half', default: DONE },
    { key: 'nama_sertifikat', label: 'Nama / judul sertifikat', type: 'text', required: true, placeholder: 'mis. English Score Test 1, Diploma in Hospitality…' },
    { key: 'penerbit', label: 'Penerbit', type: 'text', col: 'half' },
    { key: 'nomor', label: 'Nomor sertifikat', type: 'text', col: 'half' },
    { key: 'tanggal_terbit', label: 'Tanggal terbit', type: 'date', col: 'third' },
    { key: 'berlaku_sampai', label: 'Berlaku sampai', type: 'date', col: 'third' },
    { key: 'skor', label: 'Nilai / skor / level', type: 'text', col: 'third' },
    { key: 'berkas', label: 'Berkas sertifikat', type: 'attachment', accept: 'image/*,.pdf', help: 'Unggah PDF/foto sertifikat atau cantumkan tautan Google Drive.' },
    { key: 'catatan', label: 'Catatan', type: 'textarea', rows: 2 },
  ] },
];
const exportCols = [
  { key: 'batch_id', label: 'Batch', value: r => batchName(r.batch_id) }, { key: 'student_id', label: 'Mahasiswa', value: r => (findStudent(r) || {}).nama || r.nama_mahasiswa || '' },
  { key: 'nim', label: 'NIM', value: r => (findStudent(r) || {}).nim || r.nim || '' },
  { key: 'jenis', label: 'Jenis' }, { key: 'nama_sertifikat', label: 'Nama Sertifikat' }, { key: 'penerbit', label: 'Penerbit' }, { key: 'nomor', label: 'Nomor' },
  { key: 'tanggal_terbit', label: 'Tanggal Terbit' }, { key: 'berlaku_sampai', label: 'Berlaku Sampai' }, { key: 'skor', label: 'Skor' }, { key: 'status', label: 'Status' },
  { key: 'berkas', label: 'Berkas' }, { key: 'catatan', label: 'Catatan' },
];
const aliases = { student_id: ['Nama', 'Nama Mahasiswa', 'Mahasiswa'], nama_sertifikat: ['Sertifikat', 'Nama Sertifikat'], tanggal_terbit: ['Tanggal', 'Tanggal Terbit'] };

/** Batch terpilih di kanan atas (bawaan "Semua Batch" agar tabel tampil terpisah per batch) */
function currentBatch() {
  const v = pref.get('cert_batch', 'all');
  return v === 'all' || store.get('batches', v) ? v : 'all';
}

/* =================== Data =================== */
/** Satu batch: jenis sertifikat wajib + progres tiap mahasiswa (urut absen A–Z, bernomor) */
function batchData(bid) {
  const certs = store.all('certificates').filter(c => c.batch_id === bid);
  const names = uniq(certs.map(titleOf)).sort(cmpNat);
  const studs = store.all('students').filter(s => s.batch_id === bid).sort(byText(s => s.nama));
  const rows = studs.map(s => {
    const mine = certs.filter(c => owns(c, s));
    const st = Object.fromEntries(names.map(t => {
      const list = mine.filter(c => titleOf(c) === t);
      return [t, list.some(c => c.status === DONE) ? DONE : list.some(c => c.status === 'Proses') ? 'Proses' : list.length ? 'Belum' : ''];
    }));
    const done = names.filter(t => st[t] === DONE).length;
    return { s, bid, mine, st, done, need: names.length, kurang: names.filter(t => st[t] !== DONE),
      terbit: mine.filter(c => c.status === DONE).length, proses: mine.filter(c => c.status === 'Proses').length,
      belum: mine.filter(c => c.status !== DONE && c.status !== 'Proses').length,
      berkas: mine.filter(c => hasAttachment(c.berkas)).length, persen: names.length ? pct(done, names.length) : null,
      last: mine.map(c => c.tanggal_terbit).filter(Boolean).sort().pop() || '' };
  }).filter(x => x.mine.length || !INACTIVE.test(x.s.status_mhs || ''));
  rows.forEach((x, i) => { x.no = i + 1; x.lengkap = x.need > 0 && x.done === x.need; });
  const types = names.map(t => {
    const meta = certs.find(c => titleOf(c) === t) || {};
    const done = rows.filter(x => x.st[t] === DONE).length;
    return { t, bid, jenis: meta.jenis || '', penerbit: meta.penerbit || '', done, proses: rows.filter(x => x.st[t] === 'Proses').length, total: rows.length, persen: pct(done, rows.length) };
  });
  return { bid, certs, names, rows, types };
}
/** Semua batch yang tampil sesuai pilihan (Semua Batch → urut Batch 1, 2, …) */
const scope = (bid) => (bid === 'all' ? batches().map(b => b.id) : [bid]).map(batchData);
/** Bilah progres satu baris: bilah + persen di kanan (rata tengah vertikal, lebar seragam) */
const progressCell = (p) => p === null ? h('span', { class: 'muted' }, '–') : h('div', { class: 'prog-inline' }, h('div', { class: `meter ${p >= 100 ? 'ok' : p >= 50 ? '' : 'warn'}` }, h('i', { style: { width: `${p}%` } })), h('small', {}, `${p}%`));
const nameCell = (s) => h('div', { class: 'name-cell' }, avatar(s.nama, s.foto, { size: 'sm' }), h('div', {}, h('span', { class: 'primary' }, s.nama), h('span', { class: 'secondary' }, s.nim ? `NIM ${s.nim}` : 'NIM belum diisi')));

/* =================== Tambah / ubah / hapus =================== */
function openCert(rec = {}) {
  const isNew = !rec.id;
  const form = buildForm(sections, rec);
  const save = h('button', { class: 'btn btn-primary', type: 'button' }, icon('check'), isNew ? 'Simpan' : 'Simpan perubahan');
  const del = isNew ? null : h('button', { class: 'btn btn-danger', type: 'button' }, icon('trash', 'sm'), 'Hapus');
  const s = findStudent(rec);
  const d = openDrawer({ title: isNew ? 'Tambah sertifikat' : 'Ubah sertifikat', subtitle: s ? s.nama : null, body: form.el,
    footer: [h('div', { class: 'left' }, del), h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => d.close() }, 'Batal'), save] });
  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      const v = await form.collect(); if (!v) { save.disabled = false; return; }
      await store.save('certificates', withStudent(v)); toast(isNew ? 'Sertifikat ditambahkan.' : 'Perubahan disimpan.', 'ok'); d.close();
    } catch (e) { toast(e.message, 'bad'); save.disabled = false; }
  });
  if (del) del.addEventListener('click', async () => { if (await confirmDialog('Hapus sertifikat ini? Tindakan ini tidak dapat dibatalkan.')) { await removeCert(rec); d.close(); } });
}
async function removeCert(c) {
  try { if (c.berkas && c.berkas.file) store.deleteFile(c.berkas.file).catch(() => { }); await store.remove('certificates', c.id); toast('Sertifikat dihapus.', 'ok'); }
  catch (e) { toast(e.message, 'bad'); }
}

/** Buat satu jenis sertifikat sekaligus untuk seluruh mahasiswa aktif di satu batch */
function bulkDialog(defBatch) {
  const form = buildForm([{ fields: [
    { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'half', default: defBatch && defBatch !== 'all' ? defBatch : firstBatch() },
    { key: 'jenis', label: 'Jenis sertifikat', type: 'select', options: JENIS_SERTIFIKAT, required: true, col: 'half' },
    { key: 'nama_sertifikat', label: 'Nama sertifikat', type: 'text', required: true },
    { key: 'penerbit', label: 'Penerbit', type: 'text', col: 'half' },
    { key: 'status', label: 'Status awal', type: 'select', options: STATUS, col: 'half', default: 'Belum' },
  ] }], {});
  const ok = h('button', { class: 'btn btn-primary', type: 'button' }, icon('plus'), 'Buat untuk semua');
  const { close } = openModal({ title: 'Tambah jenis sertifikat untuk satu batch', subtitle: 'Sertifikat ini menjadi sertifikat wajib batch tersebut: sistem membuat satu baris untuk setiap mahasiswa aktif, lalu status dan berkasnya dapat diperbarui per mahasiswa.', body: form.el,
    footer: [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => close() }, 'Batal'), ok] });
  ok.addEventListener('click', async () => {
    const v = await form.collect(); if (!v) return;
    const exist = store.all('certificates');
    const studs = store.all('students').filter(s => s.batch_id === v.batch_id && !INACTIVE.test(s.status_mhs || ''));
    const recs = studs.filter(s => !exist.some(c => owns(c, s) && titleOf(c) === String(v.nama_sertifikat).trim())).map(s => ({ ...v, student_id: s.id, nim: s.nim || '', nama_mahasiswa: s.nama }));
    if (!recs.length) { toast('Semua mahasiswa sudah memiliki sertifikat ini.', 'info'); return close(); }
    await store.saveMany('certificates', recs); toast(`${recs.length} baris sertifikat dibuat.`, 'ok'); close();
  });
}

function importCerts(bid) {
  const fields = flatFields(sections);
  importDialog({ title: 'Sertifikat Mahasiswa', fields: [...fields, ...schemaExtras('certificates', fields)], aliases,
    note: 'Kolom yang digunakan: Batch, Nama/NIM mahasiswa, Jenis, Nama sertifikat, Penerbit, Nomor, Tanggal terbit, Berlaku sampai, Skor, Status, dan Berkas (tautan). Data mahasiswa dicocokkan secara otomatis berdasarkan NIM atau nama.',
    onImport: (recs) => store.saveMany('certificates', recs.map(r => {
      const x = withStudent({ status: DONE, ...(bid !== 'all' ? { batch_id: bid } : {}), ...r });
      if (!x.batch_id) { const s = findStudent(x); if (s) x.batch_id = s.batch_id; }
      return x;
    })) });
}

/* =================== Popup sertifikat satu mahasiswa =================== */
function certCard(c) {
  const st = c.status || 'Belum';
  const meta = [['Nomor', c.nomor], ['Tanggal terbit', c.tanggal_terbit ? fmtDate(c.tanggal_terbit) : ''], ['Berlaku sampai', c.berlaku_sampai ? fmtDate(c.berlaku_sampai) : ''], ['Skor', c.skor]].filter(([, v]) => v);
  return h('article', { class: `cert-card is-${toneSt(st)}` },
    h('header', {},
      h('span', { class: 'cert-ico' }, icon(st === DONE ? 'award' : st === 'Proses' ? 'clock' : 'file')),
      h('div', { class: 'cert-title' }, h('strong', {}, titleOf(c) || '–'), h('span', { class: 'secondary' }, [c.jenis, c.penerbit].filter(Boolean).join(' · ') || '—')),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn-icon', type: 'button', title: 'Ubah', 'aria-label': 'Ubah', onclick: () => openCert(c) }, icon('edit', 'sm')),
        h('button', { class: 'btn btn-icon danger', type: 'button', title: 'Hapus', 'aria-label': 'Hapus', onclick: async () => { if (await confirmDialog('Hapus sertifikat ini?')) removeCert(c); } }, icon('trash', 'sm')))),
    meta.length ? h('dl', { class: 'cert-meta' }, meta.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v)))) : null,
    c.catatan ? h('p', { class: 'cert-note' }, c.catatan) : null,
    h('footer', {}, docLink(c.berkas, 'Berkas belum diunggah'), badge(st, toneSt(st))));
}

function studentCerts(studentId, bid) {
  const body = h('div', { class: 'stack' });
  const s0 = store.get('students', studentId) || {};
  const fill = () => {
    clear(body);
    const D = batchData(bid); const x = D.rows.find(r => r.s.id === studentId);
    const s = store.get('students', studentId) || s0;
    const mine = (x ? x.mine : store.all('certificates').filter(c => owns(c, s))).slice().sort((a, b) => cmpNat(titleOf(a), titleOf(b)));
    const missing = D.types.filter(t => !mine.some(c => titleOf(c) === t.t));
    body.append(
      kpiRow([
        { label: 'Kelengkapan', value: x && x.need ? `${x.done} / ${x.need}` : '–', sub: x && x.need ? (x.lengkap ? 'semua sertifikat wajib sudah terbit' : `kurang ${x.need - x.done} sertifikat`) : 'belum ada sertifikat wajib', icon: 'check', accent: true, meter: x && x.need ? x.persen : undefined, meterTone: 'ok' },
        { label: 'Sertifikat tercatat', value: mine.length, sub: `${mine.filter(c => hasAttachment(c.berkas)).length} berkas terunggah`, icon: 'award' },
      ]),
      mine.length || missing.length ? h('div', { class: 'cert-grid' },
        ...mine.map(certCard),
        // Sertifikat wajib batch yang belum tercatat sama sekali untuk mahasiswa ini
        ...missing.map(t => h('article', { class: 'cert-card is-missing' },
          h('header', {},
            h('span', { class: 'cert-ico' }, icon('award')),
            h('div', { class: 'cert-title' }, h('strong', {}, t.t), h('span', { class: 'secondary' }, 'Belum tercatat')),
            h('div', { class: 'row-actions' }, h('button', { class: 'btn btn-icon', type: 'button', title: 'Isi data', 'aria-label': 'Isi data',
              onclick: () => openCert({ batch_id: bid, student_id: studentId, nama_sertifikat: t.t, jenis: t.jenis, penerbit: t.penerbit, status: DONE }) }, icon('plus', 'sm')))))))
        : h('div', { class: 'empty' }, icon('award'), h('h3', {}, 'Belum ada sertifikat'), h('p', {}, 'Tambahkan sertifikat pertama untuk mahasiswa ini.')));
  };
  fill();
  const unsub = store.subscribe(fill);
  const add = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openCert({ batch_id: bid, student_id: studentId, status: DONE }) }, icon('plus'), 'Tambah sertifikat');
  const { close } = openModal({ title: s0.nama || 'Mahasiswa', subtitle: [batchName(bid), s0.nim ? `NIM ${s0.nim}` : null].filter(Boolean).join(' · '), body, size: 'lg', onClose: unsub,
    footer: [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => close() }, 'Tutup'), add] });
}

/** Popup satu jenis sertifikat: siapa saja yang sudah / belum memilikinya */
function typeDetail(t, bid) {
  const body = h('div');
  let sub = '';
  const fill = () => {
    const D = batchData(bid); const T = D.types.find(x => x.t === t);
    const rows = D.rows.map(x => ({ x, st: x.st[t] || '', c: x.mine.find(c => titleOf(c) === t && c.status === DONE) || x.mine.find(c => titleOf(c) === t) }));
    sub = T ? `${batchName(bid)} · ${T.done} dari ${T.total} mahasiswa sudah terbit` : batchName(bid);
    clear(body).appendChild(dataTable({ rows, pageSize: Infinity, compact: true, className: 'tbl-mid cert-tbl', onRowClick: r => studentCerts(r.x.s.id, bid),
      columns: [
        { key: 'no', label: 'No', align: 'center', width: '56px', cls: 'col-no', value: r => r.x.no, render: r => h('span', { class: 'muted num' }, r.x.no) },
        { key: 'nama', label: 'Mahasiswa', main: true, width: '40%', value: r => r.x.s.nama, render: r => nameCell(r.x.s) },
        { key: 'st', label: 'Status', align: 'center', nowrap: true, value: r => r.st, render: r => badge(r.st || 'Belum ada', toneSt(r.st)) },
        { key: 'tgl', label: 'Tanggal terbit', nowrap: true, value: r => (r.c || {}).tanggal_terbit || '', render: r => r.c && r.c.tanggal_terbit ? fmtDate(r.c.tanggal_terbit) : null },
        { key: 'berkas', label: 'Berkas', sortable: false, render: r => r.c ? docLink(r.c.berkas, 'Belum ada') : null },
      ] }).el);
    const p = body.closest('dialog') && body.closest('dialog').querySelector('.dlg-head p'); if (p) p.textContent = sub;
  };
  fill();
  const unsub = store.subscribe(fill);
  const { close } = openModal({ title: t, subtitle: sub, body, size: 'lg', onClose: unsub, footer: [h('button', { class: 'btn btn-primary', type: 'button', onclick: () => close() }, 'Tutup')] });
}

/* =================== Halaman (satu halaman, tanpa tab) =================== */
const sameBatch = (a, b) => byBatch(x => x.bid)(a, b);

export default {
  mount(root) {
    let bid = currentBatch(); let q = ''; let fil = ''; let page = 0;
    const kpiBox = h('div'); const listBox = h('div'); const tableBox = h('div');
    const countEl = h('span', { class: 'count' });

    /* ---------- Ekspor ---------- */
    const exportRekap = () => {
      const Ds = scope(bid).filter(D => D.rows.length);
      if (!Ds.length) return toast('Belum ada data untuk diekspor.', 'info');
      exportWorkbook(`Rekap_Sertifikat_${batchLabel(bid).replace(/\s+/g, '_')}`, Ds.map(D => ({ name: batchName(D.bid).slice(0, 31),
        rows: [['No', 'Nama Mahasiswa', 'NIM', ...D.names, 'Terlengkapi', 'Progres (%)'],
          ...D.rows.map(x => [x.no, x.s.nama, x.s.nim || '', ...D.names.map(t => { const c = x.mine.find(c => titleOf(c) === t && c.status === DONE) || x.mine.find(c => titleOf(c) === t); return c ? (c.status || 'Belum') + (c.skor ? ` (${c.skor})` : '') : ''; }), `${x.done} / ${x.need}`, x.persen ?? ''])] })));
    };
    const exportAll = () => {
      const ids = new Set(scope(bid).map(D => D.bid));
      const list = store.all('certificates').filter(c => ids.has(c.batch_id)).sort((a, b) => byBatch()(a, b) || cmpNat((findStudent(a) || {}).nama || '', (findStudent(b) || {}).nama || '') || cmpNat(titleOf(a), titleOf(b)));
      exportRows(`Sertifikat_Mahasiswa_${batchLabel(bid).replace(/\s+/g, '_')}`, exportCols, list, 'xlsx');
    };

    /* ---------- Bagian tetap (tidak digambar ulang agar kotak cari tidak kehilangan fokus) ---------- */
    const searchIn = h('input', { class: 'input', type: 'search', placeholder: 'Cari nama atau NIM…', 'aria-label': 'Cari' });
    searchIn.addEventListener('input', () => { q = searchIn.value; page = 0; refresh(); });
    const filSel = h('select', { class: 'select', 'aria-label': 'Kelengkapan', onchange: (e) => { fil = e.target.value; page = 0; refresh(); } },
      h('option', { value: '' }, 'Semua Status'), h('option', { value: 'Lengkap' }, 'Lengkap'), h('option', { value: 'Belum lengkap' }, 'Belum lengkap'));

    root.append(
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, 'Data Mahasiswa'), h('h1', {}, 'Sertifikat Mahasiswa')),
        h('div', { class: 'actions no-print' },
          batchSelect({ value: bid, withAll: true, allValue: 'all', onChange: (v) => { bid = v; pref.set('cert_batch', v); page = 0; refresh(); } }),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => importCerts(bid) }, icon('upload'), 'Impor'),
          dropdown('Ekspor', [
            { label: 'Rekap kelengkapan (Excel)', icon: 'sheet', onClick: exportRekap },
            { label: 'Daftar semua sertifikat (Excel)', icon: 'sheet', onClick: exportAll },
          ]),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => bulkDialog(bid) }, icon('plus'), 'Tambah jenis sertifikat'))),
      kpiBox,
      h('div', { class: 'stack imm-stack' },
        // Kartu 1 · List Sertifikat (sertifikat wajib tiap batch)
        h('div', { class: 'card' },
          h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'List sertifikat'), h('p', {}, 'Sertifikat yang wajib dimiliki setiap mahasiswa. Klik sertifikat untuk melihat siapa saja yang sudah dan belum memilikinya.'))),
          listBox),
        // Kartu 2 · Progres per mahasiswa (sekaligus daftar sertifikat per mahasiswa)
        h('div', { class: 'card' },
          h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Progres per mahasiswa'), h('p', {}, 'Urut sesuai absen (A–Z). Pilih “Lihat detail” untuk melihat seluruh sertifikat beserta tautan berkasnya.'))),
          h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search'), searchIn), filSel, countEl),
          tableBox)));

    function refresh() {
      const Ds = scope(bid); const single = bid !== 'all'; const D1 = single ? Ds[0] : null;
      const all = Ds.flatMap(D => D.rows); const types = Ds.flatMap(D => D.types);
      const lengkap = all.filter(x => x.lengkap).length;
      const sumDone = all.reduce((n, x) => n + x.done, 0), sumNeed = all.reduce((n, x) => n + x.need, 0);

      clear(kpiBox).appendChild(kpiRow([
        { label: 'Mahasiswa', value: all.length, sub: batchLabel(bid), icon: 'users' },
        { label: 'Sertifikat wajib', value: single ? D1.names.length : types.length, sub: single ? 'jenis per mahasiswa' : `jenis di ${Ds.filter(D => D.names.length).length} batch`, icon: 'award' },
        { label: 'Mahasiswa lengkap', value: `${lengkap} / ${all.length}`, sub: 'semua sertifikat wajib terbit', meter: pct(lengkap, all.length), meterTone: 'ok', icon: 'check', accent: true },
        { label: 'Sertifikat terbit', value: `${sumDone} / ${sumNeed}`, sub: `${pct(sumDone, sumNeed)}% dari seluruh kewajiban`, meter: pct(sumDone, sumNeed), meterTone: 'ok', icon: 'layers' },
      ]));

      clear(listBox).appendChild(dataTable({ rows: types, pageSize: Infinity, className: 'tbl-mid cert-tbl', onRowClick: T => typeDetail(T.t, T.bid),
        order: (a, b) => sameBatch(a, b) || cmpNat(a.t, b.t),
        groupBy: single ? null : (T => batchName(T.bid)),
        emptyNode: h('div', { class: 'empty' }, icon('award'), h('h3', {}, 'Belum ada sertifikat wajib'), h('p', {}, 'Gunakan “Tambah jenis sertifikat” untuk membuat satu sertifikat bagi seluruh mahasiswa batch.')),
        columns: [
          { key: 't', label: 'Sertifikat', main: true, render: T => h('div', {}, h('span', { class: 'primary' }, T.t), h('span', { class: 'secondary' }, [T.jenis, T.penerbit].filter(Boolean).join(' · ') || '—')) },
          { key: 'done', label: 'Sudah terbit', align: 'center', width: '130px', value: T => T.done, render: T => h('span', { class: 'num' }, `${T.done} / ${T.total}`) },
          { key: 'proses', label: 'Proses', align: 'center', width: '100px', value: T => T.proses, render: T => h('span', { class: `num ${T.proses ? '' : 'muted'}` }, T.proses) },
          { key: 'persen', label: 'Progres', width: '220px', value: T => T.persen, render: T => progressCell(T.persen) },
        ] }).el);

      const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const rows = all.filter(x => (!fil || (fil === 'Lengkap' ? x.lengkap : !x.lengkap && x.need > 0))
        && (!terms.length || terms.every(t => `${x.s.nama} ${x.s.nim || ''}`.toLowerCase().includes(t))));
      countEl.textContent = `${rows.length} dari ${all.length} mahasiswa`;
      clear(tableBox).appendChild(dataTable({
        rows, pageSize: 40, page, onPage: (p) => { page = p; }, className: 'tbl-mid cert-tbl', onRowClick: x => studentCerts(x.s.id, x.bid),
        // Urutan bawaan: Batch 1, Batch 2, … lalu nomor absen (A–Z); satu batch tidak terpecah ke dua halaman
        order: (a, b) => sameBatch(a, b) || a.no - b.no,
        groupBy: single ? null : (x => batchName(x.bid)), pageBy: x => x.bid, pageRows: 40,
        emptyNode: h('div', { class: 'empty' }, icon('users'), h('h3', {}, q || fil ? 'Tidak ada mahasiswa yang cocok' : 'Belum ada mahasiswa di batch ini'), h('p', {}, q || fil ? 'Coba kata kunci atau status lain.' : 'Data mahasiswa diambil dari menu Mahasiswa.')),
        columns: [
          { key: 'no', label: 'No', align: 'center', width: '56px', cls: 'col-no', value: x => x.no, render: x => h('span', { class: 'muted num' }, x.no) },
          { key: 'nama', label: 'Mahasiswa', main: true, width: '32%', value: x => x.s.nama, render: x => nameCell(x.s) },
          { key: 'done', label: 'Terlengkapi', align: 'center', width: '120px', value: x => x.done, render: x => x.need ? h('b', { class: 'num' }, `${x.done} / ${x.need}`) : h('span', { class: 'muted' }, '–') },
          { key: 'persen', label: 'Progres', width: '200px', value: x => x.persen ?? -1, render: x => progressCell(x.persen) },
          { key: 'kurang', label: 'Belum terbit', sortable: false, cls: 'wide', render: x => !x.need ? null : x.lengkap ? badge('Lengkap', 'ok')
            : h('span', { class: 'kurang-list' }, x.kurang.map(t => x.st[t] === 'Proses' ? `${t} (proses)` : t).join(', ')) },
        ],
        rowActions: (x) => h('div', { class: 'row-actions' },
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => studentCerts(x.s.id, x.bid) }, icon('eye', 'sm'), 'Lihat detail')),
      }).el);
    }
    refresh();
    return { destroy: store.subscribe(refresh) };
  },
};
