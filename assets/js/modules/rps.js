/* =========================================================================
   3. RPS & OBE
   • Tab "Template RPS & OBE": seluruh mata kuliah kurikulum IBM beserta draft/
     template RPS dan OBE masing-masing (tabel rps_obe_template).
   • Tab "Penilaian OBE": penilaian OBE per mata kuliah, per batch, per periode
     (tabel penilaian_obe). Yang wajib diisi tim IBM hanya mata kuliah yang
     diajar Dosen External; dosen internal Asia mengisi sendiri.
   ========================================================================= */
import { h, icon, clear, badge, docLink, hasAttachment, batchName, batchOptions, uniq, pct, toast, tabs, pref, openDrawer, confirmDialog, fmtDate, today } from '../ui.js';
import { kpiRow, flatFields } from '../crud.js';
import { dataTable } from '../table.js';
import { buildForm } from '../form.js';
import { exportRows, importDialog, previewAttachment, isSheetFile } from '../io.js';
import { store } from '../store.js';
import { periodeOptions, currentPeriode, jenisDosen } from '../jadwal-lib.js';

const STATUS_TPL = ['Draft', 'Revisi', 'Final'];
const STATUS_OBE = ['Belum', 'Proses', 'Selesai'];
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const tplStatus = (t) => !t ? 'Belum ada' : (!hasAttachment(t.template_rps) && !hasAttachment(t.template_obe)) ? (t.template_rps || t.template_obe ? 'Link belum diisi' : 'Belum ada') : (t.status || 'Draft');
const pjOf = (jenis) => jenis === 'Dosen External' ? 'Tim IBM' : jenis === 'Ikut Fakultas' ? 'Fakultas' : 'Dosen internal';

/** Template untuk sebuah mata kuliah kurikulum (dicocokkan lewat course_id, kode, lalu nama) */
function templateOf(c) {
  const all = store.all('rpsTemplates');
  return all.find(t => t.course_id && t.course_id === c.id)
    || (c.kode && all.find(t => t.kode_mk && norm(t.kode_mk) === norm(c.kode) && (!t.mata_kuliah || norm(t.mata_kuliah) === norm(c.nama_en))))
    || all.find(t => t.mata_kuliah && (norm(t.mata_kuliah) === norm(c.nama_en) || norm(t.mata_kuliah) === norm(c.nama_id))) || null;
}
const courseOf = (slot) => store.get('courses', slot.course_id) || store.all('courses').find(c => (slot.kode && norm(c.kode) === norm(slot.kode)) || norm(c.nama_en) === norm(slot.mata_kuliah)) || null;

/* =================== TAB 1 — TEMPLATE RPS & OBE =================== */
const tplSections = [
  { title: 'Mata kuliah', fields: [
    { key: 'kode_mk', label: 'Kode MK', type: 'text', col: 'third' },
    { key: 'semester', label: 'Semester', type: 'number', col: 'third', min: 1, max: 8 },
    { key: 'versi', label: 'Versi kurikulum', type: 'text', col: 'third', placeholder: 'mis. OBE 2024' },
    { key: 'mata_kuliah', label: 'Mata kuliah', type: 'text', required: true },
    { key: 'dosen_penyusun', label: 'Dosen penyusun', type: 'text', col: 'half' },
    { key: 'status', label: 'Status template', type: 'select', options: STATUS_TPL, col: 'half', default: 'Draft' },
  ] },
  { title: 'Template', note: 'Cantumkan tautan Google Docs/Sheets template atau unggah berkasnya (maksimal 15 MB).', fields: [
    { key: 'template_rps', label: 'Template / draft RPS', type: 'attachment', accept: '.doc,.docx,.pdf' },
    { key: 'template_obe', label: 'Template penilaian OBE', type: 'attachment', accept: '.xlsx,.csv,.xls', help: 'Template OBE ini digunakan sebagai acuan dalam pengisian penilaian OBE per batch.' },
    { key: 'catatan', label: 'Catatan', type: 'textarea', rows: 2 },
  ] },
];

