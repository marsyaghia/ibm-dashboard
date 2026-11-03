/* =========================================================================
   UI — helper DOM, ikon, format angka/tanggal, toast, dialog, badge.
   ========================================================================= */
import { store } from './store.js';
import { lang } from './i18n.js';
import { CONFIG } from './config.js';

/* ---------- Huruf judul (Title Case) ----------
   Judul memakai huruf besar di awal setiap kata, kecuali kata tugas
   (dan, di, ke, per, …) yang bukan kata pertama. Singkatan/nama yang sudah
   memakai huruf besar (OBE, RPS, bit.ly, s.d.) tidak diubah. */
const SMALL_WORDS = new Set(['dan', 'atau', 'di', 'ke', 'dari', 'untuk', 'yang', 'per', 'pada', 'dengan', 'dalam', 'oleh', 'serta', 'bagi', 'tentang', 'tanpa', 'terhadap', 'hingga', 'vs',
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'at', 'by', 'with', 'from', 'as', 'into', 'nor', 'but']);
export function tc(s) {
  if (typeof s !== 'string' || !s.trim()) return s;
  let first = true;
  return s.replace(/[^\s/()–—-]+/g, (w, i) => {
    const isFirst = first; first = false;
    if (w !== w.toLowerCase()) return w;            // sudah ada huruf besar (OBE, Dosen External)
    if (/\.|@|^\d|^[^\p{L}]*$/u.test(w)) return w;  // bit.ly, s.d., angka, simbol
    const core = w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
    if (!isFirst && s[i - 1] !== '/' && SMALL_WORDS.has(core)) return w;
    return w.replace(/\p{L}/u, (c) => c.toUpperCase());
  });
}
const TITLE_TAGS = new Set(['H1', 'H2', 'H3']);

/* ---------- DOM ---------- */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  // Semua judul (h1–h3) otomatis Title Case, kecuali ditandai data-raw (mis. nama orang/perusahaan)
  append(el, TITLE_TAGS.has(el.tagName) && !(attrs && attrs['data-raw'] !== undefined) ? kids.flat(Infinity).map(k => (typeof k === 'string' ? tc(k) : k)) : kids);
  return el;
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Ikon (garis 24px) ---------- */
const P = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v4"/><path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/><path d="M21 12h-4a2 2 0 0 0 0 4h4z"/>',
  income: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>',
  expense: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M4 3h16"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5"/><path d="M19 17v4H6.5"/><path d="M9 7h6"/><path d="M9 11h4"/>',
  slides: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4"/><path d="M8 20h8"/><path d="m10 8 4 2-4 2z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  star: '<path d="m12 3 2.76 5.6 6.18.9-4.47 4.36 1.05 6.15L12 17.1l-5.52 2.9 1.05-6.15L3.06 9.5l6.18-.9z"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"/><path d="M10 21v-3h4v3"/>',
  handshake: '<path d="m11 17 2 2a1 1 0 0 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 0 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 0 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 0 0 3-3"/><path d="M3 4h8"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14.5-1.5 7 5-3 5 3-1.5-7"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  teacher: '<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/><path d="m9 14 3 3 3-3"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  sheet: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M12 11v8"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  minus: '<path d="M5 12h14"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  report: '<path d="M3 3v18h18"/><path d="M7 15v2"/><path d="M11 11v6"/><path d="M15 7v10"/><path d="M19 12v5"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  piggy: '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  refresh: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
  languages: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
};
export function icon(name, cls = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', `icon ${cls}`.trim()); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = P[name] || P.file;
  return s;
}

