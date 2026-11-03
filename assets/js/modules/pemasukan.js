/* =========================================================================
   2. KEUANGAN — PEROLEHAN DARI MAHASISWA
   Satu baris = satu mahasiswa: Batch, NIM, Nama, DU, DPP, UKT per semester
   (format sheet "Biaya Batch 1 sd 4").
   Tab Data biaya (input & daftar) + tab Rekapitulasi (grafik per batch).
   ========================================================================= */
import { h, icon, clear, fmtIDR, sum, batchName, batchOptions, batches, tabs, pref } from '../ui.js';
import { crudView, kpiRow } from '../crud.js';
import { groupedBars } from '../charts.js';
import { dataTable } from '../table.js';
import { exportWorkbook } from '../io.js';
import { store } from '../store.js';

/** Tiga komponen biaya, urut seperti di sheet */
const BIAYA = [
  { key: 'du', label: 'DU' },
  { key: 'dpp', label: 'DPP' },
  { key: 'ukt_per_semester', label: 'UKT per semester' },
];
const money = (k) => (r) => Number(r[k]) || 0;
const batchOrder = (id) => { const i = batches().findIndex(b => b.id === id); return i < 0 ? 999 : i; };

const sections = [
  { title: 'Mahasiswa', fields: [
    { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'half' },
    { key: 'nim', label: 'NIM', type: 'text', col: 'half' },
    { key: 'nama_mahasiswa', label: 'Nama', type: 'text', required: true },
  ] },
  { title: 'Biaya', fields: [
    { key: 'du', label: 'DU (Daftar Ulang)', type: 'money', col: 'third' },
    { key: 'dpp', label: 'DPP', type: 'money', col: 'third' },
    { key: 'ukt_per_semester', label: 'UKT per semester', type: 'money', col: 'third' },
  ] },
];

const moneyCol = (b) => ({ key: b.key, label: b.label, align: 'right', money: true, value: money(b.key), render: r => h('span', { class: 'num' }, fmtIDR(r[b.key])), nowrap: true });
const columns = [
  { key: 'batch_id', label: 'Batch', value: r => batchOrder(r.batch_id), render: r => batchName(r.batch_id), nowrap: true },
  { key: 'nim', label: 'NIM', nowrap: true },
  { key: 'nama_mahasiswa', label: 'Nama', main: true, render: r => h('span', { class: 'primary' }, r.nama_mahasiswa || '–') },
  ...BIAYA.map(moneyCol),
];
const exportCols = [
  { key: 'batch_id', label: 'Batch', value: r => batchName(r.batch_id) }, { key: 'nim', label: 'NIM' }, { key: 'nama_mahasiswa', label: 'Nama' },
  ...BIAYA.map(b => ({ key: b.key, label: `${b.label} (Rp)`, money: true, value: money(b.key) })),
];

/* ---------- Agregasi per batch ---------- */
function recap(rows) {
  return batches().map(b => {
    const rs = rows.filter(r => r.batch_id === b.id);
    return { batch: b, n: rs.length, ...Object.fromEntries(BIAYA.map(x => [x.key, sum(rs, x.key)])) };
  });
}

function rekapExcel(rows) {
  const T = (v) => ({ v, bold: true }); const rc = recap(rows);
  const fmt = (from) => Object.fromEntries(BIAYA.map((_, i) => [from + i, 'money']));
  const sorted = rows.slice().sort((a, z) => batchOrder(a.batch_id) - batchOrder(z.batch_id) || String(a.nama_mahasiswa).localeCompare(String(z.nama_mahasiswa)));
  exportWorkbook('Rekap_Perolehan_Mahasiswa', [
    { name: 'Rekap per Batch', numFmt: fmt(2), rows: [['Batch', 'Mahasiswa', ...BIAYA.map(b => `${b.label} (Rp)`)],
      ...rc.map(x => [x.batch.nama, x.n, ...BIAYA.map(b => x[b.key])]),
      [T('TOTAL'), T(sum(rc, 'n')), ...BIAYA.map(b => T(sum(rc, b.key)))]] },
    { name: 'Per Mahasiswa', numFmt: fmt(4), rows: [['Batch', 'No', 'NIM', 'Nama', ...BIAYA.map(b => `${b.label} (Rp)`)],
      ...sorted.map((r, i, a) => [batchName(r.batch_id), a.slice(0, i + 1).filter(x => x.batch_id === r.batch_id).length, r.nim || '', r.nama_mahasiswa || '', ...BIAYA.map(b => money(b.key)(r))])] },
  ]);
}

