/* ===== SUPABASE CONFIG (fill in once, shared by all pages) ===== */
const SUPABASE_URL = 'https://vhecgwfuoapzdwvephhz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_t6KaePTmiBYwI5wvbMZsEg_okAQirJf';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ===== UTILITIES ===== */
const LOCALE = 'en-GB'; // date display format; use 'id-ID' for Indonesian dates
const LOGIN_PAGE = 'login.html';
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const opts = (list) => (list || []).map((o) => (Array.isArray(o) ? o : [o, o])); // [value, label]

/* ===== ICONS (inline SVG, no icon font needed) ===== */
const ICONS = {
  dashboard: '<rect width="7" height="9" x="3" y="3" rx="1.5"/><rect width="7" height="5" x="14" y="3" rx="1.5"/><rect width="7" height="9" x="14" y="12" rx="1.5"/><rect width="7" height="5" x="3" y="16" rx="1.5"/>',
  students: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  lecturers: '<path d="m16 11 2 2 4-4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  attendance: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  rps: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  trent: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  certificate: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  schedule: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  sheet: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M10 9H8"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  cap: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  link: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  success: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  danger: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
};
const icon = (name, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ===== BACKGROUND: floating colour orbs that the glass blurs over ===== */
document.body.insertAdjacentHTML('afterbegin', '<div class="bg" aria-hidden="true"><i></i><i></i><i></i><i></i></div>');

/* ===== TOAST ===== */
function showAlert(msg, type = 'success') {
  let stack = $('toasts');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toasts';
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
  el.innerHTML = `${icon(type in ICONS ? type : 'info', 'toast-icon')}<span class="toast-msg">${esc(msg)}</span>
    <button type="button" class="toast-close" aria-label="Close">${icon('x')}</button>`;
  const close = () => {
    if (!el.isConnected) return;
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 220);
  };
  el.querySelector('.toast-close').addEventListener('click', close);
  stack.prepend(el);
  setTimeout(close, 5000);
}

/* ===== MENU: single source of truth for sidebar AND dashboard =====
   page  = the `page` value used in each HTML file (crud({ page: ... }) / dashboard -> 'index')
   table = Supabase table (used for dashboard counters)                                      */
const MENU = [
  { page: 'index',      href: 'index.html',                icon: 'dashboard',  label: 'Dashboard' },
  { page: 'students',   href: 'students.html',             icon: 'students',   label: 'Students',             table: 'students' },
  { page: 'lecturers',  href: 'lecturers.html',            icon: 'lecturers',  label: 'Lecturers',            table: 'lecturers' },
  { page: 'attendance', href: 'lecturer-attendances.html', icon: 'attendance', label: 'Lecturer Attendances', table: 'lecturer_attendances' },
  { page: 'rps',        href: 'rps-obe.html',              icon: 'rps',        label: 'RPS OBE',              table: 'rps_obe' },
  { page: 'trent',      href: 'trent-global-college.html', icon: 'trent',      label: 'Trent Global College', table: 'trent_global_courses' },
  { page: 'sertifikat', href: 'student-certificates.html', icon: 'certificate', label: 'Student Certificates', table: 'student_certificates' },
  { page: 'jadwal',     href: 'class-schedules.html',      icon: 'schedule',   label: 'Class Schedule',       table: 'class_schedules' },
];

/* ===== AUTH (Supabase email + password) ===== */
let currentUser = null;

// Every protected page calls this first; no session -> redirect to the login page.
async function requireAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    const here = location.pathname.split('/').pop() || 'index.html';
    location.replace(`${LOGIN_PAGE}?next=${encodeURIComponent(here)}`);
    return null;
  }
  currentUser = session.user;
  return session;
}

// Signed out (button, expired/revoked session, or from another tab) -> back to login.
db.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' && !location.pathname.endsWith(LOGIN_PAGE)) {
    location.replace(`${LOGIN_PAGE}?logged_out=1`);
  }
});

