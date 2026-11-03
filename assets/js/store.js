/* =========================================================================
   STORE — lapisan data. Modul hanya memakai objek `store`:
     store.all(col) · store.get(col, id) · await store.save(col, rec)
     await store.saveMany(col, recs) · await store.remove(col, id)
     await store.putFile(File) · store.fileUrl(meta) · store.fileBlob(meta)
     store.setting(key) · await store.saveSetting(key, value) · store.subscribe(fn)
   Mode utama: Supabase (satu tabel per menu, lihat schema.js).
   Mode demo : ?demo=1 → data contoh di browser (localStorage + IndexedDB).
   ========================================================================= */
import { CONFIG } from './config.js';
import { SCHEMA, COLLECTIONS, toRow, fromRow } from './schema.js';
import { buildSeed } from './data/seed.js';
import { demoExtras } from './data/demo.js';
const demoSeed = () => { const s = buildSeed(); return { ...s, ...demoExtras(s) }; };

export { COLLECTIONS };
export const uid = (p = 'id') => `${p}_${(globalThis.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 14)}`;
const nowIso = () => new Date().toISOString();
const clone = (o) => JSON.parse(JSON.stringify(o));
const PREFIX = { batches: 'B', courses: 'mk', students: 'mhs', lecturers: 'dsn', schedules: 'jd', attendance: 'abs' };

/* Istilah lama "Dosen LB" / "Dosen Tamu" sekarang "Dosen External". Data lama dan hasil impor ikut disesuaikan. */
const JENIS_DOSEN = { lecturers: 'tipe', courses: 'jenis_pengampu', schedules: 'jenis_dosen', obeAssessments: 'jenis_dosen' };
const OLD_JENIS = ['Dosen LB', 'Dosen Tamu'];
const legacyJenis = (c, rec) => { const k = JENIS_DOSEN[c]; return k && rec && OLD_JENIS.includes(rec[k]) ? { ...rec, [k]: 'Dosen External' } : rec; };

/* ---------- Berkas mode demo: IndexedDB ---------- */
function idb() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('ibm_dash_files', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  });
}
async function idbDo(mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => { const tx = db.transaction('files', mode); const r = fn(tx.objectStore('files')); tx.oncomplete = () => res(r && 'result' in r ? r.result : undefined); tx.onerror = () => rej(tx.error); });
}

/* ---------- Mode demo ---------- */
class DemoAdapter {
  constructor() { this.mode = 'demo'; this.data = {}; this.key = 'ibm_dash_demo_v5'; this.profile = { email: 'demo@ibmasia.ac.id', nama: 'Mode Demo', sapaan: 'Tim IBM', peran: 'superadmin' }; }
  async connect() { return this.profile; }
  async init() {
    try { this.data = JSON.parse(localStorage.getItem(this.key) || '{}'); } catch (e) { this.data = {}; }
    if (!this.data.__seeded) { this.data = { ...demoSeed(), __seeded: nowIso() }; this.persist(); }
    COLLECTIONS.forEach(c => { if (!Array.isArray(this.data[c])) this.data[c] = []; });
  }
  persist() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { throw new Error('Penyimpanan browser penuh atau diblokir.'); } }
  list(c) { return this.data[c] || []; }
  async upsert(c, rec) { const a = this.data[c]; const i = a.findIndex(r => r.id === rec.id); if (i >= 0) a[i] = rec; else a.push(rec); this.persist(); return rec; }
  async upsertMany(c, recs) { const a = this.data[c]; const m = new Map(a.map((r, i) => [r.id, i])); recs.forEach(r => { if (m.has(r.id)) a[m.get(r.id)] = r; else a.push(r); }); this.persist(); return recs; }
  async remove(c, id) { this.data[c] = this.data[c].filter(r => r.id !== id); this.persist(); }
  async removeMany(c, ids) { const s = new Set(ids); this.data[c] = this.data[c].filter(r => !s.has(r.id)); this.persist(); }
  async putFile(file) { const meta = { id: uid('f'), name: file.name, size: file.size, type: file.type || '' }; await idbDo('readwrite', st => st.put(file, meta.id)); return meta; }
  async fileBlob(meta) { return idbDo('readonly', st => st.get(meta.id)); }
  async fileUrl(meta) { const b = await this.fileBlob(meta); return b ? URL.createObjectURL(b) : null; }
  async deleteFile(meta) { try { await idbDo('readwrite', st => st.delete(meta.id)); } catch (e) { /* abaikan */ } }
  async admins() { return [{ email: 'ibm@asia.ac.id', nama: 'Admin IBM', sapaan: 'Admin IBM', peran: 'superadmin' }, { email: 'danar@asia.ac.id', nama: 'Karolus Danar Kurniawan', sapaan: 'Pak Karolus', peran: 'superadmin' }]; }
  async signOut() { location.search = ''; }
  async reset() { this.data = { ...demoSeed(), __seeded: nowIso() }; this.persist(); }
}

