/* =========================================================================
   5. JADWAL KULIAH — per batch, per periode
   Urutan tab: Jadwal Full (satu semester) · Weekly · Daily · Slot jadwal ·
   Kalender akademik. Semua tampilan dibentuk dari Slot jadwal (kelas
   mingguan) + Kalender akademik (data PDF bagian akademik).
   ========================================================================= */
import { h, icon, clear, badge, batchName, batchOptions, tabs, pref, toast, fmtDate, fmtDateLong, fmtDayDate, parseDate, isoDate, today, uniq, pct, sum, openDrawer, confirmDialog } from '../ui.js';
import { buildForm } from '../form.js';
import { crudView, kpiRow } from '../crud.js';
import { dataTable } from '../table.js';
import { exportWorkbook } from '../io.js';
import { store } from '../store.js';
import {
  HARI, STATUS_ABSEN, HADIR, toneAbsen, KATEGORI_KALENDER, kategoriOf, periodInfo, periodeOptions, currentPeriode, sessionsOf, slotsOf, timeLabel, byTime,
  hariOf, saveAbsen, weekNo, weekStart, weekCount, eventsBetween, jenisDosen, parseRentang, normSemester, normTahunAjaran,
} from '../jadwal-lib.js';

const TIPE = ['Kuliah', 'Trent', 'IBM Activity'];
const MODE = ['Onsite', 'Online', 'Hybrid', 'Konversi Magang', 'Immersion'];
const DAY = 864e5;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const courseOpts = () => [...store.all('courses')].sort((a, b) => a.semester - b.semester || a.nama_en.localeCompare(b.nama_en)).map(c => ({ value: c.id, label: `Smt ${c.semester} · ${c.nama_en}` }));
const lecturerOpts = (r) => uniq([...store.all('lecturers').map(l => l.nama).sort((a, b) => a.localeCompare(b)), r && r.dosen]);
const ttCls = (s) => `tt-item ${s.tipe === 'Trent' ? 'trent' : s.tipe === 'IBM Activity' ? 'act' : ''}`;
const jenisPill = (s) => { const j = jenisDosen(s); return h('span', { class: `pill ${j === 'Dosen External' ? 'gold' : ''}` }, j); };
const sessPill = (x) => x.jenis !== 'Kuliah' ? h('span', { class: 'pill gold' }, x.jenis) : null;
const absenCell = (x, t) => {
  const j = jenisDosen(x.slot); if (j !== 'Dosen External') return h('span', { class: 'muted' }, j === 'Ikut Fakultas' ? 'Ikut fakultas' : 'Dosen internal');
  return x.absen && x.absen.status ? badge(x.absen.status, toneAbsen(x.absen.status)) : h('span', { class: 'muted' }, x.tanggal <= t ? 'Belum dicatat' : '–');
};

/* ---------- Pemilih periode & batch ---------- */
function pickers(state, onChange, { allBatch = true } = {}) {
  const per = h('select', { class: 'select', 'aria-label': 'Periode akademik' }, periodeOptions().map(p => h('option', { value: p }, p)));
  per.value = state.periode; per.addEventListener('change', () => { state.periode = per.value; onChange(); });
  const bat = h('select', { class: 'select', 'aria-label': 'Batch' }, allBatch ? h('option', { value: '' }, 'Semua batch') : null, batchOptions().map(o => h('option', { value: o.value }, o.label)));
  bat.value = state.batch || ''; bat.addEventListener('change', () => { state.batch = bat.value; onChange(); });
  return [per, bat];
}
const calNote = (periode, info) => {
  if (!info) return h('div', { class: 'note warn' }, icon('alert'), h('div', {}, `Periode “${periode}” belum terdaftar di Kalender akademik sehingga tanggal pertemuan belum dapat dihitung. Silakan tambahkan kegiatan “Perkuliahan”, “UTS”, dan “UAS” untuk periode ini melalui tab Kalender akademik.`));
  if (info.events.some(e => /perkiraan/i.test(e.catatan || ''))) return h('div', { class: 'note' }, icon('info'), h('div', {}, `Kalender ${periode} masih bersifat perkiraan. Silakan impor kalender akademik resmi (PDF Bagian Akademik) melalui tab Kalender akademik agar tanggal pertemuan dan absensi akurat.`));
  return null;
};
const loadState = (key, extra = {}) => {
  const st = { periode: pref.get('jd_periode', ''), batch: pref.get('jd_batch', ''), ...extra };
  if (!periodeOptions().includes(st.periode)) st.periode = currentPeriode();
  return st;
};
const saveState = (st) => { pref.set('jd_periode', st.periode); pref.set('jd_batch', st.batch); };

/** Tabel kelas tanpa hari/jam tetap (ikut fakultas, konversi magang, belum dijadwalkan) */
function looseCard(slots, showBatch) {
  if (!slots.length) return null;
  return h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, `Tanpa hari/jam tetap · ${slots.length}`), h('p', {}, 'Mengikuti jadwal fakultas, konversi magang, immersion, atau jadwal yang belum ditetapkan'))),
    dataTable({ rows: slots, pageSize: Infinity, onRowClick: openSlot, compact: true, columns: [
      { key: 'mata_kuliah', label: 'Mata kuliah', main: true, render: s => h('div', {}, h('span', { class: 'primary' }, s.mata_kuliah), h('span', { class: 'secondary' }, [s.kode, s.sks ? `${s.sks} SKS` : ''].filter(Boolean).join(' · '))) },
      showBatch ? { key: 'batch_id', label: 'Batch', value: s => batchName(s.batch_id) } : null,
      { key: 'dosen', label: 'Dosen', render: s => h('div', {}, s.dosen || '–', h('span', { class: 'secondary' }, jenisDosen(s))) },
      { key: 'mode', label: 'Mode', render: s => s.mode || '–' },
      { key: 'catatan', label: 'Keterangan', render: s => s.catatan || s.status || '–' },
    ].filter(Boolean) }).el);
}

