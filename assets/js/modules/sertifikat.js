/* =========================================================================
   6. PENDATAAN SERTIFIKAT MAHASISWA — per batch
   ========================================================================= */
import { h, icon, clear, badge, docLink, fmtDate, batchName, batchOptions, batchSelect, firstBatch, studentOf, tabPage, toast, openDrawer, openModal, uniq, pct, chain, byBatch, byText } from '../ui.js';
import { crudView, kpiRow } from '../crud.js';
import { buildForm } from '../form.js';
import { exportWorkbook } from '../io.js';
import { store } from '../store.js';

const JENIS_SERTIFIKAT = () => store.list('jenis_sertifikat');
const STATUS = ['Sudah Terbit', 'Proses', 'Belum'];

const sections = [
  { title: 'Mahasiswa', fields: [
    { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'half' },
    { key: 'student_id', label: 'Mahasiswa', type: 'student', batchKey: 'batch_id', required: true, col: 'half' },
  ] },
  { title: 'Sertifikat', fields: [
    { key: 'jenis', label: 'Jenis sertifikat', type: 'select', options: JENIS_SERTIFIKAT, required: true, col: 'half' },
    { key: 'status', label: 'Status', type: 'select', options: STATUS, col: 'half', default: 'Sudah Terbit' },
    { key: 'nama_sertifikat', label: 'Nama / judul sertifikat', type: 'text', required: true, placeholder: 'mis. English Score Test 1, Diploma in Hospitality…' },
    { key: 'penerbit', label: 'Penerbit', type: 'text', col: 'half' },
    { key: 'nomor', label: 'Nomor sertifikat', type: 'text', col: 'half' },
    { key: 'tanggal_terbit', label: 'Tanggal terbit', type: 'date', col: 'third' },
    { key: 'berlaku_sampai', label: 'Berlaku sampai', type: 'date', col: 'third' },
    { key: 'skor', label: 'Nilai / skor / level', type: 'text', col: 'third' },
    { key: 'berkas', label: 'Berkas sertifikat', type: 'attachment', accept: 'image/*,.pdf' },
    { key: 'catatan', label: 'Catatan', type: 'textarea' },
  ] },
];

const columns = [
  { key: 'student_id', label: 'Mahasiswa', main: true, value: r => studentOf(r), render: r => h('div', {}, h('span', { class: 'primary' }, studentOf(r)), h('span', { class: 'secondary' }, batchName(r.batch_id))) },
  { key: 'nama_sertifikat', label: 'Sertifikat', render: r => h('div', {}, h('span', { class: 'primary' }, r.nama_sertifikat), h('span', { class: 'secondary' }, [r.jenis, r.penerbit].filter(Boolean).join(' · '))) },
  { key: 'skor', label: 'Skor' },
  { key: 'tanggal_terbit', label: 'Terbit', render: r => r.tanggal_terbit ? fmtDate(r.tanggal_terbit) : null, nowrap: true },
  { key: 'status', label: 'Status', render: r => badge(r.status) },
  { key: 'berkas', label: 'Berkas', sortable: false, render: r => docLink(r.berkas, '–') },
];
const exportCols = [
  { key: 'batch_id', label: 'Batch', value: r => batchName(r.batch_id) }, { key: 'student_id', label: 'Mahasiswa', value: r => studentOf(r) },
  { key: 'nim', label: 'NIM' },
  { key: 'jenis', label: 'Jenis' }, { key: 'nama_sertifikat', label: 'Nama Sertifikat' }, { key: 'penerbit', label: 'Penerbit' }, { key: 'nomor', label: 'Nomor' },
  { key: 'tanggal_terbit', label: 'Tanggal Terbit' }, { key: 'berlaku_sampai', label: 'Berlaku Sampai' }, { key: 'skor', label: 'Skor' }, { key: 'status', label: 'Status' },
  { key: 'berkas', label: 'Berkas' }, { key: 'catatan', label: 'Catatan' },
];

