/* =========================================================================
   8. BIODATA DOSEN & PRAKTISI
   Klik baris → profil (termasuk mata kuliah, RPS, dan materi PPT yang terkait).
   Impor langsung dari CSV/Excel Google Form "Data Dosen IBM".
   ========================================================================= */
import { h, icon, badge, docLink, avatar, fmtDateLong, uniq, openDrawer, hasAttachment } from '../ui.js';
import { crudView } from '../crud.js';
import { store } from '../store.js';

export const TIPE = ['Dosen Internal', 'Dosen External'];
/** Tipe dosen: selain Dosen Internal, semuanya Dosen External. Data lama "Dosen LB" / "Dosen Tamu" sudah disesuaikan di store.js. */
export const tipeDosen = (r) => !r || !r.tipe ? '' : r.tipe === 'Dosen Internal' ? 'Dosen Internal' : 'Dosen External';
/** Kunci pencocokan nama tanpa gelar: "Dr. Puji Subekti, S.Si." → "puji subekti" */
export const nameKey = (n) => String(n || '').split(',')[0].replace(/\b(Prof|Dr|Drs|Dra|Ir|Sr|Ms|Mr|Mrs|Hj|H|Pak|Bu)\.?\s+/gi, '').replace(/[^a-zA-Z\s]/g, ' ').trim().toLowerCase().split(/\s+/).slice(0, 2).join(' ');
const matches = (a, b) => { const [a1, a2] = nameKey(a).split(' '), [b1, b2] = nameKey(b).split(' '); return !!a1 && a1 === b1 && (!a2 || !b2 || a2 === b2); };