function editTemplate(c, t) {
  const rec = t || { course_id: c.id, kode_mk: c.kode, mata_kuliah: c.nama_en, semester: c.semester, dosen_penyusun: c.pengampu, versi: 'OBE 2024', status: 'Draft' };
  const form = buildForm(tplSections, rec);
  const save = h('button', { class: 'btn btn-primary', type: 'button' }, icon('check'), 'Simpan');
  const del = t ? h('button', { class: 'btn btn-danger', type: 'button' }, icon('trash', 'sm'), 'Hapus template') : null;
  const d = openDrawer({ title: c.nama_en, subtitle: [c.nama_id, c.kode, `Semester ${c.semester}`].filter(Boolean).join(' · '), body: form.el,
    footer: [h('div', { class: 'left' }, del), h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => d.close() }, 'Batal'), save] });
  save.addEventListener('click', async () => {
    save.disabled = true;
    try { const v = await form.collect(); if (!v) { save.disabled = false; return; } await store.save('rpsTemplates', { ...v, course_id: c.id }); toast('Template disimpan.', 'ok'); d.close(); }
    catch (e) { toast(e.message, 'bad'); save.disabled = false; }
  });
  if (del) del.addEventListener('click', async () => { if (await confirmDialog('Hapus template RPS & OBE mata kuliah ini?')) { await store.remove('rpsTemplates', t.id); d.close(); } });
}