async function logout() {
  const { error } = await db.auth.signOut();
  if (error) return showAlert('Failed to log out: ' + error.message, 'danger');
  location.replace(`${LOGIN_PAGE}?logged_out=1`);
}

function loginPage() {
  document.title = 'Login | Academic System';
  const params = new URLSearchParams(location.search);
  // only allow redirecting back to known pages (prevents open redirect)
  const next = MENU.find((m) => m.href === params.get('next'))?.href || 'index.html';

  db.auth.getSession().then(({ data: { session } }) => {
    if (session) location.replace(next); // already logged in
  });

  $('app').innerHTML = `
  <div class="login-page">
    <div class="glass login-card">
      <div class="login-head">
        <div class="logo-tile">${icon('cap')}</div>
        <h1>Academic System</h1>
        <p>Sign in to continue</p>
      </div>
      <form id="loginForm" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" class="input" autocomplete="username" required autofocus>
          <div class="invalid-feedback">Enter a valid email address.</div>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <div class="input-wrap">
            <input id="password" type="password" class="input" autocomplete="current-password" required minlength="6">
            <button id="btnTogglePw" type="button" class="input-addon" aria-label="Show password">${icon('eye')}</button>
          </div>
          <div class="invalid-feedback">Password is required (min. 6 characters).</div>
        </div>
        <button id="btnLogin" type="submit" class="btn btn-primary btn-block">Login</button>
      </form>
    </div>
  </div>`;

  if (params.get('logged_out')) showAlert('You have been logged out.', 'info');

  const form = $('loginForm'), btn = $('btnLogin');

  $('btnTogglePw').addEventListener('click', () => {
    const pw = $('password'), show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    $('btnTogglePw').innerHTML = icon(show ? 'eyeOff' : 'eye');
    $('btnTogglePw').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Signing in...';
    const { error } = await db.auth.signInWithPassword({
      email: $('email').value.trim(),
      password: $('password').value,
    });

    if (error) {
      btn.disabled = false;
      btn.textContent = 'Login';
      const m = error.message || '';
      showAlert(
        /invalid login/i.test(m) ? 'Incorrect email or password.'
          : /not confirmed/i.test(m) ? 'Your email has not been confirmed yet.'
          : error.status === 429 ? 'Too many attempts. Please try again later.'
          : 'Failed to sign in: ' + m,
        'danger');
      $('password').value = '';
      $('password').focus();
      return;
    }
    location.replace(next);
  });
}

/* ===== LAYOUT (floating glass sidebar + topbar) ===== */
function layout(page, title) {
  document.title = `${title} | Academic System`;
  const current = location.pathname.split('/').pop() || 'index.html';
  const isActive = (m) => m.page === page || m.href === current;
  const email = currentUser?.email || '';

  $('app').innerHTML = `
  <div class="scrim" id="scrim"></div>
  <aside id="sidebar" class="glass" aria-label="Main menu">
    <div class="sidebar-brand">
      <span class="logo-tile sm">${icon('cap')}</span>
      <span class="brand-text">Academic<br>System</span>
      <button type="button" class="icon-btn sidebar-close" id="btnCloseMenu" aria-label="Close menu">${icon('x')}</button>
    </div>
    <nav class="sidebar-nav">
      <ul>
        ${MENU.map((m) => `<li><a class="nav-link ${isActive(m) ? 'active' : ''}" href="${m.href}"${isActive(m) ? ' aria-current="page"' : ''}><span class="nav-ico">${icon(m.icon)}</span><span>${m.label}</span></a></li>`).join('')}
      </ul>
      <ul class="nav-logout">
        <li><a class="nav-link" href="#" id="btnLogout"><span class="nav-ico">${icon('logout')}</span><span>Logout</span></a></li>
      </ul>
    </nav>
  </aside>
  <div class="main-wrapper">
    <header class="topbar glass">
      <button class="icon-btn menu-toggle" id="btnMenu" type="button" aria-label="Open menu" aria-controls="sidebar">${icon('menu')}</button>
      <div class="user-chip">
        <span class="avatar">${esc((email[0] || '?').toUpperCase())}</span>
        <span class="user-email">${esc(email)}</span>
      </div>
    </header>
    <main>
      <h1 class="page-title">${esc(title)}</h1>
      <div id="content"></div>
    </main>
    <footer>&copy; ${new Date().getFullYear()} Academic System</footer>
  </div>`;

  const sidebar = $('sidebar'), scrim = $('scrim');
  const setMenu = (open) => {
    sidebar.classList.toggle('open', open);
    scrim.classList.toggle('show', open);
  };
  $('btnMenu').addEventListener('click', () => setMenu(true));
  $('btnCloseMenu').addEventListener('click', () => setMenu(false));
  scrim.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  $('btnLogout').addEventListener('click', async (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('disabled');
    await logout();
    e.currentTarget.classList.remove('disabled');
  });
  return $('content');
}

