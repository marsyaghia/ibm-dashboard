/* =========================================================================
   BERANDA — sapaan, jam & kalender waktu Malang (WIB), pengingat data yang
   belum lengkap, kelas hari ini, dan rekap setiap menu.
   ========================================================================= */
import { h, icon, clear, fmtIDR, fmtIDRShort, fmtDate, fmtDayDate, sum, uniq, pct, badge, batchName, batches, greeting, nowWIB, today, isoDate, parseDate, monthName, HARI_P, hasAttachment } from '../ui.js';
import { store } from '../store.js';
import { lang } from '../i18n.js';
import { HARI, HADIR, toneAbsen, periodInfo, currentPeriode, sessionsOf, slotsOf, timeLabel, attendanceSummary, isLB, jenisDosen, weekNo, kategoriOf } from '../jadwal-lib.js';
import { completeness } from './mahasiswa.js';
import { tipeDosen } from './dosen.js';
import { batchProgress, targetOf } from './immersion.js';

const yearOf = (d) => String(d || '').slice(0, 4);
const noProof = (r) => !hasAttachment(r.bukti);
const DOT = { UTS: 'uts', UAS: 'uas', Libur: 'libur', Lainnya: 'lain' };

/* ---------- Pengingat data yang belum lengkap ---------- */
function reminders() {
  const out = []; const add = (tone, title, text, route, n) => { if (n) out.push({ tone, title, text, route, n }); };
  const periode = currentPeriode(); const t = today(); const info = periodInfo(periode);

  // Jadwal & kalender
  if (!info) add('bad', 'Kalender akademik belum diisi', `Periode ${periode} belum memiliki kegiatan Perkuliahan/UTS/UAS sehingga tanggal pertemuan belum dapat dihitung.`, 'jadwal', 1);
  else if (info.events.some(e => /perkiraan/i.test(e.catatan || ''))) add('warn', 'Kalender akademik masih bersifat perkiraan', `Silakan impor kalender akademik resmi ${periode} dari dokumen PDF Bagian Akademik.`, 'jadwal', 1);
  const slots = slotsOf(periode);
  add('warn', 'Slot jadwal belum lengkap', `${periode}: terdapat kelas yang belum memiliki dosen atau masih berstatus TBC.`, 'jadwal', slots.filter(s => !s.dosen || s.status === 'TBC').length);

  // Absensi Dosen External
  const lb = slots.filter(s => HARI.includes(s.hari) && isLB(s));
  const belum = sum(lb, s => attendanceSummary(s, t).belum);
  add('bad', 'Absensi Dosen External belum dicatat', `${belum} pertemuan yang telah berlangsung pada ${periode} belum dicatat.`, 'absensi', belum);

  // RPS & OBE
  const tpl = store.all('rpsTemplates'); const courses = store.all('courses');
  const noTpl = courses.filter(c => { const x = tpl.find(t => t.course_id === c.id || (t.kode_mk && t.kode_mk === c.kode)); return !x || !hasAttachment(x.template_rps) || !hasAttachment(x.template_obe); }).length;
  add('warn', 'Template RPS/OBE belum lengkap', 'Terdapat mata kuliah yang tautan template RPS atau OBE-nya belum dilengkapi.', 'rps', noTpl);
  const ass = store.all('obeAssessments').filter(a => a.periode === periode);
  const lbMk = uniq(slots.filter(s => isLB(s) && s.tipe !== 'IBM Activity').map(s => `${s.batch_id}|${s.mata_kuliah.toLowerCase()}`));
  const obeBelum = lbMk.filter(k => !ass.some(a => `${a.batch_id}|${String(a.mata_kuliah).toLowerCase()}` === k && a.status === 'Selesai')).length;
  add('warn', 'Penilaian OBE Dosen External belum selesai', `Mata kuliah Dosen External pada ${periode} yang penilaian OBE-nya belum diselesaikan oleh Tim IBM.`, 'rps', obeBelum);

  // Materi
  const mats = store.all('materials');
  add('warn', 'Materi PPT belum lengkap', 'Mata kuliah dengan materi yang belum lengkap atau belum memiliki tautan PPT.', 'materi', mats.filter(m => m.status !== 'Lengkap' || !hasAttachment(m.materi)).length);

  // Keuangan
  add('warn', 'Pengeluaran tanpa bukti', 'Transaksi pengeluaran yang belum dilengkapi kuitansi atau bukti pembayaran.', 'pengeluaran', store.all('expenses').filter(r => r.status !== 'Dibatalkan' && noProof(r)).length);
  add('info', 'Pengeluaran menunggu pembayaran', 'Transaksi berstatus “Menunggu Pembayaran” atau “Diajukan (Reimburse)”.', 'pengeluaran', store.all('expenses').filter(r => /menunggu|diajukan/i.test(r.status || '')).length);

  // Trent
  const tp = store.all('trentPayments');
  add('bad', 'Tagihan Trent perlu dibayar', 'Mata kuliah Trent yang sedang berjalan atau telah selesai, namun tagihannya belum dilunasi.', 'trent', tp.filter(r => r.progres !== 'Upcoming' && r.status_bayar !== 'Lunas').length);
  add('info', 'Marksheet Trent belum tersedia', 'Mata kuliah Trent yang telah selesai namun belum memiliki berkas marksheet.', 'trent', tp.filter(r => r.progres === 'Done' && !hasAttachment(r.marksheet)).length);

  // Immersion
  const sav = store.all('immersionSavings');
  add('warn', 'Setoran immersion menunggu verifikasi', 'Periksa bukti transfer, kemudian ubah status menjadi Terverifikasi.', 'immersion', sav.filter(r => r.status === 'Menunggu verifikasi').length);
  add('warn', 'Setoran immersion tanpa bukti transfer', 'Lampirkan bukti transfer agar setoran dapat diverifikasi.', 'immersion', sav.filter(noProof).length);
  if (sav.length) add('info', 'Batch belum punya target tabungan', 'Tetapkan target tabungan immersion untuk masing-masing batch.', 'immersion', uniq(sav.map(r => r.batch_id)).filter(b => !targetOf(b)).length);

  // Data mahasiswa & dosen
  const studs = store.all('students');
  add('warn', 'NIM mahasiswa belum diisi', 'NIM digunakan untuk mencocokkan data hasil impor (pembayaran, sertifikat, dan tabungan).', 'mahasiswa', studs.filter(s => !s.nim).length);
  add('info', 'Biodata mahasiswa belum lengkap', 'Sebagian kolom utama pada Formulir Pendataan Mahasiswa belum terisi.', 'mahasiswa', studs.filter(s => completeness(s) < 100).length);
  add('info', 'Sertifikat dalam proses / belum terbit', 'Sertifikat mahasiswa yang belum terbit.', 'sertifikat', store.all('certificates').filter(c => c.status !== 'Sudah Terbit').length);
  const dsnLB = store.all('lecturers').filter(l => tipeDosen(l) === 'Dosen External' && l.status !== 'Tidak aktif');
  add('info', 'Biodata Dosen External belum lengkap', 'Dosen External yang belum memiliki CV, email, atau nomor WhatsApp.', 'dosen', dsnLB.filter(l => !(l.cv_link || hasAttachment(l.dokumen)) || !l.email || !l.telp).length);

  const rank = { bad: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone] || b.n - a.n);
}

