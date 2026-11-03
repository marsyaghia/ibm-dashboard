/* =========================================================================
   APP — kerangka (sidebar, topbar), router, tema, bahasa, login superadmin.
   ========================================================================= */
import { h, icon, clear, toast, greeting, nowWIB, HARI_P, fmtDateLong, openModal } from './ui.js';
import { store } from './store.js';
import { CONFIG } from './config.js';
import { lang, setLang, startI18n, t } from './i18n.js';

import beranda from './modules/beranda.js';
import pengeluaran from './modules/pengeluaran.js';
import pemasukan from './modules/pemasukan.js';
import rps from './modules/rps.js';
import materi from './modules/materi.js';
import jadwal from './modules/jadwal.js';
import absensi from './modules/absensi.js';
import trent from './modules/trent.js';
import immersion from './modules/immersion.js';
import magang from './modules/magang.js';
import sertifikat from './modules/sertifikat.js';
import mahasiswa from './modules/mahasiswa.js';
import dosen from './modules/dosen.js';
import pengaturan from './modules/pengaturan.js';

const NAV = [
  { group: 'Ringkasan', items: [{ id: 'beranda', label: 'Beranda', icon: 'dashboard', mod: beranda }] },
  { group: 'Keuangan', items: [
    { id: 'pengeluaran', label: 'Pengeluaran Divisi', icon: 'expense', mod: pengeluaran, count: () => store.all('expenses').length },
    { id: 'pemasukan', label: 'Perolehan Mahasiswa', icon: 'income', mod: pemasukan, count: () => store.all('incomes').length },
  ] },
  { group: 'Akademik', items: [
    { id: 'rps', label: 'RPS & OBE', icon: 'book', mod: rps, count: () => store.all('rpsTemplates').length },
    { id: 'materi', label: 'Materi & PPT Dosen', icon: 'slides', mod: materi, count: () => store.all('materials').length },
    { id: 'jadwal', label: 'Jadwal Kuliah', icon: 'calendar', mod: jadwal },
    { id: 'absensi', label: 'Absensi Dosen External', icon: 'clipboard', mod: absensi },
  ] },
  { group: 'Program', items: [
    { id: 'trent', label: 'Trent Global College', icon: 'handshake', mod: trent },
    { id: 'immersion', label: 'Immersion', icon: 'plane', mod: immersion },
    { id: 'magang', label: 'Data Magang', icon: 'briefcase', mod: magang, count: () => store.all('internships').length },
  ] },
  { group: 'Data', items: [
    { id: 'sertifikat', label: 'Sertifikat Mahasiswa', icon: 'award', mod: sertifikat, count: () => store.all('certificates').length },
    { id: 'mahasiswa', label: 'Biodata Mahasiswa', icon: 'users', mod: mahasiswa, count: () => store.all('students').length },
    { id: 'dosen', label: 'Biodata Dosen', icon: 'teacher', mod: dosen, count: () => store.all('lecturers').length },
  ] },
  { group: 'Sistem', items: [{ id: 'pengaturan', label: 'Pengaturan', icon: 'settings', mod: pengaturan }] },
];
const ROUTES = Object.fromEntries(NAV.flatMap(g => g.items.map(i => [i.id, { ...i, group: g.group }])));

const getTheme = () => document.documentElement.getAttribute('data-theme') || 'light';
function setTheme(v) { document.documentElement.setAttribute('data-theme', v); try { localStorage.setItem('ibm_theme', v); } catch (e) { /* abaikan */ } }

let current = null; const els = {};