/* ---------- Format ---------- */
const nfID = new Intl.NumberFormat('id-ID');
export const fmtNum = (n, d = 0) => (n === null || n === undefined || n === '' || isNaN(n)) ? '–' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(Number(n));
export const fmtIDR = (n) => (n === null || n === undefined || n === '' || isNaN(n)) ? '–' : (Number(n) < 0 ? '−Rp\u00a0' : 'Rp\u00a0') + nfID.format(Math.abs(Math.round(Number(n))));
export const fmtIDRShort = (n) => {
  n = Number(n) || 0; const a = Math.abs(n);
  if (a >= 1e9) return 'Rp ' + fmtNum(n / 1e9, 2) + ' M';
  if (a >= 1e6) return 'Rp ' + fmtNum(n / 1e6, 1) + ' jt';
  if (a >= 1e3) return 'Rp ' + fmtNum(n / 1e3, 0) + ' rb';
  return 'Rp ' + fmtNum(n);
};
export const fmtSGD = (n) => (n === null || n === undefined || n === '' || isNaN(n)) ? '–' : 'S$ ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(n));
const BULAN = { id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
const BULAN_P = { id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
export const HARI_P = { id: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
export const BULAN_PANJANG = BULAN_P.id;
export const monthName = (i, short = false) => (short ? BULAN : BULAN_P)[lang()][i];
export function parseDate(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s); if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(s); return isNaN(d) ? null : d;
}
export const fmtDate = (s) => { const d = parseDate(s); return d ? `${d.getDate()} ${BULAN[lang()][d.getMonth()]} ${d.getFullYear()}` : (s || '–'); };
export const fmtDateLong = (s) => { const d = parseDate(s); return d ? `${d.getDate()} ${BULAN_P[lang()][d.getMonth()]} ${d.getFullYear()}` : (s || ''); };
export const fmtDayDate = (s) => { const d = parseDate(s); return d ? `${HARI_P[lang()][d.getDay()]}, ${fmtDateLong(d)}` : ''; };
export const isoDate = (s) => { const d = parseDate(s); if (!d) return ''; const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
/** Waktu sekarang di zona Institut Asia Malang (WIB) */
export function nowWIB() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: CONFIG.app.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return new Date(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
}
export const today = () => isoDate(nowWIB());
export function greeting() { const hr = nowWIB().getHours(); return hr < 11 ? 'Selamat pagi' : hr < 15 ? 'Selamat siang' : hr < 18 ? 'Selamat sore' : 'Selamat malam'; }
export const toNumber = (v) => {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return 0;
  let s = String(v).replace(/[^\d,.-]/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
  const n = parseFloat(s); return isNaN(n) ? 0 : n;
};
export const initials = (name) => String(name || '?').replace(/^(Dr|Prof|Sr|Ms|Mr|Ir)\.?\s+/gi, '').split(/[\s,]+/).filter(w => /^[A-Za-z]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
export const sum = (arr, f) => arr.reduce((s, x) => s + (Number(typeof f === 'function' ? f(x) : x[f]) || 0), 0);
export const groupBy = (arr, f) => arr.reduce((m, x) => { const k = typeof f === 'function' ? f(x) : x[f]; (m[k] || (m[k] = [])).push(x); return m; }, {});
export const uniq = (arr) => [...new Set(arr.filter(v => v !== '' && v !== null && v !== undefined))];
export const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;

/* ---------- Lookup data master ---------- */
const cmpText = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'id', { numeric: true, sensitivity: 'base' });
/** Urutan batch: Batch 1, Batch 2, … (angkatan lalu nama) */
export const batches = () => [...store.all('batches')].sort((a, b) => (Number(a.angkatan) || 9999) - (Number(b.angkatan) || 9999) || cmpText(a.nama, b.nama));
export const batchName = (id) => id === 'all' ? 'Semua batch' : ((store.get('batches', id) || {}).nama || '–');
export const batchOptions = (withAll = false) => [...(withAll ? [{ value: 'all', label: 'Semua batch' }] : []), ...batches().map(b => ({ value: b.id, label: `${b.nama} · ${b.angkatan}` }))];
/** Posisi batch di urutan (data tanpa batch ditaruh paling akhir) */
export function batchRank(id) { const i = batches().findIndex(b => b.id === id); return i < 0 ? 9999 : i; }
/** Pembanding baku: urut abjad/angka ala Indonesia ("Batch 2" < "Batch 10") */
export const byText = (f) => (a, b) => cmpText(f(a), f(b));
/** Gabungkan beberapa pembanding: urut batch → lalu pembanding berikutnya */
export const chain = (...fns) => (a, b) => { for (const f of fns) { const r = f(a, b); if (r) return r; } return 0; };
export const byBatch = (f = (r) => r.batch_id) => (a, b) => batchRank(f(a)) - batchRank(f(b));
/** Batch bawaan saat belum ada pilihan: Batch 1 */
export const firstBatch = () => (batches()[0] || {}).id || '';

/** Dropdown batch yang seragam di semua menu. withAll: tambahkan "Semua batch" (value 'all' atau ''). */
export function batchSelect({ value, onChange, withAll = false, allValue = '', label = 'Batch', compact = false } = {}) {
  const sel = h('select', { class: 'select', 'aria-label': label },
    withAll ? h('option', { value: allValue }, 'Semua batch') : null,
    batchOptions().map(o => h('option', { value: o.value }, o.label)));
  sel.value = value ?? '';
  if (sel.value !== String(value ?? '')) sel.value = withAll ? allValue : firstBatch();
  sel.addEventListener('change', () => onChange && onChange(sel.value));
  return compact ? sel : picker(label, sel);
}
/** Bungkus <select> dengan label kecil di kiri (gaya pemilih yang seragam) */
export const picker = (label, sel, cls = '') => h('label', { class: `picker ${cls}`.trim() }, h('span', { class: 'picker-label' }, label), sel);
/** Dropdown sederhana dari daftar opsi [{value,label}] atau string */
export function selectEl(options, value, onChange, { label = '', cls = '' } = {}) {
  const sel = h('select', { class: `select ${cls}`.trim(), 'aria-label': label || null },
    options.map(o => typeof o === 'object' ? h('option', { value: o.value }, o.label) : h('option', { value: o }, o)));
  sel.value = value ?? '';
  sel.addEventListener('change', () => onChange && onChange(sel.value));
  return sel;
}
export const studentName = (id) => (store.get('students', id) || {}).nama || '–';
/** Cari mahasiswa dari student_id, lalu NIM, lalu nama (untuk data hasil impor CSV) */
export function findStudent(r) {
  if (!r) return null;
  if (r.student_id) { const s = store.get('students', r.student_id); if (s) return s; }
  const all = store.all('students');
  if (r.nim) { const s = all.find(x => x.nim && String(x.nim) === String(r.nim)); if (s) return s; }
  if (r.nama_mahasiswa) { const n = String(r.nama_mahasiswa).toLowerCase().trim(); return all.find(x => x.nama.toLowerCase().trim() === n) || null; }
  return null;
}
export const studentOf = (r) => { const s = findStudent(r); return s ? s.nama : (r && r.nama_mahasiswa) || '–'; };
/** Isi kolom denormalisasi (nim, nama_mahasiswa) dari student_id sebelum disimpan */
export const withStudent = (r) => { const s = store.get('students', r.student_id); return s ? { ...r, nim: s.nim || r.nim || '', nama_mahasiswa: s.nama } : r; };

/* ---------- Badge ---------- */
const TONES = {
  ok: ['lunas', 'paid', 'lengkap', 'done', 'selesai', 'aktif', 'mahasiswa aktif', 'sudah terbit', 'terbit', 'tersedia', 'diterima', 'disetujui', 'lulus'],
  warn: ['on progress', 'proses', 'sebagian', 'pending', 'menunggu', 'belum lengkap', 'cuti', 'under checking', 'sedang berjalan', 'diajukan', 'belum ditagih', 'upcoming', 'tbc'],
  bad: ['belum dibayar', 'belum', 'belum ada', 'unfinished', 'ditolak', 'non-aktif', 'mengundurkan diri', 'dibatalkan', 'kedaluwarsa', 'unpaid', 'drop out'],
};
export function toneOf(text) {
  const t = String(text || '').toLowerCase().trim();
  for (const [tone, list] of Object.entries(TONES)) if (list.includes(t)) return tone;
  return '';
}
export const badge = (text, tone) => text ? h('span', { class: `badge ${tone ?? toneOf(text)}` }, text) : h('span', { class: 'muted' }, '–');

/* ---------- Toast ---------- */
export function toast(msg, type = 'info') {
  const box = document.getElementById('toasts');
  const el = h('div', { class: `toast ${type}` }, icon(type === 'bad' ? 'alert' : type === 'ok' ? 'check' : 'info'), h('div', {}, msg));
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, type === 'bad' ? 6000 : 3200);
}

/* ---------- Dialog (popup di tengah layar) ---------- */
function makeDialog({ title, subtitle, body, footer, onClose, size = 'md' }) {
  const closeBtn = h('button', { class: 'btn btn-icon', type: 'button', 'aria-label': 'Tutup' }, icon('x'));
  const dlg = h('dialog', { class: `modal modal-${size}`, 'aria-label': title },
    h('div', { class: 'dlg-head' }, h('div', {}, h('h2', {}, title), subtitle ? h('p', {}, subtitle) : null), closeBtn),
    h('div', { class: 'dlg-body' }, body),
    footer ? h('div', { class: 'dlg-foot' }, footer) : null,
  );
  const close = () => { if (dlg.open) dlg.close(); };
  closeBtn.addEventListener('click', close);
  dlg.addEventListener('close', () => { dlg.remove(); onClose && onClose(); });
  dlg.addEventListener('mousedown', (e) => { if (e.target === dlg) dlg._down = true; });
  dlg.addEventListener('click', (e) => { if (e.target === dlg && dlg._down && size === 'sm') close(); dlg._down = false; });
  dlg.tabIndex = -1;
  document.body.appendChild(dlg); dlg.showModal();
  // Fokus awal pada popup itu sendiri (bukan tombol Tutup) agar tidak muncul cincin fokus
  dlg.focus({ preventScroll: true });
  return { dlg, close };
}
/** Formulir / detail data (ukuran besar) */
export const openDrawer = (opts) => makeDialog({ ...opts, size: opts.size || 'lg' });
/** Dialog umum: wide → ekstra lebar (tabel), default sedang */
export const openModal = (opts) => makeDialog({ ...opts, size: opts.wide ? 'xl' : (opts.size || 'md') });

export function confirmDialog(message, { title = 'Konfirmasi', okText = 'Hapus', danger = true } = {}) {
  return new Promise((resolve) => {
    let result = false;
    const ok = h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, type: 'button' }, okText);
    const cancel = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Batal');
    const { close } = openModal({ title, size: 'sm', body: h('p', { style: { margin: 0 } }, message), footer: [cancel, ok], onClose: () => resolve(result) });
    ok.addEventListener('click', () => { result = true; close(); });
    cancel.addEventListener('click', close);
    setTimeout(() => cancel.focus(), 30);
  });
}

/* ---------- Dropdown menu ---------- */
export function dropdown(label, items, { cls = 'btn btn-ghost', iconName = 'download' } = {}) {
  const list = h('div', { class: 'menu-list hidden', role: 'menu' });
  const btn = h('button', { class: cls, type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, icon(iconName), label, icon('chevron', 'sm'));
  const wrap = h('div', { class: 'menu' }, btn, list);
  items.forEach(it => {
    if (it === '-') return list.appendChild(h('hr'));
    list.appendChild(h('button', { type: 'button', role: 'menuitem', onclick: () => { hide(); it.onClick(); } }, icon(it.icon || 'file'), it.label));
  });
  const hide = () => { list.classList.add('hidden'); btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); const show = list.classList.contains('hidden');
    document.querySelectorAll('.menu-list').forEach(m => m.classList.add('hidden'));
    if (show) { list.classList.remove('hidden'); btn.setAttribute('aria-expanded', 'true'); }
  });
  return wrap;
}