/* ---------- Kalender bulan (WIB) ---------- */
function calendarCard(onPick) {
  const now = nowWIB(); let ym = { y: now.getFullYear(), m: now.getMonth() }; let sel = today();
  const el = h('div', { class: 'card' }); const agenda = h('div');
  const evAll = () => store.all('calendar').map(k => ({ ...k, kat: kategoriOf(k), a: k.mulai, b: k.selesai || k.mulai }));
  function draw() {
    clear(el);
    const first = new Date(ym.y, ym.m, 1); const lead = (first.getDay() + 6) % 7; const start = new Date(ym.y, ym.m, 1 - lead);
    const evs = evAll(); const t = today();
    const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    const dow = lang() === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const move = (n) => { const d = new Date(ym.y, ym.m + n, 1); ym = { y: d.getFullYear(), m: d.getMonth() }; draw(); };
    el.append(
      h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, `${monthName(ym.m)} ${ym.y}`), h('p', {}, 'Kalender akademik · waktu Malang (WIB)')),
        h('div', { class: 'btn-group' },
          h('button', { class: 'btn btn-ghost btn-icon', type: 'button', 'aria-label': 'Bulan sebelumnya', onclick: () => move(-1) }, '‹'),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { ym = { y: now.getFullYear(), m: now.getMonth() }; sel = t; draw(); onPick(sel); } }, 'Hari ini'),
          h('button', { class: 'btn btn-ghost btn-icon', type: 'button', 'aria-label': 'Bulan berikutnya', onclick: () => move(1) }, '›'))),
      h('div', { class: 'card-body' },
        h('div', { class: 'cal-grid' }, dow.map(d => h('div', { class: 'dow' }, d)),
          days.map(d => {
            const iso = isoDate(d); const on = evs.filter(e => iso >= e.a && iso <= e.b);
            const kats = uniq(on.map(e => e.kat)).filter(k => k !== 'Perkuliahan');
            return h('button', { type: 'button', class: ['cal-day', d.getMonth() !== ym.m ? 'out' : '', on.some(e => e.kat === 'Perkuliahan') ? 'kuliah' : '', iso === t ? 'today' : '', iso === sel ? 'sel' : ''].join(' '), 'aria-label': `${fmtDayDate(iso)}${on.length ? ': ' + on.map(e => e.kegiatan).join(', ') : ''}`, title: on.map(e => e.kegiatan).join(' · '),
              onclick: () => { sel = iso; draw(); onPick(iso); } },
            h('span', {}, d.getDate()), kats.length ? h('span', { class: 'dots' }, kats.map(k => h('i', { class: DOT[k] || '' }))) : null);
          })),
        h('div', { class: 'cal-legend' }, [['kuliah', 'Masa perkuliahan'], ['uts', 'UTS / UAS'], ['libur', 'Libur'], ['lain', 'Kegiatan lain']].map(([c, l]) => h('span', {}, h('i', { class: c }), l))),
        agenda));
  }
  draw();
  return { el, agenda };
}

