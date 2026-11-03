/* =========================================================================
   1. KEUANGAN — PENGELUARAN DIVISI IBM (+ laporan)
   ========================================================================= */
import { h, icon, clear, fmtIDR, fmtDate, fmtNum, sum, groupBy, uniq, badge, docLink, batchName, batchOptions, tabs, pref, today, parseDate, monthName, toast } from '../ui.js';
import { crudView, kpiRow } from '../crud.js';
import { hbars } from '../charts.js';
import { dataTable } from '../table.js';
import { exportWorkbook } from '../io.js';
import { store } from '../store.js';
import { CONFIG } from '../config.js';

/* Daftar kategori & metode bisa diubah di menu Pengaturan → Daftar pilihan */
const KATEGORI_PENGELUARAN = () => store.list('kategori_pengeluaran');
const STATUS = ['Lunas', 'Menunggu Pembayaran', 'Diajukan (Reimburse)', 'Dibatalkan'];
const METODE = () => store.list('metode_bayar');
const yearOf = (d) => (parseDate(d) || { getFullYear: () => '' }).getFullYear();
const years = (rows) => uniq(rows.map(r => yearOf(r.tanggal))).sort().reverse().map(String);

const sections = [
  { title: 'Transaksi', fields: [
    { key: 'tanggal', label: 'Tanggal', type: 'date', required: true, col: 'half', default: () => today() },
    { key: 'kategori', label: 'Kategori', type: 'select', options: KATEGORI_PENGELUARAN, required: true, col: 'half' },
    { key: 'uraian', label: 'Uraian / keperluan', type: 'text', required: true, placeholder: 'mis. Honor praktisi Business Valuation, Okt 2026' },
    { key: 'jumlah', label: 'Jumlah', type: 'money', required: true, col: 'half' },
    { key: 'status', label: 'Status', type: 'select', options: STATUS, col: 'half', default: 'Lunas' },
    { key: 'penerima', label: 'Penerima / vendor', type: 'text', col: 'half' },
    { key: 'metode', label: 'Metode pembayaran', type: 'select', options: METODE, col: 'half', default: 'Transfer Bank' },
    { key: 'batch_id', label: 'Terkait batch', type: 'batch', allowAll: true, col: 'half', placeholder: '— Umum (tidak spesifik) —' },
    { key: 'no_bukti', label: 'No. kwitansi / invoice', type: 'text', col: 'half' },
  ] },
  { title: 'Bukti & catatan', fields: [
    { key: 'bukti', label: 'Bukti pembayaran', type: 'attachment', accept: 'image/*,.pdf', help: 'Unggah foto/PDF kuitansi atau cantumkan tautan Google Drive.' },
    { key: 'catatan', label: 'Catatan', type: 'textarea' },
  ] },
];

const columns = [
  { key: 'tanggal', label: 'Tanggal', render: r => fmtDate(r.tanggal), nowrap: true },
  { key: 'uraian', label: 'Uraian', minWidth: '220px', render: r => h('div', {}, h('span', { class: 'primary' }, r.uraian), h('span', { class: 'secondary' }, r.kategori)) },
  { key: 'kategori', label: 'Kategori', render: null, value: r => r.kategori, export: true, hidden: true },
  { key: 'batch_id', label: 'Batch', value: r => r.batch_id ? batchName(r.batch_id) : 'Umum', nowrap: true },
  { key: 'penerima', label: 'Penerima' },
  { key: 'status', label: 'Status', render: r => badge(r.status) },
  { key: 'jumlah', label: 'Jumlah', align: 'right', money: true, render: r => h('span', { class: 'num' }, fmtIDR(r.jumlah)), value: r => Number(r.jumlah) || 0, nowrap: true },
  { key: 'bukti', label: 'Bukti', sortable: false, render: r => docLink(r.bukti, '–') },
];
const tableCols = columns.filter(c => !c.hidden);
const exportCols = [
  { key: 'tanggal', label: 'Tanggal' }, { key: 'kategori', label: 'Kategori' }, { key: 'uraian', label: 'Uraian' },
  { key: 'jumlah', label: 'Jumlah (Rp)', money: true, value: r => Number(r.jumlah) || 0 }, { key: 'status', label: 'Status' },
  { key: 'penerima', label: 'Penerima / Vendor' }, { key: 'metode', label: 'Metode' },
  { key: 'batch_id', label: 'Batch', value: r => r.batch_id ? batchName(r.batch_id) : 'Umum' }, { key: 'no_bukti', label: 'No. Bukti' },
  { key: 'bukti', label: 'Bukti (link/berkas)' }, { key: 'catatan', label: 'Catatan' },
];