/* =================== TAB 1 — JADWAL FULL (satu semester) =================== */
function jadwalFull(root) {
  const st = loadState(); const box = h('div');
  function render() {
    saveState(st); clear(box);
    const info = periodInfo(st.periode); const t = today();
    const slots = slotsOf(st.periode, st.batch);
    const fixed = slots.filter(s => HARI.includes(s.hari)); const loose = slots.filter(s => !HARI.includes(s.hari));
    const all = fixed.flatMap(s => sessionsOf(s, info)).sort((a, b) => a.tanggal.localeCompare(b.tanggal) || String(a.slot.jam_mulai || '99').localeCompare(String(b.slot.jam_mulai || '99')));
    const past = all.filter(x => x.tanggal <= t); const lbPast = past.filter(x => jenisDosen(x.slot) === 'Dosen External'); const lbRec = lbPast.filter(x => x.absen && x.absen.status);
    const groupLabel = (x) => {
      const w = weekNo(info, x.tanggal); if (!w) return 'Sebelum perkuliahan';
      const a = weekStart(info, w); const b = addDays(a, 6);
      const ev = eventsBetween(info, a, b).map(e => e.kegiatan);
      return `Minggu ${w} · ${fmtDate(a)} – ${fmtDate(b)}${ev.length ? ' · ' + ev.join(', ') : ''}`;
    };
    const [per, bat] = pickers(st, render);
    const rowsXls = [['Minggu', 'Tanggal', 'Hari', 'Jam', 'Mata Kuliah', 'Batch', 'Dosen', 'Jenis Dosen', 'Ruang', 'Pertemuan', 'Keterangan', 'Absensi Dosen External'],
      ...all.map(x => [weekNo(info, x.tanggal) || '', x.tanggal, x.slot.hari, timeLabel(x.slot), x.slot.mata_kuliah, batchName(x.slot.batch_id), x.slot.dosen, jenisDosen(x.slot), x.slot.ruang, x.no, x.jenis !== 'Kuliah' ? x.jenis : '', (x.absen && x.absen.status) || '']),
      ...loose.map(s => ['', '', '(tanpa hari tetap)', '', s.mata_kuliah, batchName(s.batch_id), s.dosen, jenisDosen(s), s.ruang, '', s.mode || s.catatan || '', ''])];

    box.append(...[
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, 'Jadwal Kuliah · Jadwal Full'), h('h1', {}, 'Jadwal Satu Semester'),
          h('p', {}, `${st.periode} · ${st.batch ? batchName(st.batch) : 'semua batch'} — seluruh pertemuan dari awal perkuliahan sampai UAS, dikelompokkan per minggu.`)),
        h('div', { class: 'actions no-print' }, per, bat,
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => window.print() }, icon('print'), 'Cetak'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => exportWorkbook(`Jadwal_Full_${st.periode}_${st.batch ? batchName(st.batch) : 'Semua'}`.replace(/\W+/g, '_'), [{ name: 'Jadwal Full', rows: rowsXls }]) }, icon('sheet'), 'Ekspor Excel'))),
      calNote(st.periode, info),
      kpiRow([
        { label: 'Total pertemuan', value: all.length, sub: `${fixed.length} kelas mingguan${info ? ` · ${weekCount(info)} minggu` : ''}`, icon: 'calendar', accent: true },
        { label: 'Sudah berlangsung', value: `${past.length} / ${all.length}`, sub: `s.d. ${fmtDate(t)}`, meter: pct(past.length, all.length), icon: 'clock' },
        { label: 'Absensi Dosen External', value: `${lbRec.length} / ${lbPast.length}`, sub: 'pertemuan yang telah berlangsung', meter: pct(lbRec.length, lbPast.length), meterTone: 'ok', icon: 'clipboard' },
        { label: 'Tanpa hari/jam tetap', value: loose.length, sub: 'rincian pada tabel di bawah', icon: 'layers' },
      ]),
      h('div', { class: 'card' }, dataTable({
        rows: all, pageSize: Infinity, groupBy: groupLabel, onRowClick: x => openSlot(x.slot),
        emptyNode: h('div', { class: 'empty' }, icon('calendar'), h('h3', {}, 'Belum ada pertemuan'), h('p', {}, 'Pastikan telah tersedia slot jadwal dengan hari tetap serta kalender akademik untuk periode ini.')),
        columns: [
          { key: 'tanggal', label: 'Tanggal', sortable: false, nowrap: true, render: x => h('div', { class: 'time-cell' }, h('b', {}, fmtDate(x.tanggal)), h('span', {}, `${x.slot.hari} · ${timeLabel(x.slot) || 'jam belum diisi'}`)) },
          { key: 'mk', label: 'Mata kuliah', main: true, sortable: false, render: x => h('div', {}, h('span', { class: 'primary' }, x.slot.mata_kuliah, ' ', sessPill(x)), h('span', { class: 'secondary' }, [st.batch ? '' : batchName(x.slot.batch_id), x.slot.ruang ? `Ruang ${x.slot.ruang}` : x.slot.mode].filter(Boolean).join(' · '))) },
          { key: 'dosen', label: 'Dosen', sortable: false, render: x => h('div', {}, x.slot.dosen || '–', h('span', { class: 'secondary' }, jenisDosen(x.slot))) },
          { key: 'no', label: 'Pertemuan', sortable: false, align: 'center', render: x => h('span', { class: 'num' }, `${x.no}`) },
          { key: 'absen', label: 'Absensi', sortable: false, render: x => absenCell(x, t) },
        ] }).el),
      looseCard(loose, !st.batch),
    ].filter(Boolean));
    box.querySelectorAll('tbody tr').forEach(tr => { if (tr.querySelector('.time-cell b') && tr.querySelector('.time-cell b').textContent === fmtDate(t)) tr.classList.add('is-today'); });
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe(render) };
}

