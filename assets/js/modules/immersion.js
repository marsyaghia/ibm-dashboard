/* =========================================================================
   10. IMMERSION — tabungan & arus kas program immersion, dipisah per batch.
   Pemilih batch di atas tab berlaku untuk semua tab:
   • Rekap            : ringkasan dana (tabungan + pemasukan lain − pengeluaran),
                        progres tabungan per mahasiswa, pengeluaran per kategori
   • Cicilan          : matriks mahasiswa × cicilan ke-1..n (format sheet "B2 - Cicilan")
   • Log setoran      : tiap setoran tabungan + bukti transfer + verifikasi
   • Kas & pengeluaran: pengeluaran, pemasukan lain (dana fasilitator, dll.),
                        penukaran uang asing, dan rencana anggaran
   • Target           : goal tabungan per batch
   ========================================================================= */
import { h, icon, clear, fmtIDR, fmtNum, fmtDate, fmtDateLong, sum, uniq, pct, badge, docLink, batchName, batches, studentOf, withStudent, today, parseDate, tabPage, batchSelect, firstBatch, pref, toast, openModal, chain, byBatch, byText } from '../ui.js';
import { crudView, kpiRow } from '../crud.js';
import { dataTable } from '../table.js';
import { hbars } from '../charts.js';
import { exportWorkbook } from '../io.js';
import { store } from '../store.js';

const STATUS_SETOR = ['Terverifikasi', 'Menunggu verifikasi', 'Ditolak'];
const JENIS_KAS = ['Pengeluaran', 'Pemasukan lain', 'Penukaran uang'];
const STATUS_KAS = ['Realisasi', 'Rencana'];
const MATA_UANG = ['IDR', 'JPY', 'SGD', 'MYR', 'USD', 'KRW', 'THB'];
const SIMBOL = { IDR: 'Rp', JPY: '¥', SGD: 'S$', MYR: 'RM', USD: 'US$', KRW: '₩', THB: '฿' };
const METODE = () => store.list('metode_bayar');
const KATEGORI = () => store.list('kategori_immersion');
const verified = (rows) => rows.filter(r => (r.status || 'Terverifikasi') === 'Terverifikasi');
const aktif = (s) => !/non-aktif|mengundurkan|drop|lulus/i.test(s.status_mhs || '');
const own = (r, s) => r.student_id === s.id || (!!r.nim && !!s.nim && String(r.nim) === String(s.nim)) || (!r.student_id && !!r.nama_mahasiswa && r.nama_mahasiswa.toLowerCase().trim() === s.nama.toLowerCase().trim());
const toneSetor = (s) => ({ Terverifikasi: 'ok', 'Menunggu verifikasi': 'warn', Ditolak: 'bad' }[s] || '');
const jenisOf = (r) => r.jenis || 'Pengeluaran';
const statusKas = (r) => r.status || 'Realisasi';
const isOut = (r) => jenisOf(r) === 'Pengeluaran';
const isIn = (r) => jenisOf(r) === 'Pemasukan lain';
const toneJenis = (j) => ({ Pengeluaran: 'bad', 'Pemasukan lain': 'ok', 'Penukaran uang': '' }[j] || '');
const fmtAsing = (r) => r.mata_uang && r.mata_uang !== 'IDR' && r.nominal_asing ? `${SIMBOL[r.mata_uang] || r.mata_uang} ${fmtNum(r.nominal_asing)}${r.kurs ? ` × ${fmtNum(r.kurs, 2)}` : ''}` : '';

/* ---------- Batch aktif (berlaku di semua tab) — bawaan Batch 1 bila belum dipilih ---------- */
function currentBatch() {
  const bid = pref.get('imm_batch2', '');
  return store.get('batches', bid) ? bid : firstBatch();
}

/** Target aktif sebuah batch */
export function targetOf(batchId) {
  const ts = store.all('immersionTargets').filter(t => t.batch_id === batchId);
  return ts.find(t => (t.status || 'Aktif') === 'Aktif') || ts.sort((a, b) => String(b.tenggat).localeCompare(String(a.tenggat)))[0] || null;
}
/** Urutan cicilan: pakai kolom cicilan_ke, bila kosong diurutkan dari tanggal */
function withCicilan(list) {
  const sorted = [...list].sort((a, b) => String(a.tanggal || '').localeCompare(String(b.tanggal || '')));
  let n = 0; return sorted.map(r => { n = Math.max(n + 1, Number(r.cicilan_ke) || 0); return { ...r, _ke: Number(r.cicilan_ke) || n }; });
}
/** Progres tabungan & arus kas satu batch */
export function batchProgress(batchId) {
  const t = targetOf(batchId); const goal = Number(t && t.target_per_mahasiswa) || 0;
  const sav = store.all('immersionSavings').filter(r => r.batch_id === batchId);
  const studs = store.all('students').filter(s => s.batch_id === batchId && (aktif(s) || sav.some(r => own(r, s)))).sort((a, b) => a.nama.localeCompare(b.nama));
  const rows = studs.map(s => {
    const mine = withCicilan(sav.filter(r => own(r, s))); const ok = verified(mine);
    const terkumpul = sum(ok, 'jumlah'); const kurang = Math.max(0, goal - terkumpul);
    const last = mine.map(r => r.tanggal).filter(Boolean).sort().pop() || '';
    return { s, mine, n: ok.length, pending: mine.filter(r => r.status === 'Menunggu verifikasi'), terkumpul, kurang, persen: goal ? Math.min(100, Math.round(terkumpul / goal * 100)) : null, last };
  });
  const kas = store.all('immersionExpenses').filter(r => r.batch_id === batchId);
  const real = kas.filter(r => statusKas(r) === 'Realisasi');
  const total = sum(rows, 'terkumpul');
  const masukLain = sum(real.filter(isIn), 'jumlah');
  const terpakai = sum(real.filter(isOut), 'jumlah');
  const rencana = sum(kas.filter(r => statusKas(r) === 'Rencana' && isOut(r)), 'jumlah');
  return { target: t, goal, rows, total, targetTotal: goal * rows.length, kurang: sum(rows, 'kurang'), masukLain, terpakai, rencana, saldo: total + masukLain - terpakai, pending: sav.filter(r => r.status === 'Menunggu verifikasi'), kas, real, sav };
}
const statusMhs = (x, goal) => !goal ? 'Target belum diatur' : x.terkumpul >= goal ? 'Tercapai' : x.terkumpul > 0 ? 'Belum tercapai' : 'Belum menabung';
const progressCell = (p) => p === null ? h('span', { class: 'muted' }, '–') : h('div', { class: 'progress-cell' }, h('small', {}, `${p}%`), h('div', { class: `meter ${p >= 100 ? 'ok' : p >= 50 ? '' : 'warn'}` }, h('i', { style: { width: `${p}%` } })));