const transaksi = crudView({
  id: 'expenses', collection: 'expenses', noun: 'pengeluaran', title: 'Pengeluaran Divisi IBM', eyebrow: 'Keuangan',
  description: 'Pencatatan seluruh pengeluaran program IBM beserta bukti pendukungnya. Data dapat difilter, diekspor ke Excel/CSV, dan direkapitulasi pada tab Laporan.',
  sections, columns: tableCols, exportColumns: exportCols, exportName: 'Pengeluaran_IBM', sort: { key: 'tanggal', dir: 'desc' },
  searchPlaceholder: 'Cari uraian, penerima, no. bukti…',
  search: r => [r.uraian, r.kategori, r.penerima, r.no_bukti, r.catatan].join(' '),
  filters: [
    { key: 'kategori', label: 'Kategori', options: () => uniq([...KATEGORI_PENGELUARAN(), ...store.all('expenses').map(r => r.kategori)]) },
    { key: 'status', label: 'Status', options: STATUS },
    { key: 'batch_id', label: 'Batch', options: () => [{ value: '__umum', label: 'Umum' }, ...batchOptions(true)], match: (r, v) => v === '__umum' ? !r.batch_id : r.batch_id === v },
    { key: 'tahun', label: 'Tahun', options: () => years(store.all('expenses')), match: (r, v) => String(yearOf(r.tanggal)) === v },
  ],
  kpis: (rows) => {
    const ok = rows.filter(r => r.status !== 'Dibatalkan');
    const now = new Date(); const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return [
      { label: 'Total pengeluaran', value: fmtIDR(sum(ok, 'jumlah')), sub: `${ok.length} transaksi (tanpa yang dibatalkan)`, icon: 'expense', accent: true },
      { label: 'Sudah dibayar', value: fmtIDR(sum(ok.filter(r => r.status === 'Lunas'), 'jumlah')), icon: 'check' },
      { label: 'Menunggu / reimburse', value: fmtIDR(sum(ok.filter(r => r.status !== 'Lunas'), 'jumlah')), sub: `${ok.filter(r => r.status !== 'Lunas').length} transaksi`, icon: 'calendar' },
      { label: 'Bulan ini', value: fmtIDR(sum(ok.filter(r => String(r.tanggal || '').startsWith(ym)), 'jumlah')), icon: 'report' },
    ];
  },
  footer: (rows) => ['Total', '', '', '', '', h('span', { class: 'num' }, fmtIDR(sum(rows.filter(r => r.status !== 'Dibatalkan'), 'jumlah'))), ''],
  emptyTitle: 'Belum ada pengeluaran tercatat', emptyText: 'Tambahkan transaksi secara manual atau impor dari berkas Excel pencatatan yang tersedia.',
});