document.addEventListener('click', () => document.querySelectorAll('.menu-list').forEach(m => m.classList.add('hidden')));

/* ---------- Lampiran (link Drive / file unggahan) ---------- */
export async function openAttachment(att) {
  if (!att) return;
  if (att.file) {
    try { const url = await store.fileUrl(att.file); if (url) window.open(url, '_blank', 'noopener'); else toast('Berkas tidak ditemukan di penyimpanan browser ini.', 'bad'); }
    catch (e) { toast(e.message, 'bad'); }
  } else if (att.link) window.open(att.link, '_blank', 'noopener');
}
export const hasAttachment = (att) => !!(att && (att.link || att.file));
export function docLink(att, fallback = 'Belum ada') {
  if (!hasAttachment(att)) {
    if (att && att.label) return h('span', { class: 'doc-link none', title: `${att.label} — link belum diisi` }, icon('file', 'sm'), h('span', {}, att.label, h('small', {}, 'link belum diisi')));
    return h('span', { class: 'doc-link none' }, icon('minus', 'sm'), h('span', {}, fallback));
  }
  const label = att.label || (att.file ? att.file.name : 'Buka tautan');
  return h('button', { type: 'button', class: 'doc-link', title: label, onclick: (e) => { e.stopPropagation(); openAttachment(att); } }, icon(att.file ? 'file' : 'external', 'sm'), h('span', {}, label));
}