function bulkDialog(defBatch) {
  const form = buildForm([{ fields: [
    { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'half', default: defBatch },
    { key: 'jenis', label: 'Jenis sertifikat', type: 'select', options: JENIS_SERTIFIKAT, required: true, col: 'half' },
    { key: 'nama_sertifikat', label: 'Nama sertifikat', type: 'text', required: true },
    { key: 'penerbit', label: 'Penerbit', type: 'text', col: 'half' },
    { key: 'status', label: 'Status awal', type: 'select', options: STATUS, col: 'half', default: 'Belum' },
  ] }], {});
  const ok = h('button', { class: 'btn btn-primary', type: 'button' }, icon('plus'), 'Buat untuk semua');
  const { close } = openModal({ title: 'Tambah sertifikat untuk satu batch', subtitle: 'Sistem akan membuat satu baris untuk setiap mahasiswa aktif; status dan berkas selanjutnya dapat diperbarui secara individual.', body: form.el, footer: [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => close() }, 'Batal'), ok] });
  ok.addEventListener('click', async () => {
    const v = await form.collect(); if (!v) return;
    const exist = store.all('certificates');
    const studs = store.all('students').filter(s => s.batch_id === v.batch_id && !/non-aktif|mengundurkan|drop/i.test(s.status_mhs || ''));
    const recs = studs.filter(s => !exist.some(c => c.student_id === s.id && c.nama_sertifikat === v.nama_sertifikat)).map(s => ({ ...v, student_id: s.id, nim: s.nim || '', nama_mahasiswa: s.nama }));
    if (!recs.length) { toast('Semua mahasiswa sudah memiliki sertifikat ini.', 'info'); return close(); }
    await store.saveMany('certificates', recs); toast(`${recs.length} baris sertifikat dibuat.`, 'ok'); close();
  });
}

const daftar = crudView({
  id: 'certificates', collection: 'certificates', noun: 'sertifikat', title: 'Sertifikat Mahasiswa', eyebrow: 'Data mahasiswa',
  description: 'Pendataan sertifikat setiap mahasiswa per batch, meliputi Trent, English Score, Public Speaking, Immersion, magang, dan lainnya.',
  sections, columns, exportColumns: exportCols, exportName: 'Sertifikat_Mahasiswa_IBM',
  // Urutan bawaan: Batch 1 → nama mahasiswa (abjad) → nama sertifikat
  order: chain(byBatch(), byText(r => studentOf(r)), byText(r => r.nama_sertifikat)),
  searchPlaceholder: 'Cari mahasiswa, sertifikat, nomor…',
  search: r => [studentOf(r), r.nim, r.nama_sertifikat, r.jenis, r.penerbit, r.nomor].join(' '),
  filters: [
    { key: 'batch_id', label: 'Batch', options: () => batchOptions() },
    { key: 'jenis', label: 'Jenis', options: () => uniq([...JENIS_SERTIFIKAT(), ...store.all('certificates').map(r => r.jenis)]) },
    { key: 'status', label: 'Status', options: STATUS },
  ],
  defaults: () => ({ status: 'Sudah Terbit' }),
  extraActions: (ctx) => [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => bulkDialog(ctx.state.f.batch_id) }, icon('layers'), 'Tambah per batch')],
  kpis: (rows) => {
    const done = rows.filter(r => r.status === 'Sudah Terbit').length;
    return [
      { label: 'Sertifikat tercatat', value: rows.length, sub: `${uniq(rows.map(r => r.student_id)).length} mahasiswa`, icon: 'award' },
      { label: 'Sudah terbit', value: done, meter: pct(done, rows.length), meterTone: 'ok', icon: 'check', accent: true },
      { label: 'Masih proses', value: rows.filter(r => r.status === 'Proses').length, icon: 'calendar' },
      { label: 'Belum', value: rows.filter(r => r.status === 'Belum').length, icon: 'alert' },
    ];
  },
  aliases: { student_id: ['Nama', 'Nama Mahasiswa'], nama_sertifikat: ['Sertifikat'], tanggal_terbit: ['Tanggal'] },
  emptyTitle: 'Belum ada sertifikat tercatat', emptyText: 'Tambahkan data secara manual, gunakan fitur “Tambah per batch”, atau impor dari Excel.',
});