/* ---------- Riwayat setoran satu mahasiswa ---------- */
function studentLog(x, P, go) {
  const list = [...x.mine].sort((a, b) => b._ke - a._ke);
  const body = h('div', { class: 'stack' },
    kpiRow([
      { label: 'Terkumpul', value: fmtIDR(x.terkumpul), sub: `${x.n} setoran terverifikasi`, icon: 'piggy', accent: true },
      { label: 'Kurang', value: fmtIDR(x.kurang), sub: P.goal ? `dari target ${fmtIDR(P.goal)}` : 'target belum diatur', icon: 'alert', meter: x.persen ?? 0, meterTone: 'ok' },
    ]),
    list.length ? dataTable({ rows: list, pageSize: Infinity, compact: true, columns: [
      { key: '_ke', label: 'Cicilan', main: true, render: r => h('b', {}, `Cicilan ${r._ke}`) },
      { key: 'tanggal', label: 'Tanggal', render: r => fmtDate(r.tanggal), nowrap: true },
      { key: 'jumlah', label: 'Jumlah', align: 'right', render: r => h('span', { class: 'num' }, fmtIDR(r.jumlah)) },
      { key: 'status', label: 'Status', render: r => badge(r.status || 'Terverifikasi', toneSetor(r.status || 'Terverifikasi')) },
      { key: 'bukti', label: 'Bukti TF', sortable: false, render: r => docLink(r.bukti, '') },
    ] }).el : h('div', { class: 'empty' }, icon('piggy'), h('h3', {}, 'Belum ada setoran'), h('p', {}, 'Silakan catat setoran pertama untuk mahasiswa ini.')));
  const add = h('button', { class: 'btn btn-primary', type: 'button' }, icon('plus'), 'Catat setoran');
  const { close } = openModal({ title: x.s.nama, subtitle: `${batchName(x.s.batch_id)}${x.s.nim ? ' · ' + x.s.nim : ''} · Tabungan immersion`, body, size: 'lg', footer: [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => close() }, 'Tutup'), add] });
  add.addEventListener('click', () => { close(); go('setoran', { batch_id: x.s.batch_id, student_id: x.s.id, cicilan_ke: (x.mine.reduce((m, r) => Math.max(m, r._ke), 0) + 1) }); });
}

/* ---------- Ekspor rekap satu batch (format sheet rekap) ---------- */
function exportBatch(bid) {
  const P = batchProgress(bid); const maxN = Math.max(1, ...P.rows.map(x => x.mine.length ? Math.max(...x.mine.map(r => r._ke)) : 0));
  const cic = Array.from({ length: maxN }, (_, i) => i + 1);
  exportWorkbook(`Rekap_Immersion_${batchName(bid)}`.replace(/\W+/g, '_'), [
    { name: 'Cicilan', rows: [['No', 'Nama Mahasiswa', 'NIM', ...cic.map(i => `Cicilan ${i}`), 'Total (Rp)', 'Target (Rp)', 'Kurang (Rp)', 'Status'],
      ...P.rows.map((x, i) => [i + 1, x.s.nama, x.s.nim || '', ...cic.map(k => sum(verified(x.mine.filter(r => r._ke === k)), 'jumlah') || ''), x.terkumpul, P.goal || '', P.goal ? x.kurang : '', statusMhs(x, P.goal)]),
      ['', 'TOTAL', '', ...cic.map(k => sum(P.rows, x => sum(verified(x.mine.filter(r => r._ke === k)), 'jumlah'))), P.total, P.targetTotal || '', P.goal ? P.kurang : '', '']] },
    { name: 'Log Setoran', rows: [['Tanggal', 'Mahasiswa', 'NIM', 'Cicilan ke', 'Jumlah (Rp)', 'Metode', 'Status', 'Bukti', 'Catatan'],
      ...[...P.sav].sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal))).map(r => [r.tanggal || '', studentOf(r), r.nim || '', r.cicilan_ke || '', Number(r.jumlah) || 0, r.metode || '', r.status || '', r.bukti ? (r.bukti.link || (r.bukti.file && r.bukti.file.name) || '') : '', r.catatan || ''])] },
    { name: 'Kas & Pengeluaran', rows: [['Tanggal', 'Jenis', 'Status', 'Kategori', 'Uraian', 'Vendor / Invoice', 'Pax', 'Mata uang', 'Nominal asing', 'Kurs', 'Jumlah (Rp)', 'Atas nama', 'Catatan'],
      ...[...P.kas].sort((a, b) => String(a.tanggal || '9').localeCompare(String(b.tanggal || '9'))).map(r => [r.tanggal || '', jenisOf(r), statusKas(r), r.kategori || '', r.uraian || '', r.vendor || '', r.pax || '', r.mata_uang || '', Number(r.nominal_asing) || '', Number(r.kurs) || '', r.jumlah === null || r.jumlah === undefined || r.jumlah === '' ? '' : Number(r.jumlah), r.student_id || r.nama_mahasiswa ? studentOf(r) : 'Kolektif', r.catatan || ''])] },
    { name: 'Ringkasan', rows: [['Komponen', 'Jumlah (Rp)'], ['Tabungan mahasiswa (terverifikasi)', P.total], ['Pemasukan lain', P.masukLain], ['Pengeluaran (realisasi)', P.terpakai], ['Saldo', P.saldo], ['Rencana pengeluaran (belum realisasi)', P.rencana]] },
  ]);
}

