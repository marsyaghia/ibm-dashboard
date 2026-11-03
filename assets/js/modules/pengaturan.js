/* =========================================================================
   12. PENGATURAN — kebutuhan operasional Divisi IBM
   • Umum            : profil divisi, penandatangan, parameter akademik & Trent
   • Daftar pilihan  : kategori/jenis/metode/ruang yang muncul di formulir
   • Batch & Kurikulum (master data)
   • Akun superadmin : siapa yang bisa masuk, ganti kata sandi
   • Data & impor    : template CSV per tabel Supabase, cadangan, ekspor
   ========================================================================= */
import { h, icon, clear, badge, tabPage, toast, confirmDialog, fmtDateLong, sum, openModal } from '../ui.js';
import { crudView, kpiRow } from '../crud.js';
import { buildForm } from '../form.js';
import { dataTable } from '../table.js';
import { exportWorkbook } from '../io.js';
import { store, COLLECTIONS } from '../store.js';
import { SCHEMA, dbColumns, toRow } from '../schema.js';
import { download } from '../lib/sheet.js';
import { CONFIG } from '../config.js';

const head = (eyebrow, title, desc, ...actions) => h('div', { class: 'page-head' },
  h('div', {}, h('span', { class: 'eyebrow' }, eyebrow), h('h1', {}, title), desc ? h('p', {}, desc) : null),
  actions.length ? h('div', { class: 'actions no-print' }, ...actions) : null);

/* =================== Umum =================== */
const PROFIL = [{ title: 'Profil divisi', note: 'Digunakan pada sapaan Dashboard, kop laporan, dan formulir cetak (tanda tangan Rektor dan Koordinator IBM).', fields: [
  { key: 'nama_divisi', label: 'Nama divisi', type: 'text', required: true },
  { key: 'koordinator', label: 'Koordinator IBM (nama & gelar)', type: 'text', col: 'half' },
  { key: 'rektor', label: 'Rektor (nama & gelar)', type: 'text', col: 'half' },
  { key: 'fakultas', label: 'Fakultas', type: 'text', col: 'half' },
  { key: 'kota', label: 'Kota', type: 'text', col: 'half' },
  { key: 'email', label: 'Email divisi', type: 'email', col: 'half' },
  { key: 'telepon', label: 'Telepon / WA divisi', type: 'tel', col: 'half' },
] }];
const AKADEMIK = [{ title: 'Parameter akademik & Trent', note: 'Nilai bawaan yang digunakan saat membuat slot jadwal baru dan menghitung tagihan Trent. Tanggal UTS/UAS yang pasti tetap mengacu pada Kalender akademik.', fields: [
  { key: 'target_pertemuan', label: 'Jumlah pertemuan per semester', type: 'number', col: 'third', min: 1, max: 32 },
  { key: 'minggu_uts', label: 'Pertemuan UTS (bila kalender kosong)', type: 'number', col: 'third', min: 1, max: 32 },
  { key: 'minggu_uas', label: 'Pertemuan UAS (bila kalender kosong)', type: 'number', col: 'third', min: 1, max: 32 },
  { key: 'tarif_trent_sgd', label: 'Tarif Trent per mahasiswa per mata kuliah', type: 'decimal', prefix: 'S$', col: 'half' },
  { key: 'gst_trent', label: 'GST Trent (%)', type: 'number', col: 'half', min: 0, max: 100, step: 0.5 },
] }];
function settingCard(key, sections) {
  const form = buildForm(sections, store.setting(key));
  const save = h('button', { class: 'btn btn-primary', type: 'button' }, icon('check'), 'Simpan');
  const reset = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Kembalikan bawaan');
  save.addEventListener('click', async () => { const v = await form.collect(); if (!v) return; save.disabled = true; try { await store.saveSetting(key, v); toast('Pengaturan disimpan.', 'ok'); } catch (e) { toast(e.message, 'bad'); } save.disabled = false; });
  reset.addEventListener('click', async () => { if (await confirmDialog('Kembalikan ke nilai bawaan?', { okText: 'Kembalikan', danger: false })) { await store.saveSetting(key, CONFIG.defaults[key]); toast('Dikembalikan ke nilai bawaan.', 'ok'); } });
  return h('div', { class: 'card card-pad' }, form.el, h('div', { class: 'actions', style: { justifyContent: 'flex-end', marginTop: '8px' } }, reset, save));
}
function umum(root) {
  const draw = () => { clear(root); root.append(head('Pengaturan', 'Pengaturan umum', 'Identitas divisi dan parameter operasional yang digunakan di seluruh menu.'), h('div', { class: 'grid grid-2' }, settingCard('profil', PROFIL), settingCard('akademik', AKADEMIK))); };
  draw(); return { destroy: store.subscribe((c) => { if (c === 'settings' || c === '*') draw(); }) };
}

