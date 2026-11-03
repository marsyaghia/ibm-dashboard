/* =========================================================================
   JADWAL — logika bersama Jadwal Kuliah, Absensi Dosen External, dan Beranda.
   Tanggal pertemuan dihitung dari slot mingguan (hari + jam) dan
   kalender akademik (format PDF akademik: semester, tahun ajaran, kegiatan,
   tanggal mulai s.d. selesai).
   ========================================================================= */
import { store } from './store.js';
import { parseDate, isoDate, today, batchName, uniq } from './ui.js';

export const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const STATUS_ABSEN = ['Hadir', 'Terlambat', 'Online (daring)', 'Diganti dosen lain', 'Tugas mandiri', 'Tidak hadir', 'Dijadwal ulang', 'Libur'];
export const HADIR = ['Hadir', 'Terlambat', 'Online (daring)'];
export const TIDAK_DIHITUNG = ['Dijadwal ulang', 'Libur'];
export const toneAbsen = (s) => ({ 'Hadir': 'ok', 'Terlambat': 'warn', 'Online (daring)': 'info', 'Diganti dosen lain': 'warn', 'Tugas mandiri': 'warn', 'Tidak hadir': 'bad', 'Dijadwal ulang': '', 'Libur': '' }[s] ?? '');
export const KATEGORI_KALENDER = ['Perkuliahan', 'UTS', 'UAS', 'Libur', 'Lainnya'];

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const inRange = (d, r) => d >= r.start && d <= r.end;

/** Kategori kegiatan kalender (kolom kategori, atau dideteksi dari nama kegiatan) */
export function kategoriOf(k) {
  if (k.kategori) return k.kategori;
  const s = String(k.kegiatan || '').toLowerCase();
  if (/\buts\b|tengah semester/.test(s)) return 'UTS';
  if (/\buas\b|akhir semester/.test(s)) return 'UAS';
  if (/libur|cuti|tenang|natal|lebaran|idul|nyepi|imlek|waisak|kenaikan|tahun baru|kemerdekaan/.test(s)) return 'Libur';
  if (/kuliah|perkuliahan|pembelajaran/.test(s)) return 'Perkuliahan';
  return 'Lainnya';
}
export const periodeName = (k) => `${k.semester} ${k.tahun_ajaran}`;

/** Ringkasan satu periode dari kalender akademik */
export function periodInfo(periode) {
  const [sem, ta] = String(periode || '').split(' ');
  const events = store.all('calendar').filter(k => k.semester === sem && k.tahun_ajaran === ta)
    .map(k => ({ ...k, kat: kategoriOf(k), start: parseDate(k.mulai), end: parseDate(k.selesai || k.mulai) }))
    .filter(k => k.start).sort((a, b) => a.start - b.start);
  if (!events.length) return null;
  const kuliah = events.filter(e => e.kat === 'Perkuliahan');
  const start = (kuliah[0] || events[0]).start;
  const end = new Date(Math.max(...events.filter(e => e.kat !== 'Lainnya').map(e => e.end.getTime()), start.getTime()));
  return { periode, start, end, events, uts: events.filter(e => e.kat === 'UTS'), uas: events.filter(e => e.kat === 'UAS'), libur: events.filter(e => e.kat === 'Libur') };
}
export function periodeOptions() {
  const fromCal = uniq(store.all('calendar').map(periodeName));
  const all = uniq([...fromCal, ...store.all('schedules').map(s => s.periode)]);
  const key = (p) => { const [s, ta] = p.split(' '); return `${(ta || '').slice(0, 4)}${s === 'Genap' ? 2 : 1}`; };
  return all.sort((a, b) => key(b).localeCompare(key(a)));
}
/** Periode yang sedang berjalan pada tanggal tertentu (WIB) */
export function currentPeriode(date = today()) {
  const d = parseDate(date); const opts = periodeOptions();
  const infos = opts.map(periodInfo).filter(Boolean);
  const hit = infos.find(i => d >= i.start && d <= addDays(i.end, 14));
  if (hit) return hit.periode;
  const past = infos.filter(i => i.start <= d).sort((a, b) => b.start - a.start)[0];
  return (past || infos[0] || {}).periode || opts[0] || '';
}