/* ---------- Agenda satu tanggal (kegiatan kalender + kelas) ---------- */
function dayAgenda(box, iso) {
  clear(box);
  const periode = currentPeriode(iso); const info = periodInfo(periode); const d = parseDate(iso);
  const evs = store.all('calendar').filter(k => iso >= k.mulai && iso <= (k.selesai || k.mulai));
  const sess = slotsOf(periode).filter(s => HARI.includes(s.hari)).flatMap(s => sessionsOf(s, info)).filter(x => x.tanggal === iso)
    .sort((a, b) => String(a.slot.jam_mulai || '99').localeCompare(String(b.slot.jam_mulai || '99')));
  box.append(h('div', { class: 'cal-agenda' },
    h('h4', {}, fmtDayDate(iso), weekNo(info, d) ? h('small', {}, ` · ${periode} · minggu ke-${weekNo(info, d)}`) : null),
    evs.length ? h('div', { class: 'actions', style: { margin: '6px 0' } }, evs.map(e => badge(e.kegiatan, { UTS: 'warn', UAS: 'warn', Libur: 'ok', Perkuliahan: 'info' }[kategoriOf(e)] || ''))) : null,
    sess.length ? h('ul', { class: 'list compact' }, sess.slice(0, 8).map(x => h('li', {},
      h('div', { class: 'time-cell', style: { minWidth: '48px' } }, h('b', {}, x.slot.jam_mulai || '–'), h('span', {}, x.slot.jam_selesai || '')),
      h('div', {}, h('strong', {}, x.slot.mata_kuliah), h('span', {}, `${batchName(x.slot.batch_id)} · ${x.slot.dosen || '–'} · P${x.no}${x.jenis !== 'Kuliah' ? ' · ' + x.jenis : ''}`)),
      h('div', { class: 'more' }, isLB(x.slot) ? (x.absen && x.absen.status ? badge(x.absen.status, toneAbsen(x.absen.status)) : h('span', { class: 'muted' }, 'Dosen External')) : null)))) :
      h('p', { class: 'muted', style: { margin: '6px 0 0', fontSize: '13px' } }, d && d.getDay() === 0 ? 'Hari Minggu — tidak ada perkuliahan.' : 'Tidak ada kelas terjadwal.'),
    sess.length > 8 ? h('a', { href: '#/jadwal', class: 'doc-link' }, `+${sess.length - 8} kelas lainnya di Jadwal Kuliah`) : null));
}

