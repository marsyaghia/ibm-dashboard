/* =========================================================================
   5. KEMITRAAN — TRENT GLOBAL COLLEGE
   • Pembayaran per batch per mata kuliah (S$ → Rp, bukti, marksheet)
   • Progres mahasiswa per mata kuliah Trent (matriks centang)
   • Mata kuliah & silabus per pertemuan
   ========================================================================= */
import { h, icon, clear, badge, docLink, fmtIDR, fmtSGD, fmtDate, fmtNum, sum, batchName, batchOptions, batches, tabs, pref, toast, openDrawer, openModal, hasAttachment, pct, uniq } from '../ui.js';
import { crudView, kpiRow } from '../crud.js';
import { buildForm } from '../form.js';
import { exportWorkbook } from '../io.js';
import { store } from '../store.js';

const subjects = () => [...store.all('trentSubjects')].sort((a, b) => a.semester - b.semester || a.kode.localeCompare(b.kode));
const subj = (code) => store.all('trentSubjects').find(s => s.kode === code) || {};
const PROGRES = ['Upcoming', 'On Progress', 'Done'];
const STATUS_BAYAR = ['Lunas', 'Belum Dibayar', 'Belum Ditagih'];
/** Kode Trent → nama kolom di tabel trent_progres_mahasiswa: 'DTG-04' → 'dtg_04' */
const ck = (code) => String(code).toLowerCase().replace(/[^a-z0-9]+/g, '_');
const tarif = () => Number(store.setting('akademik').tarif_trent_sgd) || 50;
const gst = () => (Number(store.setting('akademik').gst_trent) || 9) / 100;
const tagihanSGD = (r) => (Number(r.total_sgd) || 0) + (Number(r.gst_sgd) || 0);
const batchSort = (id) => (store.get('batches', id) || {}).angkatan || 0;

/* ---------- Tab 1: Pembayaran ---------- */
const paySections = [
  { title: 'Mata kuliah & batch', fields: [
    { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'half' },
    { key: 'trent_code', label: 'Mata kuliah Trent', type: 'select', required: true, col: 'half', options: () => subjects().map(s => ({ value: s.kode, label: `${s.kode} · ${s.nama}` })) },
    { key: 'progres', label: 'Progres perkuliahan', type: 'select', options: PROGRES, col: 'third', default: 'Upcoming' },
    { key: 'jumlah_mahasiswa', label: 'Jumlah mahasiswa', type: 'number', col: 'third', min: 0 },
    { key: 'mahasiswa_aktif', label: 'Mahasiswa ditagihkan', type: 'number', col: 'third', min: 0, help: 'Jumlah mahasiswa yang diperhitungkan dalam invoice.' },
  ] },
  { title: 'Tagihan & pembayaran', note: 'Kosongkan kolom Total dan GST agar dihitung secara otomatis (jumlah mahasiswa × tarif, GST sesuai Pengaturan). Total dalam Rupiah akan dihitung berdasarkan kurs apabila dikosongkan.', fields: [
    { key: 'tuition_sgd', label: 'Tarif per mahasiswa', type: 'decimal', prefix: 'S$', col: 'third', default: () => tarif() },
    { key: 'total_sgd', label: 'Total', type: 'decimal', prefix: 'S$', col: 'third' },
    { key: 'gst_sgd', label: 'GST', type: 'decimal', prefix: 'S$', col: 'third' },
    { key: 'kurs', label: 'Kurs 1 S$ → Rp', type: 'decimal', prefix: 'Rp', col: 'third' },
    { key: 'total_idr', label: 'Total dibayar', type: 'money', col: 'third', help: 'Nominal transfer aktual (termasuk biaya bank).' },
    { key: 'status_bayar', label: 'Status pembayaran', type: 'select', options: STATUS_BAYAR, col: 'third', default: 'Belum Ditagih' },
    { key: 'tanggal_bayar', label: 'Tanggal bayar', type: 'date', col: 'half' },
    { key: 'invoice_no', label: 'No. invoice Trent', type: 'text', col: 'half' },
    { key: 'bukti', label: 'Bukti pembayaran', type: 'attachment', accept: 'image/*,.pdf' },
  ] },
  { title: 'Penilaian', fields: [
    { key: 'marksheet', label: 'Marksheet (lembar nilai)', type: 'attachment', accept: '.xlsx,.csv,.pdf' },
    { key: 'marksheet_status', label: 'Status marksheet', type: 'select', options: ['Tersedia', 'Under checking', 'On Progress', 'TBC'], col: 'half', default: 'TBC' },
    { key: 'catatan', label: 'Catatan', type: 'textarea' },
  ] },
];