/* ---------- Laporan ---------- */
function laporan(root) {
  const p = pref.get('lap_exp', { tahun: String(new Date().getFullYear()), trent: true });
  const box = h('div');
  const allYears = () => uniq([...store.all('expenses').map(r => String(yearOf(r.tanggal))), ...store.all('trentPayments').filter(r => r.tanggal_bayar).map(r => String(yearOf(r.tanggal_bayar))), String(new Date().getFullYear())]).sort().reverse();

  function data() {
    const inYear = (d) => p.tahun === 'all' || String(yearOf(d)) === p.tahun;
    const exp = store.all('expenses').filter(r => r.status !== 'Dibatalkan' && inYear(r.tanggal));
    const trent = p.trent ? store.all('trentPayments').filter(r => r.status_bayar === 'Lunas' && r.tanggal_bayar && inYear(r.tanggal_bayar)) : [];
    const lines = [
      ...exp.map(r => ({ tanggal: r.tanggal, kategori: r.kategori || 'Lain-lain', uraian: r.uraian, batch: r.batch_id ? batchName(r.batch_id) : 'Umum', jumlah: Number(r.jumlah) || 0, sumber: 'Pengeluaran divisi', status: r.status })),
      ...trent.map(r => ({ tanggal: r.tanggal_bayar, kategori: 'Pembayaran Trent Global College', uraian: `Trent ${r.trent_code} — ${r.subjek}`, batch: batchName(r.batch_id), jumlah: Number(r.total_idr) || 0, sumber: 'Modul Trent', status: 'Lunas' })),
    ].sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
    return { exp, trent, lines };
  }

  function render() {
    clear(box);
    const { exp, trent, lines } = data();
    const total = sum(lines, 'jumlah');
    const byKat = Object.entries(groupBy(lines, 'kategori')).map(([k, v]) => ({ label: k, value: sum(v, 'jumlah'), n: v.length })).sort((a, b) => b.value - a.value);
    const byBatch = Object.entries(groupBy(lines, 'batch')).map(([k, v]) => ({ label: k, value: sum(v, 'jumlah'), n: v.length })).sort((a, b) => a.label.localeCompare(b.label));
    const byMonth = Object.entries(groupBy(lines, l => String(l.tanggal || '').slice(0, 7))).sort().map(([k, v]) => ({ key: k, label: k ? `${monthName(+k.slice(5, 7) - 1)} ${k.slice(0, 4)}` : 'Tanpa tanggal', ops: sum(v.filter(x => x.sumber !== 'Modul Trent'), 'jumlah'), trent: sum(v.filter(x => x.sumber === 'Modul Trent'), 'jumlah'), n: v.length }));

    const yearSel = h('select', { class: 'select', style: { width: 'auto' }, 'aria-label': 'Tahun laporan' }, h('option', { value: 'all' }, 'Semua tahun'), allYears().map(y => h('option', { value: y }, `Tahun ${y}`)));
    yearSel.value = p.tahun; yearSel.addEventListener('change', () => { p.tahun = yearSel.value; pref.set('lap_exp', p); render(); });
    const trentChk = h('input', { type: 'checkbox' }); trentChk.checked = p.trent;
    trentChk.addEventListener('change', () => { p.trent = trentChk.checked; pref.set('lap_exp', p); render(); });
    const periodLabel = p.tahun === 'all' ? 'Semua periode' : `Tahun ${p.tahun}`;

    box.append(...[
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, 'Keuangan · Laporan'), h('h1', {}, `Laporan Pengeluaran IBM`), h('p', {}, `${periodLabel}. ${p.trent ? 'Termasuk pembayaran Trent Global College yang telah lunas (diambil secara otomatis dari menu Trent).' : 'Hanya pengeluaran operasional divisi.'}`)),
        h('div', { class: 'actions no-print' }, yearSel, h('label', { class: 'check' }, trentChk, 'Sertakan Trent'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => window.print() }, icon('print'), 'Cetak / PDF'),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => exportLaporan(periodLabel, lines, byKat, byMonth, byBatch, total) }, icon('sheet'), 'Ekspor laporan Excel'))),
      kpiRow([
        { label: 'Total pengeluaran', value: fmtIDR(total), sub: periodLabel, icon: 'expense', accent: true },
        { label: 'Operasional divisi', value: fmtIDR(sum(exp, 'jumlah')), sub: `${exp.length} transaksi`, icon: 'wallet' },
        { label: 'Pembayaran Trent', value: fmtIDR(sum(trent, 'total_idr')), sub: p.trent ? `${trent.length} pembayaran lunas` : 'Tidak disertakan', icon: 'handshake' },
        { label: 'Kategori terbesar', small: true, value: byKat[0] ? byKat[0].label : '–', sub: byKat[0] ? `${fmtIDR(byKat[0].value)} · ${Math.round(byKat[0].value / (total || 1) * 100)}%` : '', icon: 'report' },
      ]),
      lines.length ? h('div', { class: 'grid grid-2' },
        h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Per kategori'), h('p', {}, 'Proporsi setiap kategori terhadap total'))),
          h('div', { class: 'card-body' }, hbars(byKat.map(k => ({ label: k.label, value: k.value, display: `${fmtIDR(k.value)} · ${Math.round(k.value / (total || 1) * 100)}%` }))))),
        h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Per batch'), h('p', {}, '“Umum” berarti tidak terkait dengan batch tertentu'))),
          h('div', { class: 'card-body' }, hbars(byBatch.map(k => ({ label: k.label, value: k.value, display: `${fmtIDR(k.value)} · ${k.n} trx` })), { color: 'var(--chart-2)' }))),
      ) : h('div', { class: 'card' }, h('div', { class: 'empty' }, icon('report'), h('h3', {}, 'Belum ada data untuk periode ini'), h('p', {}, 'Silakan pilih tahun lain atau tambahkan transaksi melalui tab Transaksi.'))),
      lines.length ? h('div', { class: 'card', style: { marginTop: '16px' } }, h('div', { class: 'card-head' }, h('h3', {}, 'Rekap per bulan')),
        dataTable({ rows: byMonth, pageSize: Infinity, columns: [
          { key: 'label', label: 'Bulan', main: true, value: m => m.key, render: m => h('b', {}, m.label) },
          { key: 'n', label: 'Transaksi', align: 'right', render: m => h('span', { class: 'num' }, m.n) },
          { key: 'ops', label: 'Operasional', align: 'right', render: m => h('span', { class: 'num' }, fmtIDR(m.ops)) },
          { key: 'trent', label: 'Trent', align: 'right', render: m => h('span', { class: 'num' }, fmtIDR(m.trent)) },
          { key: 'total', label: 'Total', align: 'right', value: m => m.ops + m.trent, render: m => h('b', { class: 'num' }, fmtIDR(m.ops + m.trent)) },
        ], footer: () => ['Total', h('span', { class: 'num' }, lines.length), h('span', { class: 'num' }, fmtIDR(sum(byMonth, 'ops'))), h('span', { class: 'num' }, fmtIDR(sum(byMonth, 'trent'))), h('b', { class: 'num' }, fmtIDR(total))] }).el) : null,
    ].filter(Boolean));
  }
  render();
  root.appendChild(box);
  return { destroy: store.subscribe(render) };
}