/* ---------- Rekap matriks per batch ---------- */
function rekap(root) {
  // Bawaan Batch 1; pilihan batch hanya diingat selama halaman belum dimuat ulang
  let bid = store.get('batches', rekapBatch) ? rekapBatch : firstBatch();
  const box = h('div');
  function openCert(rec) {
    const form = buildForm(sections, rec);
    const save = h('button', { class: 'btn btn-primary', type: 'button' }, 'Simpan');
    const d = openDrawer({ title: rec.id ? 'Ubah sertifikat' : 'Tambah sertifikat', subtitle: studentOf(rec), body: form.el, footer: [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => d.close() }, 'Batal'), save] });
    save.addEventListener('click', async () => { const v = await form.collect(); if (!v) return; await store.save('certificates', v); toast('Sertifikat disimpan.', 'ok'); d.close(); });
  }
  function render() {
    clear(box);
    const studs = store.all('students').filter(s => s.batch_id === bid).sort(byText(s => s.nama));
    const certs = store.all('certificates').filter(c => c.batch_id === bid);
    const types = uniq([...certs.map(c => c.nama_sertifikat)]).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
    const sel = batchSelect({ value: bid, onChange: (v) => { bid = v; rekapBatch = v; render(); } });
    const cell = (s, t) => certs.find(c => (c.student_id === s.id || (c.nim && c.nim === s.nim)) && c.nama_sertifikat === t);
    const done = certs.filter(c => c.status === 'Sudah Terbit').length;

    box.append(
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, 'Sertifikat · Rekap'), h('h1', {}, 'Rekap Sertifikat per Batch'), h('p', {}, 'Setiap kolom mewakili satu jenis sertifikat. Warna hijau menandakan sudah terbit dan kuning menandakan dalam proses. Pilih kotak untuk mengisi atau mengubah data.')),
        h('div', { class: 'actions no-print' }, sel,
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => bulkDialog(bid) }, icon('plus'), 'Tambah kolom sertifikat'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => exportWorkbook(`Rekap_Sertifikat_${batchName(bid).replace(/\s+/g, '_')}`, [{ name: batchName(bid), rows: [['No', 'Nama Mahasiswa', 'NIM', ...types], ...studs.map((s, i) => [i + 1, s.nama, s.nim || '', ...types.map(t => { const c = cell(s, t); return c ? c.status + (c.skor ? ` (${c.skor})` : '') : ''; })])] }]) }, icon('sheet'), 'Ekspor Excel'))),
      kpiRow([
        { label: 'Mahasiswa', value: studs.length, sub: batchName(bid), icon: 'users' },
        { label: 'Jenis sertifikat', value: types.length, icon: 'award' },
        { label: 'Sudah terbit', value: `${done} / ${studs.length * types.length || 0}`, meter: pct(done, studs.length * types.length), meterTone: 'ok', icon: 'check', accent: true },
      ]),
      h('div', { class: 'card' }, !studs.length ? h('div', { class: 'empty' }, icon('users'), h('h3', {}, 'Belum ada mahasiswa di batch ini'))
        : !types.length ? h('div', { class: 'empty' }, icon('award'), h('h3', {}, 'Belum ada sertifikat untuk batch ini'), h('p', {}, 'Gunakan “Tambah kolom sertifikat” untuk membuat satu sertifikat bagi seluruh mahasiswa batch ini.'))
        : h('div', { class: 'table-wrap' }, h('table', { class: 'tbl matrix stack' },
          h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Nama mahasiswa'), types.map(t => h('th', { class: 'mark', style: { whiteSpace: 'normal', minWidth: '96px' } }, t)))),
          h('tbody', {}, studs.map((s, i) => h('tr', {}, h('td', { class: 'muted num idx' }, i + 1), h('td', { class: 'cell-main' }, h('span', { class: 'primary' }, s.nama), s.nim ? h('span', { class: 'secondary' }, s.nim) : null),
            types.map(t => { const c = cell(s, t); const st = c ? c.status : '';
              return h('td', { class: 'mark', 'data-label': t }, h('button', { type: 'button', class: `tick ${st === 'Sudah Terbit' ? 'on' : st === 'Proses' ? 'part' : ''}`, title: c ? `${c.status}${c.skor ? ' · ' + c.skor : ''}` : 'Belum ada', 'aria-label': `${s.nama} — ${t}: ${st || 'belum ada'}`,
                onclick: () => openCert(c || { batch_id: bid, student_id: s.id, nama_sertifikat: t, jenis: (certs.find(x => x.nama_sertifikat === t) || {}).jenis, penerbit: (certs.find(x => x.nama_sertifikat === t) || {}).penerbit, status: 'Sudah Terbit' }) }, icon(st === 'Proses' ? 'minus' : 'check')));
            }))))))),
    );
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe(render) };
}

let rekapBatch = '';

export default {
  mount(root) {
    return tabPage(root, [
      { id: 'rekap', label: 'Rekap per batch', fn: (b) => rekap(b) },
      { id: 'daftar', label: 'Daftar sertifikat', fn: (b) => daftar(b) },
    ], { eyebrow: 'Data Mahasiswa', title: 'Sertifikat Mahasiswa', key: 'tab_cert', def: 'rekap' });
  },
};
