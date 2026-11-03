/* =========================================================================
   6. ABSENSI DOSEN EXTERNAL — per mata kuliah, per periode, per batch (diisi tim IBM)
   Hanya kelas yang diajar Dosen External; dosen internal Asia tidak dicatat di sini.
   • Rekap kehadiran : persentase per kelas atau per dosen
   • Lembar absensi  : seluruh pertemuan satu kelas (status, dosen mengajar, jam)
   • Log absensi     : semua catatan (filter, ekspor)
   Absensi cepat juga bisa diisi dari Jadwal Kuliah → Daily.
   ========================================================================= */
import { h, icon, clear, badge, batchName, batchOptions, batchSelect, picker, selectEl, tabPage, pref, toast, fmtDate, today, pct, uniq, chain, byBatch, byText } from '../ui.js';
import { crudView, kpiRow } from '../crud.js';
import { dataTable } from '../table.js';
import { exportWorkbook } from '../io.js';
import { store } from '../store.js';
import { nameKey } from './dosen.js';
import { HARI, STATUS_ABSEN, HADIR, toneAbsen, periodInfo, periodeOptions, currentPeriode, sessionsOf, slotsOf, timeLabel, byTime, attendanceSummary, saveAbsen, isLB } from '../jadwal-lib.js';

const pctCell = (p) => p === null ? h('span', { class: 'muted' }, '–') : h('div', { class: 'progress-cell' }, h('small', {}, `${p}%`), h('div', { class: `meter ${p >= 80 ? 'ok' : 'warn'}` }, h('i', { style: { width: `${p}%` } })));
/** Kelas Dosen External dengan hari tetap pada periode/batch */
const lbSlots = (periode, batch) => slotsOf(periode, batch).filter(s => HARI.includes(s.hari) && isLB(s)).sort(byTime);
/** Pilihan "dosen mengajar": dosen terjadwal + seluruh Biodata Dosen */
const dosenOptions = (slot, cur) => uniq([slot.dosen, ...store.all('lecturers').filter(l => l.status !== 'Tidak aktif').map(l => l.nama).sort((a, b) => a.localeCompare(b)), cur]);

function selectors(state, render, { slot = false } = {}) {
  const per = picker('Periode', selectEl(periodeOptions(), state.periode, (v) => { state.periode = v; state.slot = ''; render(); }, { label: 'Periode' }));
  const bat = batchSelect({ value: state.batch || '', withAll: true, onChange: (v) => { state.batch = v; state.slot = ''; render(); } });
  const out = [per, bat];
  if (slot) {
    const slots = lbSlots(state.periode, state.batch).sort(chain(byBatch(s => s.batch_id), (a, b) => HARI.indexOf(a.hari) - HARI.indexOf(b.hari), byText(s => s.jam_mulai)));
    if (!slots.some(s => s.id === state.slot)) state.slot = (slots[0] || {}).id || '';
    const sl = selectEl(slots.map(s => ({ value: s.id, label: `${s.mata_kuliah}${state.batch ? '' : ' · ' + batchName(s.batch_id)} · ${s.hari} ${s.jam_mulai || ''}` })), state.slot, (v) => { state.slot = v; render(); }, { label: 'Kelas' });
    out.push(picker('Kelas', sl, 'picker-wide'));
  }
  return out;
}
const loadState = () => {
  const st = { periode: pref.get('abs_periode', ''), batch: pref.get('abs_batch', ''), slot: pref.get('abs_slot', ''), mode: pref.get('abs_mode', 'kelas') };
  if (!periodeOptions().includes(st.periode)) st.periode = currentPeriode();
  return st;
};