/* =================== TAB 2 — WEEKLY =================== */
function weekly(root) {
  const st = loadState({ week: 0 }); const box = h('div');
  function render() {
    saveState(st); clear(box);
    const info = periodInfo(st.periode); const t = today(); const n = weekCount(info);
    if (!st.week || st.week > n) st.week = Math.min(Math.max(1, weekNo(info, t) || 1), n || 1);
    const slots = slotsOf(st.periode, st.batch).sort(byTime);
    const fixed = slots.filter(s => HARI.includes(s.hari)); const loose = slots.filter(s => !HARI.includes(s.hari));
    const ws = info ? weekStart(info, st.week) : null;
    const dateOf = (hari) => ws ? addDays(ws, HARI.indexOf(hari)) : null;
    const sessOf = (s) => ws ? sessionsOf(s, info).find(x => x.tanggal === isoDate(dateOf(s.hari))) : null;
    const evs = ws ? eventsBetween(info, ws, addDays(ws, 6)) : [];
    const liburOn = (d) => d && evs.find(e => e.kat === 'Libur' && d >= e.start && d <= e.end);
    const times = uniq(fixed.map(timeLabel)).sort();
    const [per, bat] = pickers(st, () => { st.week = 0; render(); });
    const nav = info ? h('div', { class: 'btn-group' },
      h('button', { class: 'btn btn-ghost btn-icon', type: 'button', 'aria-label': 'Minggu sebelumnya', disabled: st.week <= 1, onclick: () => { st.week--; render(); } }, '‹'),
      h('span', { class: 'week-label' }, `Minggu ${st.week} / ${n}`),
      h('button', { class: 'btn btn-ghost btn-icon', type: 'button', 'aria-label': 'Minggu berikutnya', disabled: st.week >= n, onclick: () => { st.week++; render(); } }, '›')) : null;

    const item = (s) => {
      const x = sessOf(s); const lib = liburOn(dateOf(s.hari));
      return h('button', { type: 'button', class: ttCls(s), style: lib ? { opacity: '.55' } : null, onclick: () => openSlot(s) },
        h('b', {}, s.mata_kuliah),
        h('span', { class: 'meta' }, s.dosen || 'Dosen belum ditentukan'),
        h('span', { class: 'tags' }, st.batch ? null : h('span', { class: 'pill' }, batchName(s.batch_id)), s.ruang ? h('span', { class: 'pill' }, s.ruang) : null,
          lib ? h('span', { class: 'pill' }, 'Libur') : x ? [h('span', { class: 'pill' }, `P${x.no}`), sessPill(x)] : null,
          s.mode && s.mode !== 'Onsite' ? h('span', { class: 'pill gold' }, s.mode) : null));
    };
    const grid = h('table', { class: 'timetable' },
      h('thead', {}, h('tr', {}, h('th', { class: 'time' }, 'Jam'), HARI.map(d => h('th', {}, d, dateOf(d) ? h('small', {}, fmtDate(dateOf(d))) : null)))),
      h('tbody', {}, times.map(tm => h('tr', {}, h('td', { class: 'time' }, h('b', {}, tm.split('–')[0]), tm.split('–')[1] || ''),
        HARI.map(d => h('td', {}, fixed.filter(s => s.hari === d && timeLabel(s) === tm).map(item)))))));
    const mobile = h('div', { class: 'week-mobile' }, HARI.map(d => {
      const items = fixed.filter(s => s.hari === d);
      return h('section', { class: 'wm-day' }, h('h4', {}, d, dateOf(d) ? h('small', {}, fmtDate(dateOf(d))) : null, h('span', { class: 'count' }, `${items.length} kelas`)),
        items.length ? items.map(s => h('div', { class: 'wm-row' }, h('div', { class: 'time-cell' }, h('b', {}, s.jam_mulai || '–'), h('span', {}, s.jam_selesai || '')), item(s))) : h('p', { class: 'muted' }, 'Tidak ada kelas'));
    }));

    box.append(...[
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, 'Jadwal Kuliah · Weekly'), h('h1', {}, 'Jadwal Mingguan'),
          h('p', {}, ws ? `${st.periode} · ${st.batch ? batchName(st.batch) : 'semua batch'} · ${fmtDateLong(ws)} – ${fmtDateLong(addDays(ws, 5))}. Pilih kelas untuk mengubah slot jadwal.` : `${st.periode} · ${st.batch ? batchName(st.batch) : 'semua batch'}.`)),
        h('div', { class: 'actions no-print' }, per, bat, nav,
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => window.print() }, icon('print'), 'Cetak'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => exportWorkbook(`Jadwal_Mingguan_${st.periode}_${st.batch ? batchName(st.batch) : 'Semua'}`.replace(/\W+/g, '_'), [{ name: 'Jadwal Mingguan', rows: [['Hari', 'Jam Mulai', 'Jam Selesai', 'Mata Kuliah', 'Batch', 'Semester', 'Dosen', 'Jenis Dosen', 'Ruang', 'Mode', 'Tipe', 'SKS'], ...slots.map(s => [s.hari || '(tanpa hari tetap)', s.jam_mulai, s.jam_selesai, s.mata_kuliah, batchName(s.batch_id), s.semester, s.dosen, jenisDosen(s), s.ruang, s.mode, s.tipe, s.sks])] }]) }, icon('sheet'), 'Ekspor Excel'),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openSlot({ periode: st.periode, batch_id: st.batch }) }, icon('plus'), 'Tambah kelas'))),
      calNote(st.periode, info),
      evs.length ? h('div', { class: 'note warn' }, icon('calendar'), h('div', {}, h('b', {}, 'Minggu ini: '), evs.map(e => `${e.kegiatan} (${fmtDate(e.start)}${e.end > e.start ? ' – ' + fmtDate(e.end) : ''})`).join(' · '))) : null,
      kpiRow([
        { label: 'Kelas per minggu', value: fixed.length, sub: `${uniq(fixed.map(s => s.hari)).length} hari aktif`, icon: 'calendar', accent: true },
        { label: 'Total SKS', value: sum(slots, s => Number(s.sks) || 0), icon: 'layers' },
        { label: 'Dosen External', value: uniq(slots.filter(s => jenisDosen(s) === 'Dosen External').map(s => s.dosen)).length, sub: `${uniq(slots.map(s => s.dosen)).length} pengampu total`, icon: 'teacher' },
        { label: 'Tanpa hari/jam tetap', value: loose.length, icon: 'layers' },
      ]),
      fixed.length ? h('div', { class: 'card' }, grid, mobile,
        h('div', { class: 'legend-row' }, h('span', {}, h('i'), 'Kuliah'), h('span', {}, h('i', { class: 'trent' }), 'Trent Global College'), h('span', {}, h('i', { class: 'act' }), 'IBM Activity'), h('span', {}, 'P = pertemuan ke-'))) :
        h('div', { class: 'card' }, h('div', { class: 'empty' }, icon('calendar'), h('h3', {}, 'Belum ada kelas dengan hari tetap'), h('p', {}, 'Tambahkan kelas, impor slot jadwal melalui tab “Slot jadwal”, atau pilih periode/batch lain.'))),
      looseCard(loose, !st.batch),
    ].filter(Boolean));
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe(render) };
}