function shell() {
  const root = document.getElementById('root'); clear(root);
  const nav = h('nav', { class: 'nav', 'aria-label': 'Menu utama' });
  NAV.forEach(g => {
    const grp = h('div', { class: 'nav-group' }, h('span', {}, g.group));
    g.items.forEach(i => { const c = h('span', { class: 'count' }); i._count = c; grp.appendChild(h('a', { href: `#/${i.id}`, dataset: { route: i.id } }, icon(i.icon), h('span', {}, i.label), c)); });
    nav.appendChild(grp);
  });
  const p = store.profile || {};
  els.sidebar = h('aside', { class: 'sidebar', id: 'sidebar' },
    h('a', { class: 'brand', href: '#/beranda' }, h('img', { class: 'brand-mark', src: 'assets/img/logo.svg', alt: '' }),
      h('span', { class: 'brand-text' }, h('strong', {}, CONFIG.app.name), h('span', {}, CONFIG.app.org))),
    nav,
    h('div', { class: 'side-foot' },
      h('span', { class: 'mode' }, h('i', { class: `dot ${store.mode === 'demo' ? 'demo' : ''}` }), store.mode === 'demo' ? 'Mode demo · data contoh' : 'Tersambung ke Supabase'),
      h('span', {}, `${p.nama || ''} · ${p.peran || 'superadmin'}`)));

  els.crumb = h('div', { class: 'crumb' });
  els.clock = h('span', { class: 'clock', 'aria-live': 'off' });
  const tick = () => { const d = nowWIB(); els.clock.textContent = `${HARI_P[lang()][d.getDay()]}, ${fmtDateLong(d)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`; };
  tick(); clearInterval(els.timer); els.timer = setInterval(tick, 15000);

  const themeBtn = h('button', { class: 'btn btn-icon', type: 'button', 'aria-label': 'Ganti tema terang/gelap', title: 'Ganti tema terang/gelap' });
  const paintTheme = () => { clear(themeBtn); themeBtn.appendChild(icon(getTheme() === 'dark' ? 'sun' : 'moon')); };
  paintTheme(); themeBtn.addEventListener('click', () => { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); paintTheme(); });

  const langSw = h('div', { class: 'lang-switch', role: 'group', 'aria-label': 'Bahasa', 'data-no-i18n': '' },
    ['id', 'en'].map(l => h('button', { type: 'button', 'aria-pressed': String(lang() === l), title: l === 'id' ? 'Bahasa Indonesia' : 'English', onclick: () => { if (lang() !== l) { setLang(l); shell(); route(); startI18n(); } } }, l.toUpperCase())));
  const refresh = h('button', { class: 'btn btn-icon', type: 'button', title: 'Muat ulang data', 'aria-label': 'Muat ulang data', onclick: async () => { refresh.disabled = true; try { await store.reload(); toast('Data diperbarui dari server.', 'ok'); } catch (e) { toast(e.message, 'bad'); } refresh.disabled = false; } }, icon('refresh'));
  const menuBtn = h('button', { class: 'btn btn-icon menu-btn', type: 'button', 'aria-label': 'Buka menu', 'aria-controls': 'sidebar', 'aria-expanded': 'false', onclick: () => toggleSide(true) }, icon('menu'));
  const userChip = h('span', { class: 'user-chip' },
    h('span', { class: 'avatar sm', 'aria-hidden': 'true' }, (p.sapaan || p.nama || '?').replace(/^(Pak|Bu|Ibu)\s+/i, '').charAt(0).toUpperCase()),
    h('span', { class: 'who' }, h('b', {}, p.sapaan || p.nama || ''), h('small', {}, p.email || '')),
    h('button', { class: 'btn btn-icon', type: 'button', title: 'Keluar', 'aria-label': 'Keluar', onclick: logout }, icon('logout')));

  els.page = h('main', { class: 'page', id: 'main', tabindex: '-1' });
  const main = h('div', { class: 'main' }, h('header', { class: 'topbar' }, menuBtn, els.crumb, h('div', { class: 'spacer' }), els.clock, langSw, refresh, themeBtn, userChip), els.page);
  root.appendChild(h('div', { class: 'app' }, els.sidebar, main));

  function toggleSide(open) {
    els.sidebar.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open));
    if (open) { els.scrim = h('div', { class: 'scrim', onclick: () => toggleSide(false) }); document.body.appendChild(els.scrim); }
    else if (els.scrim) { els.scrim.remove(); els.scrim = null; }
  }
  els.closeSide = () => toggleSide(false);
  if (!els.keyBound) { document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.scrim) els.closeSide(); }); els.keyBound = true; }
  if (els.unsub) els.unsub(); els.unsub = store.subscribe(updateCounts); updateCounts();
}
function updateCounts() { NAV.forEach(g => g.items.forEach(i => { if (i._count) i._count.textContent = i.count ? i.count() : ''; })); }

async function logout() {
  await store.signOut();
  if (store.mode !== 'demo') location.reload();
}

function route() {
  const id = (location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]) || 'beranda';
  const r = ROUTES[id] || ROUTES.beranda;
  if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  clear(els.page);
  els.sidebar.querySelectorAll('a[data-route]').forEach(a => a.toggleAttribute('aria-current', false));
  const link = els.sidebar.querySelector(`a[data-route="${r.id}"]`); if (link) link.setAttribute('aria-current', 'page');
  clear(els.crumb); els.crumb.append(r.group, ' / ', h('b', {}, r.label));
  document.title = `${t(r.label)} · ${CONFIG.app.name}`;
  try { current = r.mod.mount(els.page) || null; }
  catch (e) { console.error(e); els.page.appendChild(h('div', { class: 'note warn' }, icon('alert'), h('div', {}, 'Halaman gagal dimuat: ' + e.message))); }
  els.closeSide && els.closeSide(); window.scrollTo(0, 0);
}

