/* =========================================================================
   11. DATA MAGANG — penempatan magang mahasiswa & penilaian tempat magang.
   Pemilih batch di atas tab berlaku untuk semua tab:
   • Penempatan      : siapa magang di mana, posisi, durasi, status
   • Penilaian tempat: rekap rating tiap perusahaan dari ulasan mahasiswa
   • Respon penilaian: semua jawaban form (bisa ditinjau / disembunyikan)
   • Link form       : link publik per batch + bit.ly + daftar yang belum mengisi
   Form publik untuk mahasiswa: penilaian-magang.html?batch=B2 (tanpa login,
   disimpan lewat fungsi Supabase "kirim_penilaian_magang").
   ========================================================================= */
import { h, icon, clear, fmtDate, fmtDateLong, sum, uniq, pct, badge, batchName, batches, studentOf, withStudent, today, tabPage, batchSelect, firstBatch, pref, toast, openModal, docLink, chain, byBatch, byText } from '../ui.js';
import { crudView, kpiRow } from '../crud.js';
import { dataTable } from '../table.js';
import { hbars } from '../charts.js';
import { exportWorkbook } from '../io.js';
import { store } from '../store.js';

const STATUS = ['Proses', 'Diterima', 'Berjalan', 'Selesai', 'Dihentikan'];
const JENIS = ['Penempatan prodi', 'Inisiatif mahasiswa', 'Permintaan perusahaan'];
const STATUS_REVIEW = ['Baru', 'Ditinjau', 'Disembunyikan'];
const MODE = ['WFO', 'Hybrid', 'WFH'];
const ASPEK = [
  ['rating_jobdesk', 'Kesesuaian jobdesk'], ['rating_lingkungan', 'Lingkungan kerja'], ['rating_bimbingan', 'Bimbingan mentor'],
  ['rating_kompensasi', 'Kompensasi'], ['rating_pengembangan', 'Pengembangan skill'],
];
const toneStatus = (s) => ({ Proses: 'warn', Diterima: '', Berjalan: 'ok', Selesai: 'ok', Dihentikan: 'bad' }[s] ?? '');
const toneReview = (s) => ({ Baru: 'warn', Ditinjau: 'ok', Disembunyikan: '' }[s] ?? '');
const norm = (s) => String(s || '').toLowerCase().replace(/\b(pt|cv|tbk)\b\.?/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const visible = (r) => r.status_review !== 'Disembunyikan';
const avg = (rows, k) => { const v = rows.map(r => Number(r[k])).filter(n => n > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
const fmt1 = (n) => n ? n.toFixed(1).replace('.', ',') : '–';
const share = (rows, k, yes = 'Ya') => { const v = rows.filter(r => r[k]); return v.length ? pct(v.filter(r => r[k] === yes).length, v.length) : null; };

/** Tampilan bintang (baca saja) */
export function stars(value, { size = '', label = true } = {}) {
  const v = Number(value) || 0; const full = Math.round(v * 2) / 2;
  return h('span', { class: `stars ${size}`, role: 'img', 'aria-label': v ? `${fmt1(v)} dari 5 bintang` : 'Belum ada rating', title: v ? `${fmt1(v)} / 5` : 'Belum ada rating' },
    ...[1, 2, 3, 4, 5].map(n => h('i', { class: n <= full ? 'on' : n - 0.5 === full ? 'half' : '' }, icon('star'))),
    label ? h('b', {}, v ? fmt1(v) : '–') : null);
}

/* ---------- Batch aktif — bawaan Batch 1 bila belum dipilih ---------- */
const hasData = (b) => store.all('internships').some(r => r.batch_id === b) || store.all('internshipReviews').some(r => r.batch_id === b);
function currentBatch() {
  const bid = pref.get('mg_batch2', '');
  return bid === 'all' || store.get('batches', bid) ? bid : (firstBatch() || 'all');
}
const inBatch = (bid) => (r) => bid === 'all' || r.batch_id === bid;
const reviewsOf = (m) => store.all('internshipReviews').filter(r => r.magang_id === m.id || (!r.magang_id && r.nim && m.nim && String(r.nim) === String(m.nim) && (!r.perusahaan || !m.perusahaan || norm(r.perusahaan) === norm(m.perusahaan))));
const formBase = () => new URL('penilaian-magang.html', location.href.split('#')[0].split('?')[0]).href;
const formUrl = (bid) => `${formBase()}?batch=${encodeURIComponent(bid)}`;
const shortUrl = (bid) => (store.setting('magang_form') || {})[bid] || '';
async function copy(text, msg = 'Link disalin.') { try { await navigator.clipboard.writeText(text); toast(msg, 'ok'); } catch (e) { window.prompt('Salin teks berikut:', text); } }

/* ---------- Agregasi per perusahaan ---------- */
function companies(bid) {
  const place = store.all('internships').filter(inBatch(bid));
  const revs = store.all('internshipReviews').filter(inBatch(bid)).filter(visible);
  const map = new Map();
  const key = (name) => norm(name) || '(tanpa nama)';
  for (const m of place) { if (!m.perusahaan) continue; const k = key(m.perusahaan); if (!map.has(k)) map.set(k, { nama: m.perusahaan, kota: m.kota || '', placements: [], reviews: [] }); map.get(k).placements.push(m); }
  for (const r of revs) { const k = key(r.perusahaan); if (!map.has(k)) map.set(k, { nama: r.perusahaan || '(tanpa nama)', kota: r.kota || '', placements: [], reviews: [] }); const c = map.get(k); c.reviews.push(r); if (!c.kota && r.kota) c.kota = r.kota; }
  return [...map.values()].map(c => ({
    ...c, n: c.reviews.length, mahasiswa: uniq(c.placements.map(m => m.student_id || m.nama_mahasiswa)).length,
    rating: avg(c.reviews, 'rating_keseluruhan'), aspek: Object.fromEntries(ASPEK.map(([k]) => [k, avg(c.reviews, k)])),
    rekomendasi: share(c.reviews, 'rekomendasi'), jobdesk: share(c.reviews, 'jobdesk_sesuai'), lingkungan: share(c.reviews, 'lingkungan_cocok'), kompensasi: share(c.reviews, 'kompensasi_sepadan'),
    posisi: uniq([...c.placements.map(m => m.posisi), ...c.reviews.map(r => r.posisi)]).join(', '),
    batches: uniq([...c.placements.map(m => m.batch_id), ...c.reviews.map(r => r.batch_id)]),
  }));
}

/* ---------- Detail satu perusahaan ---------- */
function companyDetail(c) {
  const yn = (v) => v === null ? '–' : `${v}%`;
  const body = h('div', { class: 'stack' },
    h('div', { class: 'company-sum' },
      h('div', {}, stars(c.rating, { size: 'lg' }), h('p', { class: 'muted' }, c.n ? `${c.n} ulasan mahasiswa` : 'Belum ada ulasan')),
      h('div', { class: 'company-aspek' }, hbars(ASPEK.map(([k, l]) => ({ label: l, value: c.aspek[k], display: c.aspek[k] ? `${fmt1(c.aspek[k])} / 5` : '–' })), { max: 5, color: 'var(--gold)' }))),
    kpiRow([
      { label: 'Merekomendasikan', value: yn(c.rekomendasi), sub: 'menjawab “Ya”', icon: 'check', accent: true },
      { label: 'Jobdesk sesuai', value: yn(c.jobdesk), icon: 'clipboard' },
      { label: 'Lingkungan cocok', value: yn(c.lingkungan), icon: 'users' },
      { label: 'Kompensasi sepadan', value: yn(c.kompensasi), icon: 'wallet' },
    ]),
    c.placements.length ? h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h3', {}, `Mahasiswa yang magang di sini (${c.placements.length})`)),
      dataTable({ rows: c.placements, pageSize: Infinity, compact: true, columns: [
        { key: 'nama', label: 'Mahasiswa', main: true, value: m => studentOf(m), render: m => h('div', {}, h('span', { class: 'primary' }, studentOf(m)), h('span', { class: 'secondary' }, [batchName(m.batch_id), m.nim].filter(Boolean).join(' · '))) },
        { key: 'posisi', label: 'Posisi' },
        { key: 'durasi', label: 'Durasi', render: m => [m.durasi, m.mulai ? `${fmtDate(m.mulai)} – ${m.selesai ? fmtDate(m.selesai) : '…'}` : null].filter(Boolean).join(' · ') || '–' },
        { key: 'status', label: 'Status', render: m => badge(m.status, toneStatus(m.status)) },
        { key: 'nilai', label: 'Penilaian', value: m => reviewsOf(m).length, render: m => { const r = reviewsOf(m).filter(visible)[0]; return r ? stars(r.rating_keseluruhan) : h('span', { class: 'muted' }, 'Belum menilai'); } },
      ] }).el) : null,
    c.reviews.length ? h('div', { class: 'reviews' }, ...[...c.reviews].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).map(reviewCard)) : h('div', { class: 'empty' }, icon('message'), h('h3', {}, 'Belum ada ulasan'), h('p', {}, 'Bagikan tautan formulir penilaian kepada mahasiswa yang magang di perusahaan ini.')));
  openModal({ title: c.nama, subtitle: [c.kota, c.posisi].filter(Boolean).join(' · '), body, wide: true });
}
function reviewCard(r) {
  const who = r.tampilkan_anonim ? 'Anonim (ditampilkan anonim)' : (r.nama_lengkap || studentOf(r));
  const row = (label, v) => v ? h('div', {}, h('dt', {}, label), h('dd', {}, v)) : null;
  return h('article', { class: 'review' },
    h('header', {}, h('div', {}, h('strong', {}, who), h('span', { class: 'muted' }, [batchName(r.batch_id), r.posisi, r.durasi, r.mode_kerja].filter(x => x && x !== '–').join(' · '))), stars(r.rating_keseluruhan)),
    h('div', { class: 'review-tags' },
      r.jobdesk_sesuai ? badge(`Jobdesk sesuai: ${r.jobdesk_sesuai}`, r.jobdesk_sesuai === 'Ya' ? 'ok' : r.jobdesk_sesuai === 'Tidak' ? 'bad' : 'warn') : null,
      r.lingkungan_cocok ? badge(`Lingkungan: ${r.lingkungan_cocok}`, r.lingkungan_cocok === 'Ya' ? 'ok' : r.lingkungan_cocok === 'Tidak' ? 'bad' : 'warn') : null,
      r.kompensasi_sepadan ? badge(`Kompensasi sepadan: ${r.kompensasi_sepadan}`, r.kompensasi_sepadan === 'Ya' ? 'ok' : r.kompensasi_sepadan === 'Tidak' ? 'bad' : 'warn') : null,
      r.rekomendasi ? badge(`Rekomendasi: ${r.rekomendasi}`, r.rekomendasi === 'Ya' ? 'ok' : r.rekomendasi === 'Tidak' ? 'bad' : 'warn') : null,
      r.status_review === 'Disembunyikan' ? badge('Disembunyikan', '') : null),
    h('dl', { class: 'dl' },
      row('Kelebihan', r.kelebihan), row('Kekurangan', r.kekurangan), row('Skill yang didapat', r.skill_didapat),
      row('Kompensasi diterima', r.kompensasi_diterima), row('Jam kerja', r.jam_kerja), row('Beban kerja', r.beban_kerja), row('Tawaran kerja', r.tawaran_kerja), row('Saran untuk prodi', r.saran)));
}

/* =================== Penempatan =================== */
const penempatanCfg = (bid) => ({
  id: `internships_${bid}`, collection: 'internships', noun: 'data magang', title: 'Penempatan Magang', eyebrow: `Data Magang · ${batchName(bid)}`,
  description: 'Data tempat magang (PKL) setiap mahasiswa, meliputi perusahaan, posisi, durasi, dan status. Kolom “Penilaian” menunjukkan apakah mahasiswa telah mengisi formulir penilaian tempat magang.',
  rowsFilter: (rows) => rows.filter(inBatch(bid)), addLabel: 'Tambah data magang',
  sections: [
    { title: 'Mahasiswa', fields: [
      { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'half' },
      { key: 'periode', label: 'Periode', type: 'text', col: 'half', placeholder: 'Semester 5 · Ganjil 2026/2027' },
      { key: 'student_id', label: 'Mahasiswa', type: 'student', batchKey: 'batch_id', required: true },
    ] },
    { title: 'Tempat magang', fields: [
      { key: 'perusahaan', label: 'Perusahaan (diterima)', type: 'text', required: true, col: 'half' },
      { key: 'kota', label: 'Kota', type: 'text', col: 'half', placeholder: 'mis. Malang' },
      { key: 'posisi', label: 'Posisi', type: 'text', col: 'half', placeholder: 'mis. Sales & Marketing' },
      { key: 'divisi', label: 'Divisi / bidang', type: 'select', options: () => uniq([...store.list('bidang_magang'), ...store.all('internships').map(r => r.divisi)]), col: 'half' },
      { key: 'kandidat', label: 'Tempat yang dilamar / dipertimbangkan', type: 'text', help: 'Opsional, contohnya daftar perusahaan yang pernah dilamar.' },
    ] },
    { title: 'Waktu & status', fields: [
      { key: 'durasi', label: 'Durasi', type: 'text', col: 'third', placeholder: '6 Months' },
      { key: 'mulai', label: 'Mulai', type: 'date', col: 'third' },
      { key: 'selesai', label: 'Selesai', type: 'date', col: 'third' },
      { key: 'status', label: 'Status', type: 'select', options: STATUS, col: 'half', default: 'Proses' },
      { key: 'jenis', label: 'Jenis penempatan', type: 'select', options: JENIS, col: 'half', default: 'Penempatan prodi' },
      { key: 'form_pkl', label: 'Form PKL', type: 'checkbox', checkLabel: 'Form PKL prodi sudah diisi', col: 'half' },
    ] },
    { title: 'Pembimbing & dokumen', fields: [
      { key: 'pembimbing_lapangan', label: 'Pembimbing lapangan', type: 'text', col: 'half' },
      { key: 'pembimbing_akademik', label: 'Pembimbing akademik', type: 'text', col: 'half' },
      { key: 'kontak_perusahaan', label: 'Kontak perusahaan', type: 'text', placeholder: 'Nama · email / WhatsApp HR' },
      { key: 'dokumen', label: 'Dokumen (LoA, laporan, sertifikat)', type: 'attachment', accept: 'image/*,.pdf' },
      { key: 'catatan', label: 'Catatan', type: 'textarea', rows: 2 },
    ] },
  ],
  beforeSave: (r) => withStudent(r),
  columns: [
    { key: 'mhs', label: 'Mahasiswa', main: true, value: r => studentOf(r), render: r => h('div', {}, h('span', { class: 'primary' }, studentOf(r)), h('span', { class: 'secondary' }, [bid === 'all' ? batchName(r.batch_id) : null, r.nim].filter(Boolean).join(' · '))) },
    { key: 'perusahaan', label: 'Perusahaan', render: r => r.perusahaan ? h('div', {}, h('span', { class: 'primary' }, r.perusahaan), r.kota ? h('span', { class: 'secondary' }, r.kota) : null) : h('span', { class: 'muted' }, 'Belum ada') },
    { key: 'posisi', label: 'Posisi', render: r => r.posisi || h('span', { class: 'muted' }, '–') },
    { key: 'mulai', label: 'Durasi', value: r => r.mulai || '', render: r => h('div', {}, h('span', {}, r.durasi || '–'), r.mulai ? h('span', { class: 'secondary' }, `${fmtDate(r.mulai)} – ${r.selesai ? fmtDate(r.selesai) : '…'}`) : null) },
    { key: 'status', label: 'Status', render: r => badge(r.status, toneStatus(r.status)) },
    { key: 'nilai', label: 'Penilaian', value: r => { const x = reviewsOf(r).filter(visible)[0]; return x ? Number(x.rating_keseluruhan) || 0 : -1; }, render: r => { const x = reviewsOf(r).filter(visible)[0]; return x ? stars(x.rating_keseluruhan) : ['Berjalan', 'Selesai'].includes(r.status) ? badge('Belum menilai', 'warn') : h('span', { class: 'muted' }, '–'); } },
  ],
  exportColumns: [
    { key: 'batch_id', label: 'Batch', value: r => batchName(r.batch_id) }, { key: 'periode', label: 'Periode' }, { key: 'mhs', label: 'Nama Mahasiswa', value: r => studentOf(r) }, { key: 'nim', label: 'NIM' },
    { key: 'perusahaan', label: 'Perusahaan' }, { key: 'kandidat', label: 'Tempat Dilamar' }, { key: 'posisi', label: 'Posisi' }, { key: 'divisi', label: 'Divisi' }, { key: 'kota', label: 'Kota' },
    { key: 'durasi', label: 'Durasi' }, { key: 'mulai', label: 'Mulai' }, { key: 'selesai', label: 'Selesai' }, { key: 'status', label: 'Status' }, { key: 'jenis', label: 'Jenis' },
    { key: 'form_pkl', label: 'Form PKL', value: r => r.form_pkl ? 'Sudah' : 'Belum' }, { key: 'pembimbing_lapangan', label: 'Pembimbing Lapangan' }, { key: 'pembimbing_akademik', label: 'Pembimbing Akademik' },
    { key: 'rating', label: 'Rating Penilaian', value: r => { const x = reviewsOf(r)[0]; return x ? x.rating_keseluruhan : ''; } }, { key: 'catatan', label: 'Catatan' },
  ],
  exportName: `Data_Magang_${batchName(bid)}`, order: chain(byBatch(), byText(r => studentOf(r))),
  groupBy: bid === 'all' ? (r => batchName(r.batch_id)) : null,
  searchPlaceholder: 'Cari mahasiswa, perusahaan, posisi…', search: r => [studentOf(r), r.nim, r.perusahaan, r.kandidat, r.posisi, r.kota, r.catatan].join(' '),
  filters: [
    { key: 'status', label: 'Status', options: STATUS },
    { key: 'jenis', label: 'Jenis', options: JENIS },
    { key: 'perusahaan', label: 'Perusahaan', options: () => uniq(store.all('internships').filter(inBatch(bid)).map(r => r.perusahaan)).sort() },
    { key: 'nilai', label: 'Penilaian', all: 'Semua penilaian', options: ['Sudah menilai', 'Belum menilai'], match: (r, v) => (reviewsOf(r).length > 0) === (v === 'Sudah menilai') },
  ],
  defaults: () => ({ batch_id: bid === 'all' ? '' : bid, status: 'Proses', jenis: 'Penempatan prodi' }),
  kpis: (rows) => {
    const done = rows.filter(r => ['Berjalan', 'Selesai'].includes(r.status)); const rated = done.filter(r => reviewsOf(r).length);
    return [
      { label: 'Mahasiswa magang', value: rows.length, sub: `${uniq(rows.map(r => r.perusahaan)).length} perusahaan`, icon: 'briefcase', accent: true },
      { label: 'Sedang berjalan', value: rows.filter(r => r.status === 'Berjalan').length, sub: `${rows.filter(r => r.status === 'Diterima' || r.status === 'Proses').length} diterima / proses`, icon: 'clock' },
      { label: 'Selesai', value: rows.filter(r => r.status === 'Selesai').length, sub: `${rows.filter(r => r.status === 'Dihentikan').length} dihentikan`, icon: 'check' },
      { label: 'Sudah menilai', value: `${rated.length} / ${done.length}`, sub: 'mahasiswa berjalan & selesai', icon: 'star', meter: pct(rated.length, done.length), meterTone: 'ok' },
    ];
  },
  aliases: { student_id: ['Nama', 'Nama Mahasiswa', 'Nama Lengkap', 'Full Name'], perusahaan: ['Accepted', 'Perusahaan', 'Tempat Magang', 'Diterima'], kandidat: ['Place of Internship', 'Tempat Dilamar'], posisi: ['Position', 'Posisi'], durasi: ['Duration', 'Durasi'], mulai: ['Start', 'Mulai', 'Tanggal Mulai'], selesai: ['End', 'Selesai', 'Tanggal Selesai'], kota: ['City', 'Kota'], panggilan: ['Nick Name', 'Panggilan'] },
  importNote: 'Kolom yang digunakan: Batch, Nama/NIM mahasiswa, Perusahaan, Posisi, Kota, Durasi, Mulai, Selesai, dan Status (Proses / Diterima / Berjalan / Selesai / Dihentikan). Data mahasiswa dicocokkan secara otomatis berdasarkan NIM atau nama.',
  emptyTitle: 'Belum ada data magang', emptyText: 'Tambahkan data tempat magang mahasiswa atau impor dari sheet Data Magang.',
});

/* =================== Penilaian per perusahaan =================== */
function penilaian(root, go, bid) {
  const box = h('div'); let q = '';
  function render() {
    clear(box);
    const list = companies(bid).sort((a, b) => (b.rating - a.rating) || (b.n - a.n) || a.nama.localeCompare(b.nama));
    const revs = store.all('internshipReviews').filter(inBatch(bid)).filter(visible);
    const rated = list.filter(c => c.n);
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Cari perusahaan, kota, posisi…', 'aria-label': 'Cari perusahaan', value: q });
    const shown = () => list.filter(c => !q || [c.nama, c.kota, c.posisi].join(' ').toLowerCase().includes(q.toLowerCase()));
    const table = dataTable({ rows: shown(), pageSize: 25, onRowClick: companyDetail, sort: { key: 'rating', dir: 'desc' },
      emptyNode: h('div', { class: 'empty' }, icon('building'), h('h3', {}, 'Belum ada tempat magang'), h('p', {}, 'Data perusahaan ditampilkan secara otomatis berdasarkan tab Penempatan dan formulir penilaian.')),
      columns: [
        { key: 'nama', label: 'Perusahaan', main: true, render: c => h('div', {}, h('span', { class: 'primary' }, c.nama), h('span', { class: 'secondary' }, [c.kota, c.posisi].filter(Boolean).join(' · ') || '–')) },
        { key: 'rating', label: 'Rating', value: c => c.rating || -1, render: c => c.n ? stars(c.rating) : h('span', { class: 'muted' }, 'Belum dinilai') },
        { key: 'n', label: 'Ulasan', align: 'right', render: c => h('span', { class: 'num' }, `${c.n} / ${c.mahasiswa || c.n}`) },
        { key: 'rekomendasi', label: 'Rekomendasi', align: 'right', value: c => c.rekomendasi ?? -1, render: c => c.rekomendasi === null ? h('span', { class: 'muted' }, '–') : badge(`${c.rekomendasi}% Ya`, c.rekomendasi >= 70 ? 'ok' : c.rekomendasi >= 40 ? 'warn' : 'bad') },
        { key: 'jobdesk', label: 'Jobdesk sesuai', align: 'right', value: c => c.jobdesk ?? -1, render: c => c.jobdesk === null ? h('span', { class: 'muted' }, '–') : h('span', { class: 'num' }, `${c.jobdesk}%`) },
        { key: 'kompensasi', label: 'Kompensasi sepadan', align: 'right', value: c => c.kompensasi ?? -1, render: c => c.kompensasi === null ? h('span', { class: 'muted' }, '–') : h('span', { class: 'num' }, `${c.kompensasi}%`) },
      ] });
    search.addEventListener('input', () => { q = search.value; table.update(shown()); });
    const xls = () => exportWorkbook(`Penilaian_Tempat_Magang_${batchName(bid)}`.replace(/\W+/g, '_'), [
      { name: 'Per Perusahaan', rows: [['Perusahaan', 'Kota', 'Jumlah Ulasan', 'Rating Keseluruhan', ...ASPEK.map(a => a[1]), 'Rekomendasi (%)', 'Jobdesk Sesuai (%)', 'Lingkungan Cocok (%)', 'Kompensasi Sepadan (%)'],
        ...list.map(c => [c.nama, c.kota, c.n, c.rating ? +c.rating.toFixed(2) : '', ...ASPEK.map(([k]) => c.aspek[k] ? +c.aspek[k].toFixed(2) : ''), c.rekomendasi ?? '', c.jobdesk ?? '', c.lingkungan ?? '', c.kompensasi ?? ''])] },
    ]);
    box.append(...[
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, `Data Magang · ${batchName(bid)}`), h('h1', {}, 'Penilaian Tempat Magang'),
          h('p', {}, 'Rekapitulasi ulasan mahasiswa untuk setiap perusahaan. Pilih nama perusahaan untuk membaca seluruh ulasan. Ulasan yang disembunyikan tidak diperhitungkan.')),
        h('div', { class: 'actions no-print' },
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: xls }, icon('sheet'), 'Ekspor'),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => go('link') }, icon('link'), 'Link form penilaian'))),
      kpiRow([
        { label: 'Rating rata-rata', value: revs.length ? `${fmt1(avg(revs, 'rating_keseluruhan'))} / 5` : '–', sub: `${revs.length} ulasan`, icon: 'star', accent: true },
        { label: 'Perusahaan dinilai', value: `${rated.length} / ${list.length}`, sub: 'tempat magang', icon: 'building', meter: pct(rated.length, list.length), meterTone: 'ok' },
        { label: 'Merekomendasikan', value: share(revs, 'rekomendasi') === null ? '–' : `${share(revs, 'rekomendasi')}%`, sub: 'mahasiswa menjawab “Ya”', icon: 'check' },
        { label: 'Kompensasi sepadan', value: share(revs, 'kompensasi_sepadan') === null ? '–' : `${share(revs, 'kompensasi_sepadan')}%`, sub: 'menjawab “Ya”', icon: 'wallet' },
      ]),
      revs.length ? h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Rata-rata per aspek'), h('p', {}, `Skala 1–5 · ${revs.length} ulasan`))),
        h('div', { class: 'card-body' }, hbars(ASPEK.map(([k, l]) => ({ label: l, value: avg(revs, k), display: `${fmt1(avg(revs, k))} / 5` })), { max: 5, color: 'var(--gold)' }))) : null,
      h('div', { class: 'card' }, h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search'), search), h('span', { class: 'count' }, `${list.length} perusahaan`)), table.el),
    ].filter(Boolean));
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe(render) };
}