/* =================== Rekap kehadiran =================== */
function rekap(root, goSheet) {
  const state = loadState(); const box = h('div');
  function render() {
    pref.set('abs_periode', state.periode); pref.set('abs_batch', state.batch); pref.set('abs_mode', state.mode);
    clear(box);
    const t = today();
    const rows = lbSlots(state.periode, state.batch).map(s => ({ s, r: attendanceSummary(s, t) }));
    const tot = rows.reduce((a, x) => ({ due: a.due + x.r.due, rec: a.rec + x.r.tercatat, hadir: a.hadir + x.r.hadir, cnt: a.cnt + x.r.hadir + x.r.diganti + x.r.tidak, belum: a.belum + x.r.belum }), { due: 0, rec: 0, hadir: 0, cnt: 0, belum: 0 });
    const byDosen = Object.values(rows.reduce((m, x) => {
      const k = nameKey(x.s.dosen) || x.s.dosen || '—';
      const g = m[k] || (m[k] = { nama: x.s.dosen || '—', kelas: [], due: 0, rec: 0, hadir: 0, diganti: 0, tidak: 0, belum: 0 });
      g.kelas.push(x.s.mata_kuliah); g.due += x.r.due; g.rec += x.r.tercatat; g.hadir += x.r.hadir; g.diganti += x.r.diganti; g.tidak += x.r.tidak; g.belum += x.r.belum; return m;
    }, {})).map(g => ({ ...g, persen: (g.hadir + g.diganti + g.tidak) ? Math.round(g.hadir / (g.hadir + g.diganti + g.tidak) * 100) : null }));
    const [per, bat] = selectors(state, render);
    const modeSel = h('div', { class: 'seg', role: 'group', 'aria-label': 'Tampilan' }, [['kelas', 'Per kelas'], ['dosen', 'Per dosen']].map(([v, l]) => h('button', { type: 'button', 'aria-pressed': String(state.mode === v), onclick: () => { state.mode = v; render(); } }, l)));

    const exportAll = () => {
      const ids = new Set(rows.map(x => x.s.id));
      const att = store.all('attendance').filter(a => ids.has(a.schedule_id)).sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
      exportWorkbook(`Rekap_Absensi_Dosen_LB_${state.periode}_${state.batch ? batchName(state.batch) : 'Semua'}`.replace(/\W+/g, '_'), [
        { name: 'Per Kelas', rows: [['Mata Kuliah', 'Batch', 'Dosen', 'Jadwal', 'Terjadwal s.d. hari ini', 'Tercatat', 'Hadir', 'Diganti', 'Tidak hadir', 'Belum dicatat', 'Kehadiran (%)'], ...rows.map(x => [x.s.mata_kuliah, batchName(x.s.batch_id), x.s.dosen, `${x.s.hari} ${timeLabel(x.s)}`, x.r.due, x.r.tercatat, x.r.hadir, x.r.diganti, x.r.tidak, x.r.belum, x.r.persen ?? ''])] },
        { name: 'Per Dosen', rows: [['Dosen', 'Kelas', 'Terjadwal s.d. hari ini', 'Tercatat', 'Hadir', 'Diganti', 'Tidak hadir', 'Belum dicatat', 'Kehadiran (%)'], ...byDosen.map(g => [g.nama, uniq(g.kelas).join('; '), g.due, g.rec, g.hadir, g.diganti, g.tidak, g.belum, g.persen ?? ''])] },
        { name: 'Detail', rows: [['Tanggal', 'Mata Kuliah', 'Batch', 'Pertemuan', 'Jenis', 'Status', 'Dosen Terjadwal', 'Dosen Mengajar', 'Jam Masuk', 'Jam Keluar', 'Catatan', 'Dicatat Oleh'], ...att.map(a => [a.tanggal, a.mata_kuliah, batchName(a.batch_id), a.pertemuan, a.jenis, a.status, a.dosen_jadwal, a.dosen_hadir, a.jam_masuk, a.jam_keluar, a.catatan, a.dicatat_oleh])] },
      ]);
    };
    const num = (v, warn) => warn && v ? h('b', { class: 'num', style: { color: 'var(--warn)' } }, v) : h('span', { class: 'num' }, v);
    const tblKelas = dataTable({ rows, pageSize: Infinity, order: chain(byBatch(x => x.s.batch_id), byText(x => x.s.mata_kuliah)), onRowClick: x => goSheet(x.s),
      columns: [
        { key: 'mk', label: 'Mata kuliah', main: true, value: x => x.s.mata_kuliah, render: x => h('div', {}, h('span', { class: 'primary' }, x.s.mata_kuliah), h('span', { class: 'secondary' }, `${x.s.dosen || '—'} · ${batchName(x.s.batch_id)}`)) },
        { key: 'jadwal', label: 'Jadwal', nowrap: true, value: x => `${HARI.indexOf(x.s.hari)}${x.s.jam_mulai}`, render: x => h('div', {}, x.s.hari, h('span', { class: 'secondary num' }, timeLabel(x.s))) },
        { key: 'due', width: '96px', label: 'Terjadwal', align: 'right', value: x => x.r.due, render: x => num(`${x.r.due}/${x.r.total}`) },
        { key: 'hadir', width: '96px', label: 'Hadir', align: 'right', value: x => x.r.hadir, render: x => num(x.r.hadir) },
        { key: 'diganti', width: '96px', label: 'Diganti', align: 'right', value: x => x.r.diganti, render: x => num(x.r.diganti) },
        { key: 'tidak', width: '96px', label: 'Tidak hadir', align: 'right', value: x => x.r.tidak, render: x => num(x.r.tidak) },
        { key: 'belum', width: '96px', label: 'Belum dicatat', align: 'right', value: x => x.r.belum, render: x => num(x.r.belum, true) },
        { key: 'persen', label: 'Kehadiran', width: '130px', value: x => x.r.persen ?? 101, render: x => pctCell(x.r.persen) },
      ],
      rowActions: x => h('div', { class: 'row-actions' }, h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => goSheet(x.s) }, icon('clipboard', 'sm'), 'Isi absensi')) });
    const tblDosen = dataTable({ rows: byDosen, pageSize: Infinity, order: byText(g => g.nama),
      columns: [
        { key: 'nama', label: 'Dosen', main: true, render: g => h('div', {}, h('span', { class: 'primary' }, g.nama), h('span', { class: 'secondary' }, uniq(g.kelas).join(' · '))) },
        { key: 'due', width: '96px', label: 'Terjadwal', align: 'right', render: g => num(g.due) },
        { key: 'hadir', width: '96px', label: 'Hadir', align: 'right', render: g => num(g.hadir) },
        { key: 'diganti', width: '96px', label: 'Diganti', align: 'right', render: g => num(g.diganti) },
        { key: 'tidak', width: '96px', label: 'Tidak hadir', align: 'right', render: g => num(g.tidak) },
        { key: 'belum', width: '96px', label: 'Belum dicatat', align: 'right', render: g => num(g.belum, true) },
        { key: 'persen', label: 'Kehadiran', value: g => g.persen ?? 101, render: g => pctCell(g.persen) },
      ] });

    box.append(...[
      h('div', { class: 'page-head' },
        h('div', {}, h('span', { class: 'eyebrow' }, 'Akademik · Absensi Dosen External'), h('h1', {}, 'Rekap Kehadiran Dosen External'), h('p', {}, `${state.periode} · ${state.batch ? batchName(state.batch) : 'semua batch'}. Dihitung berdasarkan pertemuan yang telah berlangsung (s.d. ${fmtDate(t)}); status “Dijadwal ulang” dan “Libur” tidak diperhitungkan.`)),
        h('div', { class: 'actions no-print' }, per, bat, modeSel, h('button', { class: 'btn btn-ghost', type: 'button', onclick: exportAll }, icon('sheet'), 'Ekspor Excel'))),
      kpiRow([
        { label: 'Kehadiran Dosen External', value: tot.cnt ? `${Math.round(tot.hadir / tot.cnt * 100)}%` : '–', sub: `${tot.hadir} hadir dari ${tot.cnt} pertemuan tercatat`, meter: tot.cnt ? Math.round(tot.hadir / tot.cnt * 100) : 0, meterTone: 'ok', icon: 'teacher', accent: true },
        { label: 'Pertemuan s.d. hari ini', value: tot.due, sub: `${rows.length} kelas · ${uniq(rows.map(x => x.s.dosen)).length} Dosen External`, icon: 'calendar' },
        { label: 'Absensi tercatat', value: `${pct(tot.rec, tot.due)}%`, sub: `${tot.rec} dari ${tot.due}`, meter: pct(tot.rec, tot.due), icon: 'check' },
        { label: 'Belum dicatat', value: tot.belum, sub: 'perlu dicatat oleh Tim IBM', icon: 'alert' },
      ]),
      h('div', { class: 'card' }, !rows.length ? h('div', { class: 'empty' }, icon('teacher'), h('h3', {}, 'Tidak ada kelas Dosen External'), h('p', {}, 'Periode/batch ini tidak memiliki kelas Dosen External dengan hari tetap. Jenis dosen dapat diatur melalui Jadwal Kuliah → List Jadwal atau Biodata Dosen.'))
        : (state.mode === 'dosen' ? tblDosen : tblKelas).el),
    ].filter(Boolean));
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe(render) };
}