/* =================== Rekap =================== */
function rekap(root, go, bid) {
  const box = h('div');
  function render() {
    clear(box);
    const P = batchProgress(bid); const t = P.target;
    const sisaHari = t && t.tenggat ? Math.ceil((parseDate(t.tenggat) - parseDate(today())) / 864e5) : null;
    const byKat = Object.entries(P.real.filter(isOut).reduce((m, r) => { const k = r.kategori || 'Lainnya'; m[k] = (m[k] || 0) + (Number(r.jumlah) || 0); return m; }, {})).sort((a, b) => b[1] - a[1]);
    const allB = batches().map(b => ({ b, P: batchProgress(b.id) })).filter(x => x.P.target || x.P.total || x.P.kas.length);
    const noSav = !P.sav.length;

    box.append(...[
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, `Program · Immersion · ${batchName(bid)}`), h('h1', {}, t ? t.program || 'Immersion' : `Immersion ${batchName(bid)}`),
          h('p', {}, t ? [t.destinasi, P.goal ? `target ${fmtIDR(P.goal)} per mahasiswa` : null, t.tenggat ? `tenggat ${fmtDateLong(t.tenggat)}${sisaHari !== null && t.status !== 'Selesai' ? (sisaHari >= 0 ? ` (${sisaHari} hari lagi)` : ' (lewat tenggat)') : ''}` : null, t.status === 'Selesai' ? 'program selesai' : null].filter(Boolean).join(' · ') + '.' : 'Target tabungan batch ini belum ditetapkan. Silakan tambahkan melalui tab Target.')),
        h('div', { class: 'actions no-print' },
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => exportBatch(bid) }, icon('sheet'), 'Ekspor rekap'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => go('kas', { batch_id: bid }) }, icon('expense'), 'Catat kas'),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => go('setoran', { batch_id: bid }) }, icon('plus'), 'Catat setoran'))),
      !t ? h('div', { class: 'note warn' }, icon('alert'), h('div', {}, 'Batch ini belum memiliki target tabungan. ', h('button', { class: 'doc-link', type: 'button', onclick: () => go('target', { batch_id: bid }) }, 'Atur target sekarang'))) : null,
      t && !P.goal ? h('div', { class: 'note' }, icon('info'), h('div', {}, 'Target per mahasiswa belum diisi sehingga kekurangan setiap mahasiswa belum dapat dihitung. ', h('button', { class: 'doc-link', type: 'button', onclick: () => go('target') }, 'Lengkapi target'))) : null,
      kpiRow([
        { label: 'Tabungan terkumpul', value: fmtIDR(P.total), sub: P.targetTotal ? `${P.rows.filter(x => x.terkumpul >= P.goal).length} dari ${P.rows.length} mahasiswa lunas · target ${fmtIDR(P.targetTotal)}` : `${P.sav.length} setoran tercatat`, meter: P.targetTotal ? pct(P.total, P.targetTotal) : undefined, meterTone: 'ok', icon: 'piggy', accent: true },
        { label: 'Pemasukan lain', value: fmtIDR(P.masukLain), sub: 'mis. dana fasilitator / sponsor', icon: 'income' },
        { label: 'Pengeluaran (realisasi)', value: fmtIDR(P.terpakai), sub: P.rencana ? `rencana belum realisasi ${fmtIDR(P.rencana)}` : `${P.real.filter(isOut).length} transaksi`, icon: 'expense' },
        { label: 'Saldo dana', value: fmtIDR(P.saldo), sub: 'tabungan + pemasukan lain − pengeluaran', icon: 'wallet' },
      ]),
      P.pending.length ? h('div', { class: 'note warn' }, icon('clock'), h('div', {}, `${P.pending.length} setoran (${fmtIDR(sum(P.pending, 'jumlah'))}) menunggu verifikasi dan belum dihitung. `, h('button', { class: 'doc-link', type: 'button', onclick: () => { pref.set(`filters_immersionSavings_${bid}`, { status: 'Menunggu verifikasi' }); go('setoran'); } }, 'Verifikasi sekarang'))) : null,
      noSav && P.kas.length ? h('div', { class: 'note' }, icon('info'), h('div', {}, `${batchName(bid)} belum memiliki log setoran per mahasiswa. Dana mahasiswa dicatat sebagai pemasukan di tab Kas & pengeluaran.`)) : null,
      h('div', { class: byKat.length && !noSav ? 'grid grid-main imm-split' : 'stack' },
        noSav ? null : h('div', { class: 'card' },
          h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Progres tabungan per mahasiswa'), h('p', {}, 'Pilih nama mahasiswa untuk melihat riwayat cicilan. Hanya setoran terverifikasi yang diperhitungkan.'))),
          dataTable({ rows: P.rows, pageSize: Infinity, order: byText(x => x.s.nama), onRowClick: x => studentLog(x, P, go),
            emptyNode: h('div', { class: 'empty' }, icon('users'), h('h3', {}, 'Belum ada mahasiswa aktif di batch ini')),
            columns: [
              { key: 'nama', label: 'Mahasiswa', main: true, value: x => x.s.nama, render: x => h('div', {}, h('span', { class: 'primary' }, x.s.nama), h('span', { class: 'secondary' }, [x.s.nim, x.last ? `terakhir ${fmtDate(x.last)}` : 'belum ada setoran'].filter(Boolean).join(' · '))) },
              { key: 'n', label: 'Cicilan', align: 'right', value: x => x.n, render: x => h('span', { class: 'num' }, `${x.n}×${x.pending.length ? ` (+${x.pending.length})` : ''}`) },
              { key: 'terkumpul', label: 'Terkumpul', align: 'right', value: x => x.terkumpul, render: x => h('span', { class: 'num' }, fmtIDR(x.terkumpul)) },
              { key: 'kurang', label: 'Kurang', align: 'right', value: x => x.kurang, render: x => x.kurang ? h('b', { class: 'num', style: { color: 'var(--warn)' } }, fmtIDR(x.kurang)) : h('span', { class: 'num' }, P.goal ? 'Lunas' : '–') },
              { key: 'persen', label: 'Progres', value: x => x.persen ?? -1, render: x => progressCell(x.persen) },
            ],
            footer: (rows) => ['Total', h('span', { class: 'num' }, sum(rows, 'n')), h('span', { class: 'num' }, fmtIDR(sum(rows, 'terkumpul'))), h('span', { class: 'num' }, fmtIDR(sum(rows, 'kurang'))), P.targetTotal ? `${pct(P.total, P.targetTotal)}%` : ''],
          }).el),
        byKat.length ? h('div', { class: 'card' },
          h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Pengeluaran per kategori'), h('p', {}, `Realisasi · total ${fmtIDR(P.terpakai)}`)),
            h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => go('kas') }, 'Lihat rincian')),
          h('div', { class: 'card-body' }, hbars(byKat.map(([label, value]) => ({ label, value, display: `${fmtIDR(value)} · ${pct(value, P.terpakai)}%` }))))) : null,
      ),
      allB.length > 1 ? h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Perbandingan antarbatch'), h('p', {}, 'Dana terkumpul (tabungan + pemasukan lain) dan pengeluaran realisasi tiap batch'))),
        dataTable({ rows: allB, pageSize: Infinity, compact: true, onRowClick: x => { pref.set('imm_batch2', x.b.id); go('rekap'); },
          columns: [
            { key: 'b', label: 'Batch', main: true, value: x => x.b.angkatan, render: x => h('div', {}, h('span', { class: 'primary' }, x.b.nama), h('span', { class: 'secondary' }, (x.P.target && x.P.target.program) || '–')) },
            { key: 'masuk', label: 'Dana masuk', align: 'right', value: x => x.P.total + x.P.masukLain, render: x => h('span', { class: 'num' }, fmtIDR(x.P.total + x.P.masukLain)) },
            { key: 'keluar', label: 'Pengeluaran', align: 'right', value: x => x.P.terpakai, render: x => h('span', { class: 'num' }, fmtIDR(x.P.terpakai)) },
            { key: 'saldo', label: 'Saldo', align: 'right', value: x => x.P.saldo, render: x => h('b', { class: 'num' }, fmtIDR(x.P.saldo)) },
            { key: 'prog', label: 'Tabungan vs target', value: x => x.P.targetTotal ? pct(x.P.total, x.P.targetTotal) : -1, render: x => progressCell(x.P.targetTotal ? Math.min(100, pct(x.P.total, x.P.targetTotal)) : null) },
            { key: 'st', label: 'Status', value: x => (x.P.target || {}).status || '', render: x => badge((x.P.target || {}).status || '') },
          ] }).el) : null,
    ].filter(Boolean));
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe(render) };
}