/* ---------- Kosong ---------- */
export const emptyState = (title, text, action) => h('div', { class: 'empty' }, icon('layers'), h('h3', {}, title), text ? h('p', {}, text) : null, action || null);

/* ---------- Tab ---------- */
export function tabs(items, active, onChange) {
  const bar = h('div', { class: 'tabs', role: 'tablist' });
  items.forEach(it => bar.appendChild(h('button', { type: 'button', role: 'tab', 'aria-selected': String(it.id === active), onclick: () => onChange(it.id) }, tc(it.label))));
  return bar;
}

/** Judul halaman menu (dipakai di atas tab) */
export function moduleHead({ eyebrow, title, description, actions } = {}) {
  return h('div', { class: 'module-head' },
    h('div', { class: 'module-title' }, eyebrow ? h('span', { class: 'eyebrow' }, eyebrow) : null, h('h1', {}, title), description ? h('p', {}, description) : null),
    actions && [].concat(actions).filter(Boolean).length ? h('div', { class: 'actions no-print' }, actions) : null);
}

/**
 * Halaman menu bertab yang seragam: judul menu → (pemilih, mis. batch) → tab → isi tab.
 * items: [{ id, label, fn(body, ctx) → { destroy? } }]
 * opts: { eyebrow, title, description, key (pref tab), def, remember (default true), actions(ctx) → Node[] }
 */