function exportLaporan(periode, lines, byKat, byMonth, byBatch, total) {
  const T = (v) => ({ v, bold: true });
  exportWorkbook(`Laporan_Pengeluaran_IBM_${periode.replace(/\s+/g, '_')}`, [
    { name: 'Ringkasan', header: false, numFmt: { 1: 'money' }, rows: [
      [T('LAPORAN PENGELUARAN DIVISI IBM')], [store.setting('profil').nama_divisi + ' — ' + CONFIG.app.org], ['Periode', periode], ['Dibuat', fmtDate(today())], [],
      [T('Ringkasan'), T('Jumlah (Rp)')],
      ['Operasional divisi', sum(lines.filter(l => l.sumber !== 'Modul Trent'), 'jumlah')],
      ['Pembayaran Trent Global College', sum(lines.filter(l => l.sumber === 'Modul Trent'), 'jumlah')],
      [T('TOTAL'), T(total)], [],
      [T('Per kategori'), T('Jumlah (Rp)'), T('Transaksi'), T('Porsi')],
      ...byKat.map(k => [k.label, k.value, k.n, `${Math.round(k.value / (total || 1) * 100)}%`]), [],
      [T('Per batch'), T('Jumlah (Rp)'), T('Transaksi')], ...byBatch.map(k => [k.label, k.value, k.n]),
    ], widths: [42, 20, 12, 10] },
    { name: 'Per Bulan', numFmt: { 2: 'money', 3: 'money', 4: 'money' }, rows: [['Bulan', 'Transaksi', 'Operasional (Rp)', 'Trent (Rp)', 'Total (Rp)'], ...byMonth.map(m => [m.label, m.n, m.ops, m.trent, m.ops + m.trent]), [T('TOTAL'), T(lines.length), T(sum(byMonth, 'ops')), T(sum(byMonth, 'trent')), T(total)]] },
    { name: 'Detail Transaksi', numFmt: { 4: 'money' }, rows: [['Tanggal', 'Kategori', 'Uraian', 'Batch', 'Jumlah (Rp)', 'Sumber', 'Status'], ...lines.map(l => [l.tanggal, l.kategori, l.uraian, l.batch, l.jumlah, l.sumber, l.status])] },
  ]);
}

export default {
  mount(root) {
    let tab = pref.get('tab_exp', 'transaksi'); let inner = null;
    const body = h('div');
    const draw = () => {
      inner && inner.destroy && inner.destroy(); clear(root);
      root.appendChild(tabs([{ id: 'transaksi', label: 'Transaksi' }, { id: 'laporan', label: 'Laporan' }], tab, (t) => { tab = t; pref.set('tab_exp', t); draw(); }));
      clear(body); root.appendChild(body);
      inner = tab === 'laporan' ? laporan(body) : transaksi(body);
    };
    draw();
    return { destroy: () => inner && inner.destroy && inner.destroy() };
  },
};
