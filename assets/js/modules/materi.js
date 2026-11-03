/* =========================================================================
   4. MATERI MENGAJAR & LINK PPT DOSEN
   Pelacakan materi per mata kuliah — tidak hanya bergantung pada Google Classroom.
   ========================================================================= */
import { h, icon, badge, docLink, hasAttachment, batchName, batchOptions, uniq, pct, fmtNum } from '../ui.js';
import { crudView } from '../crud.js';
import { store } from '../store.js';
import { periodeOptions as calPeriode } from '../jadwal-lib.js';

const PRODI = ['IBM', 'Manajemen', 'Akuntansi', 'Lainnya'];
const STATUS = ['Lengkap', 'Belum Lengkap'];
const periodeOptions = () => {
  const list = []; for (let y = 2024; y <= new Date().getFullYear() + 1; y++) list.push(`Ganjil ${y}/${y + 1}`, `Genap ${y}/${y + 1}`);
  return uniq([...store.all('materials').map(r => r.periode), ...calPeriode(), ...list]).sort((a, b) => b.localeCompare(a, 'id', { numeric: true }));
};
const progress = (r) => {
  const t = Number(r.target_pertemuan) || 14; const a = Number(r.pertemuan_tersedia) || 0;
  return { a, t, p: Math.min(100, pct(a, t)) };
};

const sections = [
  { title: 'Mata kuliah', fields: [
    { key: 'mata_kuliah', label: 'Mata kuliah', type: 'text', required: true },
    { key: 'dosen', label: 'Dosen pengampu', type: 'text', required: true, col: 'half' },
    { key: 'prodi', label: 'Prodi / kelas', type: 'select', options: PRODI, col: 'half', default: 'IBM' },
    { key: 'periode', label: 'Semester / periode', type: 'select', options: periodeOptions, required: true, col: 'half' },
    { key: 'batch_id', label: 'Batch (opsional)', type: 'batch', allowAll: true, col: 'half', placeholder: '— Tidak spesifik —' },
  ] },
  { title: 'Materi', fields: [
    { key: 'materi', label: 'Folder / berkas PPT', type: 'attachment', accept: '.ppt,.pptx,.pdf,.zip', help: 'Disarankan menggunakan tautan folder Google Drive agar dosen dapat menambahkan materi secara berkelanjutan.' },
    { key: 'pertemuan_tersedia', label: 'Pertemuan tersedia', type: 'number', col: 'third', min: 0, max: 32 },
    { key: 'target_pertemuan', label: 'Target pertemuan', type: 'number', col: 'third', default: 14, min: 1, max: 32 },
    { key: 'status', label: 'Status', type: 'select', options: STATUS, col: 'third', default: 'Belum Lengkap' },
    { key: 'cakupan', label: 'Keterangan cakupan', type: 'text', placeholder: 'mis. Pertemuan 1-14, atau Modul', col: 'half' },
    { key: 'gclassroom', label: 'Link Google Classroom', type: 'url', col: 'half' },
    { key: 'catatan', label: 'Catatan', type: 'textarea' },
  ] },
];

const columns = [
  { key: 'mata_kuliah', label: 'Mata kuliah', main: true, minWidth: '240px', render: r => h('div', {}, h('span', { class: 'primary' }, r.mata_kuliah), ' ', h('span', { class: `pill ${r.prodi === 'IBM' ? 'gold' : ''}` }, r.prodi || '–'), h('span', { class: 'secondary' }, r.dosen)) },
  { key: 'periode', label: 'Periode', nowrap: true, render: r => h('div', {}, r.periode || '–', r.batch_id && r.batch_id !== 'all' ? h('span', { class: 'secondary' }, batchName(r.batch_id)) : null) },
  { key: 'materi', label: 'Materi PPT', sortable: false, render: r => h('div', { class: 'doc-links' }, docLink(r.materi, 'Belum ada link'), r.gclassroom ? h('a', { class: 'doc-link', href: r.gclassroom, target: '_blank', rel: 'noopener', onclick: e => e.stopPropagation() }, icon('external', 'sm'), h('span', {}, 'Classroom')) : null) },
  { key: 'progres', label: 'Pertemuan', value: r => progress(r).p, render: r => { const p = progress(r); return h('div', { class: 'progress-cell' }, h('small', {}, `${p.a} / ${p.t}${r.cakupan && !/pertemuan/i.test(r.cakupan) ? ` · ${r.cakupan}` : ''}`), h('div', { class: `meter ${p.p >= 100 ? 'ok' : 'warn'}` }, h('i', { style: { width: `${p.p}%` } }))); } },
  { key: 'status', label: 'Status', render: r => badge(r.status) },
];
const exportCols = [
  { key: 'mata_kuliah', label: 'Mata Kuliah' }, { key: 'dosen', label: 'Dosen' }, { key: 'prodi', label: 'Prodi' }, { key: 'periode', label: 'Semester' },
  { key: 'batch_id', label: 'Batch', value: r => r.batch_id ? batchName(r.batch_id) : '' },
  { key: 'materi', label: 'Link PPT', value: r => (r.materi && (r.materi.link || (r.materi.file && r.materi.file.name))) || '' },
  { key: 'cakupan', label: 'Pertemuan' }, { key: 'pertemuan_tersedia', label: 'Pertemuan Tersedia' }, { key: 'target_pertemuan', label: 'Target' },
  { key: 'status', label: 'Ket' }, { key: 'gclassroom', label: 'Google Classroom' }, { key: 'catatan', label: 'Catatan' },
];