/* ---------- Tab Data biaya ---------- */
const data = crudView({
  id: 'incomes', collection: 'incomes', noun: 'data mahasiswa', title: 'Perolehan dari Mahasiswa', eyebrow: 'Keuangan',
  description: 'Rincian biaya setiap mahasiswa IBM per batch: DU (Daftar Ulang), DPP, dan UKT per semester.',
  sections, columns, exportColumns: exportCols, exportName: 'Perolehan_Mahasiswa_IBM', sort: { key: 'batch_id', dir: 'asc' }, unit: 'mahasiswa',
  searchPlaceholder: 'Cari nama atau NIM…',
  search: r => [r.nama_mahasiswa, r.nim, batchName(r.batch_id)].join(' '),
  filters: [{ key: 'batch_id', label: 'Batch', options: () => batchOptions() }],
  kpis: (rows) => [
    { label: 'Mahasiswa', value: rows.length, sub: `${new Set(rows.map(r => r.batch_id).filter(Boolean)).size} batch`, icon: 'users' },
    ...BIAYA.map((b, i) => ({ label: `Total ${b.label}`, value: fmtIDR(sum(rows, b.key)), icon: i === 2 ? 'income' : 'wallet', accent: i === 2 })),
  ],
  footer: (rows) => ['Total', '', '', ...BIAYA.map(b => h('span', { class: 'num' }, fmtIDR(sum(rows, b.key))))],
  // Impor ulang: mahasiswa dengan NIM sama (atau batch + nama sama) diperbarui, bukan diduplikasi
  mergeKey: (r) => r.nim ? `nim:${String(r.nim).trim()}` : (r.nama_mahasiswa ? `${r.batch_id}|${String(r.nama_mahasiswa).trim().toLowerCase()}` : ''),
  importSection: 'batch_id',
  aliases: { nama_mahasiswa: ['Nama', 'Nama Mahasiswa', 'Student Name'], batch_id: ['Angkatan'], du: ['Daftar Ulang'], ukt_per_semester: ['UKT', 'UKT/SPP', 'UKT per semester'] },
  importNote: 'Sheet “Biaya Batch 1 sd 4” dapat digunakan secara langsung (File → Download → .xlsx/.csv). Kolom yang dikenali: NIM, Nama, DU, DPP, dan UKT per semester. Baris judul seperti “BATCH 1 / 2023” digunakan sebagai batch untuk baris di bawahnya, sedangkan baris total akan diabaikan. Data mahasiswa dengan NIM yang sama akan diperbarui.',
  emptyTitle: 'Belum ada data biaya mahasiswa', emptyText: 'Tambahkan data mahasiswa secara manual atau impor dari sheet biaya per batch.',
});

/* ---------- Tab Rekapitulasi ---------- */
function rekap(root) {
  const box = h('div');
  function render() {
    clear(box);
    const rows = store.all('incomes'); const rc = recap(rows);
    const series = BIAYA.map((b, i) => ({ name: b.label, cls: `bar-${i + 1}`, color: `var(--chart-${i + 1})`, values: rc.map(x => x[b.key]) }));
    const tableCols = [
      { key: 'batch', label: 'Batch', main: true, value: x => x.batch.angkatan, render: x => h('div', {}, h('span', { class: 'primary' }, x.batch.nama), h('span', { class: 'secondary' }, `Angkatan ${x.batch.angkatan} · ${x.n} mahasiswa`)) },
      ...BIAYA.map(b => ({ key: b.key, label: b.label, align: 'right', value: x => x[b.key], render: x => h('span', { class: 'num' }, fmtIDR(x[b.key])) })),
    ];
    box.append(
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, 'Keuangan · Rekapitulasi'), h('h1', {}, 'Rekap Perolehan per Batch'), h('p', {}, 'Total DU, DPP, dan UKT per semester dari seluruh mahasiswa pada setiap batch.')),
        h('div', { class: 'actions no-print' },
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => window.print() }, icon('print'), 'Cetak / PDF'),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => rekapExcel(rows) }, icon('sheet'), 'Ekspor rekap Excel'))),
      kpiRow([
        { label: 'Mahasiswa', value: rows.length, sub: `${rc.filter(x => x.n).length} batch`, icon: 'users' },
        ...BIAYA.map((b, i) => ({ label: `Total ${b.label}`, value: fmtIDR(sum(rows, b.key)), icon: i === 2 ? 'income' : 'wallet', accent: i === 2 })),
      ]),
      !rows.length ? h('div', { class: 'card' }, h('div', { class: 'empty' }, icon('report'), h('h3', {}, 'Belum ada data biaya mahasiswa'), h('p', {}, 'Tambahkan data melalui tab Data biaya atau impor dari sheet biaya per batch.'))) :
        h('div', { class: 'stack' },
          h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'DU, DPP, dan UKT per batch'), h('p', {}, 'Arahkan kursor ke grafik batang untuk melihat nilai secara lengkap'))),
            h('div', { class: 'card-body' }, groupedBars({ categories: rc.map(x => x.batch.nama), series, height: 300, width: 1000 }))),
          h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Tabel rekap'))),
            dataTable({ columns: tableCols, rows: rc, pageSize: Infinity, sort: { key: 'batch', dir: 'asc' },
              footer: () => ['Total', ...BIAYA.map(b => h('b', { class: 'num' }, fmtIDR(sum(rc, b.key))))] }).el)),
    );
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe(render) };
}

export default {
  mount(root) {
    let tab = pref.get('tab_inc', 'transaksi'); let inner = null; const body = h('div');
    const draw = () => {
      inner && inner.destroy && inner.destroy(); clear(root);
      root.appendChild(tabs([{ id: 'transaksi', label: 'Data biaya' }, { id: 'rekap', label: 'Rekapitulasi' }], tab, (t) => { tab = t; pref.set('tab_inc', t); draw(); }));
      clear(body); root.appendChild(body);
      inner = tab === 'rekap' ? rekap(body) : data(body);
    };
    draw();
    return { destroy: () => inner && inner.destroy && inner.destroy() };
  },
};