const payColumns = [
  { key: 'batch_id', label: 'Batch', value: r => `${batchSort(r.batch_id)}-${r.semester}-${r.trent_code}`, render: r => h('span', { class: 'primary nowrap' }, batchName(r.batch_id)) },
  { key: 'trent_code', label: 'Mata kuliah', main: true, minWidth: '240px', render: r => h('div', {}, h('span', { class: 'pill gold' }, r.trent_code), ' ', h('span', { class: 'primary' }, r.subjek || subj(r.trent_code).nama), h('span', { class: 'secondary' }, `Semester ${r.semester || subj(r.trent_code).semester || '–'} · ${r.asia_code || ''}`)) },
  { key: 'progres', label: 'Progres', render: r => badge(r.progres) },
  { key: 'mahasiswa_aktif', label: 'Mhs', align: 'right', value: r => Number(r.mahasiswa_aktif) || 0, render: r => h('span', { class: 'num' }, `${fmtNum(r.mahasiswa_aktif)}${r.jumlah_mahasiswa && r.jumlah_mahasiswa !== r.mahasiswa_aktif ? ` / ${r.jumlah_mahasiswa}` : ''}`) },
  { key: 'tagihan', label: 'Tagihan (S$)', align: 'right', decimal: true, value: tagihanSGD, render: r => h('span', { class: 'num' }, tagihanSGD(r) ? fmtSGD(tagihanSGD(r)) : '–'), nowrap: true },
  { key: 'total_idr', label: 'Dibayar (Rp)', align: 'right', money: true, value: r => Number(r.total_idr) || 0, render: r => h('span', { class: 'num' }, r.total_idr ? fmtIDR(r.total_idr) : '–'), nowrap: true },
  { key: 'status_bayar', label: 'Status', render: r => h('div', {}, badge(r.status_bayar), r.tanggal_bayar ? h('span', { class: 'secondary' }, fmtDate(r.tanggal_bayar)) : null) },
  { key: 'bukti', label: 'Bukti', sortable: false, render: r => docLink(r.bukti, '–') },
  { key: 'marksheet', label: 'Marksheet', sortable: false, render: r => hasAttachment(r.marksheet) ? docLink(r.marksheet) : h('span', { class: 'muted' }, r.marksheet_status || '–') },
];
const payExport = [
  { key: 'batch_id', label: 'Batch', value: r => batchName(r.batch_id) }, { key: 'trent_code', label: 'Trent Code' }, { key: 'asia_code', label: 'Asia Code' },
  { key: 'subjek', label: 'Subject' }, { key: 'semester', label: 'Semester' }, { key: 'progres', label: 'Progres' },
  { key: 'jumlah_mahasiswa', label: 'Jumlah Mahasiswa' }, { key: 'mahasiswa_aktif', label: 'Mahasiswa Ditagihkan' },
  { key: 'tuition_sgd', label: 'Tuition/Pax (S$)', decimal: true }, { key: 'total_sgd', label: 'Total (S$)', decimal: true }, { key: 'gst_sgd', label: 'GST 9% (S$)', decimal: true },
  { key: 'kurs', label: 'Kurs (Rp)', decimal: true }, { key: 'total_idr', label: 'Total Dibayar (Rp)', money: true, value: r => Number(r.total_idr) || 0 },
  { key: 'status_bayar', label: 'Status Pembayaran' }, { key: 'tanggal_bayar', label: 'Tanggal Bayar' }, { key: 'invoice_no', label: 'No. Invoice' },
  { key: 'bukti', label: 'Bukti' }, { key: 'marksheet', label: 'Marksheet' }, { key: 'marksheet_status', label: 'Status Marksheet' },
];