const sections = [
  { title: 'Identitas', fields: [
    { key: 'nama', label: 'Nama lengkap & gelar', type: 'text', required: true },
    { key: 'tipe', label: 'Tipe', type: 'select', options: TIPE, col: 'third', default: 'Dosen Internal', help: 'Dosen Internal adalah dosen tetap; Dosen External adalah dosen luar atau praktisi yang absensinya dicatat oleh Tim IBM.' },
    { key: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Tidak aktif'], col: 'third', default: 'Aktif' },
    { key: 'nidn', label: 'NIDN / NIP (opsional)', type: 'text', col: 'third' },
    { key: 'instansi', label: 'Instansi / perusahaan', type: 'text', col: 'half' },
    { key: 'jabatan', label: 'Jabatan', type: 'text', col: 'half' },
    { key: 'email', label: 'Email', type: 'email', col: 'half' },
    { key: 'telp', label: 'No. Telp (WA)', type: 'tel', col: 'half' },
    { key: 'tanggal_lahir', label: 'Tanggal lahir', type: 'date', col: 'half' },
    { key: 'alamat', label: 'Alamat', type: 'textarea', rows: 2 },
  ] },
  { title: 'Pendidikan', fields: [
    { key: 's1', label: 'S1 (Sarjana)', type: 'text', col: 'half' },
    { key: 's2', label: 'S2 (Magister)', type: 'text', col: 'half' },
    { key: 's3', label: 'S3 (Doktor)', type: 'text', col: 'half' },
    { key: 'lainnya', label: 'Sertifikasi / pendidikan lain', type: 'text', col: 'half' },
  ] },
  { title: 'Pengalaman & pengajaran', fields: [
    { key: 'mata_kuliah', label: 'Mata kuliah yang diampu', type: 'textarea', rows: 2, help: 'Pisahkan dengan titik koma (;).' },
    { key: 'pengalaman_kerja', label: 'Pengalaman kerja', type: 'textarea', rows: 4 },
    { key: 'pengalaman_organisasi', label: 'Pengalaman organisasi', type: 'textarea', rows: 3 },
  ] },
  { title: 'Administrasi', note: 'Data rekening hanya digunakan untuk keperluan pembayaran honorarium. Dilarang menyimpan kata sandi dalam bentuk apa pun di dashboard ini.', fields: [
    { key: 'rekening', label: 'Rekening bank (no. — atas nama — bank)', type: 'text' },
    { key: 'npwp', label: 'NPWP', type: 'text', col: 'half' },
    { key: 'honor_per_sks', label: 'Honor per pertemuan (opsional)', type: 'money', col: 'half' },
    { key: 'foto_link', label: 'Link foto profesional', type: 'url', col: 'half' },
    { key: 'cv_link', label: 'Link CV', type: 'url', col: 'half' },
    { key: 'dokumen', label: 'Dokumen lain (kontrak, KTP, dsb.)', type: 'attachment', accept: '.pdf,image/*,.doc,.docx' },
  ] },
];

const columns = [
  { key: 'nama', label: 'Nama', main: true, render: r => h('div', { class: 'name-cell' }, avatar(r.nama, r.foto_link, { size: 'sm' }), h('div', {}, h('span', { class: 'primary' }, r.nama), h('span', { class: 'secondary' }, [r.jabatan, r.instansi].filter(Boolean).join(' · ') || '—'))) },
  { key: 'tipe', label: 'Tipe', render: r => h('span', { class: `pill ${r.tipe === 'Dosen External' ? 'gold' : ''}` }, r.tipe || '–') },
  { key: 'mata_kuliah', label: 'Mata kuliah', render: r => r.mata_kuliah ? h('span', { style: { fontSize: '13px' } }, r.mata_kuliah.split(';').map(s => s.trim()).filter(Boolean).slice(0, 3).join(' · ')) : null },
  { key: 'pendidikan', label: 'Pendidikan', value: r => r.s3 ? 'S3' : r.s2 ? 'S2' : r.s1 ? 'S1' : '', render: r => (r.s3 || r.s2 || r.s1) ? h('span', { title: [r.s1, r.s2, r.s3].filter(Boolean).join(' · ') }, r.s3 && !/progress|berjalan/i.test(r.s3) ? 'S3' : r.s2 ? 'S2' : 'S1') : null },
  { key: 'cv', label: 'CV', sortable: false, render: r => r.cv_link ? docLink({ link: r.cv_link, label: 'Lihat CV' }) : null },
  { key: 'status', label: 'Status', render: r => badge(r.status) },
];
const exportCols = sections.flatMap(s => s.fields).filter(f => f.type !== 'attachment').map(f => ({ key: f.key, label: f.label, money: f.type === 'money' }));

function profile(r, ctx) {
  const courses = store.all('courses').filter(c => matches(c.pengampu, r.nama));
  const rps = store.all('rpsTemplates').filter(x => matches(x.dosen_penyusun, r.nama));
  const slots = store.all('schedules').filter(x => matches(x.dosen, r.nama));
  const mats = store.all('materials').filter(x => matches(x.dosen, r.nama));
  const mk = uniq([...(r.mata_kuliah || '').split(';').map(s => s.trim()), ...courses.map(c => c.nama_en)]);
  const dd = (label, val) => val ? [h('dt', {}, label), h('dd', {}, val)] : [];
  const edit = h('button', { class: 'btn btn-primary', type: 'button' }, icon('edit', 'sm'), 'Ubah biodata');
  const d = openDrawer({
    title: 'Profil dosen', body: h('div', { class: 'stack' },
      h('div', { class: 'profile' }, avatar(r.nama, r.foto_link),
        h('div', {}, h('h2', { 'data-raw': '' }, r.nama), h('p', { class: 'muted', style: { margin: '4px 0 8px' } }, [r.jabatan, r.instansi].filter(Boolean).join(' · ') || '—'),
          h('div', { class: 'actions' }, h('span', { class: `pill ${r.tipe === 'Dosen External' ? 'gold' : ''}` }, r.tipe || '–'), badge(r.status),
            r.foto_link ? docLink({ link: r.foto_link, label: 'Foto' }) : null, r.cv_link ? docLink({ link: r.cv_link, label: 'CV' }) : null, hasAttachment(r.dokumen) ? docLink(r.dokumen) : null))),
      h('div', { class: 'card card-pad' }, h('h3', { style: { fontSize: '14px', marginBottom: '10px' } }, 'Mengajar di IBM'),
        mk.length ? h('ul', { style: { margin: 0, paddingLeft: '18px' } }, mk.map(m => h('li', {}, m))) : h('p', { class: 'muted', style: { margin: 0 } }, 'Belum ada mata kuliah tercatat.'),
        h('p', { class: 'muted', style: { margin: '10px 0 0', fontSize: '12.5px' } }, `${slots.length} slot jadwal · ${rps.length} template RPS/OBE · ${mats.length} catatan materi PPT terkait nama ini.`)),
      h('dl', { class: 'dl' },
        ...dd('Email', r.email), ...dd('No. Telp (WA)', r.telp), ...dd('Tanggal lahir', r.tanggal_lahir ? fmtDateLong(r.tanggal_lahir) : ''), ...dd('Alamat', r.alamat),
        ...dd('S1', r.s1), ...dd('S2', r.s2), ...dd('S3', r.s3), ...dd('Lainnya', r.lainnya),
        ...dd('Pengalaman kerja', r.pengalaman_kerja), ...dd('Organisasi', r.pengalaman_organisasi), ...dd('Rekening', r.rekening), ...dd('NPWP', r.npwp))),
    footer: [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => d.close() }, 'Tutup'), edit],
  });
  edit.addEventListener('click', () => { d.close(); ctx.openForm(r); });
}