function templateTab(root) {
  const st = pref.get('rps_tpl', { q: '', semester: '', jenis: '', status: '' });
  const box = h('div'); const kpiBox = h('div'); const tableBox = h('div');
  const rowsAll = () => [...store.all('courses')].sort((a, b) => a.semester - b.semester || String(a.nama_en).localeCompare(b.nama_en)).map(c => ({ c, t: templateOf(c) }));
  const filtered = () => rowsAll().filter(({ c, t }) => {
    if (st.semester && String(c.semester) !== st.semester) return false;
    if (st.jenis && (c.jenis_pengampu || '') !== st.jenis) return false;
    if (st.status && tplStatus(t) !== st.status) return false;
    const q = st.q.toLowerCase().trim(); if (!q) return true;
    return [c.nama_en, c.nama_id, c.kode, c.pengampu, t && t.dosen_penyusun].join(' ').toLowerCase().includes(q);
  });
  const columns = [
    { key: 'mk', label: 'Mata kuliah', main: true, value: x => x.c.nama_en, render: x => h('div', {}, h('span', { class: 'primary' }, x.c.nama_en), h('span', { class: 'secondary' }, [x.c.nama_id, x.c.kode, x.c.sks ? `${x.c.sks} SKS` : ''].filter(Boolean).join(' · '))) },
    { key: 'pengampu', label: 'Pengampu', value: x => x.c.pengampu, render: x => h('div', {}, h('span', { class: `pill ${x.c.jenis_pengampu === 'Dosen External' ? 'gold' : ''}` }, x.c.jenis_pengampu || '–'), h('span', { class: 'secondary' }, x.c.pengampu || '')) },
    { key: 'rps', label: 'Template RPS', sortable: false, render: x => docLink(x.t && x.t.template_rps, 'Belum ada') },
    { key: 'obe', label: 'Template OBE', sortable: false, render: x => docLink(x.t && x.t.template_obe, 'Belum ada') },
    { key: 'status', label: 'Status', value: x => tplStatus(x.t), render: x => badge(tplStatus(x.t), tplStatus(x.t) === 'Final' ? 'ok' : tplStatus(x.t) === 'Belum ada' ? 'bad' : 'warn') },
  ];
  const exportCols = [
    { key: 'semester', label: 'Semester', value: x => x.c.semester }, { key: 'kode', label: 'Kode MK', value: x => x.c.kode },
    { key: 'mk', label: 'Mata Kuliah', value: x => x.c.nama_en }, { key: 'mk_id', label: 'Nama Indonesia', value: x => x.c.nama_id },
    { key: 'jenis', label: 'Jenis Pengampu', value: x => x.c.jenis_pengampu }, { key: 'pengampu', label: 'Pengampu', value: x => x.c.pengampu },
    { key: 'rps', label: 'Template RPS', value: x => x.t && x.t.template_rps ? (x.t.template_rps.link || x.t.template_rps.label) : '' },
    { key: 'obe', label: 'Template OBE', value: x => x.t && x.t.template_obe ? (x.t.template_obe.link || x.t.template_obe.label) : '' },
    { key: 'status', label: 'Status', value: x => tplStatus(x.t) },
  ];
  const table = dataTable({ columns, rows: [], pageSize: 100, groupBy: x => `Semester ${x.c.semester}`, onRowClick: x => editTemplate(x.c, x.t),
    rowActions: x => h('div', { class: 'row-actions' }, h('button', { class: 'btn btn-icon', type: 'button', title: x.t ? 'Ubah template' : 'Isi template', 'aria-label': 'Ubah template', onclick: () => editTemplate(x.c, x.t) }, icon(x.t ? 'edit' : 'plus', 'sm'))) });
  tableBox.appendChild(table.el);

  const sel = (key, label, opts) => { const s = h('select', { class: 'select', 'aria-label': label }, h('option', { value: '' }, label), opts.map(o => h('option', { value: o.value ?? o }, o.label ?? o))); s.value = st[key]; s.addEventListener('change', () => { st[key] = s.value; pref.set('rps_tpl', st); refresh(); }); return s; };
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Cari mata kuliah, kode, dosen…', 'aria-label': 'Cari', value: st.q });
  search.addEventListener('input', () => { st.q = search.value; refresh(); });
  const count = h('span', { class: 'count' });

  function refresh() {
    const all = rowsAll(); const rows = filtered();
    count.textContent = `${rows.length} dari ${all.length} mata kuliah`;
    const rpsOk = all.filter(x => x.t && hasAttachment(x.t.template_rps)).length; const obeOk = all.filter(x => x.t && hasAttachment(x.t.template_obe)).length;
    clear(kpiBox).appendChild(kpiRow([
      { label: 'Mata kuliah kurikulum', value: all.length, sub: `${uniq(all.map(x => x.c.semester)).length} semester`, icon: 'book' },
      { label: 'Template RPS tersedia', value: `${rpsOk} / ${all.length}`, meter: pct(rpsOk, all.length), meterTone: 'ok', icon: 'file', accent: true },
      { label: 'Template OBE tersedia', value: `${obeOk} / ${all.length}`, meter: pct(obeOk, all.length), meterTone: 'ok', icon: 'sheet' },
      { label: 'Status final', value: all.filter(x => tplStatus(x.t) === 'Final').length, sub: 'template siap dipakai', icon: 'check' },
    ]));
    table.update(rows);
  }
  const importFields = flatFields(tplSections);
  box.append(
    h('div', { class: 'page-head' },
      h('div', {}, h('span', { class: 'eyebrow' }, 'Akademik · RPS & OBE'), h('h1', {}, 'Template RPS & OBE per Mata Kuliah'),
        h('p', {}, 'Daftar seluruh mata kuliah kurikulum IBM beserta draf/template RPS dan OBE. Pilih baris untuk mengisi atau memperbarui tautan template. Daftar mata kuliah dikelola melalui menu Pengaturan → Kurikulum.')),
      h('div', { class: 'actions no-print' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => importDialog({ title: 'Template RPS & OBE', fields: importFields, aliases: { mata_kuliah: ['Mata Kuliah', 'Subject', 'Nama MK'], kode_mk: ['Kode', 'Kode MK'], template_rps: ['Link RPS', 'RPS'], template_obe: ['Link OBE', 'OBE'], dosen_penyusun: ['Dosen', 'Penyusun'] },
          note: 'Setiap baris dicocokkan dengan kurikulum berdasarkan Kode MK atau nama mata kuliah; template yang sudah ada akan diperbarui.',
          onImport: async (recs) => {
            const courses = store.all('courses');
            const out = recs.map(r => { const c = courses.find(c => (r.kode_mk && norm(c.kode) === norm(r.kode_mk)) || norm(c.nama_en) === norm(r.mata_kuliah) || norm(c.nama_id) === norm(r.mata_kuliah)); const prev = c ? templateOf(c) : null; return { ...(prev || {}), ...r, course_id: c ? c.id : (r.course_id || ''), semester: r.semester || (c && c.semester) || '' }; });
            await store.saveMany('rpsTemplates', out);
          } }) }, icon('upload'), 'Impor'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => exportRows('Template_RPS_OBE', exportCols, filtered(), 'xlsx') }, icon('sheet'), 'Ekspor Excel'))),
    kpiBox,
    h('div', { class: 'card' },
      h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search'), search),
        sel('semester', 'Semua semester', uniq(store.all('courses').map(c => String(c.semester))).sort().map(s => ({ value: s, label: `Semester ${s}` }))),
        sel('jenis', 'Semua pengampu', ['Dosen Internal', 'Dosen External', 'Ikut Fakultas']),
        sel('status', 'Semua status', ['Belum ada', 'Link belum diisi', ...STATUS_TPL]), count),
      tableBox));
  refresh(); root.appendChild(box);
  return { destroy: store.subscribe(refresh) };
}