/* =================== Lembar absensi =================== */
function lembar(root) {
  const state = loadState(); const box = h('div'); let muted = false;
  function render() {
    pref.set('abs_periode', state.periode); pref.set('abs_batch', state.batch);
    clear(box);
    const sels = selectors(state, render, { slot: true }); pref.set('abs_slot', state.slot);
    const slot = store.get('schedules', state.slot);
    const pickBar = h('div', { class: 'sheet-picker no-print' }, ...sels);
    const head = (...actions) => h('div', { class: 'page-head' },
      h('div', {}, h('span', { class: 'eyebrow' }, 'Akademik · Absensi Dosen External'), h('h1', {}, 'Lembar Absensi Dosen External'),
        h('p', {}, 'Pilih periode, batch, dan kelas, lalu isi status kehadiran dosen pada setiap pertemuan. Perubahan tersimpan otomatis.')),
      actions.length ? h('div', { class: 'actions no-print' }, ...actions) : null);
    if (!slot) { box.append(head(), h('div', { class: 'card' }, pickBar, h('div', { class: 'empty' }, icon('teacher'), h('h3', {}, 'Tidak ada kelas Dosen External dengan hari tetap'), h('p', {}, 'Silakan pilih periode/batch lain atau lengkapi hari, jam, dan jenis dosen melalui Jadwal Kuliah → List Jadwal.')))); return; }
    const sessions = sessionsOf(slot, periodInfo(slot.periode));
    const t = today(); const sm = attendanceSummary(slot, t);
    const save = async (x, patch, rowEl) => {
      muted = true;
      try { x.absen = await saveAbsen(x, patch); rowEl.classList.add('saved'); setTimeout(() => rowEl.classList.remove('saved'), 900); }
      catch (e) { toast(e.message, 'bad'); } finally { muted = false; }
    };
    const exportSheet = () => exportWorkbook(`Absensi_${slot.mata_kuliah}_${batchName(slot.batch_id)}_${slot.periode}`.replace(/\W+/g, '_'), [{ name: 'Absensi Dosen External', rows: [
      ['Mata Kuliah', slot.mata_kuliah], ['Batch', batchName(slot.batch_id)], ['Periode', slot.periode], ['Dosen', slot.dosen], ['Jadwal', `${slot.hari} ${timeLabel(slot)} · ${slot.ruang || ''}`], [],
      ['Pertemuan', 'Tanggal', 'Jenis', 'Status', 'Dosen Mengajar', 'Jam Masuk', 'Jam Keluar', 'Catatan'].map(v => ({ v, bold: true })),
      ...sessions.map(x => { const a = x.absen || {}; return [x.no, x.tanggal, x.jenis, a.status || '', a.dosen_hadir || '', a.jam_masuk || '', a.jam_keluar || '', a.catatan || '']; }),
    ], header: false, widths: [11, 12, 9, 20, 34, 10, 10, 40] }]);

    const L = (label, ...kids) => h('td', { 'data-label': label, class: /Dosen|Catatan|Jam/.test(label) ? 'wide' : '' }, ...kids);
    const tbody = h('tbody', {}, sessions.map(x => {
      const a = x.absen || {}; const tr = h('tr', { class: [x.tanggal === t ? 'is-today' : '', x.tanggal > t ? 'is-future' : ''].join(' ') });
      const st = h('select', { class: `select st-${toneAbsen(a.status) || 'none'}`, 'aria-label': `Status pertemuan ${x.no}` }, h('option', { value: '' }, x.tanggal <= t ? '— Belum dicatat —' : '—'), STATUS_ABSEN.map(v => h('option', { value: v }, v)));
      st.value = a.status || '';
      st.addEventListener('change', () => { st.className = `select st-${toneAbsen(st.value) || 'none'}`; save(x, { status: st.value, dosen_hadir: dsn.value || slot.dosen }, tr); });
      const dsn = h('select', { class: 'select', 'aria-label': `Dosen mengajar pertemuan ${x.no}` }, dosenOptions(slot, a.dosen_hadir).map(n => h('option', { value: n }, n === slot.dosen ? `${n} (terjadwal)` : n)));
      dsn.value = a.dosen_hadir || slot.dosen || '';
      dsn.addEventListener('change', () => { const patch = { dosen_hadir: dsn.value }; if (dsn.value !== slot.dosen && (!st.value || HADIR.includes(st.value))) { patch.status = 'Diganti dosen lain'; st.value = patch.status; st.className = `select st-${toneAbsen(patch.status)}`; } save(x, patch, tr); });
      const time = (key, label) => { const el = h('input', { class: 'input', type: 'time', value: a[key] || '', 'aria-label': label }); el.addEventListener('change', () => save(x, { [key]: el.value }, tr)); return el; };
      const note = h('input', { class: 'input', value: a.catatan || '', placeholder: 'Catatan (opsional)', 'aria-label': `Catatan pertemuan ${x.no}` });
      note.addEventListener('change', () => save(x, { catatan: note.value.trim() }, tr));
      const date = h('input', { class: 'input', type: 'date', value: x.tanggal, title: x.tanggal !== x.rencana ? `Jadwal awal ${fmtDate(x.rencana)}` : 'Ubah apabila jadwal kelas dipindahkan', 'aria-label': `Tanggal pertemuan ${x.no}` });
      date.addEventListener('change', () => { if (date.value) save(x, { tanggal: date.value }, tr); });
      tr.append(
        h('td', { class: 'cell-main' }, h('div', { class: 'meet-no' }, h('b', {}, `Pertemuan ${x.no}`), x.jenis !== 'Kuliah' ? h('span', { class: 'pill gold' }, x.jenis) : null)),
        L('Tanggal', date), L('Status', st), L('Dosen mengajar', dsn),
        L('Jam masuk – keluar', h('div', { class: 'jam' }, time('jam_masuk', 'Jam masuk'), time('jam_keluar', 'Jam keluar'))),
        L('Catatan', note));
      return tr;
    }));

    const meta = (label, value) => value ? h('span', {}, `${label} `, h('b', {}, value)) : null;
    box.append(
      head(h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => window.print() }, icon('print'), 'Cetak'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: exportSheet }, icon('sheet'), 'Ekspor Excel')),
      kpiRow([
        { label: 'Kehadiran dosen', value: sm.persen === null ? '–' : `${sm.persen}%`, sub: `${sm.hadir} hadir · ${sm.diganti} diganti · ${sm.tidak} tidak hadir`, meter: sm.persen || 0, meterTone: 'ok', icon: 'teacher', accent: true },
        { label: 'Pertemuan berlangsung', value: `${sm.due} / ${sm.total}`, meter: pct(sm.due, sm.total), icon: 'calendar' },
        { label: 'Belum dicatat', value: sm.belum, sub: 'pertemuan yang telah berlangsung', icon: 'alert' },
      ]),
      h('div', { class: 'card' },
        pickBar,
        h('div', { class: 'sheet-meta' }, meta('Batch', batchName(slot.batch_id)), meta('Jadwal', `${slot.hari} ${timeLabel(slot)}`), meta('Dosen', slot.dosen || 'belum ditentukan'), meta('Ruang', slot.ruang), meta('Periode', slot.periode)),
        h('div', { class: 'table-wrap' }, h('table', { class: 'tbl compact presensi stack' },
          h('thead', {}, h('tr', {}, [['Pertemuan', '120px'], ['Tanggal', '150px'], ['Status', '200px'], ['Dosen mengajar', ''], ['Jam masuk – keluar', '210px'], ['Catatan', '18%']].map(([x, w]) => h('th', { style: w ? { width: w } : null }, x)))), tbody)),
        h('div', { class: 'legend-row' }, icon('info', 'sm'), h('span', {}, 'Memilih dosen pengganti otomatis mengubah status menjadi “Diganti dosen lain”.'))));
  }
  render(); root.appendChild(box);
  return { destroy: store.subscribe(() => { if (!muted) render(); }) };
}