const view = crudView({
  id: 'materials', collection: 'materials', noun: 'materi', title: 'Materi Mengajar & Link PPT', eyebrow: 'Akademik',
  description: 'Daftar materi dan folder PPT setiap mata kuliah dari masing-masing dosen, sehingga kemajuan penyusunan materi dapat dipantau di luar Google Classroom. Data awal bersumber dari sheet “MATKUL DAN LINK PPT” FEB 2025/2026.',
  sections, columns, exportColumns: exportCols, exportName: 'Materi_PPT_Dosen', sort: { key: 'mata_kuliah', dir: 'asc' },
  searchPlaceholder: 'Cari mata kuliah atau dosen…',
  search: r => [r.mata_kuliah, r.dosen, r.prodi, r.periode, r.catatan].join(' '),
  filters: [
    { key: 'prodi', label: 'Prodi', options: () => uniq([...PRODI, ...store.all('materials').map(r => r.prodi)]) },
    { key: 'periode', label: 'Periode', options: () => uniq(store.all('materials').map(r => r.periode)).sort().reverse() },
    { key: 'status', label: 'Status', options: STATUS },
    { key: 'link_ada', label: 'Link', all: 'Semua link', options: [{ value: 'ya', label: 'Ada link' }, { value: 'tidak', label: 'Belum ada link' }], match: (r, v) => (v === 'ya') === hasAttachment(r.materi) },
  ],
  defaults: () => ({ prodi: 'IBM', target_pertemuan: 14, status: 'Belum Lengkap' }),
  kpis: (rows) => {
    const done = rows.filter(r => r.status === 'Lengkap').length; const nolink = rows.filter(r => !hasAttachment(r.materi)).length;
    return [
      { label: 'Mata kuliah', value: rows.length, sub: `${uniq(rows.map(r => r.dosen)).length} dosen`, icon: 'slides' },
      { label: 'Materi lengkap', value: `${pct(done, rows.length)}%`, sub: `${done} dari ${rows.length}`, meter: pct(done, rows.length), meterTone: 'ok', icon: 'check', accent: true },
      { label: 'Belum lengkap', value: rows.length - done, sub: 'perlu ditindaklanjuti', icon: 'alert' },
      { label: 'Belum ada link', value: nolink, sub: 'materi belum dikumpulkan', icon: 'link' },
    ];
  },
  above: (rows) => {
    const by = {};
    rows.forEach(r => { const d = r.dosen || '—'; (by[d] || (by[d] = { n: 0, belum: 0, nolink: 0 })); by[d].n++; if (r.status !== 'Lengkap') by[d].belum++; if (!hasAttachment(r.materi)) by[d].nolink++; });
    const list = Object.entries(by).filter(([, v]) => v.belum).sort((a, b) => b[1].belum - a[1].belum).slice(0, 6);
    if (!list.length) return null;
    return h('div', { class: 'card', style: { marginBottom: '16px' } },
      h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Perlu ditindaklanjuti'), h('p', {}, 'Dosen dengan materi belum lengkap (sesuai filter)'))),
      h('div', { class: 'table-wrap' }, h('table', { class: 'tbl compact' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Dosen'), h('th', { class: 'right' }, 'Mata kuliah'), h('th', { class: 'right' }, 'Belum lengkap'), h('th', { class: 'right' }, 'Tanpa link'))),
        h('tbody', {}, list.map(([d, v]) => h('tr', {}, h('td', {}, h('span', { class: 'primary' }, d)), h('td', { class: 'right num' }, fmtNum(v.n)), h('td', { class: 'right num' }, fmtNum(v.belum)), h('td', { class: 'right num' }, fmtNum(v.nolink))))))));
  },
  aliases: { mata_kuliah: ['MATA KULIAH', 'Matkul'], dosen: ['DOSEN'], prodi: ['PRODI'], periode: ['SEMESTER'], materi: ['LINK PPT', 'Link'], cakupan: ['PERTEMUAN'], status: ['KET', 'Keterangan'] },
  importNote: 'Format sheet “MATKUL DAN LINK PPT” (NO, MATA KULIAH, DOSEN, PRODI, SEMESTER, LINK PPT, PERTEMUAN, KET) dikenali secara otomatis. Silakan pilih berkas .xlsx/.csv hasil unduhan dari Google Sheets.',
  beforeSave: (r) => {
    if ((r.pertemuan_tersedia === '' || r.pertemuan_tersedia === undefined) && r.cakupan) { const m = /(\d+)\s*-\s*(\d+)/.exec(r.cakupan); if (m) r.pertemuan_tersedia = Number(m[2]); }
    return r;
  },
});

export default { mount: view };