/* =================== TAB 2 — PENILAIAN OBE =================== */
const obeSections = (templateNode) => [
  { title: 'Mata kuliah', fields: [
    { key: 'periode', label: 'Periode', type: 'select', options: () => periodeOptions(), required: true, col: 'half' },
    { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'half' },
    { key: 'mata_kuliah', label: 'Mata kuliah', type: 'text', required: true },
    { key: 'kode_mk', label: 'Kode MK', type: 'text', col: 'third' },
    { key: 'semester', label: 'Semester', type: 'number', col: 'third', min: 1, max: 8 },
    { key: 'jenis_dosen', label: 'Jenis dosen', type: 'select', options: ['Dosen External', 'Dosen Internal', 'Ikut Fakultas'], col: 'third' },
    { key: 'dosen', label: 'Dosen pengampu', type: 'select', options: (r) => uniq([...store.all('lecturers').map(l => l.nama).sort(), r && r.dosen]), col: 'full' },
  ] },
  { title: 'Penilaian', note: templateNode ? 'Gunakan template OBE mata kuliah ini sebagai acuan.' : null, fields: [
    { key: 'berkas', label: 'Berkas penilaian OBE (Excel / CSV / link Sheets)', type: 'attachment', accept: '.xlsx,.csv,.pdf', help: 'Berkas .xlsx/.csv yang diunggah dapat dibuka langsung melalui tombol “Lihat isi”.' },
    { key: 'status', label: 'Status', type: 'select', options: STATUS_OBE, col: 'half', default: 'Belum' },
    { key: 'tanggal_selesai', label: 'Tanggal selesai', type: 'date', col: 'half' },
    { key: 'catatan', label: 'Catatan', type: 'textarea', rows: 2 },
  ] },
];