/* =================== Respon penilaian =================== */
const YN = ['Ya', 'Sebagian', 'Tidak']; const YC = ['Ya', 'Cukup', 'Tidak'];
const responCfg = (bid) => ({
  id: `internshipReviews_${bid}`, collection: 'internshipReviews', noun: 'penilaian', title: 'Respon Penilaian Magang', eyebrow: `Data Magang · ${batchName(bid)}`,
  description: 'Jawaban formulir penilaian dari mahasiswa (diterima secara otomatis melalui tautan bit.ly). Tandai “Ditinjau” setelah dibaca, atau “Disembunyikan” apabila ulasan tidak layak diperhitungkan.',
  rowsFilter: (rows) => rows.filter(inBatch(bid)), addLabel: 'Input penilaian',
  sections: [
    { title: 'Mahasiswa & tempat magang', fields: [
      { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'half' },
      { key: 'student_id', label: 'Mahasiswa', type: 'student', batchKey: 'batch_id', col: 'half' },
      { key: 'nama_lengkap', label: 'Nama lengkap', type: 'text', col: 'half' },
      { key: 'nim', label: 'NIM', type: 'text', col: 'half' },
      { key: 'perusahaan', label: 'Perusahaan', type: 'text', required: true, col: 'half' },
      { key: 'kota', label: 'Kota', type: 'text', col: 'half' },
      { key: 'posisi', label: 'Posisi', type: 'text', col: 'half' },
      { key: 'durasi', label: 'Durasi', type: 'text', col: 'half', placeholder: '6 bulan' },
      { key: 'mode_kerja', label: 'Mode kerja', type: 'radio', options: MODE },
    ] },
    { title: 'Rating (1–5 bintang)', fields: [
      { key: 'rating_keseluruhan', label: 'Penilaian keseluruhan', type: 'rating', required: true },
      ...ASPEK.map(([k, l]) => ({ key: k, label: l, type: 'rating', col: 'half' })),
    ] },
    { title: 'Kesesuaian', fields: [
      { key: 'jobdesk_sesuai', label: 'Jobdesk sesuai dengan posisi/bidang studi?', type: 'radio', options: YN, col: 'half' },
      { key: 'lingkungan_cocok', label: 'Lingkungan kerja cocok?', type: 'radio', options: YC, col: 'half' },
      { key: 'kompensasi_diterima', label: 'Kompensasi yang diterima', type: 'text', col: 'half', placeholder: 'Uang saku, uang makan, transport, atau tidak ada' },
      { key: 'kompensasi_sepadan', label: 'Kompensasi sepadan dengan beban kerja?', type: 'radio', options: YC, col: 'half' },
      { key: 'jam_kerja', label: 'Jam kerja', type: 'text', col: 'half' },
      { key: 'beban_kerja', label: 'Beban kerja', type: 'radio', options: ['Ringan', 'Sesuai', 'Berat'], col: 'half' },
      { key: 'rekomendasi', label: 'Merekomendasikan kepada mahasiswa angkatan berikutnya?', type: 'radio', options: ['Ya', 'Mungkin', 'Tidak'], col: 'half' },
      { key: 'tawaran_kerja', label: 'Mendapat tawaran kerja?', type: 'radio', options: ['Ya', 'Belum', 'Tidak'], col: 'half' },
    ] },
    { title: 'Ulasan', fields: [
      { key: 'kelebihan', label: 'Kelebihan', type: 'textarea', rows: 2 },
      { key: 'kekurangan', label: 'Kekurangan', type: 'textarea', rows: 2 },
      { key: 'skill_didapat', label: 'Skill yang didapat', type: 'textarea', rows: 2 },
      { key: 'saran', label: 'Saran untuk prodi', type: 'textarea', rows: 2 },
      { key: 'tampilkan_anonim', label: 'Anonim', type: 'checkbox', checkLabel: 'Tampilkan ulasan tanpa nama' },
    ] },
    { title: 'Tinjauan tim IBM', fields: [
      { key: 'status_review', label: 'Status', type: 'select', options: STATUS_REVIEW, col: 'half', default: 'Ditinjau' },
      { key: 'sumber', label: 'Sumber', type: 'select', options: ['Form publik', 'Input admin'], col: 'half', default: 'Input admin' },
      { key: 'catatan_admin', label: 'Catatan internal', type: 'textarea', rows: 2 },
    ] },
  ],
  beforeSave: (rec) => {
    const r = withStudent(rec);
    if (!r.nama_lengkap && r.nama_mahasiswa) r.nama_lengkap = r.nama_mahasiswa;
    if (!r.magang_id) { const m = store.all('internships').find(x => (x.student_id && x.student_id === r.student_id) || (x.nim && r.nim && String(x.nim) === String(r.nim))); if (m) r.magang_id = m.id; }
    delete r.nama_mahasiswa; return r;
  },
  columns: [
    { key: 'created_at', label: 'Tanggal masuk', value: r => r.created_at || '', render: r => r.created_at ? fmtDate(String(r.created_at).slice(0, 10)) : '–', nowrap: true },
    { key: 'nama', label: 'Mahasiswa', main: true, value: r => r.nama_lengkap || studentOf(r), render: r => h('div', {}, h('span', { class: 'primary' }, r.nama_lengkap || studentOf(r)), h('span', { class: 'secondary' }, [bid === 'all' ? batchName(r.batch_id) : null, r.nim, r.tampilkan_anonim ? 'minta anonim' : null].filter(Boolean).join(' · '))) },
    { key: 'perusahaan', label: 'Perusahaan', render: r => h('div', {}, h('span', { class: 'primary' }, r.perusahaan), h('span', { class: 'secondary' }, [r.posisi, r.durasi].filter(Boolean).join(' · '))) },
    { key: 'rating_keseluruhan', label: 'Rating', value: r => Number(r.rating_keseluruhan) || 0, render: r => stars(r.rating_keseluruhan) },
    { key: 'rekomendasi', label: 'Rekomendasi', render: r => r.rekomendasi ? badge(r.rekomendasi, r.rekomendasi === 'Ya' ? 'ok' : r.rekomendasi === 'Tidak' ? 'bad' : 'warn') : h('span', { class: 'muted' }, '–') },
    { key: 'status_review', label: 'Status', render: r => badge(r.status_review || 'Baru', toneReview(r.status_review || 'Baru')) },
  ],
  exportColumns: [
    { key: 'created_at', label: 'Tanggal Masuk', value: r => String(r.created_at || '').slice(0, 10) }, { key: 'batch_id', label: 'Batch', value: r => batchName(r.batch_id) },
    { key: 'nama_lengkap', label: 'Nama Lengkap' }, { key: 'nim', label: 'NIM' }, { key: 'email', label: 'Email' }, { key: 'perusahaan', label: 'Perusahaan' }, { key: 'posisi', label: 'Posisi' }, { key: 'kota', label: 'Kota' },
    { key: 'durasi', label: 'Durasi' }, { key: 'mode_kerja', label: 'Mode Kerja' }, { key: 'rating_keseluruhan', label: 'Rating Keseluruhan' }, ...ASPEK.map(([k, l]) => ({ key: k, label: l })),
    { key: 'jobdesk_sesuai', label: 'Jobdesk Sesuai' }, { key: 'lingkungan_cocok', label: 'Lingkungan Cocok' }, { key: 'kompensasi_diterima', label: 'Kompensasi Diterima' }, { key: 'kompensasi_sepadan', label: 'Kompensasi Sepadan' },
    { key: 'jam_kerja', label: 'Jam Kerja' }, { key: 'beban_kerja', label: 'Beban Kerja' }, { key: 'skill_didapat', label: 'Skill Didapat' }, { key: 'kelebihan', label: 'Kelebihan' }, { key: 'kekurangan', label: 'Kekurangan' },
    { key: 'rekomendasi', label: 'Rekomendasi' }, { key: 'tawaran_kerja', label: 'Tawaran Kerja' }, { key: 'saran', label: 'Saran' }, { key: 'tampilkan_anonim', label: 'Anonim', value: r => r.tampilkan_anonim ? 'Ya' : 'Tidak' },
    { key: 'status_review', label: 'Status Tinjauan' }, { key: 'sumber', label: 'Sumber' },
  ],
  exportName: `Respon_Penilaian_Magang_${batchName(bid)}`, sort: { key: 'created_at', dir: 'desc' },
  searchPlaceholder: 'Cari nama, NIM, perusahaan, ulasan…', search: r => [r.nama_lengkap, r.nim, r.perusahaan, r.posisi, r.kelebihan, r.kekurangan, r.saran].join(' '),
  filters: [
    { key: 'status_review', label: 'Status', options: STATUS_REVIEW, match: (r, v) => (r.status_review || 'Baru') === v },
    { key: 'perusahaan', label: 'Perusahaan', options: () => uniq(store.all('internshipReviews').filter(inBatch(bid)).map(r => r.perusahaan)).sort() },
    { key: 'rating_keseluruhan', label: 'Rating', all: 'Semua rating', options: [5, 4, 3, 2, 1].map(n => ({ value: String(n), label: `${n} bintang` })), match: (r, v) => String(r.rating_keseluruhan) === v },
  ],
  defaults: () => ({ batch_id: bid === 'all' ? '' : bid, status_review: 'Ditinjau', sumber: 'Input admin' }),
  onRowClick: (r, ctx) => {
    const body = reviewCard(r);
    const edit = h('button', { class: 'btn btn-ghost', type: 'button' }, icon('edit', 'sm'), 'Ubah');
    const setSt = (st) => async () => { await store.save('internshipReviews', { ...r, status_review: st }); toast(`Status: ${st}.`, 'ok'); close(); };
    const { close } = openModal({ title: r.perusahaan || 'Penilaian magang', subtitle: `${String(r.created_at || '').slice(0, 10) ? `Masuk ${fmtDateLong(String(r.created_at).slice(0, 10))} · ` : ''}${r.sumber || 'Form publik'}`, body, size: 'lg',
      footer: [h('div', { class: 'left' }, edit), r.status_review === 'Disembunyikan' ? h('button', { class: 'btn btn-ghost', type: 'button', onclick: setSt('Ditinjau') }, 'Tampilkan lagi') : h('button', { class: 'btn btn-ghost', type: 'button', onclick: setSt('Disembunyikan') }, 'Sembunyikan'),
        r.status_review !== 'Ditinjau' ? h('button', { class: 'btn btn-primary', type: 'button', onclick: setSt('Ditinjau') }, icon('check'), 'Tandai ditinjau') : h('button', { class: 'btn btn-primary', type: 'button', onclick: () => close() }, 'Tutup')] });
    edit.addEventListener('click', () => { close(); ctx.openForm(r); });
  },
  rowExtra: (r) => (r.status_review || 'Baru') === 'Baru' ? [h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: async (e) => { e.stopPropagation(); await store.save('internshipReviews', { ...r, status_review: 'Ditinjau' }); toast('Ditandai ditinjau.', 'ok'); } }, icon('check', 'sm'), 'Ditinjau')] : [],
  kpis: (rows) => {
    const vis = rows.filter(visible);
    return [
      { label: 'Respon masuk', value: rows.length, sub: `${rows.filter(r => r.sumber === 'Form publik').length} dari form publik`, icon: 'message', accent: true },
      { label: 'Rating rata-rata', value: vis.length ? `${fmt1(avg(vis, 'rating_keseluruhan'))} / 5` : '–', sub: `${vis.length} ulasan dihitung`, icon: 'star' },
      { label: 'Merekomendasikan', value: share(vis, 'rekomendasi') === null ? '–' : `${share(vis, 'rekomendasi')}%`, icon: 'check' },
      { label: 'Perlu ditinjau', value: rows.filter(r => (r.status_review || 'Baru') === 'Baru').length, sub: 'status “Baru”', icon: 'bell' },
    ];
  },
  aliases: { nama_lengkap: ['Nama', 'Nama Lengkap'], perusahaan: ['Perusahaan', 'Tempat Magang'], rating_keseluruhan: ['Rating', 'Bintang', 'Rating Keseluruhan'] },
  importNote: 'Susunan kolom mengikuti template penilaian_magang.csv. Rating diisi dengan angka 1–5.',
  emptyTitle: 'Belum ada penilaian', emptyText: 'Bagikan tautan formulir penilaian (tab Link form) kepada mahasiswa yang sedang atau telah menyelesaikan magang.',
});