/* ---------- Rekap tiap menu ---------- */
function moduleCards() {
  const y = String(nowWIB().getFullYear()); const periode = currentPeriode(); const t = today();
  const exp = store.all('expenses').filter(r => r.status !== 'Dibatalkan' && yearOf(r.tanggal) === y);
  const inc = store.all('incomes');
  const courses = store.all('courses'); const tpl = store.all('rpsTemplates');
  const tplOk = courses.filter(c => tpl.some(x => (x.course_id === c.id || x.kode_mk === c.kode) && hasAttachment(x.template_rps))).length;
  const mats = store.all('materials'); const matOk = mats.filter(m => m.status === 'Lengkap').length;
  const slots = slotsOf(periode); const fixed = slots.filter(s => HARI.includes(s.hari));
  const lb = fixed.filter(isLB); const abs = lb.map(s => attendanceSummary(s, t)); const due = sum(abs, 'due'); const rec = sum(abs, 'tercatat');
  const cnt = sum(abs, x => x.hadir + x.diganti + x.tidak); const hadir = sum(abs, 'hadir');
  const tp = store.all('trentPayments'); const tpOk = tp.filter(r => r.status_bayar === 'Lunas').length;
  const imm = batches().map(b => batchProgress(b.id)).filter(P => P.target); const immTot = sum(imm, 'total'); const immTarget = sum(imm, 'targetTotal');
  const cert = store.all('certificates'); const certOk = cert.filter(c => c.status === 'Sudah Terbit').length;
  const studs = store.all('students'); const aktif = studs.filter(s => s.status_mhs === 'Mahasiswa Aktif').length;
  const dsn = store.all('lecturers');
  const card = (route, ic, label, value, sub, meter) => h('a', { class: 'module-card', href: `#/${route}` },
    h('span', { class: 'top' }, icon(ic), label), h('span', { class: 'v' }, value), h('span', { class: 's' }, sub),
    meter !== undefined ? h('div', { class: 'meter ok', role: 'meter', 'aria-valuenow': meter, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': label }, h('i', { style: { width: `${Math.min(100, meter)}%` } })) : null);
  return h('div', { class: 'module-grid' },
    card('pengeluaran', 'expense', 'Pengeluaran Divisi', fmtIDRShort(sum(exp, 'jumlah')), `${exp.length} transaksi tahun ${y}`),
    card('pemasukan', 'income', 'Perolehan Mahasiswa', `${inc.length} mahasiswa`, `UKT ${fmtIDRShort(sum(inc, 'ukt_per_semester'))} per semester`),
    card('rps', 'book', 'RPS & OBE', `${tplOk} / ${courses.length}`, 'template RPS tersedia', pct(tplOk, courses.length)),
    card('materi', 'slides', 'Materi & PPT', `${pct(matOk, mats.length)}%`, `${matOk} dari ${mats.length} materi lengkap`, pct(matOk, mats.length)),
    card('jadwal', 'calendar', 'Jadwal Kuliah', `${fixed.length} kelas`, `${periode} · ${slots.length - fixed.length} tanpa hari tetap`),
    card('absensi', 'clipboard', 'Absensi Dosen External', cnt ? `${Math.round(hadir / cnt * 100)}% hadir` : '–', `${rec} / ${due} pertemuan tercatat`, pct(rec, due)),
    card('trent', 'handshake', 'Trent Global College', `${tpOk} / ${tp.length}`, 'tagihan lunas', pct(tpOk, tp.length)),
    card('immersion', 'plane', 'Immersion', immTarget ? `${pct(immTot, immTarget)}%` : fmtIDRShort(sum(store.all('immersionSavings').filter(r => (r.status || 'Terverifikasi') === 'Terverifikasi'), 'jumlah')), immTarget ? `${fmtIDRShort(immTot)} dari ${fmtIDRShort(immTarget)}` : 'target tabungan belum diatur', immTarget ? pct(immTot, immTarget) : undefined),
    (() => { const mg = store.all('internships'); const rv = store.all('internshipReviews').filter(r => r.status_review !== 'Disembunyikan'); const avg = rv.length ? (sum(rv, 'rating_keseluruhan') / rv.length).toFixed(1).replace('.', ',') : null;
      return card('magang', 'briefcase', 'Data Magang', `${mg.filter(m => m.status === 'Berjalan').length} berjalan`, `${mg.length} penempatan · ${rv.length ? `rating ${avg}/5 (${rv.length} ulasan)` : 'belum ada ulasan'}`, mg.length ? pct(rv.length, mg.filter(m => ['Berjalan', 'Selesai'].includes(m.status)).length) : undefined); })(),
    card('sertifikat', 'award', 'Sertifikat', `${certOk} / ${cert.length}`, 'sertifikat sudah terbit', cert.length ? pct(certOk, cert.length) : undefined),
    card('mahasiswa', 'users', 'Biodata Mahasiswa', `${aktif} aktif`, `${studs.length} mahasiswa · ${batches().length} batch`),
    card('dosen', 'teacher', 'Biodata Dosen', `${dsn.length} dosen`, `${dsn.filter(l => tipeDosen(l) === 'Dosen External').length} Dosen External · ${dsn.filter(l => tipeDosen(l) === 'Dosen Internal').length} internal`),
  );
}

export default {
  mount(root) {
    const p = store.profile || {}; const prof = store.setting('profil');
    const box = h('div'); let timer = null;
    const clockBig = h('span', { class: 'big', 'aria-live': 'off' }); const clockSub = h('small');
    const tick = () => { const d = nowWIB(); clockBig.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; clockSub.textContent = `${HARI_P[lang()][d.getDay()]}, ${fmtDate(d)} · ${store.setting('profil').kota || 'Malang'} (WIB)`; };
    function render() {
      clear(box);
      const periode = currentPeriode(); const info = periodInfo(periode); const wk = weekNo(info, today());
      const rem = reminders();
      const cal = calendarCard((iso) => dayAgenda(cal.agenda, iso)); dayAgenda(cal.agenda, today());
      const greet = `${greeting()}, ${p.sapaan || p.nama || 'Tim IBM'}`;
      box.append(
        h('section', { class: 'hero' },
          h('div', {}, h('span', { class: 'eyebrow' }, prof.nama_divisi || 'Divisi IBM'), h('h1', {}, greet),
            h('p', {}, info && wk ? `${periode} sedang berjalan — minggu perkuliahan ke-${wk}. Berikut ringkasan seluruh menu dan data yang perlu dilengkapi.` : `${periode}. Berikut ringkasan seluruh menu dan data yang perlu dilengkapi.`)),
          h('div', { class: 'clock-card' }, icon('clock'), h('div', {}, clockBig, clockSub))),
        h('div', { class: 'grid grid-main' },
          h('div', { class: 'card' },
            h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, icon('bell', 'sm'), ' Pengingat data'), h('p', {}, rem.length ? `${rem.length} hal perlu ditindaklanjuti` : 'Seluruh data utama telah lengkap'))),
            rem.length ? h('ul', { class: 'list' }, rem.map(r => h('li', {},
              h('span', { class: `ico ${r.tone}` }, icon(r.tone === 'bad' ? 'alert' : r.tone === 'warn' ? 'bell' : 'info')),
              h('div', {}, h('strong', {}, r.title, ' ', h('span', { class: `badge ${r.tone === 'info' ? '' : r.tone}` }, String(r.n))), h('span', {}, r.text)),
              h('a', { class: 'more doc-link', href: `#/${r.route}` }, h('span', {}, 'Buka'), icon('arrow', 'sm')))))
              : h('div', { class: 'empty' }, icon('check'), h('h3', {}, 'Tidak ada pengingat'), h('p', {}, 'Tidak ada data yang perlu ditindaklanjuti.'))),
          cal.el),
        h('h2', { class: 'section-title' }, icon('dashboard', 'sm'), 'Rekap tiap menu'),
        moduleCards());
    }
    tick(); timer = setInterval(tick, 1000);
    render(); root.appendChild(box);
    const unsub = store.subscribe(render);
    return { destroy: () => { clearInterval(timer); unsub(); } };
  },
};