export function tabPage(root, items, opts = {}) {
  const key = opts.key; const remember = opts.remember !== false;
  let tab = (remember && key ? pref.get(key, opts.def) : opts.def) || items[0].id;
  if (!items.some(x => x.id === tab)) tab = opts.def || items[0].id;
  let inner = null; const body = h('div', { class: 'tab-body' });
  const ctx = {
    get tab() { return tab; },
    go(id) { tab = id; if (remember && key) pref.set(key, id); draw(); window.scrollTo(0, 0); return inner; },
    redraw: () => draw(),
  };
  function draw() {
    inner && inner.destroy && inner.destroy(); clear(root);
    root.append(moduleHead({ eyebrow: opts.eyebrow, title: opts.title, description: opts.description, actions: opts.actions ? opts.actions(ctx) : null }),
      tabs(items, tab, (id) => ctx.go(id)));
    clear(body); root.appendChild(body);
    inner = (items.find(x => x.id === tab) || items[0]).fn(body, ctx) || null;
  }
  draw();
  return { destroy: () => inner && inner.destroy && inner.destroy(), ctx };
}

/* ---------- Foto profil ----------
   Mendukung tautan Google Drive (diubah ke thumbnail), tautan gambar langsung,
   atau berkas unggahan (lampiran). Bila gagal dimuat, kembali ke inisial. */
export function photoSrc(p) {
  if (!p) return null;
  if (typeof p === 'object') { if (p.file) return { file: p.file }; p = p.link; }
  if (!p) return null;
  const m = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/.exec(p) || /[?&]id=([\w-]{20,})/.exec(/drive\.google\.com/.test(p) ? p : '');
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400` : p;
}
const photoCache = new Map();   // berkas unggahan → URL sementara (± 25 menit)
function fileUrlCached(file) {
  const key = file.path || file.id; const hit = photoCache.get(key);
  if (hit && hit.until > Date.now()) return hit.p;
  const p = store.fileUrl(file); photoCache.set(key, { p, until: Date.now() + 25 * 60e3 }); return p;
}
export function avatar(name, photo, { size = '' } = {}) {
  const el = h('span', { class: `avatar ${size}`.trim(), 'aria-hidden': 'true' }, initials(name));
  const src = photoSrc(photo);
  if (!src) return el;
  const show = (url) => {
    if (!url) return;
    const img = h('img', { alt: '', decoding: 'async', referrerpolicy: 'no-referrer' });
    img.src = url;
    img.addEventListener('load', () => { clear(el); el.appendChild(img); el.classList.add('has-photo'); });
  };
  if (typeof src === 'string') show(src); else fileUrlCached(src.file).then(show).catch(() => { });
  return el;
}

/* ---------- Penyimpanan preferensi per-pengguna (filter, tab) ---------- */
export const pref = {
  get(k, d) { try { const v = localStorage.getItem('ibm_pref_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ibm_pref_' + k, JSON.stringify(v)); } catch (e) { /* abaikan */ } },
};