/** Daftar mata kuliah yang perlu penilaian OBE untuk satu periode (dari jadwal kuliah) */
function obeRows(periode, batch) {
  const slots = store.all('schedules').filter(s => s.periode === periode && (!batch || s.batch_id === batch) && s.tipe !== 'IBM Activity');
  const seen = new Map();
  slots.forEach(s => { const k = `${s.batch_id}|${norm(s.mata_kuliah)}`; if (!seen.has(k)) seen.set(k, s); });
  const ass = store.all('obeAssessments').filter(a => a.periode === periode);
  const rows = [...seen.values()].map(s => {
    const c = courseOf(s); const jenis = jenisDosen(s);
    const a = ass.find(a => a.batch_id === s.batch_id && ((a.course_id && c && a.course_id === c.id) || norm(a.mata_kuliah) === norm(s.mata_kuliah))) || null;
    return { slot: s, course: c, jenis, a, tpl: c ? templateOf(c) : null };
  });
  // penilaian yang dicatat manual tanpa slot jadwal tetap ditampilkan
  ass.filter(a => (!batch || a.batch_id === batch) && !rows.some(r => r.a === a)).forEach(a => rows.push({ slot: { batch_id: a.batch_id, mata_kuliah: a.mata_kuliah, dosen: a.dosen, semester: a.semester, kode: a.kode_mk }, course: store.get('courses', a.course_id), jenis: a.jenis_dosen || 'Dosen External', a, tpl: null }));
  return rows;
}

function openObe(x, periode) {
  const s = x.slot; const c = x.course;
  const rec = x.a || { periode, batch_id: s.batch_id, course_id: c ? c.id : '', kode_mk: s.kode || (c && c.kode) || '', mata_kuliah: s.mata_kuliah, semester: s.semester || (c && c.semester) || '', dosen: s.dosen, jenis_dosen: x.jenis, status: 'Belum' };
  const tplNode = x.tpl && hasAttachment(x.tpl.template_obe) ? h('div', { class: 'note' }, icon('sheet'), h('div', {}, 'Template OBE: ', docLink(x.tpl.template_obe))) : null;
  const form = buildForm(obeSections(tplNode), rec);
  const save = h('button', { class: 'btn btn-primary', type: 'button' }, icon('check'), 'Simpan');
  const del = x.a ? h('button', { class: 'btn btn-danger', type: 'button' }, icon('trash', 'sm'), 'Hapus') : null;
  const d = openDrawer({ title: s.mata_kuliah, subtitle: `${batchName(s.batch_id)} · ${periode} · Penanggung jawab: ${pjOf(x.jenis)}`, body: [tplNode, form.el],
    footer: [h('div', { class: 'left' }, del), h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => d.close() }, 'Batal'), save] });
  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      const v = await form.collect(); if (!v) { save.disabled = false; return; }
      if (v.status === 'Selesai' && !v.tanggal_selesai) v.tanggal_selesai = today();
      await store.save('obeAssessments', { ...v, course_id: rec.course_id }); toast('Penilaian OBE disimpan.', 'ok'); d.close();
    } catch (e) { toast(e.message, 'bad'); save.disabled = false; }
  });
  if (del) del.addEventListener('click', async () => { if (await confirmDialog('Hapus catatan penilaian OBE ini?')) { await store.remove('obeAssessments', x.a.id); d.close(); } });
}