/* ---------- Mode Supabase ---------- */
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat ' + src)); document.head.appendChild(s); });
}
class SupabaseAdapter {
  constructor(cfg) { this.mode = 'supabase'; this.cfg = cfg; this.data = {}; this.client = null; this.user = null; this.profile = null; }
  async connect() {
    if (!window.supabase) {
      try { await loadScript('assets/vendor/supabase.min.js'); } catch (e) { await loadScript(this.cfg.sdk); }
    }
    this.client = window.supabase.createClient(this.cfg.url, this.cfg.key, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data } = await this.client.auth.getSession();
    this.user = data.session ? data.session.user : null;
    if (this.user) await this.loadProfile();
    return this.profile;
  }
  async loadProfile() {
    const { data, error } = await this.client.from('admin_pengguna').select('email,nama,sapaan,peran').eq('email', this.user.email).maybeSingle();
    if (error || !data) { // akun login tetapi tidak terdaftar sebagai superadmin
      await this.client.auth.signOut(); this.user = null; this.profile = null;
      throw new Error('Akun ini tidak memiliki akses ke Dashboard IBM. Hubungi Koordinator IBM.');
    }
    this.profile = data; return data;
  }
  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(/invalid login/i.test(error.message) ? 'Email atau kata sandi salah.' : error.message);
    this.user = data.user; return this.loadProfile();
  }
  async resetPassword(email) {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw new Error(error.message);
  }
  async updatePassword(pw) { const { error } = await this.client.auth.updateUser({ password: pw }); if (error) throw new Error(error.message); }
  async signOut() { await this.client.auth.signOut(); this.user = null; this.profile = null; }
  async admins() { const { data, error } = await this.client.from('admin_pengguna').select('email,nama,sapaan,peran').order('email'); if (error) throw new Error(error.message); return data; }
  async init() {
    const results = await Promise.all(COLLECTIONS.map(async (c) => {
      const table = SCHEMA[c].table; const rows = []; let from = 0;
      for (;;) {
        const { data, error } = await this.client.from(table).select('*').order('created_at', { ascending: true }).range(from, from + 999);
        if (error) throw new Error(`Gagal memuat tabel ${table}: ${error.message}`);
        rows.push(...data); if (data.length < 1000) break; from += 1000;
      }
      return [c, rows.map(r => fromRow(c, r))];
    }));
    this.data = Object.fromEntries(results);
  }
  list(c) { return this.data[c] || []; }
  async upsert(c, rec) {
    const { error } = await this.client.from(SCHEMA[c].table).upsert(toRow(c, rec, this.user && this.user.email));
    if (error) throw new Error(error.message);
    const a = this.data[c]; const i = a.findIndex(r => r.id === rec.id); if (i >= 0) a[i] = rec; else a.push(rec); return rec;
  }
  async upsertMany(c, recs) {
    for (let i = 0; i < recs.length; i += 500) {
      const { error } = await this.client.from(SCHEMA[c].table).upsert(recs.slice(i, i + 500).map(r => toRow(c, r, this.user && this.user.email)));
      if (error) throw new Error(error.message);
    }
    const a = this.data[c]; const m = new Map(a.map((r, i) => [r.id, i])); recs.forEach(r => { if (m.has(r.id)) a[m.get(r.id)] = r; else a.push(r); }); return recs;
  }
  async remove(c, id) { const { error } = await this.client.from(SCHEMA[c].table).delete().eq('id', id); if (error) throw new Error(error.message); this.data[c] = this.data[c].filter(r => r.id !== id); }
  async removeMany(c, ids) { const { error } = await this.client.from(SCHEMA[c].table).delete().in('id', ids); if (error) throw new Error(error.message); const s = new Set(ids); this.data[c] = this.data[c].filter(r => !s.has(r.id)); }
  async putFile(file) {
    const id = uid('f'); const path = `${new Date().getFullYear()}/${id}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
    const { error } = await this.client.storage.from(this.cfg.bucket).upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) throw new Error('Unggah gagal: ' + error.message);
    return { id, name: file.name, size: file.size, type: file.type || '', path };
  }
  async fileUrl(meta) { const { data, error } = await this.client.storage.from(this.cfg.bucket).createSignedUrl(meta.path, 1800); if (error) throw new Error(error.message); return data.signedUrl; }
  async fileBlob(meta) { const { data, error } = await this.client.storage.from(this.cfg.bucket).download(meta.path); if (error) throw new Error(error.message); return data; }
  async deleteFile(meta) { if (meta && meta.path) await this.client.storage.from(this.cfg.bucket).remove([meta.path]); }
}

/* ---------- Fasad ---------- */
const isDemo = new URLSearchParams(location.search).has('demo');
class Store {
  constructor() { this.adapter = isDemo ? new DemoAdapter() : new SupabaseAdapter(CONFIG.supabase); this.mode = this.adapter.mode; this.subs = new Set(); }
  get profile() { return this.adapter.profile; }
  async admins() { return this.adapter.admins(); }
  async connect() { return this.adapter.connect(); }
  async signIn(e, p) { return this.adapter.signIn(e, p); }
  async signOut() { return this.adapter.signOut(); }
  async resetPassword(e) { return this.adapter.resetPassword(e); }
  async updatePassword(p) { return this.adapter.updatePassword(p); }
  async init() { await this.adapter.init(); this.fixLegacy(); }
  async reload() { await this.adapter.init(); this.fixLegacy(); this.emit('*'); }
  fixLegacy() { const d = this.adapter.data; Object.keys(JENIS_DOSEN).forEach(c => { if (Array.isArray(d[c])) d[c] = d[c].map(r => legacyJenis(c, r)); }); }

  all(c) { return this.adapter.list(c); }
  get(c, id) { return id ? this.all(c).find(r => r.id === id) || null : null; }
  emit(c) { this.subs.forEach(fn => { try { fn(c); } catch (e) { console.error(e); } }); }
  subscribe(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }

  /** Lengkapi referensi mahasiswa: student_id ⇄ nim ⇄ nama_mahasiswa (+ batch) agar data tetap terbaca walau diimpor dari CSV */
  enrich(c, rec) {
    const cols = SCHEMA[c] && SCHEMA[c].cols.map(x => x.name);
    if (!cols || !cols.includes('student_id') || !cols.includes('nama_mahasiswa')) return rec;
    const all = this.all('students'); let s = rec.student_id ? all.find(x => x.id === rec.student_id) : null;
    if (!s && rec.nim) s = all.find(x => x.nim && String(x.nim) === String(rec.nim));
    if (!s && rec.nama_mahasiswa) { const n = String(rec.nama_mahasiswa).toLowerCase().trim(); s = all.find(x => String(x.nama).toLowerCase().trim() === n); }
    if (!s) return rec;
    return { ...rec, student_id: s.id, nim: s.nim || rec.nim || '', nama_mahasiswa: s.nama, batch_id: rec.batch_id || s.batch_id || '' };
  }
  stamp(c, rec) {
    rec = legacyJenis(c, this.enrich(c, rec));
    const prev = rec.id ? this.get(c, rec.id) : null;
    return { ...rec, id: rec.id || uid(PREFIX[c] || c.slice(0, 3)), created_at: (prev && prev.created_at) || rec.created_at || nowIso(), updated_at: nowIso() };
  }
  async save(c, rec) { const r = this.stamp(c, rec); await this.adapter.upsert(c, r); this.emit(c); return r; }
  async saveMany(c, recs) { const rs = recs.map(r => this.stamp(c, r)); await this.adapter.upsertMany(c, rs); this.emit(c); return rs; }
  async remove(c, id) { await this.adapter.remove(c, id); this.emit(c); }
  async removeMany(c, ids) { if (ids.length) { await this.adapter.removeMany(c, ids); this.emit(c); } }
  async putFile(f) { return this.adapter.putFile(f); }
  async fileUrl(m) { return this.adapter.fileUrl(m); }
  async fileBlob(m) { return this.adapter.fileBlob(m); }
  async deleteFile(m) { return this.adapter.deleteFile(m); }

  /* Pengaturan (tabel "pengaturan": id = kunci, nilai = json) */
  setting(key) {
    const def = CONFIG.defaults[key] || {}; const row = this.get('settings', key);
    const val = row && row.nilai ? (typeof row.nilai === 'string' ? JSON.parse(row.nilai) : row.nilai) : {};
    return Array.isArray(def) ? (Array.isArray(val) && val.length ? val : def) : { ...clone(def), ...val };
  }
  async saveSetting(key, value) { return this.save('settings', { id: key, nilai: value }); }
  list(name) { return this.setting('daftar')[name] || []; }

  exportAll() { const out = { app: 'ibm-dashboard', version: 2, exported_at: nowIso() }; COLLECTIONS.forEach(c => (out[c] = clone(this.all(c)))); return out; }
  async importAll(json) {
    if (!json || json.app !== 'ibm-dashboard') throw new Error('Berkas bukan cadangan Dashboard IBM.');
    for (const c of COLLECTIONS) if (Array.isArray(json[c]) && json[c].length) await this.adapter.upsertMany(c, json[c].map(r => legacyJenis(c, r)));
    this.emit('*');
  }
  async resetDemo() { if (this.mode === 'demo') { await this.adapter.reset(); this.emit('*'); } }
}
export const store = new Store();