/* =================== Cicilan (matriks) =================== */
function cicilan(root, go, bid) {
  const box = h('div');
  function render() {
    clear(box);
    const P = batchProgress(bid);
    const maxN = Math.max(1, ...P.rows.map(x => x.mine.length ? Math.max(...x.mine.map(r => r._ke)) : 0));
    const cols = Array.from({ length: maxN }, (_, i) => i + 1);
    const cell = (x, k) => {
      const list = x.mine.filter(r => r._ke === k); if (!list.length) return h('span', { class: 'muted cic-empty' }, '–');
      const r = list[0]; const ok = (r.status || 'Terverifikasi') === 'Terverifikasi';
      return h('div', { class: 'cic-cell', title: `${r.tanggal ? fmtDateLong(r.tanggal) : 'Tanpa tanggal'}${r.metode ? ' · ' + r.metode : ''}${ok ? '' : ' · ' + r.status}` },
        h('span', { class: `num ${ok ? '' : 'muted'}` }, fmtNum(sum(list, 'jumlah'))),
        h('small', {}, r.tanggal ? fmtDate(r.tanggal).replace(/ \d{4}$/, '') : '–', ok ? null : ' ⏳'));
    };
    box.append(
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, `Program · Immersion · ${batchName(bid)}`), h('h1', {}, 'Cicilan Tabungan'),
          h('p', {}, `Setoran tiap mahasiswa per cicilan, mengikuti format sheet rekap. ${P.goal ? `Target ${fmtIDR(P.goal)} per mahasiswa.` : 'Target per mahasiswa belum diatur.'}`)),
        h('div', { class: 'actions no-print' },
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => exportBatch(bid) }, icon('sheet'), 'Ekspor Excel'),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => go('setoran', { batch_id: bid }) }, icon('plus'), 'Catat cicilan'))),
      kpiRow([
        { label: 'Total terkumpul', value: fmtIDR(P.total), sub: P.targetTotal ? `${pct(P.total, P.targetTotal)}% dari ${fmtIDR(P.targetTotal)}` : `${P.rows.length} mahasiswa`, icon: 'piggy', accent: true, meter: P.targetTotal ? pct(P.total, P.targetTotal) : undefined, meterTone: 'ok' },
        { label: 'Sudah menabung', value: `${P.rows.filter(x => x.n).length} / ${P.rows.length}`, sub: 'mahasiswa', icon: 'users' },
        { label: 'Lunas', value: P.goal ? `${P.rows.filter(x => x.terkumpul >= P.goal).length}` : '–', sub: P.goal ? 'mencapai target' : 'target belum diatur', icon: 'check' },
        { label: 'Rata-rata cicilan', value: fmtIDR(P.sav.length ? Math.round(sum(verified(P.sav), 'jumlah') / Math.max(1, verified(P.sav).length)) : 0), sub: `${verified(P.sav).length} setoran`, icon: 'calendar' },
      ]),
      h('div', { class: 'card' },
        h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, `Matriks cicilan · ${batchName(bid)}`), h('p', {}, 'Nominal dalam Rupiah untuk setiap cicilan (ke-1, ke-2, dst.) beserta tanggal setor. Pilih baris untuk melihat rincian dan menambahkan cicilan. Nominal berwarna abu-abu dengan tanda ⏳ belum terverifikasi.'))),
        dataTable({ rows: P.rows, pageSize: Infinity, compact: true, className: 'cicilan', onRowClick: x => studentLog(x, P, go),
          emptyNode: h('div', { class: 'empty' }, icon('piggy'), h('h3', {}, 'Belum ada data cicilan'), h('p', {}, 'Silakan catat setoran pertama atau impor dari sheet rekap.')),
          columns: [
            { key: 'nama', label: 'Mahasiswa', main: true, value: x => x.s.nama, render: x => h('div', {}, h('span', { class: 'primary' }, x.s.nama), x.s.nim ? h('span', { class: 'secondary' }, x.s.nim) : null) },
            ...cols.map(k => ({ key: `c${k}`, label: `Ke-${k}`, align: 'right', value: x => sum(x.mine.filter(r => r._ke === k), 'jumlah'), render: x => cell(x, k) })),
            { key: 'terkumpul', label: 'Total', align: 'right', value: x => x.terkumpul, render: x => h('b', { class: 'num' }, fmtIDR(x.terkumpul)) },
            { key: 'kurang', label: 'Kurang', align: 'right', value: x => x.kurang, render: x => !P.goal ? h('span', { class: 'muted' }, '–') : x.kurang ? h('span', { class: 'num', style: { color: 'var(--warn)' } }, fmtIDR(x.kurang)) : badge('Lunas', 'ok') },
          ],
          footer: (rows) => ['Total', ...cols.map(k => h('span', { class: 'num' }, fmtNum(sum(rows, x => sum(verified(x.mine.filter(r => r._ke === k)), 'jumlah'))))), h('b', { class: 'num' }, fmtIDR(sum(rows, 'terkumpul'))), P.goal ? h('span', { class: 'num' }, fmtIDR(sum(rows, 'kurang'))) : ''],
        }).el));
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe(render) };
}

