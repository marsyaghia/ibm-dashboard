/* =========================================================================
   7. BIODATA MAHASISWA — mengikuti "FORMULIR PENDATAAN MAHASISWA" IBM
   Bisa dicetak kembali ke format formulir (isi maupun kosong).
   ========================================================================= */
import { h, icon, badge, batchName, batchOptions, pct, uniq, esc, fmtDateLong, today, toast } from '../ui.js';
import { crudView } from '../crud.js';
import { store } from '../store.js';
import { CONFIG } from '../config.js';

const AGAMA = ['Islam', 'Kristen Protestan', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya'];
const PENGHASILAN = ['Tidak berpenghasilan', '< Rp500.000', 'Rp500.000 – Rp999.999', 'Rp1.000.000 – Rp1.999.999', 'Rp2.000.000 – Rp4.999.999', 'Rp5.000.000 – Rp20.000.000', '> Rp20.000.000'];
const STATUS = ['Mahasiswa Aktif', 'Cuti', 'Lulus', 'Non-aktif', 'Mengundurkan Diri'];
const DOK_MAGANG = ['CV', 'Surat Permohonan', 'Transkrip Nilai', 'Lainnya'];

export const sections = [
  { title: 'Data pribadi', fields: [
    { key: 'nama', label: 'Nama lengkap', type: 'text', required: true },
    { key: 'nim', label: 'NIM', type: 'text', col: 'half' },
    { key: 'nik', label: 'NIK', type: 'text', col: 'half', placeholder: '16 digit sesuai KTP' },
    { key: 'tempat_lahir', label: 'Tempat lahir', type: 'text', col: 'half' },
    { key: 'tanggal_lahir', label: 'Tanggal lahir', type: 'date', col: 'half' },
    { key: 'jk', label: 'Jenis kelamin', type: 'radio', options: [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }], col: 'half' },
    { key: 'agama', label: 'Agama', type: 'select', options: AGAMA, col: 'half' },
    { key: 'kewarganegaraan', label: 'Kewarganegaraan', type: 'text', col: 'half', default: 'Indonesia' },
    { key: 'telp', label: 'No. Telp (WA)', type: 'tel', col: 'half', placeholder: '08…' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'alamat_ktp', label: 'Alamat lengkap (KTP)', type: 'textarea', rows: 2 },
    { key: 'kota', label: 'Kota', type: 'text', col: 'half' },
    { key: 'kode_pos', label: 'Kode pos', type: 'text', col: 'half' },
  ] },
  { title: 'Data orang tua / wali', fields: [
    { key: 'nama_ayah', label: 'Nama ayah', type: 'text', col: 'half' },
    { key: 'nama_ibu', label: 'Nama ibu', type: 'text', col: 'half' },
    { key: 'telp_ayah', label: 'No. Telp (WA) ayah', type: 'tel', col: 'half' },
    { key: 'telp_ibu', label: 'No. Telp (WA) ibu', type: 'tel', col: 'half' },
    { key: 'pekerjaan_ayah', label: 'Pekerjaan ayah', type: 'text', col: 'half' },
    { key: 'pekerjaan_ibu', label: 'Pekerjaan ibu', type: 'text', col: 'half' },
    { key: 'penghasilan_ayah', label: 'Penghasilan ayah (per bulan)', type: 'select', options: PENGHASILAN, col: 'half' },
    { key: 'penghasilan_ibu', label: 'Penghasilan ibu (per bulan)', type: 'select', options: PENGHASILAN, col: 'half' },
    { key: 'wali_nama', label: 'Nama wali', type: 'text', col: 'third', help: 'Diisi apabila terdapat wali selain orang tua.' },
    { key: 'wali_telp', label: 'No. Telp (WA) wali', type: 'tel', col: 'third' },
    { key: 'wali_hubungan', label: 'Hubungan', type: 'text', col: 'third', placeholder: 'mis. Paman' },
  ] },
  { title: 'Data akademik', fields: [
    { key: 'prodi', label: 'Program studi', type: 'text', col: 'half', default: 'International Business Management' },
    { key: 'fakultas', label: 'Fakultas', type: 'text', col: 'half', default: 'Fakultas Ekonomi dan Bisnis' },
    { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'third' },
    { key: 'angkatan', label: 'Angkatan (tahun masuk)', type: 'number', col: 'third', min: 2015, max: 2100 },
    { key: 'status_mhs', label: 'Status mahasiswa', type: 'select', options: STATUS, col: 'third', default: 'Mahasiswa Aktif' },
  ] },
  { title: 'Skill', fields: [
    { key: 'hardskill_1', label: 'Hardskill 1', type: 'text', col: 'third' },
    { key: 'hardskill_2', label: 'Hardskill 2', type: 'text', col: 'third' },
    { key: 'hardskill_3', label: 'Hardskill 3', type: 'text', col: 'third' },
    { key: 'softskill', label: 'Softskill', type: 'textarea', rows: 2 },
  ] },
  { title: 'Data magang', fields: [
    { key: 'magang_instansi', label: 'Nama instansi / perusahaan', type: 'text' },
    { key: 'magang_alamat', label: 'Alamat instansi', type: 'textarea', rows: 2 },
    { key: 'magang_posisi', label: 'Posisi magang', type: 'text', col: 'half' },
    { key: 'magang_mulai', label: 'Tanggal mulai', type: 'date', col: 'third' },
    { key: 'magang_selesai', label: 'Tanggal selesai', type: 'date', col: 'third' },
    { key: 'pembimbing_lapangan', label: 'Pembimbing lapangan', type: 'text', col: 'half' },
    { key: 'pembimbing_akademik', label: 'Pembimbing akademik', type: 'text', col: 'half' },
    { key: 'dokumen_magang', label: 'Dokumen pendukung', type: 'checks', options: DOK_MAGANG },
    { key: 'berkas_magang', label: 'Berkas dokumen magang', type: 'attachment', accept: '.pdf,.doc,.docx,image/*' },
  ] },
  { title: 'Pernyataan', fields: [
    { key: 'pernyataan', label: 'Pernyataan', type: 'checkbox', groupLabel: 'Pernyataan', checkLabel: 'Saya menyatakan data yang diisikan benar dan dapat dipertanggungjawabkan. Apabila terdapat kekeliruan, saya bersedia menerima konsekuensi yang berlaku.' },
    { key: 'tempat_ttd', label: 'Tempat', type: 'text', col: 'half', default: 'Malang' },
    { key: 'tanggal_ttd', label: 'Tanggal', type: 'date', col: 'half' },
    { key: 'formulir', label: 'Scan formulir bertanda tangan', type: 'attachment', accept: '.pdf,image/*' },
  ] },
];