const pembayaran = crudView({
  id: 'trentPayments', collection: 'trentPayments', noun: 'pembayaran Trent', title: 'Trent Global College', eyebrow: 'Kemitraan',
  description: 'Tagihan dan pembayaran ke Trent Global College per batch dan mata kuliah (tarif per mahasiswa + GST), lengkap dengan bukti transfer dan marksheet.',
  sections: paySections, columns: payColumns, exportColumns: payExport, exportName: 'Pembayaran_Trent', sort: { key: 'batch_id', dir: 'asc' }, pageSize: 50,
  searchPlaceholder: 'Cari mata kuliah, kode…',
  search: r => [r.subjek, r.trent_code, r.asia_code, batchName(r.batch_id), r.invoice_no, r.catatan].join(' '),
  filters: [
    { key: 'batch_id', label: 'Batch', options: () => batchOptions() },
    { key: 'progres', label: 'Progres', options: PROGRES },
    { key: 'status_bayar', label: 'Status', options: STATUS_BAYAR },
  ],
  defaults: () => ({ tuition_sgd: tarif(), progres: 'Upcoming', status_bayar: 'Belum Ditagih', marksheet_status: 'TBC' }),
  beforeSave: (r) => {
    const s = subj(r.trent_code);
    const out = { ...r, subjek: s.nama || r.subjek, asia_code: s.asia_code || r.asia_code, semester: s.semester || r.semester };
    const n = Number(out.mahasiswa_aktif) || 0, t = Number(out.tuition_sgd) || 0;
    if ((out.total_sgd === '' || out.total_sgd === undefined || out.total_sgd === 0) && n && t) out.total_sgd = n * t;
    if ((out.gst_sgd === '' || out.gst_sgd === undefined) && out.total_sgd) out.gst_sgd = Math.round(out.total_sgd * gst() * 100) / 100;
    if ((out.total_idr === '' || out.total_idr === undefined || out.total_idr === 0) && out.kurs && out.total_sgd) out.total_idr = Math.round((Number(out.total_sgd) + Number(out.gst_sgd || 0)) * Number(out.kurs));
    return out;
  },
  kpis: (rows) => {
    const paid = rows.filter(r => r.status_bayar === 'Lunas');
    const due = rows.filter(r => r.status_bayar !== 'Lunas' && r.progres !== 'Upcoming');
    const estDue = sum(due, r => tagihanSGD(r) || (Number(r.mahasiswa_aktif || r.jumlah_mahasiswa) || 0) * (Number(r.tuition_sgd) || tarif()) * (1 + gst()));
    return [
      { label: 'Total dibayar', value: fmtIDR(sum(paid, 'total_idr')), sub: `${fmtSGD(sum(paid, tagihanSGD))} termasuk GST`, icon: 'wallet', accent: true },
      { label: 'Pembayaran lunas', value: `${paid.length} / ${rows.length}`, meter: pct(paid.length, rows.length), meterTone: 'ok', icon: 'check' },
      { label: 'Perlu dibayar', value: due.length, sub: due.length ? `± ${fmtSGD(estDue)} (kuliah berjalan/selesai)` : 'Tidak ada tunggakan', icon: 'alert' },
      { label: 'Marksheet tersedia', value: `${rows.filter(r => hasAttachment(r.marksheet)).length} / ${rows.length}`, icon: 'sheet' },
    ];
  },
  footer: (rows) => ['Total', '', '', h('span', { class: 'num' }, fmtNum(sum(rows, r => Number(r.mahasiswa_aktif) || 0))), h('span', { class: 'num' }, fmtSGD(sum(rows, tagihanSGD))), h('span', { class: 'num' }, fmtIDR(sum(rows, 'total_idr'))), '', '', ''],
  emptyTitle: 'Belum ada data pembayaran Trent',
});