/* =================== TAB 3 — DAILY =================== */
function daily(root) {
  const st = { date: pref.get('jd_date', today()), batch: pref.get('jd_batch', '') }; const box = h('div');
  function render() {
    pref.set('jd_date', st.date); pref.set('jd_batch', st.batch); clear(box);
    const periode = currentPeriode(st.date); const info = periodInfo(periode); const t = today();
    const d = parseDate(st.date);
    const sessions = slotsOf(periode, st.batch).filter(s => HARI.includes(s.hari)).flatMap(s => sessionsOf(s, info)).filter(x => x.tanggal === st.date)
      .sort((a, b) => String(a.slot.jam_mulai || '99').localeCompare(String(b.slot.jam_mulai || '99')));
    const evs = info ? info.events.filter(e => d >= e.start && d <= e.end && e.kat !== 'Perkuliahan') : [];
    const shift = (n) => { st.date = isoDate(addDays(parseDate(st.date), n)); render(); };
    const dateIn = h('input', { class: 'input', type: 'date', value: st.date, 'aria-label': 'Tanggal' });
    dateIn.addEventListener('change', () => { if (dateIn.value) { st.date = dateIn.value; render(); } });
    const bat = h('select', { class: 'select', 'aria-label': 'Batch' }, h('option', { value: '' }, 'Semua batch'), batchOptions().map(o => h('option', { value: o.value }, o.label)));
    bat.value = st.batch; bat.addEventListener('change', () => { st.batch = bat.value; render(); });
    const lb = sessions.filter(x => jenisDosen(x.slot) === 'Dosen External'); const done = lb.filter(x => x.absen && x.absen.status).length;
    const wk = weekNo(info, st.date);

    const absenCtl = (x) => {
      const j = jenisDosen(x.slot); if (j !== 'Dosen External') return h('span', { class: 'muted' }, j === 'Ikut Fakultas' ? 'Ikut fakultas' : 'Dosen internal');
      const cur = (x.absen && x.absen.status) || '';
      const sel = h('select', { class: `select ${cur ? 'st-' + (toneAbsen(cur) || 'info') : ''}`, 'aria-label': `Absensi ${x.slot.mata_kuliah}` }, h('option', { value: '' }, '— Belum dicatat —'), STATUS_ABSEN.map(v => h('option', { value: v }, v)));
      sel.value = cur;
      sel.addEventListener('change', async () => { sel.className = `select ${sel.value ? 'st-' + (toneAbsen(sel.value) || 'info') : ''}`; try { await saveAbsen(x, { status: sel.value }); toast(`${x.slot.mata_kuliah}: ${sel.value || 'dikosongkan'}`, 'ok'); } catch (e) { toast(e.message, 'bad'); } });
      return sel;
    };
    box.append(...[
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, 'Jadwal Kuliah · Daily'), h('h1', {}, fmtDayDate(st.date)),
          h('p', {}, info && wk ? `${periode} · minggu ke-${wk}. Absensi Dosen External dapat dicatat langsung melalui tabel ini.` : 'Tanggal ini berada di luar periode perkuliahan yang terdaftar pada Kalender akademik.')),
        h('div', { class: 'actions no-print' },
          h('div', { class: 'btn-group' }, h('button', { class: 'btn btn-ghost btn-icon', type: 'button', 'aria-label': 'Hari sebelumnya', onclick: () => shift(-1) }, '‹'), dateIn, h('button', { class: 'btn btn-ghost btn-icon', type: 'button', 'aria-label': 'Hari berikutnya', onclick: () => shift(1) }, '›')),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { st.date = today(); render(); } }, 'Hari ini'), bat)),
      evs.length ? h('div', { class: 'note warn' }, icon('calendar'), h('div', {}, evs.map(e => `${e.kegiatan} (${fmtDate(e.start)}${e.end > e.start ? ' – ' + fmtDate(e.end) : ''})`).join(' · '))) : null,
      kpiRow([
        { label: 'Kelas hari ini', value: sessions.length, sub: st.batch ? batchName(st.batch) : 'semua batch', icon: 'calendar', accent: true },
        { label: 'Kelas Dosen External', value: lb.length, sub: 'perlu absensi', icon: 'teacher' },
        { label: 'Absensi tercatat', value: `${done} / ${lb.length}`, meter: pct(done, lb.length), meterTone: 'ok', icon: 'clipboard' },
        { label: 'Dosen External hadir', value: lb.filter(x => x.absen && HADIR.includes(x.absen.status)).length, icon: 'check' },
      ]),
      h('div', { class: 'card' }, dataTable({
        rows: sessions, pageSize: Infinity, className: 'presensi',
        emptyNode: h('div', { class: 'empty' }, icon('calendar'), h('h3', {}, hariOf(st.date) === 'Minggu' ? 'Hari Minggu — tidak ada perkuliahan' : 'Tidak ada kelas terjadwal'), h('p', {}, info ? 'Silakan pilih batch atau tanggal lain.' : 'Silakan periksa kalender akademik untuk periode ini.')),
        columns: [
          { key: 'jam', label: 'Jam', sortable: false, nowrap: true, render: x => h('div', { class: 'time-cell' }, h('b', {}, x.slot.jam_mulai || '–'), h('span', {}, x.slot.jam_selesai ? `s.d. ${x.slot.jam_selesai}` : '')) },
          { key: 'mk', label: 'Mata kuliah', main: true, sortable: false, render: x => h('div', {}, h('button', { class: 'doc-link', type: 'button', onclick: () => openSlot(x.slot) }, h('span', { class: 'primary' }, x.slot.mata_kuliah)), ' ', sessPill(x), h('span', { class: 'secondary' }, [batchName(x.slot.batch_id), `Pertemuan ${x.no}`, x.slot.ruang ? `Ruang ${x.slot.ruang}` : x.slot.mode].filter(Boolean).join(' · '))) },
          { key: 'dosen', label: 'Dosen', sortable: false, render: x => h('div', {}, x.slot.dosen || '–', ' ', jenisPill(x.slot)) },
          { key: 'absen', label: 'Absensi dosen', sortable: false, width: '230px', render: absenCtl },
        ] }).el),
    ].filter(Boolean));
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe((c) => { if (c !== 'attendance') render(); }) };
}