/* =================== Log setoran =================== */
const setoranCfg = (bid) => ({
  id: `immersionSavings_${bid}`, collection: 'immersionSavings', noun: 'setoran', title: 'Log Setoran Tabungan', eyebrow: `Program · Immersion · ${batchName(bid)}`,
  description: 'Pencatatan setiap setoran tabungan immersion, meliputi urutan cicilan, tanggal, jumlah, dan bukti transfer. Setoran baru berstatus “Menunggu verifikasi” hingga diperiksa oleh Tim IBM; hanya setoran terverifikasi yang masuk ke rekap.',
  rowsFilter: (rows) => rows.filter(r => r.batch_id === bid),
  sections: [
    { title: 'Setoran', fields: [
      { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'half' },
      { key: 'tanggal', label: 'Tanggal setor', type: 'date', required: true, col: 'half', default: () => today() },
      { key: 'student_id', label: 'Mahasiswa', type: 'student', batchKey: 'batch_id', required: true },
      { key: 'cicilan_ke', label: 'Cicilan ke-', type: 'number', min: 1, col: 'third', help: 'Kosongkan untuk mengisi nomor berikutnya secara otomatis' },
      { key: 'jumlah', label: 'Jumlah setoran', type: 'money', required: true, col: 'third' },
      { key: 'metode', label: 'Metode', type: 'select', options: METODE, col: 'third', default: 'Transfer Bank' },
      { key: 'status', label: 'Status verifikasi', type: 'select', options: STATUS_SETOR, col: 'half', default: 'Menunggu verifikasi' },
    ] },
    { title: 'Bukti transfer', fields: [
      { key: 'bukti', label: 'Bukti transfer', type: 'attachment', accept: 'image/*,.pdf', help: 'Unggah foto/PDF bukti transfer atau cantumkan tautan Google Drive.' },
      { key: 'catatan', label: 'Catatan', type: 'textarea', rows: 2 },
    ] },
  ],
  beforeSave: (rec) => {
    const r = withStudent(rec);
    if (!r.cicilan_ke && r.student_id) r.cicilan_ke = store.all('immersionSavings').filter(x => x.id !== r.id && x.batch_id === r.batch_id && x.student_id === r.student_id).reduce((m, x) => Math.max(m, Number(x.cicilan_ke) || 0), 0) + 1;
    return r;
  },
  columns: [
    { key: 'tanggal', label: 'Tanggal', render: r => fmtDate(r.tanggal), nowrap: true },
    { key: 'mhs', label: 'Mahasiswa', main: true, value: r => studentOf(r), render: r => h('div', {}, h('span', { class: 'primary' }, studentOf(r)), h('span', { class: 'secondary' }, [r.nim, r.cicilan_ke ? `cicilan ${r.cicilan_ke}` : null].filter(Boolean).join(' · '))) },
    { key: 'jumlah', label: 'Jumlah', align: 'right', money: true, value: r => Number(r.jumlah) || 0, render: r => h('span', { class: 'num' }, fmtIDR(r.jumlah)), nowrap: true },
    { key: 'metode', label: 'Metode' },
    { key: 'status', label: 'Status', render: r => badge(r.status || 'Terverifikasi', toneSetor(r.status || 'Terverifikasi')) },
    { key: 'bukti', label: 'Bukti TF', sortable: false, render: r => docLink(r.bukti, 'Belum ada') },
  ],
  exportColumns: [
    { key: 'tanggal', label: 'Tanggal' }, { key: 'batch_id', label: 'Batch', value: r => batchName(r.batch_id) }, { key: 'mhs', label: 'Mahasiswa', value: r => studentOf(r) }, { key: 'nim', label: 'NIM' }, { key: 'cicilan_ke', label: 'Cicilan ke' },
    { key: 'jumlah', label: 'Jumlah (Rp)', money: true, value: r => Number(r.jumlah) || 0 }, { key: 'metode', label: 'Metode' }, { key: 'status', label: 'Status' }, { key: 'bukti', label: 'Bukti' }, { key: 'catatan', label: 'Catatan' },
  ],
  exportName: `Setoran_Immersion_${batchName(bid)}`, sort: { key: 'tanggal', dir: 'desc' },
  searchPlaceholder: 'Cari mahasiswa, NIM, catatan…', search: r => [studentOf(r), r.nim, r.catatan, r.metode].join(' '),
  filters: [
    { key: 'student_id', label: 'Mahasiswa', options: () => store.all('students').filter(s => s.batch_id === bid).sort((a, b) => a.nama.localeCompare(b.nama)).map(s => ({ value: s.id, label: s.nama })) },
    { key: 'status', label: 'Status', options: STATUS_SETOR, match: (r, v) => (r.status || 'Terverifikasi') === v },
    { key: 'bulan', label: 'Bulan', options: () => uniq(store.all('immersionSavings').filter(r => r.batch_id === bid).map(r => String(r.tanggal || '').slice(0, 7))).sort().reverse(), match: (r, v) => String(r.tanggal || '').startsWith(v) },
  ],
  defaults: () => ({ batch_id: bid, status: 'Menunggu verifikasi', metode: 'Transfer Bank', tanggal: today() }),
  rowExtra: (r) => r.status === 'Menunggu verifikasi' ? [h('button', { class: 'btn btn-ghost btn-sm', type: 'button', title: 'Tandai terverifikasi', onclick: async (e) => { e.stopPropagation(); await store.save('immersionSavings', { ...r, status: 'Terverifikasi' }); toast('Setoran diverifikasi.', 'ok'); } }, icon('check', 'sm'), 'Verifikasi')] : [],
  kpis: (rows) => {
    const ok = verified(rows); const ym = today().slice(0, 7); const pend = rows.filter(r => r.status === 'Menunggu verifikasi');
    return [
      { label: 'Total terverifikasi', value: fmtIDR(sum(ok, 'jumlah')), sub: `${ok.length} setoran`, icon: 'piggy', accent: true },
      { label: 'Menunggu verifikasi', value: pend.length, sub: fmtIDR(sum(pend, 'jumlah')), icon: 'clock' },
      { label: 'Setoran bulan ini', value: fmtIDR(sum(ok.filter(r => String(r.tanggal || '').startsWith(ym)), 'jumlah')), icon: 'calendar' },
      { label: 'Tanpa bukti TF', value: rows.filter(r => !r.bukti || !(r.bukti.link || r.bukti.file)).length, sub: 'perlu dilengkapi', icon: 'alert' },
    ];
  },
  footer: (rows) => ['Total', '', h('span', { class: 'num' }, fmtIDR(sum(verified(rows), 'jumlah'))), '', '', ''],
  aliases: { student_id: ['Nama', 'Nama Mahasiswa', 'Mahasiswa'], jumlah: ['Nominal', 'Setoran'], tanggal: ['Tanggal Setor', 'Tanggal Transfer'], cicilan_ke: ['Cicilan', 'Cicilan ke', 'Cicilan Ke-'] },
  importNote: 'Kolom yang digunakan: Tanggal, Batch, Nama/NIM mahasiswa, Cicilan ke, Jumlah, Metode, Status, dan Bukti (tautan). Data mahasiswa dicocokkan secara otomatis berdasarkan NIM atau nama.',
  emptyTitle: `Belum ada setoran ${batchName(bid)}`, emptyText: 'Catat setoran tabungan immersion mahasiswa beserta bukti transfernya.',
});