/* ---------- Tab 2: Progres mahasiswa ---------- */
function progresMahasiswa(root) {
  let bid = pref.get('trent_batch', (batches()[0] || {}).id);
  const box = h('div');
  const codes = () => subjects().map(s => s.kode);

  async function toggle(en, code) {
    try { await store.save('trentEnrollments', { ...en, [ck(code)]: !en[ck(code)] }); } catch (e) { toast(e.message, 'bad'); }
  }
  function editEnrollment(en) {
    const st = store.get('students', en.student_id) || { nama: en.nama_mahasiswa };
    const form = buildForm([{ fields: [
      { key: 'remarks', label: 'Catatan (remarks)', type: 'text' },
      { key: 'status_bayar', label: 'Status pembayaran mahasiswa', type: 'select', options: ['Lunas', 'On Progress', 'Belum Dibayar'], col: 'half' },
      { key: 'tanggal_bayar', label: 'Tanggal bayar', type: 'text', col: 'half', placeholder: 'dd/mm/yyyy' },
      { key: 'bukti_nama', label: 'Nama berkas bukti', type: 'text' },
    ] }], en);
    const save = h('button', { class: 'btn btn-primary', type: 'button' }, 'Simpan');
    const { close } = openModal({ title: st.nama || 'Mahasiswa', subtitle: batchName(en.batch_id), body: form.el, footer: [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => close() }, 'Batal'), save] });
    save.addEventListener('click', async () => { const v = await form.collect(); if (!v) return; await store.save('trentEnrollments', v); toast('Disimpan.', 'ok'); close(); });
  }

  function render() {
    clear(box);
    const cs = codes();
    const studs = store.all('students').filter(s => s.batch_id === bid).sort((a, b) => a.nama.localeCompare(b.nama));
    const ens = store.all('trentEnrollments').filter(e => e.batch_id === bid);
    const own = (e, s) => e.student_id === s.id || (e.nim && s.nim && String(e.nim) === String(s.nim)) || (!e.student_id && e.nama_mahasiswa && e.nama_mahasiswa.toLowerCase() === s.nama.toLowerCase());
    const rows = studs.map(s => ({ s, en: ens.find(e => own(e, s)) })).filter(x => x.en);
    const missing = studs.filter(s => !ens.some(e => own(e, s)));
    const sel = h('select', { class: 'select', style: { width: 'auto' }, 'aria-label': 'Pilih batch' }, batchOptions().map(o => h('option', { value: o.value }, o.label)));
    sel.value = bid || ''; sel.addEventListener('change', () => { bid = sel.value; pref.set('trent_batch', bid); render(); });
    const doneCount = (en) => cs.filter(c => en[ck(c)]).length;
    const totalTicks = sum(rows, x => doneCount(x.en));

    box.append(
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, 'Kemitraan · Trent'), h('h1', {}, 'Progres Mahasiswa Trent'), h('p', {}, 'Pilih kotak untuk menandai bahwa mahasiswa telah menyelesaikan mata kuliah Trent. Tagihan dihitung per mata kuliah yang diselesaikan sesuai tarif pada menu Pengaturan.')),
        h('div', { class: 'actions no-print' }, sel,
          missing.length ? h('button', { class: 'btn btn-ghost', type: 'button', onclick: async () => { await store.saveMany('trentEnrollments', missing.map(s => ({ student_id: s.id, nim: s.nim || '', nama_mahasiswa: s.nama, batch_id: bid, ...Object.fromEntries(cs.map(c => [ck(c), false])) }))); toast(`${missing.length} mahasiswa ditambahkan ke daftar Trent.`, 'ok'); } }, icon('plus'), `Tambahkan ${missing.length} mahasiswa`) : null,
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => exportMatrix(bid, rows, cs) }, icon('sheet'), 'Ekspor Excel'))),
      kpiRow([
        { label: 'Mahasiswa terdaftar', value: rows.length, sub: batchName(bid), icon: 'users' },
        { label: 'Selesai semua mata kuliah', value: rows.filter(x => doneCount(x.en) === cs.length).length, icon: 'award', accent: true },
        { label: 'Mata kuliah diselesaikan', value: `${totalTicks} / ${rows.length * cs.length}`, meter: pct(totalTicks, rows.length * cs.length), meterTone: 'ok', icon: 'check' },
        { label: `Estimasi tagihan (S$${tarif()}/mk)`, value: fmtSGD(totalTicks * tarif()), sub: 'belum termasuk GST', icon: 'wallet' },
      ]),
      h('div', { class: 'card' }, rows.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl matrix stack' },
        h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Nama mahasiswa'), cs.map(c => h('th', { class: 'mark', title: subj(c).nama }, c, h('span', { class: 'secondary', style: { fontWeight: 500 } }, `Smt ${subj(c).semester}`))), h('th', { class: 'right' }, 'Selesai'), h('th', {}, 'Catatan'))),
        h('tbody', {}, rows.map((x, i) => h('tr', {},
          h('td', { class: 'muted num idx' }, i + 1),
          h('td', { class: 'cell-main' }, h('button', { class: 'doc-link', type: 'button', onclick: () => editEnrollment(x.en), title: 'Ubah catatan & pembayaran' }, h('span', { class: 'primary' }, x.s.nama))),
          cs.map(c => h('td', { class: 'mark', 'data-label': c }, h('button', { type: 'button', class: `tick ${x.en[ck(c)] ? 'on' : ''}`, 'aria-pressed': String(!!x.en[ck(c)]), 'aria-label': `${x.s.nama} — ${c}`, onclick: () => toggle(x.en, c) }, icon('check')))),
          h('td', { class: 'right num', 'data-label': 'Selesai' }, `${doneCount(x.en)}/${cs.length}`),
          h('td', { class: 'wide', 'data-label': 'Catatan' }, x.en.remarks ? badge(x.en.remarks, doneCount(x.en) < cs.length ? 'warn' : '') : (doneCount(x.en) === cs.length ? badge('Done') : h('span', { class: 'muted' }, '–'))),
        ))),
        h('tfoot', {}, h('tr', {}, h('td', { class: 'idx' }), h('td', { class: 'cell-main' }, 'Jumlah selesai'), cs.map(c => h('td', { class: 'mark num', 'data-label': c }, rows.filter(x => x.en[ck(c)]).length)), h('td', { class: 'right num', 'data-label': 'Total' }, totalTicks), h('td', { class: 'idx' }))),
      )) : h('div', { class: 'empty' }, icon('users'), h('h3', {}, 'Belum ada mahasiswa terdaftar Trent di batch ini'), h('p', {}, missing.length ? 'Gunakan tombol “Tambahkan mahasiswa” di bagian atas.' : 'Silakan tambahkan mahasiswa batch ini melalui menu Biodata Mahasiswa terlebih dahulu.'))),
    );
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe(render) };
}
function exportMatrix(bid, rows, cs) {
  exportWorkbook(`Progres_Trent_${batchName(bid).replace(/\s+/g, '_')}`, [{ name: batchName(bid), rows: [
    ['No', 'Nama Mahasiswa', 'NIM', ...cs, 'Selesai', 'Tagihan (S$)', 'Catatan', 'Status Bayar', 'Tanggal Bayar'],
    ...rows.map((x, i) => { const n = cs.filter(c => x.en[ck(c)]).length; return [i + 1, x.s.nama, x.s.nim || '', ...cs.map(c => x.en[ck(c)] ? '✓' : ''), `${n}/${cs.length}`, n * tarif(), x.en.remarks || '', x.en.status_bayar || '', x.en.tanggal_bayar || '']; }),
  ] }]);
}