/* =================== TAB 4 — SLOT JADWAL (data dasar) =================== */
export const slotSections = [
  { title: 'Kelas', fields: [
    { key: 'periode', label: 'Periode akademik', type: 'select', options: periodeOptions, required: true, col: 'third' },
    { key: 'batch_id', label: 'Batch', type: 'batch', required: true, col: 'third' },
    { key: 'semester', label: 'Semester', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8'], col: 'third' },
    { key: 'course_id', label: 'Mata kuliah (kurikulum)', type: 'select', options: courseOpts, col: 'half', placeholder: '— Pilih / kosongkan —', help: 'Opsional; digunakan untuk menautkan kelas dengan kurikulum serta RPS & OBE.' },
    { key: 'mata_kuliah', label: 'Nama mata kuliah di jadwal', type: 'text', required: true, col: 'half' },
    { key: 'tipe', label: 'Tipe', type: 'select', options: TIPE, col: 'third', default: 'Kuliah' },
    { key: 'kode', label: 'Kode', type: 'text', col: 'third' },
    { key: 'sks', label: 'SKS', type: 'number', col: 'third', min: 0, max: 12 },
    { key: 'dosen', label: 'Dosen pengampu', type: 'select', options: lecturerOpts, col: 'half', placeholder: '— Pilih dosen —', help: 'Daftar bersumber dari Biodata Dosen.' },
    { key: 'jenis_dosen', label: 'Jenis dosen', type: 'select', options: ['Dosen External', 'Dosen Internal', 'Ikut Fakultas'], col: 'half', placeholder: '— Otomatis dari Biodata Dosen —', help: 'Hanya kelas yang diampu Dosen External yang tercatat di Absensi Dosen External.' },
  ] },
  { title: 'Waktu & tempat', fields: [
    { key: 'hari', label: 'Hari', type: 'select', options: HARI, col: 'third', placeholder: '— Tanpa hari tetap —' },
    { key: 'jam_mulai', label: 'Jam mulai', type: 'text', col: 'third', placeholder: '09:30' },
    { key: 'jam_selesai', label: 'Jam selesai', type: 'text', col: 'third', placeholder: '12:00' },
    { key: 'ruang', label: 'Ruang', type: 'select', options: (r) => uniq([...store.list('ruang'), r && r.ruang]), col: 'third', placeholder: '— Pilih ruang —' },
    { key: 'mode', label: 'Mode', type: 'select', options: MODE, col: 'third', default: 'Onsite' },
    { key: 'jumlah_pertemuan', label: 'Jumlah pertemuan', type: 'number', col: 'third', default: () => store.setting('akademik').target_pertemuan, min: 1, max: 32 },
    { key: 'status', label: 'Status', type: 'select', options: ['Confirmed', 'TBC'], col: 'half' },
    { key: 'classroom', label: 'Link Google Classroom', type: 'url', col: 'half' },
    { key: 'catatan', label: 'Catatan', type: 'textarea', rows: 2 },
  ] },
];
const normTime = (t) => { const m = /(\d{1,2})[.:](\d{2})/.exec(t || ''); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : (t || ''); };
export const slotBeforeSave = (r) => {
  const c = store.get('courses', r.course_id);
  const out = { ...r, mata_kuliah: r.mata_kuliah || (c ? c.nama_en : ''), nama_id: r.nama_id || (c ? c.nama_id : ''), kode: r.kode || (c ? c.kode : ''), semester: r.semester || (c ? String(c.semester) : ''), sks: r.sks || (c ? c.sks : '') };
  // "09.30 - 12.00" dalam satu kolom
  const range = /(\d{1,2}[.:]\d{2})\s*[-–]\s*(\d{1,2}[.:]\d{2})/.exec(out.jam_mulai || '');
  if (range) { out.jam_mulai = range[1]; out.jam_selesai = out.jam_selesai || range[2]; }
  out.jam_mulai = normTime(out.jam_mulai); out.jam_selesai = normTime(out.jam_selesai);
  if (out.hari) { const hit = HARI.find(x => x.toLowerCase() === String(out.hari).toLowerCase().trim() || { monday: 'Senin', tuesday: 'Selasa', wednesday: 'Rabu', thursday: 'Kamis', friday: 'Jumat', saturday: 'Sabtu' }[String(out.hari).toLowerCase().trim()] === x); out.hari = hit || ''; }
  return out;
};
const slotView = crudView({
  id: 'schedules', collection: 'schedules', noun: 'slot jadwal', title: 'Slot Jadwal', eyebrow: 'Jadwal Kuliah · Data dasar',
  description: 'Setiap baris mewakili satu kelas mingguan (hari dan jam) untuk satu batch pada satu periode. Jadwal Full, Weekly, Daily, dan Absensi Dosen External disusun berdasarkan data ini. Kosongkan kolom hari untuk kelas tanpa hari/jam tetap.',
  sections: slotSections, beforeSave: slotBeforeSave, exportName: 'Slot_Jadwal_IBM', sort: { key: 'hari', dir: 'asc' }, pageSize: 50,
  columns: [
    { key: 'mata_kuliah', label: 'Mata kuliah', main: true, render: r => h('div', {}, h('span', { class: 'primary' }, r.mata_kuliah), r.tipe && r.tipe !== 'Kuliah' ? h('span', { class: 'pill gold', style: { marginLeft: '6px' } }, r.tipe) : null, h('span', { class: 'secondary' }, [r.kode, r.sks ? `${r.sks} SKS` : '', r.semester ? `Semester ${r.semester}` : ''].filter(Boolean).join(' · '))) },
    { key: 'hari', label: 'Hari & jam', value: r => `${HARI.indexOf(r.hari) < 0 ? 9 : HARI.indexOf(r.hari)}${r.jam_mulai || ''}`, render: r => h('div', {}, h('span', { class: 'primary' }, r.hari || 'Tanpa hari tetap'), h('span', { class: 'secondary num' }, timeLabel(r))), exportValue: r => r.hari },
    { key: 'batch_id', label: 'Batch', value: r => batchName(r.batch_id), render: r => h('div', {}, batchName(r.batch_id), h('span', { class: 'secondary' }, r.periode)), nowrap: true },
    { key: 'dosen', label: 'Dosen', render: r => h('div', {}, r.dosen || '–', h('span', { class: 'secondary' }, jenisDosen(r))) },
    { key: 'ruang', label: 'Ruang', render: r => h('div', {}, r.ruang || '–', r.mode && r.mode !== 'Onsite' ? h('span', { class: 'secondary' }, r.mode) : null) },
    { key: 'status', label: 'Status', render: r => r.status ? badge(r.status, r.status === 'Confirmed' ? 'ok' : 'warn') : null },
  ],
  exportColumns: [
    { key: 'periode', label: 'Periode' }, { key: 'batch_id', label: 'Batch', value: r => batchName(r.batch_id) }, { key: 'semester', label: 'Semester' },
    { key: 'hari', label: 'Hari' }, { key: 'jam_mulai', label: 'Jam Mulai' }, { key: 'jam_selesai', label: 'Jam Selesai' }, { key: 'mata_kuliah', label: 'Mata Kuliah' },
    { key: 'kode', label: 'Kode' }, { key: 'tipe', label: 'Tipe' }, { key: 'sks', label: 'SKS' }, { key: 'dosen', label: 'Dosen' }, { key: 'jenis_dosen', label: 'Jenis Dosen', value: jenisDosen },
    { key: 'ruang', label: 'Ruang' }, { key: 'mode', label: 'Mode' }, { key: 'status', label: 'Status' }, { key: 'classroom', label: 'Google Classroom' }, { key: 'catatan', label: 'Catatan' },
  ],
  filters: [
    { key: 'periode', label: 'Periode', options: periodeOptions },
    { key: 'batch_id', label: 'Batch', options: () => batchOptions() },
    { key: 'hari', label: 'Hari', options: [...HARI, { value: '__none', label: 'Tanpa hari tetap' }], match: (r, v) => v === '__none' ? !HARI.includes(r.hari) : r.hari === v },
    { key: 'jenis', label: 'Jenis dosen', all: 'Semua jenis dosen', options: ['Dosen External', 'Dosen Internal', 'Ikut Fakultas'], match: (r, v) => jenisDosen(r) === v },
  ],
  search: r => [r.mata_kuliah, r.dosen, r.kode, r.ruang, r.catatan].join(' '),
  searchPlaceholder: 'Cari mata kuliah, dosen, ruang…',
  defaults: () => ({ periode: currentPeriode(), tipe: 'Kuliah', mode: 'Onsite', jumlah_pertemuan: store.setting('akademik').target_pertemuan }),
  aliases: { mata_kuliah: ['Subject in English', 'Subject', 'Matkul', 'Mata Kuliah'], dosen: ['Lectures', 'Lecturer', 'Pengajar', 'Dosen'], hari: ['Day'], ruang: ['ROOM', 'Room'], batch_id: ['BATCH'], jam_mulai: ['Time', 'Jam'] },
  importNote: 'Format sheet jadwal (Subject in English, Lectures, BATCH, ROOM, Day, Time) dikenali secara otomatis. Kolom “Time” dengan isi seperti “09.30 - 12.00” akan dipisahkan menjadi jam mulai dan jam selesai. Nama hari dalam bahasa Inggris (Monday, dst.) juga dikenali.',
  emptyTitle: 'Belum ada slot jadwal',
});

/* =================== TAB 5 — KALENDER AKADEMIK =================== */
const toneKat = (k) => ({ Perkuliahan: 'info', UTS: 'warn', UAS: 'warn', Libur: 'ok' }[k] || '');
const kalenderView = crudView({
  id: 'calendar', collection: 'calendar', noun: 'kegiatan', title: 'Kalender Akademik', eyebrow: 'Jadwal Kuliah · Data dasar',
  description: 'Data disalin dari PDF kalender akademik: Semester (Ganjil/Genap), Tahun Ajaran, Jenis Kegiatan, dan rentang tanggal “… s.d. …”. Kegiatan Perkuliahan menentukan awal pertemuan, UTS/UAS menandai periode ujian, dan Libur menggeser pertemuan ke minggu berikutnya.',
  sections: [{ fields: [
    { key: 'semester', label: 'Semester', type: 'select', options: ['Ganjil', 'Genap', 'Pendek'], required: true, col: 'third' },
    { key: 'tahun_ajaran', label: 'Tahun ajaran', type: 'text', required: true, col: 'third', placeholder: '2026/2027' },
    { key: 'kategori', label: 'Kategori', type: 'select', options: KATEGORI_KALENDER, col: 'third', placeholder: '— Otomatis dari nama kegiatan —' },
    { key: 'kegiatan', label: 'Jenis kegiatan', type: 'text', required: true, placeholder: 'mis. Perkuliahan Semester Ganjil, UTS, Libur Natal' },
    { key: 'mulai', label: 'Tanggal mulai', type: 'date', required: true, col: 'half' },
    { key: 'selesai', label: 's.d. tanggal', type: 'date', col: 'half', help: 'Kosongkan apabila kegiatan hanya berlangsung satu hari.' },
    { key: 'catatan', label: 'Catatan', type: 'textarea', rows: 2 },
  ] }],
  importExtra: [{ key: 'rentang', label: 'Tanggal (… s.d. …)', type: 'text' }],
  aliases: { semester: ['Semester Ganjil/Genap', 'Semester'], tahun_ajaran: ['Tahun Ajaran', 'TA', 'Tahun Akademik'], kegiatan: ['Jenis Kegiatan', 'Kegiatan', 'Uraian Kegiatan'], mulai: ['Tanggal Mulai', 'Mulai', 'Dari'], selesai: ['Sampai Dengan', 's.d.', 'sd', 'Selesai', 'Tanggal Selesai', 'Sampai'], rentang: ['Tanggal', 'Waktu', 'Rentang Tanggal', 'Pelaksanaan'] },
  importNote: 'Salin tabel dari PDF kalender akademik ke Excel/Google Sheets dengan kolom Semester, Tahun Ajaran, Jenis Kegiatan, dan Tanggal (contoh: “7 September 2026 s.d. 26 Desember 2026”). Kolom rentang tanggal akan dipisahkan secara otomatis menjadi tanggal mulai dan tanggal selesai. Nama bulan dalam bahasa Indonesia dapat dikenali.',
  beforeSave: (r) => {
    const out = { ...r };
    if (out.rentang) { const x = parseRentang(out.rentang); out.mulai = out.mulai || x.mulai; out.selesai = out.selesai || x.selesai; }
    delete out.rentang;
    out.semester = normSemester(out.semester); out.tahun_ajaran = normTahunAjaran(out.tahun_ajaran);
    if (!out.selesai) out.selesai = out.mulai;
    if (!out.kategori) out.kategori = kategoriOf(out);
    return out;
  },
  columns: [
    { key: 'kegiatan', label: 'Jenis kegiatan', main: true, render: r => h('div', {}, h('span', { class: 'primary' }, r.kegiatan), r.catatan ? h('span', { class: 'secondary' }, r.catatan) : null) },
    { key: 'periode', label: 'Semester · TA', value: r => `${(r.tahun_ajaran || '').slice(0, 4)}${r.semester === 'Genap' ? 2 : 1}`, render: r => `${r.semester} ${r.tahun_ajaran}`, nowrap: true },
    { key: 'mulai', label: 'Tanggal', render: r => r.selesai && r.selesai !== r.mulai ? `${fmtDate(r.mulai)} s.d. ${fmtDate(r.selesai)}` : fmtDate(r.mulai) },
    { key: 'durasi', label: 'Durasi', align: 'right', value: r => { const a = parseDate(r.mulai), b = parseDate(r.selesai || r.mulai); return a && b ? Math.round((b - a) / DAY) + 1 : 0; }, render: r => { const a = parseDate(r.mulai), b = parseDate(r.selesai || r.mulai); return a && b ? `${Math.round((b - a) / DAY) + 1} hari` : '–'; } },
    { key: 'kategori', label: 'Kategori', value: r => kategoriOf(r), render: r => badge(kategoriOf(r), toneKat(kategoriOf(r))) },
  ],
  exportColumns: [{ key: 'semester', label: 'Semester' }, { key: 'tahun_ajaran', label: 'Tahun Ajaran' }, { key: 'kegiatan', label: 'Jenis Kegiatan' }, { key: 'mulai', label: 'Tanggal Mulai' }, { key: 'selesai', label: 'Sampai Dengan' }, { key: 'kategori', label: 'Kategori', value: r => kategoriOf(r) }, { key: 'catatan', label: 'Catatan' }],
  filters: [
    { key: 'periode', label: 'Periode', options: () => periodeOptions(), match: (r, v) => `${r.semester} ${r.tahun_ajaran}` === v },
    { key: 'kategori', label: 'Kategori', options: KATEGORI_KALENDER, match: (r, v) => kategoriOf(r) === v },
  ],
  search: r => [r.kegiatan, r.semester, r.tahun_ajaran, r.catatan].join(' '),
  sort: { key: 'mulai', dir: 'asc' }, pageSize: 100, exportName: 'Kalender_Akademik', unit: 'kegiatan',
  groupBy: null,
  defaults: () => { const p = currentPeriode().split(' '); return { semester: p[0] || 'Ganjil', tahun_ajaran: p[1] || '' }; },
  emptyTitle: 'Kalender akademik belum diisi', emptyText: 'Tambahkan kegiatan secara manual atau impor dari tabel PDF kalender akademik.',
});

/* ---------- Popup ubah slot (dipakai Weekly, Daily, Jadwal Full) ---------- */
export function openSlot(rec) {
  const isNew = !rec.id;
  const form = buildForm(slotSections, isNew ? { tipe: 'Kuliah', mode: 'Onsite', jumlah_pertemuan: store.setting('akademik').target_pertemuan, ...rec } : rec);
  const save = h('button', { class: 'btn btn-primary', type: 'button' }, icon('check'), 'Simpan');
  const del = !isNew ? h('button', { class: 'btn btn-danger', type: 'button' }, icon('trash', 'sm'), 'Hapus') : null;
  const d = openDrawer({ title: isNew ? 'Tambah kelas' : rec.mata_kuliah, subtitle: isNew ? '' : `${batchName(rec.batch_id)} · ${rec.periode}`, body: form.el, footer: [h('div', { class: 'left' }, del), h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => d.close() }, 'Batal'), save] });
  save.addEventListener('click', async () => { try { const v = await form.collect(); if (!v) return; await store.save('schedules', slotBeforeSave(v)); toast('Jadwal disimpan.', 'ok'); d.close(); } catch (e) { toast(e.message, 'bad'); } });
  if (del) del.addEventListener('click', async () => { if (await confirmDialog('Hapus slot jadwal ini? Data absensi yang telah tercatat akan tetap tersimpan.')) { await store.remove('schedules', rec.id); toast('Jadwal dihapus.', 'ok'); d.close(); } });
}

const TABS = [
  { id: 'full', label: 'Jadwal Full', fn: jadwalFull },
  { id: 'weekly', label: 'Weekly', fn: weekly },
  { id: 'daily', label: 'Daily', fn: daily },
  { id: 'slot', label: 'Slot jadwal', fn: slotView },
  { id: 'kalender', label: 'Kalender akademik', fn: kalenderView },
];
export default {
  mount(root) {
    let tab = pref.get('tab_jadwal2', 'full'); let inner = null; const body = h('div');
    const draw = () => {
      inner && inner.destroy && inner.destroy(); clear(root);
      root.appendChild(tabs(TABS, tab, (t) => { tab = t; pref.set('tab_jadwal2', t); draw(); }));
      clear(body); root.appendChild(body);
      inner = (TABS.find(x => x.id === tab) || TABS[0]).fn(body);
    };
    draw();
    return { destroy: () => inner && inner.destroy && inner.destroy() };
  },
};