/* =================== Daftar pilihan =================== */
const LISTS = [
  ['kategori_pengeluaran', 'Kategori pengeluaran', 'Pengeluaran Divisi'],
  ['metode_bayar', 'Metode pembayaran', 'Pengeluaran, Immersion'],
  ['jenis_sertifikat', 'Jenis sertifikat', 'Sertifikat Mahasiswa'],
  ['kategori_immersion', 'Kategori kas immersion', 'Immersion'],
  ['bidang_magang', 'Bidang magang', 'Data Magang'],
  ['ruang', 'Ruang kelas', 'Jadwal Kuliah'],
];
function daftar(root) {
  function draw() {
    clear(root);
    const cur = store.setting('daftar'); const areas = {};
    const save = h('button', { class: 'btn btn-primary', type: 'button' }, icon('check'), 'Simpan semua daftar');
    save.addEventListener('click', async () => {
      const v = Object.fromEntries(Object.entries(areas).map(([k, ta]) => [k, ta.value.split('\n').map(s => s.trim()).filter(Boolean)]));
      if (Object.values(v).some(a => !a.length)) return toast('Setiap daftar minimal berisi satu pilihan.', 'bad');
      save.disabled = true; try { await store.saveSetting('daftar', v); toast('Daftar pilihan disimpan.', 'ok'); } catch (e) { toast(e.message, 'bad'); } save.disabled = false;
    });
    root.append(head('Pengaturan', 'Daftar pilihan', 'Daftar pilihan yang ditampilkan pada dropdown formulir. Tulis satu pilihan per baris. Perubahan nama pilihan tidak memengaruhi data yang sudah ada; data tersebut tetap ditampilkan dan dapat difilter.', save),
      h('div', { class: 'grid grid-3' }, LISTS.map(([k, label, used]) => {
        const ta = h('textarea', { class: 'textarea', rows: 9, 'aria-label': label }); ta.value = (cur[k] || []).join('\n'); areas[k] = ta;
        return h('div', { class: 'card card-pad' }, h('h3', { style: { fontSize: '14.5px' } }, label), h('p', { class: 'muted', style: { margin: '2px 0 10px', fontSize: '12.5px' } }, `Digunakan di: ${used}`), ta,
          h('button', { class: 'doc-link', type: 'button', style: { marginTop: '8px' }, onclick: () => { ta.value = (CONFIG.defaults.daftar[k] || []).join('\n'); } }, icon('refresh', 'sm'), h('span', {}, 'Isi nilai bawaan')));
      })));
  }
  draw(); return { destroy: store.subscribe((c) => { if (c === '*') draw(); }) };
}