/* ---------- Layar login ---------- */
function gateTools() {
  const themeBtn = h('button', { class: 'btn btn-icon', type: 'button', 'aria-label': 'Ganti tema terang/gelap', title: 'Ganti tema terang/gelap' });
  const paint = () => { clear(themeBtn); themeBtn.appendChild(icon(getTheme() === 'dark' ? 'sun' : 'moon')); };
  paint(); themeBtn.addEventListener('click', () => { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); paint(); });
  const sw = h('div', { class: 'lang-switch', role: 'group', 'aria-label': 'Bahasa', 'data-no-i18n': '' },
    ['id', 'en'].map(l => h('button', { type: 'button', 'aria-pressed': String(lang() === l), title: l === 'id' ? 'Bahasa Indonesia' : 'English', onclick: () => { if (lang() !== l) { setLang(l); location.reload(); } } }, l.toUpperCase())));
  return h('div', { class: 'gate-tools' }, sw, themeBtn);
}
function loginScreen(message) {
  return new Promise((resolve) => {
    const root = document.getElementById('root'); clear(root);
    const email = h('input', { class: 'input', type: 'email', autocomplete: 'username', required: true, id: 'lg_email', placeholder: 'nama@asia.ac.id' });
    const pass = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', required: true, id: 'lg_pass' });
    const err = h('div', { class: `note warn ${message ? '' : 'hidden'}`, role: 'alert' }, icon('alert'), h('div', {}, message || ''));
    const btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Masuk');
    const forgot = h('button', { class: 'doc-link', type: 'button', style: { marginTop: '12px' } }, 'Lupa kata sandi?');
    const form = h('form', { class: 'gate-card' },
      h('img', { src: 'assets/img/logo.svg', alt: '', width: 48, height: 48, style: { marginBottom: '16px', borderRadius: '12px' } }),
      h('h2', {}, 'Masuk ke Dashboard'), h('p', { class: 'muted', style: { marginTop: '6px' } }, 'Khusus superadmin Divisi IBM.'),
      h('div', { class: 'field' }, h('label', { for: 'lg_email' }, 'Email'), email),
      h('div', { class: 'field' }, h('label', { for: 'lg_pass' }, 'Kata sandi'), pass),
      h('div', { class: 'field' }, err), h('div', { class: 'field' }, btn), forgot);
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); btn.disabled = true; err.classList.add('hidden');
      try { await store.signIn(email.value.trim(), pass.value); resolve(); }
      catch (ex) { err.lastChild.textContent = t(ex.message); err.classList.remove('hidden'); btn.disabled = false; }
    });
    forgot.addEventListener('click', async () => {
      if (!email.value.trim()) { err.lastChild.textContent = t('Masukkan email terlebih dahulu, kemudian pilih “Lupa kata sandi?”.'); err.classList.remove('hidden'); return; }
      try { await store.resetPassword(email.value.trim()); toast('Tautan atur ulang kata sandi dikirim ke email.', 'ok'); } catch (ex) { toast(ex.message, 'bad'); }
    });
    root.appendChild(h('div', { class: 'gate-wrap' },
      h('section', { class: 'gate-art' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, h('img', { src: 'assets/img/logo.svg', alt: '', width: 40, height: 40, style: { borderRadius: '10px', background: '#fff', padding: '2px' } }), h('b', { style: { fontFamily: 'var(--font-head)' } }, CONFIG.app.org)),
        h('div', {}, h('span', { class: 'eyebrow', style: { color: 'var(--gold)' } }, CONFIG.app.program), h('h1', {}, 'Dashboard operasional Divisi IBM'),
          h('p', {}, 'Keuangan, akademik, jadwal, Trent Global College, immersion, dan data mahasiswa–dosen dalam satu tempat.')),
        h('p', { style: { fontSize: '12.5px' } }, CONFIG.app.url.replace('https://', ''))),
      h('section', { class: 'gate-form' }, gateTools(), form)));
    startI18n(); email.focus();
  });
}
function newPasswordScreen() {
  return new Promise((resolve) => {
    const pw = h('input', { class: 'input', type: 'password', minlength: 8, autocomplete: 'new-password', required: true });
    const btn = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Simpan kata sandi');
    const f = h('form', { class: 'stack' }, h('p', {}, 'Buat kata sandi baru (minimal 8 karakter).'), pw, btn);
    const { close } = openModal({ title: 'Atur ulang kata sandi', size: 'sm', body: f, onClose: resolve });
    f.addEventListener('submit', async (e) => { e.preventDefault(); try { await store.updatePassword(pw.value); toast('Kata sandi diperbarui.', 'ok'); close(); } catch (ex) { toast(ex.message, 'bad'); } });
  });
}

function fatal(e) {
  clear(document.getElementById('root')).appendChild(h('div', { class: 'gate-form', style: { minHeight: '100vh' } }, h('div', { class: 'card card-pad gate-card stack' },
    h('h2', {}, 'Dashboard tidak dapat dimuat'), h('p', {}, e.message), h('p', { class: 'muted' }, 'Periksa koneksi internet, lalu muat ulang halaman.'),
    h('button', { class: 'btn btn-primary', type: 'button', onclick: () => location.reload() }, 'Muat ulang'))));
  startI18n();
}

async function start() {
  setLang(lang());
  const recovery = /type=recovery/.test(location.hash);
  let message = '';
  try { await store.connect(); } catch (e) { message = e.message; }
  if (!store.profile) { try { await loginScreen(message); } catch (e) { return fatal(e); } }
  try { await store.init(); } catch (e) { console.error(e); return fatal(e); }
  shell();
  window.addEventListener('hashchange', route);
  if (recovery) { history.replaceState(null, '', location.pathname + location.search + '#/beranda'); }
  route(); startI18n();
  if (recovery) newPasswordScreen();
  const p = store.profile || {};
  setTimeout(() => toast(`${greeting()}, ${p.sapaan || p.nama || ''}!`), 500);
}
start();