/** Jenis dosen efektif sebuah slot: Dosen External / Dosen Internal / Ikut Fakultas */
export function jenisDosen(slot) {
  if (slot.jenis_dosen) return slot.jenis_dosen;
  const name = String(slot.dosen || '');
  if (!name || /fakultas|team teaching|magang|pembimbing|online kelas/i.test(name)) return 'Ikut Fakultas';
  const key = name.toLowerCase().replace(/^(sr|ms|mr|dr|prof|pak|bu)\.?\s+/g, '').split(/[,(]/)[0].trim().split(/\s+/).slice(0, 2).join(' ');
  const l = store.all('lecturers').find(x => x.nama.toLowerCase().includes(key));
  if (l) return l.tipe === 'Dosen Internal' ? 'Dosen Internal' : 'Dosen External';
  return 'Dosen External';
}
export const isLB = (slot) => jenisDosen(slot) === 'Dosen External';

/** Semua pertemuan sebuah slot: [{ no, tanggal, rencana, jenis, libur, absen, slot }] */
export function sessionsOf(slot, info = periodInfo(slot.periode)) {
  const di = HARI.indexOf(slot.hari); if (di < 0 || !info) return [];
  const ak = store.setting('akademik');
  const n = Number(slot.jumlah_pertemuan) || Number(ak.target_pertemuan) || 16;
  const att = store.all('attendance').filter(a => a.schedule_id === slot.id);
  // tanggal pertama dengan hari yang sama, mulai dari awal perkuliahan
  let d = new Date(info.start); const want = di + 1; // getDay: Senin = 1
  while (d.getDay() !== want) d = addDays(d, 1);
  const out = []; let guard = 0; let libur = 0;
  while (out.length < n && guard++ < 60) {
    const isLibur = info.libur.some(r => inRange(d, r));
    if (isLibur) { libur++; d = addDays(d, 7); continue; }
    const no = out.length + 1;
    let jenis = info.uts.some(r => inRange(d, r)) ? 'UTS' : info.uas.some(r => inRange(d, r)) ? 'UAS' : 'Kuliah';
    if (!info.uts.length && no === Number(ak.minggu_uts || 8)) jenis = 'UTS';
    if (!info.uas.length && no === n) jenis = 'UAS';
    const planned = isoDate(d); const absen = att.find(a => Number(a.pertemuan) === no) || null;
    out.push({ no, tanggal: (absen && absen.tanggal) || planned, rencana: planned, jenis, absen, slot });
    d = addDays(d, 7);
  }
  return out;
}

export function attendanceSummary(slot, until = today()) {
  const ss = sessionsOf(slot);
  const due = ss.filter(s => s.tanggal <= until);
  const rec = due.filter(s => s.absen && s.absen.status);
  const counted = rec.filter(s => !TIDAK_DIHITUNG.includes(s.absen.status));
  const hadir = counted.filter(s => HADIR.includes(s.absen.status)).length;
  const diganti = counted.filter(s => s.absen.status === 'Diganti dosen lain').length;
  const tidak = counted.length - hadir - diganti;
  return { total: ss.length, due: due.length, tercatat: rec.length, belum: due.length - rec.length, hadir, diganti, tidak, persen: counted.length ? Math.round(hadir / counted.length * 100) : null };
}

export const slotsOf = (periode, batch) => store.all('schedules').filter(s => s.periode === periode && (!batch || s.batch_id === batch));
export const timeLabel = (s) => s.jam_mulai ? `${s.jam_mulai}${s.jam_selesai ? '–' + s.jam_selesai : ''}` : '';
export const byTime = (a, b) => (HARI.indexOf(a.hari) - HARI.indexOf(b.hari)) || String(a.jam_mulai || '99').localeCompare(String(b.jam_mulai || '99'));
export const hariOf = (date) => { const d = parseDate(date); return d ? (['Minggu', ...HARI][d.getDay()] || '') : ''; };
export const slotLabel = (s) => `${s.mata_kuliah} · ${batchName(s.batch_id)}`;

/** Minggu perkuliahan ke-berapa untuk sebuah tanggal (dihitung dari awal perkuliahan) */
export function weekNo(info, date) {
  const d = parseDate(date); if (!info || !d || d < info.start) return null;
  return Math.floor((d - info.start) / (7 * 864e5)) + 1;
}

export async function saveAbsen(session, patch) {
  const s = session.slot; const prev = session.absen || {};
  return store.save('attendance', {
    ...prev, schedule_id: s.id, periode: s.periode, batch_id: s.batch_id, mata_kuliah: s.mata_kuliah, dosen_jadwal: s.dosen,
    pertemuan: session.no, jenis: session.jenis, tanggal: prev.tanggal || session.tanggal, dosen_hadir: prev.dosen_hadir || s.dosen,
    dicatat_oleh: (store.profile || {}).nama || '', ...patch,
  });
}

/** Senin pada minggu perkuliahan ke-n (n mulai 1) */
export function weekStart(info, n) {
  const d = new Date(info.start); const back = (d.getDay() + 6) % 7; d.setDate(d.getDate() - back + (n - 1) * 7); return d;
}
/** Jumlah minggu dalam periode (dari awal perkuliahan s.d. akhir UAS) */
export const weekCount = (info) => info ? Math.max(1, Math.ceil(((info.end - weekStart(info, 1)) / 864e5 + 1) / 7)) : 0;
/** Kegiatan kalender yang beririsan dengan rentang tanggal */
export const eventsBetween = (info, a, b) => info ? info.events.filter(e => e.start <= b && e.end >= a && e.kat !== 'Perkuliahan') : [];

/* ---------- Impor kalender akademik dari tabel PDF ---------- */
const BLN = { jan: 0, januari: 0, january: 0, feb: 1, februari: 1, february: 1, mar: 2, maret: 2, march: 2, apr: 3, april: 3, mei: 4, may: 4, jun: 5, juni: 5, june: 5, jul: 6, juli: 6, july: 6, agu: 7, agt: 7, ags: 7, agustus: 7, aug: 7, august: 7, sep: 8, sept: 8, september: 8, okt: 9, oktober: 9, oct: 9, october: 9, nov: 10, nopember: 10, november: 10, des: 11, desember: 11, dec: 11, december: 11 };
/** "1 September 2026" · "01/09/2026" · "2026-09-01" · "1 Sep 2026" → '2026-09-01' */
export function parseTanggalID(s, fallback = {}) {
  if (!s) return '';
  const str = String(s).trim().toLowerCase().replace(/^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu),?\s*/, '');
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(str); if (m) return isoDate(new Date(+m[1], +m[2] - 1, +m[3]));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(str); if (m) return isoDate(new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]));
  m = /^(\d{1,2})\s*([a-z]+)?\.?\s*(\d{4})?$/.exec(str);
  if (m) {
    const mon = m[2] ? BLN[m[2]] ?? BLN[m[2].slice(0, 3)] : fallback.month; const yr = m[3] ? +m[3] : fallback.year;
    if (mon === undefined || !yr) return ''; return isoDate(new Date(yr, mon, +m[1]));
  }
  return '';
}
/** "24 s.d. 26 Desember 2026" / "1 Sep – 20 Des 2026" → { mulai, selesai } */
export function parseRentang(s) {
  const parts = String(s || '').split(/\s*(?:s\.?\s*\/?\s*d\.?|sampai(?:\s+dengan)?|hingga|–|—|\s-\s|\bto\b)\s*/i).filter(Boolean);
  if (!parts.length) return { mulai: '', selesai: '' };
  const selesai = parseTanggalID(parts[parts.length - 1]);
  const ref = parseDate(selesai);
  const mulai = parseTanggalID(parts[0], ref ? { month: ref.getMonth(), year: ref.getFullYear() } : {}) || selesai;
  // "28 Desember s.d. 3 Januari 2027": mulai diambil tahun sebelumnya bila lebih besar dari selesai
  if (mulai && selesai && mulai > selesai) { const d = parseDate(mulai); d.setFullYear(d.getFullYear() - 1); return { mulai: isoDate(d), selesai }; }
  return { mulai, selesai: parts.length > 1 ? selesai : mulai };
}
export const normSemester = (s) => /genap|even/i.test(s || '') ? 'Genap' : /ganjil|odd/i.test(s || '') ? 'Ganjil' : /pendek|antara/i.test(s || '') ? 'Pendek' : String(s || '').trim();
export const normTahunAjaran = (s) => { const m = /(\d{4})\s*[/\-–]\s*(\d{2,4})/.exec(s || ''); return m ? `${m[1]}/${m[2].length === 2 ? m[1].slice(0, 2) + m[2] : m[2]}` : String(s || '').trim(); };