/* =================== Batch =================== */
const batchView = crudView({
  id: 'batches', collection: 'batches', noun: 'batch', title: 'Batch', eyebrow: 'Pengaturan · Master data',
  description: 'Daftar angkatan program IBM. Kode batch (B1, B2, dst.) digunakan sebagai batch_id pada seluruh tabel impor CSV.',
  sections: [{ fields: [
    { key: 'id', label: 'Kode batch', type: 'text', required: true, col: 'third', placeholder: 'mis. B5', help: 'Tidak dapat diubah setelah disimpan.' },
    { key: 'nama', label: 'Nama batch', type: 'text', required: true, col: 'third', placeholder: 'mis. Batch 5' },
    { key: 'angkatan', label: 'Tahun angkatan', type: 'number', required: true, col: 'third', min: 2015, max: 2100 },
    { key: 'periode', label: 'Periode studi', type: 'text', col: 'half', placeholder: 'mis. 2027 – 2031' },
    { key: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Lulus', 'Belum mulai'], col: 'half', default: 'Aktif' },
    { key: 'catatan', label: 'Catatan', type: 'textarea', rows: 2 },
  ] }],
  columns: [
    { key: 'nama', label: 'Batch', main: true, render: r => h('div', {}, h('span', { class: 'primary' }, r.nama), h('span', { class: 'secondary' }, `Kode ${r.id}`)) },
    { key: 'angkatan', label: 'Angkatan', align: 'right', value: r => Number(r.angkatan) || 0 },
    { key: 'periode', label: 'Periode' },
    { key: 'mhs', label: 'Mahasiswa', align: 'right', value: r => store.all('students').filter(s => s.batch_id === r.id).length },
    { key: 'status', label: 'Status', render: r => badge(r.status) },
  ],
  sort: { key: 'angkatan', dir: 'asc' }, exportName: 'Batch_IBM',
  beforeSave: (r, prev) => ({ ...r, id: (prev && prev.id) || String(r.id || '').trim().toUpperCase(), angkatan: Number(r.angkatan) || r.angkatan }),
});

/* =================== Kurikulum =================== */
const RUMPUN = ['MKD', 'MKF', 'MKI', 'MKP', 'MKPil', 'MKL', 'MKK', 'IBM Activity'];
const kurikulumView = crudView({
  id: 'courses', collection: 'courses', noun: 'mata kuliah', title: 'Kurikulum IBM (CSPP)', eyebrow: 'Pengaturan · Master data',
  description: 'Daftar mata kuliah per semester yang menjadi acuan menu RPS & OBE, Jadwal Kuliah, dan Trent. MKD Dikti · MKF Fakultas · MKI Institut · MKP Prodi · MKPil Pilihan · MKL Lintas Prodi · MKK Konsentrasi.',
  sections: [{ fields: [
    { key: 'semester', label: 'Semester', type: 'number', required: true, col: 'third', min: 1, max: 8 },
    { key: 'kode', label: 'Kode', type: 'text', col: 'third' },
    { key: 'sks', label: 'SKS', type: 'number', col: 'third', min: 0, max: 12 },
    { key: 'nama_en', label: 'Nama mata kuliah (EN)', type: 'text', required: true },
    { key: 'nama_id', label: 'Nama mata kuliah (ID)', type: 'text' },
    { key: 'rumpun', label: 'Rumpun', type: 'select', options: RUMPUN, col: 'third' },
    { key: 'mode', label: 'Mode', type: 'select', options: ['Onsite', 'Hybrid', 'Online', 'Konversi Magang', 'Immersion'], col: 'third', default: 'Onsite' },
    { key: 'trent_code', label: 'Kode Trent', type: 'select', col: 'third', options: () => store.all('trentSubjects').map(s => ({ value: s.kode, label: `${s.kode} · ${s.nama}` })), placeholder: '— Bukan Trent —' },
    { key: 'pengampu', label: 'Pengampu', type: 'select', options: (r) => [...new Set([...store.all('lecturers').map(l => l.nama).sort(), r && r.pengampu].filter(Boolean))], col: 'half', placeholder: '— Pilih / kosongkan —' },
    { key: 'jenis_pengampu', label: 'Jenis pengampu', type: 'select', options: ['Dosen Internal', 'Dosen External', 'Ikut Fakultas'], col: 'half' },
    { key: 'mitra', label: 'Mitra / asal', type: 'text', col: 'half' },
    { key: 'obe', label: 'OBE', type: 'checkbox', checkLabel: 'Menggunakan penilaian OBE', groupLabel: 'Penilaian', col: 'half' },
  ] }],
  columns: [
    { key: 'nama_en', label: 'Mata kuliah', main: true, render: r => h('div', {}, h('span', { class: 'primary' }, r.nama_en), r.trent_code ? h('span', { class: 'pill gold', style: { marginLeft: '6px' } }, r.trent_code) : null, h('span', { class: 'secondary' }, [r.kode, r.nama_id].filter(Boolean).join(' · '))) },
    { key: 'semester', label: 'Semester', align: 'center', value: r => Number(r.semester) || 0 },
    { key: 'sks', label: 'SKS', align: 'right', value: r => Number(r.sks) || 0 },
    { key: 'rumpun', label: 'Rumpun', render: r => r.rumpun ? h('span', { class: 'pill' }, r.rumpun) : null },
    { key: 'pengampu', label: 'Pengampu', render: r => h('div', {}, r.pengampu || '–', h('span', { class: 'secondary' }, r.jenis_pengampu || '')) },
    { key: 'mode', label: 'Mode' },
  ],
  filters: [
    { key: 'semester', label: 'Semester', options: ['1', '2', '3', '4', '5', '6', '7', '8'].map(s => ({ value: s, label: `Semester ${s}` })), match: (r, v) => String(r.semester) === v },
    { key: 'rumpun', label: 'Rumpun', options: RUMPUN },
    { key: 'jenis_pengampu', label: 'Jenis pengampu', options: ['Dosen Internal', 'Dosen External', 'Ikut Fakultas'] },
  ],
  sort: { key: 'semester', dir: 'asc' }, pageSize: 100, exportName: 'Kurikulum_IBM', groupBy: null,
  kpis: (rows) => [
    { label: 'Mata kuliah', value: rows.length, icon: 'book' },
    { label: 'Total SKS', value: sum(rows, r => Number(r.sks) || 0), icon: 'layers', accent: true },
    { label: 'Diampu Dosen External', value: rows.filter(r => r.jenis_pengampu === 'Dosen External').length, icon: 'teacher' },
    { label: 'Mata kuliah Trent', value: rows.filter(r => r.trent_code).length, icon: 'handshake' },
  ],
  mergeKey: (r) => r.kode ? `k:${r.kode}` : `n:${String(r.nama_en || '').toLowerCase()}`,
  beforeSave: (r) => ({ ...r, semester: Number(r.semester) || r.semester, sks: Number(r.sks) || r.sks }),
});

/* =================== Akun superadmin =================== */
function akun(root) {
  const box = h('div'); root.appendChild(box);
  const p = store.profile || {};
  const pw1 = h('input', { class: 'input', type: 'password', minlength: 8, autocomplete: 'new-password', id: 'pw1' });
  const pw2 = h('input', { class: 'input', type: 'password', minlength: 8, autocomplete: 'new-password', id: 'pw2' });
  const pwBtn = h('button', { class: 'btn btn-primary', type: 'button', disabled: store.mode === 'demo' }, icon('key'), 'Ganti kata sandi');
  pwBtn.addEventListener('click', async () => {
    if (pw1.value.length < 8) return toast('Kata sandi minimal 8 karakter.', 'bad');
    if (pw1.value !== pw2.value) return toast('Konfirmasi kata sandi tidak sama.', 'bad');
    pwBtn.disabled = true; try { await store.updatePassword(pw1.value); pw1.value = pw2.value = ''; toast('Kata sandi diperbarui.', 'ok'); } catch (e) { toast(e.message, 'bad'); } pwBtn.disabled = false;
  });
  const list = h('div', {}, h('p', { class: 'muted' }, 'Memuat daftar akun…'));
  box.append(
    head('Pengaturan', 'Akun superadmin', 'Hanya email yang terdaftar pada tabel admin_pengguna (Supabase) yang dapat masuk. Sapaan di Dashboard mengikuti kolom “sapaan”.'),
    h('div', { class: 'grid grid-main' },
      h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Akun yang memiliki akses'), h('p', {}, 'Dikelola di Supabase, bukan dari dashboard'))), list,
        h('div', { class: 'card-body' }, h('div', { class: 'note' }, icon('info'), h('div', {},
          h('b', {}, 'Menambah / mencabut akses: '), 'buka Supabase → SQL Editor, kemudian jalankan ',
          h('code', {}, "insert into admin_pengguna (email, nama, sapaan) values ('nama@asia.ac.id', 'Nama Lengkap', 'Sapaan');"),
          ' atau ', h('code', {}, "delete from admin_pengguna where email = 'nama@asia.ac.id';"),
          ' Akun login dibuat melalui Authentication → Users → Add user (centang opsi Auto Confirm). Panduan lengkap tersedia di docs/PANDUAN-SUPABASE.md.')))),
      h('div', { class: 'card card-pad stack' },
        h('h3', { style: { fontSize: '15px' } }, 'Akun Anda'),
        h('dl', { class: 'dl' }, h('dt', {}, 'Nama'), h('dd', {}, p.nama || '–'), h('dt', {}, 'Sapaan'), h('dd', {}, p.sapaan || '–'), h('dt', {}, 'Email'), h('dd', {}, p.email || '–'), h('dt', {}, 'Peran'), h('dd', {}, p.peran || 'superadmin')),
        h('div', { class: 'field' }, h('label', { for: 'pw1' }, 'Kata sandi baru'), pw1),
        h('div', { class: 'field' }, h('label', { for: 'pw2' }, 'Ulangi kata sandi baru'), pw2),
        h('div', {}, pwBtn),
        store.mode === 'demo' ? h('p', { class: 'muted', style: { fontSize: '12.5px', margin: 0 } }, 'Tidak tersedia di mode demo.') : null)));
  store.admins().then(rows => {
    clear(list).appendChild(dataTable({ rows, pageSize: Infinity, columns: [
      { key: 'nama', label: 'Nama', main: true, render: r => h('div', {}, h('span', { class: 'primary' }, r.nama), h('span', { class: 'secondary' }, r.email)) },
      { key: 'sapaan', label: 'Sapaan' },
      { key: 'peran', label: 'Peran', render: r => h('span', { class: 'pill gold' }, r.peran || 'superadmin') },
      { key: 'anda', label: 'Status', sortable: false, render: r => r.email === p.email ? badge('Sedang masuk', 'ok') : h('span', { class: 'muted' }, '–') },
    ] }).el);
  }).catch(e => { clear(list).appendChild(h('div', { class: 'card-body' }, h('div', { class: 'note warn' }, icon('alert'), h('div', {}, e.message)))); });
  return {};
}