const view = crudView({
  id: 'lecturers', collection: 'lecturers', noun: 'dosen', title: 'Biodata Dosen', eyebrow: 'Data dosen',
  description: 'Profil pengampu IBM, baik Dosen Internal maupun Dosen External (praktisi industri). Pilih nama dosen untuk melihat profil beserta mata kuliah, RPS, dan materi terkait.',  sections, columns, exportColumns: exportCols, exportName: 'Biodata_Dosen_IBM', sort: { key: 'nama', dir: 'asc' }, unit: 'dosen',
  searchPlaceholder: 'Cari nama, instansi, mata kuliah…',
  search: r => [r.nama, r.instansi, r.jabatan, r.mata_kuliah, r.email, r.s1, r.s2, r.s3].join(' '),
  filters: [
    { key: 'tipe', label: 'Tipe', options: TIPE },
    { key: 'status', label: 'Status', options: ['Aktif', 'Tidak aktif'] },
  ],
  defaults: () => ({ tipe: 'Dosen External', status: 'Aktif' }),
  onRowClick: profile,
  mergeKey: (r) => nameKey(r.nama),
  aliases: {
    nama: ['Full Name', 'Nama'], tanggal_lahir: ['Date of Birth'], alamat: ['Address'], telp: ['Phone Number', 'No HP'],
    s1: ['Bachelor Degree'], s2: ['Master Degree'], s3: ['Doctoral Degree'], lainnya: ['Other Degree'],
    pengalaman_kerja: ['Working Experience'], pengalaman_organisasi: ['Organization Experience'], rekening: ['Bank Account'],
    foto_link: ['Upload your Professional Photo', 'Photo'], cv_link: ['Please Upload your CV', 'CV'], email: ['Email Address'],
  },
  importNote: 'Unduh sheet “Data Dosen IBM 2024” (File → Download → .xlsx/.csv), kemudian pilih berkas tersebut di sini. Kolom Google Form dikenali secara otomatis, dan data dosen dengan nama yang sama akan diperbarui tanpa duplikasi. Kolom “Score” dan “SIMAKA Passwords” sengaja diabaikan karena kata sandi tidak boleh disimpan di dashboard.',
  kpis: (rows) => [
    { label: 'Pengampu', value: rows.length, icon: 'teacher' },
    { label: 'Dosen External', value: rows.filter(r => r.tipe === 'Dosen External').length, sub: 'dosen luar / praktisi', icon: 'handshake', accent: true },
    { label: 'Dosen internal', value: rows.filter(r => r.tipe === 'Dosen Internal').length, icon: 'book' },
    { label: 'CV tersedia', value: `${rows.filter(r => r.cv_link || hasAttachment(r.dokumen)).length} / ${rows.length}`, icon: 'file' },
  ],
});

export default { mount: view };