/* =================== Kas & pengeluaran =================== */
const kasCfg = (bid) => ({
  id: `immersionExpenses_${bid}`, collection: 'immersionExpenses', noun: 'transaksi kas', title: 'Kas & Pengeluaran Immersion', eyebrow: `Program · Immersion · ${batchName(bid)}`,
  description: 'Arus dana immersion yang meliputi pengeluaran (tiket, akomodasi, konsumsi, dan lainnya), pemasukan lain (dana fasilitator, sponsor), serta penukaran mata uang asing. Gunakan status “Rencana” untuk anggaran yang belum dibayarkan.',
  rowsFilter: (rows) => rows.filter(r => r.batch_id === bid),
  addLabel: 'Tambah transaksi',
  sections: [
    { title: 'Transaksi', fields: [
      { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'half' },
      { key: 'tanggal', label: 'Tanggal', type: 'date', col: 'half', default: () => today() },
      { key: 'jenis', label: 'Jenis', type: 'radio', options: JENIS_KAS, required: true, default: 'Pengeluaran' },
      { key: 'status', label: 'Status', type: 'radio', options: STATUS_KAS, default: 'Realisasi', help: 'Status “Rencana” tidak mengurangi saldo.' },
      { key: 'kategori', label: 'Kategori', type: 'select', options: () => uniq([...KATEGORI(), ...store.all('immersionExpenses').map(r => r.kategori)]), required: true, col: 'half' },
      { key: 'vendor', label: 'Vendor / invoice', type: 'text', col: 'half', placeholder: 'mis. Scoot, Airbnb, ICOCA' },
      { key: 'uraian', label: 'Uraian', type: 'text', required: true, placeholder: 'mis. Tiket pesawat Surabaya–Osaka (PP) 20 pax' },
      { key: 'pax', label: 'Pax', type: 'number', min: 0, col: 'third' },
      { key: 'student_id', label: 'Atas nama mahasiswa (opsional)', type: 'student', batchKey: 'batch_id', placeholder: '— Kolektif (seluruh batch) —', col: 'half' },
    ] },
    { title: 'Nominal', note: 'Untuk transaksi dalam mata uang asing, isi nominal asing dan kurs. Jumlah dalam Rupiah akan dihitung secara otomatis apabila dikosongkan.', fields: [
      { key: 'mata_uang', label: 'Mata uang', type: 'select', options: MATA_UANG, col: 'third', default: 'IDR' },
      { key: 'nominal_asing', label: 'Nominal asing', type: 'decimal', prefix: '', col: 'third' },
      { key: 'kurs', label: 'Kurs ke Rupiah', type: 'decimal', prefix: 'Rp', col: 'third' },
      { key: 'jumlah', label: 'Jumlah (Rupiah)', type: 'money', col: 'half' },
    ] },
    { title: 'Bukti', fields: [
      { key: 'bukti', label: 'Bukti / invoice', type: 'attachment', accept: 'image/*,.pdf' },
      { key: 'catatan', label: 'Catatan', type: 'textarea', rows: 2 },
    ] },
  ],
  beforeSave: (rec) => {
    const r = withStudent(rec);
    if ((r.jumlah === '' || r.jumlah === null || r.jumlah === undefined) && r.mata_uang && r.mata_uang !== 'IDR' && r.nominal_asing && r.kurs) r.jumlah = Math.round(Number(r.nominal_asing) * Number(r.kurs));
    if (r.mata_uang === 'IDR') { r.nominal_asing = ''; r.kurs = ''; }
    return r;
  },
  columns: [
    { key: 'tanggal', label: 'Tanggal', value: r => r.tanggal || '', render: r => r.tanggal ? fmtDate(r.tanggal) : h('span', { class: 'muted' }, '–'), nowrap: true },
    { key: 'uraian', label: 'Uraian', main: true, render: r => h('div', {}, h('span', { class: 'primary' }, r.uraian || r.kategori), h('span', { class: 'secondary' }, [r.kategori, r.vendor, r.pax ? `${r.pax} pax` : null, r.student_id || r.nama_mahasiswa ? studentOf(r) : null].filter(Boolean).join(' · '))) },
    { key: 'jenis', label: 'Jenis', value: r => jenisOf(r), render: r => h('div', { class: 'badges' }, badge(jenisOf(r), toneJenis(jenisOf(r))), statusKas(r) === 'Rencana' ? badge('Rencana', 'warn') : null) },
    { key: 'asing', label: 'Mata uang asing', value: r => Number(r.nominal_asing) || 0, render: r => fmtAsing(r) ? h('span', { class: 'num' }, fmtAsing(r)) : h('span', { class: 'muted' }, '–'), nowrap: true },
    { key: 'jumlah', label: 'Jumlah (Rp)', align: 'right', money: true, value: r => Number(r.jumlah) || 0, render: r => r.jumlah === null || r.jumlah === undefined || r.jumlah === '' ? h('span', { class: 'muted' }, '–') : h('span', { class: 'num', style: { color: isIn(r) ? 'var(--ok)' : statusKas(r) === 'Rencana' ? 'var(--muted)' : null } }, `${isIn(r) ? '+' : isOut(r) ? '−' : ''}${fmtIDR(r.jumlah)}`), nowrap: true },
    { key: 'bukti', label: 'Bukti', sortable: false, render: r => docLink(r.bukti, '') },
  ],
  exportColumns: [
    { key: 'tanggal', label: 'Tanggal' }, { key: 'batch_id', label: 'Batch', value: r => batchName(r.batch_id) }, { key: 'jenis', label: 'Jenis', value: r => jenisOf(r) }, { key: 'status', label: 'Status', value: r => statusKas(r) },
    { key: 'kategori', label: 'Kategori' }, { key: 'uraian', label: 'Uraian' }, { key: 'vendor', label: 'Vendor / Invoice' }, { key: 'pax', label: 'Pax' },
    { key: 'mata_uang', label: 'Mata Uang' }, { key: 'nominal_asing', label: 'Nominal Asing' }, { key: 'kurs', label: 'Kurs' },
    { key: 'jumlah', label: 'Jumlah (Rp)', money: true, value: r => Number(r.jumlah) || 0 }, { key: 'atas', label: 'Atas Nama', value: r => r.student_id || r.nama_mahasiswa ? studentOf(r) : 'Kolektif' }, { key: 'bukti', label: 'Bukti' }, { key: 'catatan', label: 'Catatan' },
  ],
  exportName: `Kas_Immersion_${batchName(bid)}`, sort: { key: 'tanggal', dir: 'asc' },
  search: r => [r.uraian, r.kategori, r.vendor, studentOf(r), r.catatan].join(' '),
  filters: [
    { key: 'jenis', label: 'Jenis', options: JENIS_KAS, match: (r, v) => jenisOf(r) === v },
    { key: 'status', label: 'Status', options: STATUS_KAS, match: (r, v) => statusKas(r) === v },
    { key: 'kategori', label: 'Kategori', options: () => uniq(store.all('immersionExpenses').filter(r => r.batch_id === bid).map(r => r.kategori)).sort() },
  ],
  defaults: () => ({ batch_id: bid, jenis: 'Pengeluaran', status: 'Realisasi', mata_uang: 'IDR', tanggal: today() }),
  kpis: (rows) => {
    const real = rows.filter(r => statusKas(r) === 'Realisasi'); const P = batchProgress(bid);
    return [
      { label: 'Pengeluaran (realisasi)', value: fmtIDR(sum(real.filter(isOut), 'jumlah')), sub: `${real.filter(isOut).length} transaksi`, icon: 'expense', accent: true },
      { label: 'Pemasukan lain', value: fmtIDR(sum(real.filter(isIn), 'jumlah')), sub: `${real.filter(isIn).length} transaksi`, icon: 'income' },
      { label: 'Rencana (belum realisasi)', value: fmtIDR(sum(rows.filter(r => statusKas(r) === 'Rencana' && isOut(r)), 'jumlah')), sub: `${rows.filter(r => statusKas(r) === 'Rencana').length} pos anggaran`, icon: 'clock' },
      { label: 'Saldo batch', value: fmtIDR(P.saldo), sub: `tabungan ${fmtIDR(P.total)} + pemasukan lain − pengeluaran`, icon: 'wallet' },
    ];
  },
  footer: (rows) => {
    const real = rows.filter(r => statusKas(r) === 'Realisasi');
    return ['Realisasi', '', '', '', h('span', { class: 'num' }, `+${fmtIDR(sum(real.filter(isIn), 'jumlah'))} / −${fmtIDR(sum(real.filter(isOut), 'jumlah'))}`), ''];
  },
  aliases: { student_id: ['Nama Mahasiswa', 'Atas Nama'], jumlah: ['Nominal', 'Total', 'Jumlah (Rp)', 'Total IDR'], vendor: ['Invoice', 'Vendor'], nominal_asing: ['Nominal Yen', 'Yen', 'JPY'], kurs: ['Rate', 'Kurs'] },
  importNote: 'Kolom yang digunakan: Tanggal, Batch, Jenis (Pengeluaran / Pemasukan lain / Penukaran uang), Status (Realisasi / Rencana), Kategori, Uraian, Vendor, Pax, Mata uang, Nominal asing, Kurs, dan Jumlah (Rp).',
  emptyTitle: `Belum ada transaksi kas ${batchName(bid)}`, emptyText: 'Catat pengeluaran, pemasukan lain, atau penukaran uang untuk batch ini.',
});