const CORE = ['nama', 'nim', 'tempat_lahir', 'tanggal_lahir', 'jk', 'agama', 'nik', 'alamat_ktp', 'telp', 'email', 'nama_ayah', 'nama_ibu', 'batch_id'];
export const completeness = (r) => pct(CORE.filter(k => r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '').length, CORE.length);
const magangStatus = (r) => {
  if (!r.magang_instansi) return '';
  const now = today();
  if (r.magang_selesai && r.magang_selesai < now) return 'Selesai';
  if (r.magang_mulai && r.magang_mulai > now) return 'Akan mulai';
  return 'Sedang magang';
};

const columns = [
  { key: 'nama', label: 'Nama', main: true, render: r => h('div', {}, h('span', { class: 'primary' }, r.nama), h('span', { class: 'secondary' }, r.nim || 'NIM belum diisi')) },
  { key: 'batch_id', label: 'Batch', value: r => batchName(r.batch_id), render: r => h('div', {}, batchName(r.batch_id), r.angkatan ? h('span', { class: 'secondary' }, `Angkatan ${r.angkatan}`) : null), nowrap: true },
  { key: 'kontak', label: 'Kontak', value: r => r.telp || r.email || '', render: r => (r.telp || r.email) ? h('div', {}, r.telp || '', r.email ? h('span', { class: 'secondary' }, r.email) : null) : null },
  { key: 'magang_instansi', label: 'Magang', render: r => r.magang_instansi ? h('div', {}, r.magang_instansi, h('span', { class: 'secondary' }, magangStatus(r))) : null },
  { key: 'lengkap', label: 'Biodata', value: completeness, render: r => { const p = completeness(r); return h('div', { class: 'progress-cell' }, h('small', {}, `${p}% lengkap`), h('div', { class: `meter ${p >= 100 ? 'ok' : 'warn'}` }, h('i', { style: { width: `${p}%` } }))); } },
  { key: 'status_mhs', label: 'Status', render: r => badge(r.status_mhs) },
];
const allFields = sections.flatMap(s => s.fields).filter(f => f.type !== 'attachment');
const exportCols = allFields.map(f => ({
  key: f.key, label: f.label,
  value: f.key === 'batch_id' ? (r => batchName(r.batch_id)) : f.key === 'jk' ? (r => ({ L: 'Laki-laki', P: 'Perempuan' }[r.jk] || '')) : f.type === 'checkbox' ? (r => r[f.key] ? 'Ya' : '') : undefined,
})).concat([{ key: 'lengkap', label: 'Kelengkapan Biodata (%)', value: completeness }]);