/* ---------- Tab 3: Mata kuliah & silabus ---------- */
function silabus(root) {
  const box = h('div');
  function edit(s) {
    const form = buildForm([{ fields: [
      { key: 'kode', label: 'Kode Trent', type: 'text', required: true, col: 'third' },
      { key: 'asia_code', label: 'Kode Asia', type: 'text', col: 'third' },
      { key: 'semester', label: 'Semester', type: 'number', col: 'third', min: 1, max: 8 },
      { key: 'nama', label: 'Nama mata kuliah', type: 'text', required: true },
      { key: 'link_mdd', label: 'Link MDD / CDD', type: 'url' },
      { key: 'link_rps', label: 'Link RPS', type: 'url' },
      { key: 'silabus', label: 'Silabus (satu pertemuan per baris)', type: 'textarea', rows: 12 },
    ] }], s || {});
    const save = h('button', { class: 'btn btn-primary', type: 'button' }, 'Simpan');
    const d = openDrawer({ title: s ? `${s.kode} — ${s.nama}` : 'Tambah mata kuliah Trent', body: form.el, footer: [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => d.close() }, 'Batal'), save] });
    save.addEventListener('click', async () => { const v = await form.collect(); if (!v) return; await store.save('trentSubjects', { ...v, semester: Number(v.semester) || '' }); toast('Mata kuliah Trent disimpan.', 'ok'); d.close(); });
  }
  function render() {
    clear(box);
    box.append(
      h('div', { class: 'page-head' }, h('div', {}, h('span', { class: 'eyebrow' }, 'Kemitraan · Trent'), h('h1', {}, 'Mata Kuliah & Silabus Trent'), h('p', {}, 'Enam mata kuliah Trent Global College yang dikonversi ke dalam kurikulum IBM, beserta dokumen MDD dan rencana pembelajaran per pertemuan.')),
        h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => edit(null) }, icon('plus'), 'Tambah mata kuliah'))),
      h('div', { class: 'grid grid-2' }, subjects().map(s => {
        const items = String(s.silabus || '').split('\n').filter(Boolean);
        return h('div', { class: 'card' },
          h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, h('span', { class: 'pill gold' }, s.kode), ' ', s.nama), h('p', {}, `Semester ${s.semester} · Kode Asia ${s.asia_code || '–'}`)),
            h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => edit(s) }, icon('edit', 'sm'), 'Ubah')),
          h('div', { class: 'card-body' },
            h('div', { class: 'actions', style: { marginBottom: '12px' } }, docLink(s.link_mdd ? { link: s.link_mdd, label: 'Dokumen MDD / CDD' } : null, 'MDD belum tersedia'), docLink(s.link_rps ? { link: s.link_rps, label: 'RPS' } : null, 'RPS belum tersedia')),
            items.length ? h('details', {}, h('summary', { style: { cursor: 'pointer', fontWeight: 600, color: 'var(--ink)', fontSize: '13.5px' } }, `Silabus ${items.length} pertemuan`),
              h('ol', { class: 'syllabus', style: { marginTop: '10px' } }, items.map(t => h('li', { class: /mid|final/i.test(t) ? 'exam' : '' }, t)))) : h('p', { class: 'muted' }, 'Silabus belum diisi.')));
      })));
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe(render) };
}

export default {
  mount(root) {
    let tab = pref.get('tab_trent', 'bayar'); let inner = null; const body = h('div');
    const draw = () => {
      inner && inner.destroy && inner.destroy(); clear(root);
      root.appendChild(tabs([{ id: 'bayar', label: 'Pembayaran per batch' }, { id: 'progres', label: 'Progres mahasiswa' }, { id: 'silabus', label: 'Mata kuliah & silabus' }], tab, (t) => { tab = t; pref.set('tab_trent', t); draw(); }));
      clear(body); root.appendChild(body);
      inner = tab === 'progres' ? progresMahasiswa(body) : tab === 'silabus' ? silabus(body) : pembayaran(body);
    };
    draw();
    return { destroy: () => inner && inner.destroy && inner.destroy() };
  },
};