/* =================== Data & impor =================== */
const ORDER = ['batches', 'courses', 'lecturers', 'students', 'calendar', 'schedules', 'rpsTemplates', 'obeAssessments', 'materials', 'trentSubjects', 'trentPayments', 'trentEnrollments',
  'expenses', 'incomes', 'certificates', 'immersionTargets', 'immersionSavings', 'immersionExpenses', 'internships', 'internshipReviews', 'attendance', 'settings'];
const ID_IN_TEMPLATE = new Set(['batch', 'pengaturan']);
const csvText = (rows) => rows.map(r => r.map(v => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n') + '\n';
function templateCSV(c) {
  const t = SCHEMA[c]; const cols = t.cols.flatMap(dbColumns).filter(x => !x.endsWith('_file'));
  download(new Blob([csvText([ID_IN_TEMPLATE.has(t.table) ? ['id', ...cols] : cols])], { type: 'text/csv;charset=utf-8' }), `${t.table}.csv`);
}
function dataCSV(c) {
  const t = SCHEMA[c]; const cols = ['id', ...t.cols.flatMap(dbColumns).filter(x => !x.endsWith('_file'))];
  const rows = store.all(c).map(r => { const row = toRow(c, r); return cols.map(k => row[k]); });
  download(new Blob([csvText([cols, ...rows])], { type: 'text/csv;charset=utf-8' }), `${t.table}_${new Date().toISOString().slice(0, 10)}.csv`);
  toast(`${rows.length} baris ${t.table} diunduh.`, 'ok');
}
function colsDialog(c) {
  const t = SCHEMA[c];
  openModal({ title: `Kolom tabel ${t.table}`, subtitle: t.desc, size: 'lg', body: dataTable({ rows: [...(ID_IN_TEMPLATE.has(t.table) ? [{ name: 'id', type: 'text', note: 'Kode unik, wajib diisi' }] : []), ...t.cols], pageSize: Infinity, compact: true, columns: [
    { key: 'name', label: 'Kolom', main: true, render: x => h('code', {}, x.type === 'att' ? `${x.name}_label, ${x.name}_link` : x.name) },
    { key: 'type', label: 'Tipe', render: x => ({ text: 'Teks', int: 'Angka bulat', num: 'Angka', date: 'Tanggal YYYY-MM-DD', bool: 'true / false', json: 'JSON', list: 'Teks dipisah koma', att: 'Nama dokumen & link Drive' }[x.type] || x.type) },
    { key: 'note', label: 'Keterangan / contoh', render: x => x.note || '–' },
  ] }).el });
}
function dataView(root) {
  const render = () => {
    clear(root);
    const count = COLLECTIONS.reduce((s, c) => s + store.all(c).length, 0);
    const restoreIn = h('input', { type: 'file', accept: '.json,application/json', class: 'hidden' });
    restoreIn.addEventListener('change', async () => {
      const f = restoreIn.files[0]; if (!f) return;
      try {
        const json = JSON.parse(await f.text());
        if (!(await confirmDialog('Pulihkan dari cadangan? Data dengan id yang sama akan ditimpa dengan isi berkas cadangan.', { okText: 'Pulihkan', danger: false }))) return;
        await store.importAll(json); toast('Data berhasil dipulihkan dari cadangan.', 'ok');
      } catch (e) { toast(e.message || 'Berkas cadangan tidak valid.', 'bad'); } finally { restoreIn.value = ''; }
    });
    const flat = (v) => v === null || v === undefined ? '' : Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? [v.label, v.link || (v.file && v.file.name)].filter(Boolean).join(' — ') : v;
    const exportAllXlsx = () => exportWorkbook('Dashboard_IBM_Semua_Data', ORDER.filter(c => store.all(c).length).map(c => {
      const rows = store.all(c); const keys = ['id', ...SCHEMA[c].cols.map(x => x.name)];
      return { name: SCHEMA[c].table.slice(0, 31), rows: [keys, ...rows.map(r => keys.map(k => flat(r[k])))] };
    }));
    const tables = ORDER.map((c, i) => ({ c, i: i + 1, t: SCHEMA[c], n: store.all(c).length }));
    root.append(
      head('Pengaturan', 'Data & impor', 'Data dapat diimpor per menu langsung melalui Supabase (Table Editor → tabel → Insert → Import data from CSV) menggunakan template di bawah, atau melalui tombol “Impor” pada setiap menu dashboard.'),
      kpiRow([
        { label: 'Mode penyimpanan', value: store.mode === 'supabase' ? 'Supabase' : 'Demo (browser)', small: true, sub: store.mode === 'supabase' ? 'data bersama seluruh superadmin' : 'data contoh — tidak tersimpan ke server', icon: 'database', accent: true },
        { label: 'Total catatan', value: count, sub: `${COLLECTIONS.length} tabel`, icon: 'layers' },
        { label: 'Zona waktu', value: 'WIB (Asia/Jakarta)', small: true, sub: `${store.setting('profil').kota || 'Malang'}`, icon: 'clock' },
      ]),
      h('div', { class: 'card' },
        h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Tabel & template CSV'), h('p', {}, 'Tabel disusun sesuai urutan impor yang disarankan. Kolom berakhiran _link berisi tautan Google Drive; tanggal ditulis dengan format YYYY-MM-DD; batch_id menggunakan kode batch (B1, B2, dst.).'))),
        dataTable({ rows: tables, pageSize: Infinity, columns: [
          { key: 'i', label: '#', align: 'center', render: x => h('span', { class: 'num muted' }, x.i) },
          { key: 'table', label: 'Tabel', main: true, value: x => x.t.table, render: x => h('div', {}, h('code', {}, x.t.table), h('span', { class: 'secondary' }, `${x.t.menu} — ${x.t.desc}`)) },
          { key: 'n', label: 'Baris', align: 'right', value: x => x.n, render: x => h('span', { class: 'num' }, x.n) },
        ], rowActions: x => h('div', { class: 'row-actions' },
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => colsDialog(x.c) }, icon('info', 'sm'), 'Kolom'),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => templateCSV(x.c) }, icon('download', 'sm'), 'Template'),
          x.n ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => dataCSV(x.c) }, icon('sheet', 'sm'), 'Data CSV') : null) }).el),
      h('div', { class: 'grid grid-2 mt' },
        h('div', { class: 'card card-pad stack' },
          h('h3', { style: { fontSize: '15px' } }, 'Cadangan & ekspor'),
          h('div', { class: 'actions' },
            h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { download(new Blob([JSON.stringify(store.exportAll(), null, 1)], { type: 'application/json' }), `Cadangan_Dashboard_IBM_${new Date().toISOString().slice(0, 10)}.json`); toast('Cadangan JSON diunduh.', 'ok'); } }, icon('download'), 'Unduh cadangan (.json)'),
            h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => restoreIn.click() }, icon('upload'), 'Pulihkan cadangan'),
            h('button', { class: 'btn btn-ghost', type: 'button', onclick: exportAllXlsx }, icon('sheet'), 'Semua data ke Excel'), restoreIn),
          h('p', { class: 'muted', style: { margin: 0, fontSize: '12.5px' } }, 'Berkas unggahan (PDF, foto, Excel) tersimpan di Supabase Storage dan tidak termasuk dalam cadangan JSON, sedangkan tautan Google Drive tetap disertakan. Supabase juga membuat cadangan basis data harian secara otomatis.')),
        h('div', { class: 'card card-pad stack' },
          h('h3', { style: { fontSize: '15px' } }, store.mode === 'demo' ? 'Mode demo' : 'Tentang'),
          store.mode === 'demo'
            ? [h('p', { class: 'muted', style: { margin: 0 } }, 'Mode demo menggunakan data contoh yang tersimpan di browser ini (alamat berakhiran ?demo=1). Pilih Reset untuk mengembalikan data contoh ke kondisi awal.'),
              h('div', {}, h('button', { class: 'btn btn-danger', type: 'button', onclick: async () => { if (await confirmDialog('Reset data demo ke kondisi awal?', { okText: 'Reset' })) { await store.resetDemo(); toast('Data demo direset.', 'ok'); } } }, icon('refresh', 'sm'), 'Reset data demo'))]
            : h('dl', { class: 'dl' }, h('dt', {}, 'Aplikasi'), h('dd', {}, `${CONFIG.app.name} · ${CONFIG.app.org}`), h('dt', {}, 'Alamat'), h('dd', {}, CONFIG.app.url), h('dt', {}, 'Database'), h('dd', {}, CONFIG.supabase.url.replace('https://', '')), h('dt', {}, 'Tanggal'), h('dd', {}, fmtDateLong(new Date()))))),
    );
  };
  render();
  return { destroy: store.subscribe(render) };
}

const TABS = [
  { id: 'umum', label: 'Umum', fn: umum },
  { id: 'daftar', label: 'Daftar pilihan', fn: daftar },
  { id: 'batch', label: 'Batch', fn: batchView },
  { id: 'kurikulum', label: 'Kurikulum', fn: kurikulumView },
  { id: 'akun', label: 'Akun superadmin', fn: akun },
  { id: 'data', label: 'Data & impor', fn: dataView },
];
export default {
  mount(root) {
    return tabPage(root, TABS.map(x => ({ ...x, fn: (b) => x.fn(b) })), { eyebrow: 'Sistem', title: 'Pengaturan', key: 'tab_set', def: 'umum' });
  },
};