/* =================== Log absensi =================== */
const logView = crudView({
  id: 'attendance', collection: 'attendance', noun: 'catatan absensi', title: 'Log Absensi Dosen External', eyebrow: 'Akademik · Absensi Dosen External',
  description: 'Seluruh catatan kehadiran Dosen External yang telah diisi oleh Tim IBM, diurutkan dari yang terbaru. Untuk menambahkan catatan, gunakan tab Lembar Absensi atau menu Jadwal Kuliah → Daily.',
  addable: false, exportName: 'Log_Absensi_Dosen_LB', sort: { key: 'tanggal', dir: 'desc' }, pageSize: 50,
  sections: [{ fields: [
    { key: 'tanggal', label: 'Tanggal', type: 'date', col: 'half' },
    { key: 'status', label: 'Status', type: 'select', options: STATUS_ABSEN, col: 'half', required: true },
    { key: 'dosen_hadir', label: 'Dosen mengajar', type: 'select', options: (r) => uniq([r && r.dosen_jadwal, ...store.all('lecturers').map(l => l.nama).sort(), r && r.dosen_hadir]) },
    { key: 'jam_masuk', label: 'Jam masuk', type: 'text', col: 'half' }, { key: 'jam_keluar', label: 'Jam keluar', type: 'text', col: 'half' },
    { key: 'catatan', label: 'Catatan', type: 'textarea' },
  ] }],
  columns: [
    { key: 'tanggal', label: 'Tanggal', render: r => fmtDate(r.tanggal), nowrap: true },
    { key: 'mata_kuliah', label: 'Mata kuliah', main: true, render: r => h('div', {}, h('span', { class: 'primary' }, r.mata_kuliah), h('span', { class: 'secondary' }, `${batchName(r.batch_id)} · Pertemuan ${r.pertemuan}${r.jenis && r.jenis !== 'Kuliah' ? ' · ' + r.jenis : ''}`)) },
    { key: 'dosen_hadir', label: 'Dosen mengajar', render: r => h('div', {}, r.dosen_hadir || r.dosen_jadwal || '–', r.dosen_hadir && nameKey(r.dosen_hadir) !== nameKey(r.dosen_jadwal) ? h('span', { class: 'secondary' }, `Terjadwal: ${r.dosen_jadwal}`) : null) },
    { key: 'status', label: 'Status', render: r => badge(r.status, toneAbsen(r.status)) },
    { key: 'jam', label: 'Jam', value: r => r.jam_masuk, render: r => r.jam_masuk ? `${r.jam_masuk}${r.jam_keluar ? '–' + r.jam_keluar : ''}` : null },
    { key: 'periode', label: 'Periode', nowrap: true },
  ],
  exportColumns: [
    { key: 'tanggal', label: 'Tanggal' }, { key: 'periode', label: 'Periode' }, { key: 'batch_id', label: 'Batch', value: r => batchName(r.batch_id) },
    { key: 'mata_kuliah', label: 'Mata Kuliah' }, { key: 'pertemuan', label: 'Pertemuan' }, { key: 'jenis', label: 'Jenis' }, { key: 'status', label: 'Status' },
    { key: 'dosen_jadwal', label: 'Dosen Terjadwal' }, { key: 'dosen_hadir', label: 'Dosen Mengajar' }, { key: 'jam_masuk', label: 'Jam Masuk' }, { key: 'jam_keluar', label: 'Jam Keluar' },
    { key: 'catatan', label: 'Catatan' }, { key: 'dicatat_oleh', label: 'Dicatat Oleh' },
  ],
  importable: false,
  filters: [
    { key: 'periode', label: 'Periode', options: periodeOptions },
    { key: 'batch_id', label: 'Batch', options: () => batchOptions() },
    { key: 'status', label: 'Status', options: STATUS_ABSEN },
  ],
  search: r => [r.mata_kuliah, r.dosen_hadir, r.dosen_jadwal, r.catatan].join(' '),
  searchPlaceholder: 'Cari mata kuliah atau dosen…',
  kpis: (rows) => [
    { label: 'Catatan absensi', value: rows.length, icon: 'clipboard' },
    { label: 'Dosen hadir', value: `${pct(rows.filter(r => HADIR.includes(r.status)).length, rows.length)}%`, sub: `${rows.filter(r => HADIR.includes(r.status)).length} pertemuan`, icon: 'check', accent: true },
    { label: 'Diganti dosen lain', value: rows.filter(r => r.status === 'Diganti dosen lain').length, icon: 'users' },
    { label: 'Tidak hadir', value: rows.filter(r => r.status === 'Tidak hadir').length, icon: 'alert' },
  ],
  emptyTitle: 'Belum ada absensi tercatat', emptyText: 'Absensi dapat diisi melalui tab Lembar absensi atau langsung dari menu Jadwal Kuliah → Daily.',
});

/* Urutan tab: Lembar absensi (langsung siap diisi) · Log absensi · Rekap kehadiran */
export default {
  mount(root) {
    return tabPage(root, [
      { id: 'lembar', label: 'Lembar absensi', fn: (body) => lembar(body) },
      { id: 'log', label: 'Log absensi', fn: (body) => logView(body) },
      { id: 'rekap', label: 'Rekap kehadiran', fn: (body, ctx) => rekap(body, (s) => { pref.set('abs_slot', s.id); pref.set('abs_batch', s.batch_id); pref.set('abs_periode', s.periode); ctx.go('lembar'); }) },
    ], { eyebrow: 'Akademik', title: 'Absensi Dosen External', def: 'lembar', remember: false });
  },
};