/* =================== Target per batch =================== */
const targetCfg = (bid) => ({
  id: 'immersionTargets', collection: 'immersionTargets', noun: 'target', title: 'Target Tabungan per Batch', eyebrow: 'Program · Immersion',
  description: 'Target tabungan immersion untuk setiap batch (dapat berbeda antarbatch). Rekap menggunakan target berstatus “Aktif” untuk menghitung kekurangan setiap mahasiswa. Tabel ini menampilkan seluruh batch.',
  sections: [{ fields: [
    { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'half' },
    { key: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Selesai'], col: 'half', default: 'Aktif' },
    { key: 'program', label: 'Nama program', type: 'text', required: true, placeholder: 'mis. Immersion Osaka 2027' },
    { key: 'destinasi', label: 'Destinasi', type: 'text', col: 'half', placeholder: 'mis. Osaka, Jepang' },
    { key: 'tenggat', label: 'Tenggat tabungan', type: 'date', col: 'half' },
    { key: 'target_per_mahasiswa', label: 'Target per mahasiswa', type: 'money', col: 'half' },
    { key: 'catatan', label: 'Catatan', type: 'textarea', rows: 2 },
  ] }],
  columns: [
    { key: 'program', label: 'Program', main: true, render: r => h('div', {}, h('span', { class: 'primary' }, r.program), h('span', { class: 'secondary' }, [batchName(r.batch_id), r.destinasi].filter(Boolean).join(' · '))) },
    { key: 'target_per_mahasiswa', label: 'Target / mahasiswa', align: 'right', render: r => r.target_per_mahasiswa ? h('span', { class: 'num' }, fmtIDR(r.target_per_mahasiswa)) : h('span', { class: 'muted' }, 'belum diisi') },
    { key: 'progres', label: 'Terkumpul', value: r => { const P = batchProgress(r.batch_id); return P.targetTotal ? pct(P.total, P.targetTotal) : 0; }, render: r => { const P = batchProgress(r.batch_id); return P.target && P.target.id === r.id ? (P.targetTotal ? progressCell(Math.min(100, pct(P.total, P.targetTotal))) : h('span', { class: 'num' }, fmtIDR(P.total))) : h('span', { class: 'muted' }, 'tidak aktif'); } },
    { key: 'tenggat', label: 'Tenggat', render: r => r.tenggat ? fmtDate(r.tenggat) : null, nowrap: true },
    { key: 'status', label: 'Status', render: r => badge(r.status || 'Aktif') },
  ],
  exportName: 'Target_Immersion', order: chain(byBatch(), byText(r => r.tenggat)), importable: true,
  defaults: () => ({ batch_id: bid, status: 'Aktif' }),
  emptyTitle: 'Belum ada target tabungan', emptyText: 'Tetapkan target tabungan immersion untuk setiap batch.',
});

export default {
  mount(root) {
    // Pindah tab (opsional langsung membuka formulir dengan isian awal)
    const goWith = (ctx) => (t, preset) => { const inner = ctx.go(t); if (preset && inner && inner.ctx) setTimeout(() => inner.ctx.openForm(preset), 30); };
    return tabPage(root, [
      { id: 'rekap', label: 'Rekap', fn: (b, ctx) => rekap(b, goWith(ctx), currentBatch()) },
      { id: 'cicilan', label: 'Cicilan per mahasiswa', fn: (b, ctx) => cicilan(b, goWith(ctx), currentBatch()) },
      { id: 'setoran', label: 'Log setoran', fn: (b) => crudView(setoranCfg(currentBatch()))(b) },
      { id: 'kas', label: 'Kas & pengeluaran', fn: (b) => crudView(kasCfg(currentBatch()))(b) },
      { id: 'target', label: 'Target', fn: (b) => crudView(targetCfg(currentBatch()))(b) },
    ], {
      eyebrow: 'Program', title: 'Immersion', key: 'tab_imm', def: 'rekap',
      description: 'Tabungan dan arus kas program immersion. Pilih batch untuk menampilkan datanya di semua tab.',
      actions: (ctx) => [batchSelect({ value: currentBatch(), onChange: (v) => { pref.set('imm_batch2', v); ctx.redraw(); } })],
    });
  },
};