function penilaianTab(root) {
  const st = pref.get('rps_obe', { periode: '', batch: '', pj: 'Tim IBM', status: '', q: '' });
  if (!st.periode || !periodeOptions().includes(st.periode)) st.periode = currentPeriode();
  const box = h('div'); const kpiBox = h('div'); const tableBox = h('div'); const count = h('span', { class: 'count' });
  const statusOf = (x) => x.a ? (x.a.status || 'Belum') : 'Belum';
  const filtered = () => obeRows(st.periode, st.batch).filter(x => {
    if (st.pj && pjOf(x.jenis) !== st.pj) return false;
    if (st.status && statusOf(x) !== st.status) return false;
    const q = st.q.toLowerCase().trim(); return !q || [x.slot.mata_kuliah, x.slot.dosen, x.slot.kode].join(' ').toLowerCase().includes(q);
  });
  const columns = [
    { key: 'mk', label: 'Mata kuliah', main: true, value: x => x.slot.mata_kuliah, render: x => h('div', {}, h('span', { class: 'primary' }, x.slot.mata_kuliah), h('span', { class: 'secondary' }, [batchName(x.slot.batch_id), x.slot.semester ? `Semester ${x.slot.semester}` : '', x.slot.kode].filter(Boolean).join(' · '))) },
    { key: 'dosen', label: 'Dosen', value: x => (x.a && x.a.dosen) || x.slot.dosen, render: x => h('div', {}, h('span', { class: `pill ${x.jenis === 'Dosen External' ? 'gold' : ''}` }, x.jenis), h('span', { class: 'secondary' }, (x.a && x.a.dosen) || x.slot.dosen || '–')) },
    { key: 'pj', label: 'Diisi oleh', value: x => pjOf(x.jenis), render: x => x.jenis === 'Dosen External' ? h('b', {}, 'Tim IBM') : h('span', { class: 'muted' }, pjOf(x.jenis)) },
    { key: 'tpl', label: 'Template OBE', sortable: false, render: x => docLink(x.tpl && x.tpl.template_obe, 'Belum ada') },
    { key: 'berkas', label: 'Penilaian', sortable: false, render: x => x.a && hasAttachment(x.a.berkas) ? h('div', { class: 'doc-links' }, docLink(x.a.berkas), isSheetFile(x.a.berkas) ? h('button', { class: 'doc-link', type: 'button', onclick: (e) => { e.stopPropagation(); previewAttachment(x.a.berkas, x.slot.mata_kuliah); } }, icon('eye', 'sm'), h('span', {}, 'Lihat isi')) : null) : h('span', { class: 'muted' }, 'Belum diunggah') },
    { key: 'status', label: 'Status', value: statusOf, render: x => h('div', {}, badge(statusOf(x), statusOf(x) === 'Selesai' ? 'ok' : statusOf(x) === 'Proses' ? 'warn' : x.jenis === 'Dosen External' ? 'bad' : ''), x.a && x.a.tanggal_selesai ? h('span', { class: 'secondary' }, fmtDate(x.a.tanggal_selesai)) : null) },
  ];
  const exportCols = [
    { key: 'periode', label: 'Periode', value: () => st.periode }, { key: 'batch', label: 'Batch', value: x => batchName(x.slot.batch_id) },
    { key: 'kode', label: 'Kode MK', value: x => x.slot.kode || (x.course && x.course.kode) || '' }, { key: 'mk', label: 'Mata Kuliah', value: x => x.slot.mata_kuliah },
    { key: 'dosen', label: 'Dosen', value: x => (x.a && x.a.dosen) || x.slot.dosen }, { key: 'jenis', label: 'Jenis Dosen', value: x => x.jenis },
    { key: 'pj', label: 'Diisi Oleh', value: x => pjOf(x.jenis) }, { key: 'status', label: 'Status', value: statusOf },
    { key: 'berkas', label: 'Berkas Penilaian', value: x => x.a && x.a.berkas ? (x.a.berkas.link || (x.a.berkas.file && x.a.berkas.file.name) || '') : '' },
    { key: 'tgl', label: 'Tanggal Selesai', value: x => (x.a && x.a.tanggal_selesai) || '' },
  ];
  const table = dataTable({ columns, rows: [], pageSize: 50, onRowClick: x => openObe(x, st.periode), sort: { key: 'mk', dir: 'asc' },
    rowActions: x => h('div', { class: 'row-actions' }, h('button', { class: 'btn btn-icon', type: 'button', title: 'Isi penilaian', 'aria-label': 'Isi penilaian', onclick: () => openObe(x, st.periode) }, icon(x.a ? 'edit' : 'plus', 'sm'))),
    emptyNode: h('div', { class: 'empty' }, icon('book'), h('h3', {}, 'Belum ada mata kuliah untuk filter ini'), h('p', {}, 'Daftar ini bersumber dari Jadwal Kuliah pada periode terpilih. Pastikan slot jadwal untuk periode ini telah diimpor.')) });
  tableBox.appendChild(table.el);

  const sel = (key, opts, label) => { const s = h('select', { class: 'select', 'aria-label': label }, opts.map(o => h('option', { value: o.value ?? o }, o.label ?? o))); s.value = st[key]; s.addEventListener('change', () => { st[key] = s.value; pref.set('rps_obe', st); refresh(); }); return s; };
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Cari mata kuliah atau dosen…', 'aria-label': 'Cari', value: st.q });
  search.addEventListener('input', () => { st.q = search.value; refresh(); });

  function refresh() {
    const all = obeRows(st.periode, st.batch); const rows = filtered();
    const lb = all.filter(x => x.jenis === 'Dosen External'); const lbDone = lb.filter(x => statusOf(x) === 'Selesai').length;
    count.textContent = `${rows.length} dari ${all.length} mata kuliah`;
    clear(kpiBox).appendChild(kpiRow([
      { label: 'Mata kuliah periode ini', value: all.length, sub: st.periode, icon: 'book' },
      { label: 'Wajib diisi tim IBM (Dosen External)', value: `${lbDone} / ${lb.length}`, sub: 'sudah selesai', meter: pct(lbDone, lb.length), meterTone: 'ok', icon: 'clipboard', accent: true },
      { label: 'External belum selesai', value: lb.length - lbDone, sub: 'perlu ditindaklanjuti', icon: 'alert' },
      { label: 'Diisi dosen internal / fakultas', value: all.length - lb.length, sub: `${all.filter(x => x.jenis !== 'Dosen External' && statusOf(x) === 'Selesai').length} tercatat selesai`, icon: 'teacher' },
    ]));
    table.update(rows);
  }
  box.append(
    h('div', { class: 'page-head' },
      h('div', {}, h('span', { class: 'eyebrow' }, 'Akademik · RPS & OBE'), h('h1', {}, 'Penilaian OBE per Mata Kuliah'),
        h('p', {}, 'Daftar mata kuliah bersumber dari Jadwal Kuliah pada periode terpilih. Tim IBM bertanggung jawab mengisi penilaian OBE untuk mata kuliah yang diampu Dosen External, sedangkan Dosen Internal Institut Asia mengisi secara mandiri (statusnya tetap dapat dicatat di sini).')),
      h('div', { class: 'actions no-print' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => exportRows(`Penilaian_OBE_${st.periode}`, exportCols, filtered(), 'xlsx') }, icon('sheet'), 'Ekspor Excel'))),
    kpiBox,
    h('div', { class: 'card' },
      h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search'), search),
        sel('periode', periodeOptions(), 'Periode'),
        sel('batch', [{ value: '', label: 'Semua batch' }, ...batchOptions()], 'Batch'),
        sel('pj', [{ value: '', label: 'Semua pengisi' }, { value: 'Tim IBM', label: 'Diisi tim IBM (Dosen External)' }, { value: 'Dosen internal', label: 'Diisi dosen internal' }, { value: 'Fakultas', label: 'Ikut fakultas' }], 'Diisi oleh'),
        sel('status', [{ value: '', label: 'Semua status' }, ...STATUS_OBE], 'Status'), count),
      tableBox));
  refresh(); root.appendChild(box);
  return { destroy: store.subscribe(refresh) };
}

export default {
  mount(root) {
    let tab = pref.get('tab_rps', 'template'); let inner = null; const body = h('div');
    const draw = () => {
      inner && inner.destroy && inner.destroy(); clear(root);
      root.appendChild(tabs([{ id: 'template', label: 'Template RPS & OBE' }, { id: 'penilaian', label: 'Penilaian OBE' }], tab, (t) => { tab = t; pref.set('tab_rps', t); draw(); }));
      clear(body); root.appendChild(body);
      inner = tab === 'penilaian' ? penilaianTab(body) : templateTab(body);
    };
    draw();
    return { destroy: () => inner && inner.destroy && inner.destroy() };
  },
};