/* =================== Link form per batch =================== */
function linkForm(root, go, bid) {
  const box = h('div');
  function render() {
    clear(box);
    const list = (bid === 'all' ? batches().filter(b => hasData(b.id)) : batches().filter(b => b.id === bid));
    const saved = store.setting('magang_form') || {};
    box.append(...[
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, `Data Magang · ${batchName(bid)}`), h('h1', {}, 'Link Form Penilaian'),
          h('p', {}, 'Setiap batch memiliki tautan formulir tersendiri sehingga jawaban otomatis tercatat pada batch yang sesuai. Mahasiswa hanya perlu memasukkan NIM; nama, perusahaan, dan posisi akan terisi otomatis berdasarkan data penempatan.'))),
      h('div', { class: 'note' }, icon('info'), h('div', {},
        h('b', {}, 'Langkah membuat tautan bit.ly: '), '1) Salin “Link panjang” di bawah. 2) Buka bitly.com → Create new → Link, lalu tempelkan link panjang tersebut. 3) Isi kolom back-half, contoh: ', h('code', {}, 'PenilaianMagangIBM-B2'), '. 4) Tempelkan tautan bit.ly yang dihasilkan ke kolom “Link bit.ly”, kemudian pilih Simpan. Tautan pendek inilah yang dibagikan kepada mahasiswa.')),
      ...list.map(b => {
        const place = store.all('internships').filter(m => m.batch_id === b.id);
        const target = place.filter(m => ['Berjalan', 'Selesai'].includes(m.status));
        const sudah = target.filter(m => reviewsOf(m).length); const belum = target.filter(m => !reviewsOf(m).length);
        const long = formUrl(b.id); const short = saved[b.id] || '';
        const inp = h('input', { class: 'input', type: 'url', placeholder: 'https://bit.ly/…', value: short, 'aria-label': `Link bit.ly ${b.nama}` });
        const save = h('button', { class: 'btn btn-primary', type: 'button' }, icon('check'), 'Simpan');
        save.addEventListener('click', async () => {
          let v = inp.value.trim(); if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
          if (v && !/^https:\/\/[^\s/]+\.[^\s]+/i.test(v)) return toast('Format link tidak valid.', 'bad');
          save.disabled = true; try { await store.saveSetting('magang_form', { ...(store.setting('magang_form') || {}), [b.id]: v }); toast(`Link ${b.nama} disimpan.`, 'ok'); } catch (e) { toast(e.message, 'bad'); save.disabled = false; }
        });
        const shareLink = short || long;
        const pesan = `Yth. Mahasiswa IBM ${b.nama} yang sedang atau telah menyelesaikan magang,\n\nDimohon kesediaannya untuk mengisi formulir penilaian tempat magang melalui tautan berikut (estimasi pengisian ±3 menit; hanya dengan memasukkan NIM):\n${shareLink}\n\nAtas perhatian dan partisipasinya, kami ucapkan terima kasih.\n\nTim IBM`;
        return h('div', { class: 'card' },
          h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, `Form penilaian · ${b.nama}`), h('p', {}, `${sudah.length} dari ${target.length} mahasiswa (berjalan/selesai) sudah mengisi`)),
            h('div', { class: 'actions' }, h('a', { class: 'btn btn-ghost btn-sm', href: long, target: '_blank', rel: 'noopener' }, icon('external', 'sm'), 'Buka form'))),
          h('div', { class: 'card-body stack' },
            h('div', { class: 'meter ok', role: 'meter', 'aria-valuenow': pct(sudah.length, target.length), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Progres pengisian' }, h('i', { style: { width: `${pct(sudah.length, target.length)}%` } })),
            h('div', { class: 'linkrow' }, h('span', { class: 'flabel' }, 'Link panjang (untuk dipersingkat dengan bit.ly)'),
              h('div', { class: 'copybox' }, h('code', {}, long), h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => copy(long) }, icon('copy', 'sm'), 'Salin'))),
            h('div', { class: 'linkrow' }, h('span', { class: 'flabel' }, 'Link bit.ly (dibagikan ke mahasiswa)'),
              h('div', { class: 'copybox edit' }, inp, save, short ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => copy(short) }, icon('copy', 'sm'), 'Salin') : null)),
            h('div', { class: 'actions' },
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => copy(pesan, 'Pesan pengumuman disalin.') }, icon('message', 'sm'), 'Salin pesan pengumuman'),
              belum.length ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => copy(`Mohon segera melengkapi penilaian tempat magang melalui tautan berikut: ${shareLink}\n\nDaftar mahasiswa yang belum mengisi:\n${belum.map((m, i) => `${i + 1}. ${studentOf(m)} — ${m.perusahaan || '-'}`).join('\n')}`, 'Daftar pengingat disalin.') }, icon('bell', 'sm'), `Salin pengingat (${belum.length} belum)`) : null),
            belum.length ? h('details', { class: 'belum' }, h('summary', {}, `${belum.length} mahasiswa belum mengisi`),
              h('ul', { class: 'list' }, ...belum.map(m => h('li', {}, h('span', { class: 'ico warn' }, icon('clock', 'sm')), h('div', {}, h('strong', {}, studentOf(m)), h('span', {}, [m.perusahaan, m.status].filter(Boolean).join(' · ')))))))
              : target.length ? h('div', { class: 'note' }, icon('check'), h('div', {}, 'Seluruh mahasiswa yang sedang atau telah menyelesaikan magang sudah mengisi penilaian.')) : null));
      }),
      !list.length ? h('div', { class: 'empty' }, icon('link'), h('h3', {}, 'Belum ada data magang'), h('p', {}, 'Silakan tambahkan data penempatan magang terlebih dahulu.')) : null,
    ].filter(Boolean));
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe(render) };
}

export default {
  mount(root) {
    const goWith = (ctx) => (t, preset) => { const inner = ctx.go(t); if (preset && inner && inner.ctx) setTimeout(() => inner.ctx.openForm(preset), 30); };
    return tabPage(root, [
      { id: 'penempatan', label: 'Penempatan', fn: (b) => crudView(penempatanCfg(currentBatch()))(b) },
      { id: 'penilaian', label: 'Penilaian tempat magang', fn: (b, ctx) => penilaian(b, goWith(ctx), currentBatch()) },
      { id: 'respon', label: 'Respon penilaian', fn: (b) => crudView(responCfg(currentBatch()))(b) },
      { id: 'link', label: 'Link form (bit.ly)', fn: (b, ctx) => linkForm(b, goWith(ctx), currentBatch()) },
    ], {
      eyebrow: 'Program', title: 'Data Magang', key: 'tab_mg', def: 'penempatan',
      description: 'Penempatan magang mahasiswa dan penilaian tempat magang. Pilih batch untuk menampilkan datanya di semua tab.',
      actions: (ctx) => [batchSelect({ value: currentBatch(), withAll: true, allValue: 'all', onChange: (v) => { pref.set('mg_batch2', v); ctx.redraw(); } })],
    });
  },
};