/* ===== DASHBOARD ===== */
function dashboard() { requireAuth().then((s) => s && initDashboard()); }

function countUp(el, to) {
  if (!to || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to; return; }
  const dur = 700, t0 = performance.now();
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initDashboard() {
  const c = layout('index', 'Dashboard');
  const items = MENU.filter((m) => m.table);
  const today = new Date().toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const name = (currentUser?.email || '').split('@')[0];

  c.innerHTML = `
  <section class="glass hero">
    <div>
      <h2>Welcome back, ${esc(name)}</h2>
      <p>${esc(today)}</p>
    </div>
    <div class="hero-mark">${icon('cap')}</div>
  </section>
  <div class="stat-grid">${items.map((m, i) => `
    <a href="${m.href}" class="glass stat-card tone-${i % 2 ? 'blue' : 'yellow'}" style="--i:${i}">
      <span class="stat-ico">${icon(m.icon)}</span>
      <span class="stat-body">
        <span class="stat-num" id="cnt_${m.table}">-</span>
        <span class="stat-label">${m.label}</span>
      </span>
      <span class="stat-go">${icon('arrow')}</span>
    </a>`).join('')}</div>`;

  items.forEach(async (m) => {
    const { count, error } = await db.from(m.table).select('*', { count: 'exact', head: true });
    const el = $('cnt_' + m.table);
    if (error) el.textContent = '!'; else countUp(el, count);
  });
}

/* ===== GENERIC CRUD ENGINE (configured per page) ===== */
function crud(cfg) { requireAuth().then((s) => s && initCrud(cfg)); }

// Colour for status values shown as pills
const PILLS = {
  present: 'green', active: 'green',
  absent: 'red', 'dropped out': 'red',
  permission: 'yellow', 'on leave': 'yellow',
  sick: 'blue', graduated: 'blue',
  inactive: 'gray',
};

function initCrud(cfg) {
  const root = layout(cfg.page, cfg.title);
  const filters = cfg.filters || [];
  const lookups = cfg.fields.filter((f) => f.type === 'lookup');
  const fieldOf = (k) => cfg.fields.find((f) => f.key === k);
  const cols = cfg.columns.map(fieldOf);
  const selectStr = ['*', ...lookups.map((f) => `${f.ref.table}(${f.ref.label}${f.ref.sub ? ',' + f.ref.sub : ''})`)].join(',');
  let rows = [], shown = [];

  // Text displayed for a value
  function display(r, f) {
    if (!f) return '';
    const v = r[f.key];
    if (v == null || v === '') return '';
    if (f.type === 'lookup') {
      const o = r[f.ref.table];
      return o ? o[f.ref.label] + (f.ref.sub ? ` (${o[f.ref.sub]})` : '') : '';
    }
    if (f.type === 'date') return new Date(v + 'T00:00').toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });
    if (f.type === 'time') return String(v).slice(0, 5);
    if (f.type === 'select') { const o = opts(f.options).find((x) => x[0] === v); return o ? o[1] : v; }
    return v;
  }
  function cell(r, f) {
    if (f.type === 'url') {
      const v = r[f.key];
      return v && /^https?:\/\//i.test(v) ? `<a class="link" href="${esc(v)}" target="_blank" rel="noopener">View${icon('link')}</a>` : '';
    }
    const text = display(r, f);
    if (text && /status$/.test(f.key)) {
      return `<span class="pill pill-${PILLS[String(text).toLowerCase()] || 'gray'}">${esc(text)}</span>`;
    }
    return esc(text);
  }

  // Modal form is built from the fields list
  let sec = '';
  const formHtml = cfg.fields.map((f) => {
    let head = '';
    if (f.section && f.section !== sec) {
      sec = f.section;
      head = `<h3 class="form-section">${esc(sec)}</h3>`;
    }
    const id = 'f_' + f.key;
    const a = `id="${id}" ${f.required ? 'required' : ''} ${f.max ? `maxlength="${f.max}"` : ''} ${f.pattern ? `pattern="${f.pattern}"` : ''} ${f.hint ? `placeholder="${esc(f.hint)}"` : ''}`;
    let input;
    if (f.type === 'textarea') input = `<textarea class="input" rows="2" ${a}></textarea>`;
    else if (f.type === 'select') input = `<select class="input select" ${a}><option value="">Select...</option>${opts(f.options).map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>`;
    else if (f.type === 'lookup') input = `<select class="input select" ${a}><option value="">Select...</option></select>`;
    else input = `<input type="${f.type || 'text'}" class="input" ${f.type === 'number' ? 'min="0"' : ''} ${f.suggest ? `list="dl_${f.key}"` : ''} ${a}>`
      + (f.suggest ? `<datalist id="dl_${f.key}">${f.suggest.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>` : '');
    return `${head}<div class="field${f.wide ? ' wide' : ''}">
      <label for="${id}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>${input}
      <div class="invalid-feedback">${f.hint ? 'Format: ' + esc(f.hint) : 'This field is required or the format is invalid.'}</div></div>`;
  }).join('');

  root.innerHTML = `
  <section class="glass panel">
    <div class="toolbar">
      ${filters.map((f) => `<div class="field tool-field"><label for="flt_${f.key}">${esc(f.label)}</label>
        <select id="flt_${f.key}" class="input select"><option value="">All</option></select></div>`).join('')}
      <div class="field tool-field grow">
        <label for="search">Search</label>
        <div class="search-wrap">${icon('search')}<input id="search" type="search" class="input" placeholder="Search data..."></div>
      </div>
      <div class="tool-actions">
        <button id="btnExport" type="button" class="btn btn-ghost">${icon('sheet')}Export to Excel</button>
        <button id="btnTambah" type="button" class="btn btn-primary">${icon('plus')}Add New</button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th class="col-no">No</th>${cols.map((c) => `<th>${esc(c.label)}</th>`).join('')}<th class="col-aksi">Actions</th></tr></thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
    <div class="table-info" id="info"></div>
  </section>

  <div class="modal-overlay" id="modal" aria-hidden="true">
    <form id="form" class="modal-box glass-strong" role="dialog" aria-modal="true" aria-labelledby="modalTitle" novalidate>
      <div class="modal-head">
        <h2 id="modalTitle"></h2>
        <button type="button" class="icon-btn" data-close aria-label="Close">${icon('x')}</button>
      </div>
      <div class="modal-body"><input type="hidden" id="rowId"><div class="form-grid">${formHtml}</div></div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary" id="btnSimpan">Save</button>
      </div>
    </form>
  </div>`;

  const modalEl = $('modal');
  const form = $('form');
  const colspan = cols.length + 2;
  let lastFocus = null;

  const modal = {
    show() {
      lastFocus = document.activeElement;
      modalEl.classList.add('open');
      modalEl.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
      setTimeout(() => form.querySelector('.input')?.focus(), 60);
    },
    hide() {
      modalEl.classList.remove('open');
      modalEl.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      lastFocus?.focus?.();
    },
  };

  /* --- READ --- */
  async function loadLookups() {
    for (const f of lookups) {
      const { ref } = f;
      const { data, error } = await db.from(ref.table).select(`id,${ref.label}${ref.sub ? ',' + ref.sub : ''}`).order(ref.label);
      if (error) { showAlert(`Failed to load ${f.label} list: ${error.message}`, 'danger'); continue; }
      $('f_' + f.key).innerHTML = '<option value="">Select...</option>' +
        data.map((r) => `<option value="${esc(r.id)}">${esc(r[ref.label])}${ref.sub ? ` (${esc(r[ref.sub])})` : ''}</option>`).join('');
    }
  }

  async function loadFilters() {
    if (!filters.length) return;
    const { data, error } = await db.from(cfg.table).select(filters.map((f) => f.key).join(','));
    if (error) return showAlert('Failed to load filters: ' + error.message, 'danger');
    filters.forEach((f) => {
      const el = $('flt_' + f.key), cur = el.value;
      const vals = [...new Set(data.map((r) => r[f.key]).filter(Boolean))]
        .sort((a, b) => String(b).localeCompare(String(a), undefined, { numeric: true }));
      el.innerHTML = '<option value="">All</option>' + vals.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
      if (vals.includes(cur)) el.value = cur;
    });
  }

  async function load() {
    $('tbody').innerHTML = `<tr><td colspan="${colspan}" class="state-row"><span class="spinner"></span>Loading data...</td></tr>`;
    let q = db.from(cfg.table).select(selectStr).order(cfg.order, { ascending: cfg.asc !== false });
    filters.forEach((f) => { const v = $('flt_' + f.key).value; if (v) q = q.eq(f.key, v); });
    const { data, error } = await q;
    if (error) {
      $('tbody').innerHTML = `<tr><td colspan="${colspan}" class="state-row state-error">Failed to load data.</td></tr>`;
      return showAlert('Failed to load data: ' + error.message, 'danger');
    }
    rows = cfg.sort ? data.sort(cfg.sort) : data;
    render();
  }

  function render() {
    const term = $('search').value.trim().toLowerCase();
    shown = term ? rows.filter((r) => cols.map((c) => display(r, c)).join(' ').toLowerCase().includes(term)) : rows;
    if (!shown.length) {
      $('tbody').innerHTML = `<tr><td colspan="${colspan}" class="state-row">No data found.</td></tr>`;
      $('info').textContent = '';
      return;
    }
    $('tbody').innerHTML = shown.map((r, i) => `<tr>
      <td class="col-no">${i + 1}</td>${cols.map((c) => `<td>${cell(r, c)}</td>`).join('')}
      <td class="col-aksi">
        <button type="button" class="icon-btn btn-edit" data-id="${esc(r.id)}" title="Edit" aria-label="Edit">${icon('edit')}</button>
        <button type="button" class="icon-btn danger btn-delete" data-id="${esc(r.id)}" title="Delete" aria-label="Delete">${icon('trash')}</button>
      </td></tr>`).join('');
    $('info').textContent = `Showing ${shown.length} of ${rows.length} records`;
  }

  /* --- MODAL --- */
  function openModal(r) {
    form.reset();
    form.classList.remove('was-validated');
    $('rowId').value = r ? r.id : '';
    cfg.fields.forEach((f) => {
      let v = r ? r[f.key] : (f.default ?? '');
      if (f.type === 'time' && v) v = String(v).slice(0, 5);
      $('f_' + f.key).value = v ?? '';
    });
    if (!r) filters.forEach((fl) => { // pre-fill from active filters
      const v = $('flt_' + fl.key).value;
      if (v && $('f_' + fl.key)) $('f_' + fl.key).value = v;
    });
    $('modalTitle').textContent = `${r ? 'Edit' : 'Add'} ${cfg.title}`;
    form.querySelector('.modal-body').scrollTop = 0;
    modal.show();
  }

  /* --- CREATE / UPDATE --- */
  async function save(e) {
    e.preventDefault();
    // trim first so whitespace-only values fail "required" validation
    cfg.fields.forEach((f) => { const el = $('f_' + f.key); el.value = el.value.trim(); });
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      form.querySelector('.input:invalid')?.focus();
      return;
    }

    const payload = {};
    cfg.fields.forEach((f) => {
      const v = $('f_' + f.key).value;
      if (v === '') payload[f.key] = null;
      else if (f.type === 'number') payload[f.key] = Number(v);
      else if (f.type === 'lookup') payload[f.key] = /^\d+$/.test(v) ? Number(v) : v; // supports numeric or uuid ids
      else payload[f.key] = v;
    });
    const id = $('rowId').value;

    $('btnSimpan').disabled = true;
    const { error } = id
      ? await db.from(cfg.table).update(payload).eq('id', id)
      : await db.from(cfg.table).insert(payload);
    $('btnSimpan').disabled = false;

    if (error) return showAlert('Failed to save: ' + (error.code === '23505' ? 'duplicate data (e.g. NIM is already registered).' : error.message), 'danger');
    modal.hide();
    showAlert(id ? 'Data updated successfully.' : 'Data added successfully.');
    await loadFilters();
    await load();
  }

  /* --- DELETE --- */
  async function remove(id) {
    const r = rows.find((x) => String(x.id) === String(id));
    if (!r || !confirm(`Delete "${display(r, fieldOf(cfg.nameKey))}"? This action cannot be undone.`)) return;
    const { error } = await db.from(cfg.table).delete().eq('id', id);
    if (error) return showAlert('Failed to delete: ' + error.message, 'danger');
    showAlert('Data deleted successfully.');
    await loadFilters();
    await load();
  }

  /* --- EXPORT EXCEL (all fields, follows filters & search) --- */
  function exportExcel() {
    if (!shown.length) return showAlert('No data to export.', 'warning');
    const data = shown.map((r, i) => {
      const o = { No: i + 1 };
      cfg.fields.forEach((f) => { o[f.label] = ['lookup', 'select'].includes(f.type) ? display(r, f) : (r[f.key] ?? ''); });
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = Object.keys(data[0]).map((k) => ({ wch: Math.min(40, Math.max(k.length, ...data.map((d) => String(d[k]).length)) + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, cfg.title.slice(0, 31));
    const suffix = filters.map((f) => $('flt_' + f.key).value).filter(Boolean).join('_').replace(/[\/\\]/g, '-');
    XLSX.writeFile(wb, `${cfg.exportName}${suffix ? '_' + suffix : ''}.xlsx`);
  }

  /* --- EVENTS --- */
  filters.forEach((f) => $('flt_' + f.key).addEventListener('change', load));
  $('search').addEventListener('input', render);
  $('btnTambah').addEventListener('click', () => openModal(null));
  $('btnExport').addEventListener('click', exportExcel);
  form.addEventListener('submit', save);
  modalEl.addEventListener('mousedown', (e) => { if (e.target === modalEl) modal.hide(); });
  modalEl.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) modal.hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalEl.classList.contains('open')) modal.hide(); });
  $('tbody').addEventListener('click', (e) => {
    const ed = e.target.closest('.btn-edit'), del = e.target.closest('.btn-delete');
    if (ed) openModal(rows.find((x) => String(x.id) === ed.dataset.id));
    if (del) remove(del.dataset.id);
  });

  (async () => { await loadLookups(); await loadFilters(); await load(); })();
}