/* ---------- Cetak formulir (format Word FORMULIR PENDATAAN MAHASISWA) ---------- */
export function printForm(r = {}) {
  const v = (k) => esc(r[k] ?? '');
  const prof = store.setting('profil');
  const row = (label, value) => `<tr><td class="l">${label}</td><td class="c">:</td><td class="v">${value || '&nbsp;'}</td></tr>`;
  const box = (on) => on ? '☑' : '☐';
  const inc = (k) => PENGHASILAN.map(o => `<div>${box(r[k] === o)} ${esc(o)}</div>`).join('');
  const docs = Array.isArray(r.dokumen_magang) ? r.dokumen_magang : [];
  const logo = new URL('assets/img/logo.svg', location.href).href;
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Formulir Pendataan — ${v('nama') || 'Kosong'}</title>
<style>
  @page { size: A4; margin: 16mm 16mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: "Inter", Arial, sans-serif; color: #0F1A33; font-size: 11pt; margin: 0; }
  header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #173671; padding-bottom: 10px; margin-bottom: 14px; }
  header img { width: 54px; height: 54px; }
  header h1 { font-size: 15pt; margin: 0; letter-spacing: .02em; }
  header p { margin: 2px 0 0; font-size: 10pt; color: #33415C; font-weight: 600; }
  h2 { font-size: 10.5pt; letter-spacing: .06em; text-transform: uppercase; background: #EEF2F9; color: #173671; padding: 5px 8px; margin: 16px 0 6px; border-left: 4px solid #EBB213; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 4px; vertical-align: top; }
  td.l { width: 34%; } td.c { width: 2%; } td.v { border-bottom: 1px dotted #8CA2D2; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
  .opts div { padding: 1px 0; }
  .stmt { margin-top: 16px; font-size: 10.5pt; line-height: 1.5; }
  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 40px; margin-top: 18px; text-align: center; font-size: 10.5pt; }
  .sign .sp { height: 64px; }
  .sign .n { border-top: 1px solid #0F1A33; padding-top: 4px; font-weight: 600; min-height: 1.4em; }
  .note { font-size: 9pt; color: #5B6882; }
  @media screen { body { max-width: 820px; margin: 24px auto; padding: 0 24px; } }
</style></head><body>
<header><img src="${logo}" alt=""><div><h1>FORMULIR PENDATAAN MAHASISWA</h1><p>${esc(CONFIG.app.program.toUpperCase())} · ${esc(CONFIG.app.org.toUpperCase())}</p></div></header>
<h2>Data pribadi</h2><table>
${row('Nama Lengkap', v('nama'))}${row('NIM', v('nim'))}${row('Tempat/Tanggal Lahir', [v('tempat_lahir'), r.tanggal_lahir ? fmtDateLong(r.tanggal_lahir) : ''].filter(Boolean).join(', '))}
${row('Jenis Kelamin (P/L)', r.jk ? (r.jk === 'L' ? 'L (Laki-laki)' : 'P (Perempuan)') : '')}${row('Agama', v('agama'))}${row('Kewarganegaraan', v('kewarganegaraan'))}${row('NIK', v('nik'))}
${row('Alamat Lengkap KTP', v('alamat_ktp'))}${row('Kota', v('kota'))}${row('Kode Pos', v('kode_pos'))}${row('No. Telp (WA)', v('telp'))}${row('Email', v('email'))}
</table>
<h2>Data orangtua / wali</h2><table>
${row('Nama Orangtua', `Ayah: ${v('nama_ayah')}<br>Ibu: ${v('nama_ibu')}`)}${row('No. Telp (WA)', `Ayah: ${v('telp_ayah')}<br>Ibu: ${v('telp_ibu')}`)}${row('Pekerjaan', `Ayah: ${v('pekerjaan_ayah')}<br>Ibu: ${v('pekerjaan_ibu')}`)}
</table>
<div class="two"><table>${row('Penghasilan Ayah', `<div class="opts">${inc('penghasilan_ayah')}</div>`)}</table><table>${row('Penghasilan Ibu', `<div class="opts">${inc('penghasilan_ibu')}</div>`)}</table></div>
<table>${row('Wali', `Nama: ${v('wali_nama')}<br>No. Telp (WA): ${v('wali_telp')}<br>Hubungan: ${v('wali_hubungan')}`)}</table>
<h2>Data akademik</h2><table>
${row('Program Studi', v('prodi') || 'International Business Management')}${row('Fakultas', v('fakultas') || esc(prof.fakultas || ''))}${row('Angkatan (Tahun Masuk)', v('angkatan'))}${row('Batch', r.batch_id ? esc(batchName(r.batch_id)) : '')}${row('Status Mahasiswa', v('status_mhs'))}
</table>
<h2>Skill</h2><table>${row('Hardskill 1', v('hardskill_1'))}${row('Hardskill 2', v('hardskill_2'))}${row('Hardskill 3', v('hardskill_3'))}${row('Softskill', v('softskill'))}</table>
<h2>Data magang</h2><table>
${row('Nama Instansi/Perusahaan', v('magang_instansi'))}${row('Alamat Instansi', v('magang_alamat'))}${row('Posisi Magang (jika ada)', v('magang_posisi'))}
${row('Tanggal Mulai Magang', r.magang_mulai ? fmtDateLong(r.magang_mulai) : '')}${row('Tanggal Selesai Magang', r.magang_selesai ? fmtDateLong(r.magang_selesai) : '')}
${row('Pembimbing Lapangan', v('pembimbing_lapangan'))}${row('Pembimbing Akademik', v('pembimbing_akademik'))}
${row('Dokumen Pendukung', `<div class="opts">${DOK_MAGANG.map(d => `<div>${box(docs.includes(d))} ${d}</div>`).join('')}</div>`)}
</table>
<p class="stmt">Saya yang bertanda tangan di bawah ini menyatakan bahwa data yang saya isikan adalah benar dan dapat dipertanggungjawabkan. Apabila terdapat kekeliruan, saya bersedia menerima konsekuensi yang berlaku.</p>
<p class="stmt" style="text-align:right">${v('tempat_ttd') || '__________'}, ${r.tanggal_ttd ? fmtDateLong(r.tanggal_ttd) : '___ / ___ / 20___'}</p>
<div class="sign">
  <div>Orangtua<div class="sp"></div><div class="n">${v('nama_ayah') || v('nama_ibu') || ''}</div></div>
  <div>Nama Mahasiswa<div class="sp"></div><div class="n">${v('nama')}</div></div>
  <div>Rektor Institut Asia<div class="sp"></div><div class="n">${esc(prof.rektor || '')}</div></div>
  <div>Koordinator IBM<div class="sp"></div><div class="n">${esc(prof.koordinator || '')}</div></div>
</div>
<p class="note" style="margin-top:18px">Dicetak dari Dashboard IBM · ${fmtDateLong(today())}</p>
</body></html>`;
  const w = window.open('', '_blank');
  if (!w) { toast('Izinkan pop-up untuk mencetak formulir.', 'bad'); return; }
  w.document.open(); w.document.write(html); w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* abaikan */ } }, 600);
}

const view = crudView({
  id: 'students', collection: 'students', noun: 'mahasiswa', title: 'Biodata Mahasiswa', eyebrow: 'Data mahasiswa',
  description: 'Biodata lengkap mahasiswa IBM sesuai Formulir Pendataan Mahasiswa. Setiap data dapat dicetak kembali dalam format formulir untuk ditandatangani.',
  sections, columns, exportColumns: exportCols, exportName: 'Biodata_Mahasiswa_IBM', sort: { key: 'nama', dir: 'asc' }, unit: 'mahasiswa',
  searchPlaceholder: 'Cari nama, NIM, email, instansi magang…',
  search: r => [r.nama, r.nim, r.email, r.telp, r.kota, r.magang_instansi, r.nik].join(' '),
  filters: [
    { key: 'batch_id', label: 'Batch', options: () => batchOptions() },
    { key: 'status_mhs', label: 'Status', options: STATUS },
    { key: 'lengkap', label: 'Biodata', all: 'Semua biodata', options: [{ value: 'lengkap', label: 'Biodata lengkap' }, { value: 'belum', label: 'Belum lengkap' }], match: (r, v) => (completeness(r) >= 100) === (v === 'lengkap') },
    { key: 'magang', label: 'Magang', all: 'Semua (magang)', options: ['Sedang magang', 'Selesai', 'Akan mulai', 'Belum ada data'], match: (r, v) => (magangStatus(r) || 'Belum ada data') === v },
  ],
  defaults: () => ({ prodi: 'International Business Management', fakultas: 'Fakultas Ekonomi dan Bisnis', status_mhs: 'Mahasiswa Aktif', kewarganegaraan: 'Indonesia', tempat_ttd: 'Malang' }),
  mergeKey: (r) => r.nim ? `nim:${r.nim}` : `nama:${String(r.nama || '').toLowerCase().trim()}`,
  beforeSave: (r) => { if (!r.angkatan && r.batch_id) { const b = store.get('batches', r.batch_id); if (b) r.angkatan = b.angkatan; } return r; },
  drawerTitle: (r) => r.nama, drawerSubtitle: (r, isNew) => isNew ? 'Formulir Pendataan Mahasiswa IBM' : `${batchName(r.batch_id)} · ${r.nim || 'NIM belum diisi'}`,
  drawerFooter: (r) => [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => printForm(r) }, icon('print', 'sm'), 'Cetak formulir')],
  rowExtra: (r) => [h('button', { class: 'btn btn-icon', type: 'button', title: 'Cetak formulir', 'aria-label': 'Cetak formulir', onclick: () => printForm(r) }, icon('print', 'sm'))],
  extraActions: () => [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => printForm({}) }, icon('print'), 'Formulir kosong')],
  kpis: (rows) => {
    const aktif = rows.filter(r => r.status_mhs === 'Mahasiswa Aktif').length;
    const full = rows.filter(r => completeness(r) >= 100).length;
    return [
      { label: 'Mahasiswa', value: rows.length, sub: `${uniq(rows.map(r => r.batch_id)).length} batch`, icon: 'users' },
      { label: 'Mahasiswa aktif', value: aktif, icon: 'check' },
      { label: 'Biodata lengkap', value: `${pct(full, rows.length)}%`, sub: `${full} dari ${rows.length}`, meter: pct(full, rows.length), meterTone: 'ok', icon: 'file', accent: true },
      { label: 'Sedang magang', value: rows.filter(r => magangStatus(r) === 'Sedang magang').length, icon: 'globe' },
    ];
  },
  aliases: { nama: ['Nama Lengkap', 'Student Name', 'Nama Mahasiswa'], telp: ['No. Telp', 'No HP', 'WhatsApp', 'WA'], batch_id: ['Batch'], jk: ['Jenis Kelamin (P/L)', 'Gender'] },
  importNote: 'Dapat digunakan untuk hasil ekspor Google Form pendataan. Kolom seperti “Nama Lengkap”, “NIM”, dan “Email” dikenali secara otomatis; batch dapat ditulis sebagai “Batch 2” atau tahun angkatan “2024”.',
});

export default { mount: view };
