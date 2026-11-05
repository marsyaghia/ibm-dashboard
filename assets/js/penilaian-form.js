/* =========================================================================
   FORM PUBLIK PENILAIAN MAGANG — penilaian-magang.html?batch=B2
   • Tanpa login. Tabel Supabase tetap terkunci RLS; form hanya memanggil dua
     fungsi aman: magang_cek_nim(p_nim) dan kirim_penilaian_magang(p).
   • ?demo=1 → simulasi tanpa Supabase (untuk mencoba tampilan).
   ========================================================================= */
import { CONFIG } from './config.js';

const qs = new URLSearchParams(location.search);
const DEMO = qs.has('demo');
const BATCH = (qs.get('batch') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const $ = (id) => document.getElementById(id);

/* ---------- Utilitas DOM kecil ---------- */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const P = {
  star: '<path d="m12 3 2.76 5.6 6.18.9-4.47 4.36 1.05 6.15L12 17.1l-5.52 2.9 1.05-6.15L3.06 9.5l6.18-.9z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>', alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>',
};
function icon(name, cls = '') { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', `icon ${cls}`.trim()); s.setAttribute('aria-hidden', 'true'); s.innerHTML = P[name] || ''; return s; }
function toast(msg, type = 'info') {
  const el = h('div', { class: `toast ${type}` }, icon(type === 'bad' ? 'alert' : type === 'ok' ? 'check' : 'info'), h('div', {}, msg));
  $('toasts').appendChild(el); setTimeout(() => el.remove(), type === 'bad' ? 6500 : 3500);
}
const batchLabel = (id) => id ? `Batch ${id.replace(/^B/, '')}` : '';
const fmtTgl = (iso) => { try { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(iso)); } catch (e) { return String(iso || '').slice(0, 10); } };

/* ---------- Tema ---------- */
function paintTheme() { const b = $('pf-theme'); b.innerHTML = ''; b.appendChild(icon(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon')); }
$('pf-theme').addEventListener('click', () => { const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('ibm_theme', t); } catch (e) { /* abaikan */ } paintTheme(); });
paintTheme();
if (BATCH) $('pf-batch').textContent = `Formulir ini ditujukan bagi mahasiswa IBM ${batchLabel(BATCH)}. Penilaian Anda akan membantu mahasiswa angkatan berikutnya dalam memilih tempat magang yang tepat.`;

/* ---------- Akses data (RPC aman) ---------- */
let sb = null;
async function client() {
  if (sb) return sb;
  if (!window.supabase) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = CONFIG.supabase.sdk; s.onload = ok; s.onerror = () => no(new Error('Gagal memuat koneksi. Periksa koneksi internet, kemudian muat ulang halaman.')); document.head.appendChild(s); });
  sb = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key, { auth: { persistSession: false, autoRefreshToken: false } });
  return sb;
}
async function cekNim(nim) {
  if (DEMO) return { ok: true, nama: 'Mahasiswa Contoh', batch_id: BATCH || 'B2', batch: batchLabel(BATCH || 'B2'), magang_id: 'demo', perusahaan: 'Shanaya Resort Malang', posisi: 'Sales & Marketing', kota: 'Malang', durasi: '6 Months', mulai: '2026-09-01', selesai: '2027-03-01', sudah_mengisi: false };
  const { data, error } = await (await client()).rpc('magang_cek_nim', { p_nim: nim });
  if (error) throw new Error(error.message);
  return data;
}
async function kirim(payload) {
  if (DEMO) { await new Promise(r => setTimeout(r, 500)); return { ok: true, id: 'demo' }; }
  const { data, error } = await (await client()).rpc('kirim_penilaian_magang', { p: payload });
  if (error) throw new Error(error.message.replace(/^.*?ERROR:\s*/, ''));
  return data;
}

/* ---------- Komponen input ---------- */
const LBL = ['Sangat kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat baik'];
function rating(key, title, sub, main = false) {
  let cur = 0;
  const out = h('span', { class: 'stars-label' }, 'Belum dinilai');
  const box = h('div', { class: 'stars-input', role: 'radiogroup', 'aria-label': title });
  const btns = [1, 2, 3, 4, 5].map(n => h('button', { type: 'button', role: 'radio', 'aria-checked': 'false', 'aria-label': `${n} bintang — ${LBL[n - 1]}`, title: LBL[n - 1], onclick: () => { cur = n; paint(); row.classList.remove('invalid'); } }, icon('star')));
  const paint = () => { btns.forEach((b, i) => { b.classList.toggle('on', i < cur); b.setAttribute('aria-checked', String(i + 1 === cur)); }); out.textContent = cur ? `${cur}/5 · ${LBL[cur - 1]}` : 'Belum dinilai'; };
  box.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { cur = Math.min(5, cur + 1); paint(); btns[cur - 1].focus(); e.preventDefault(); } if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { cur = Math.max(1, cur - 1); paint(); btns[cur - 1].focus(); e.preventDefault(); } });
  btns.forEach(b => box.appendChild(b)); box.appendChild(out);
  const row = h('div', { class: `rate-row ${main ? 'main' : ''}`, 'data-key': key }, h('div', { class: 'rl' }, h('strong', {}, title, h('span', { class: 'req', 'aria-hidden': 'true', style: 'color:var(--bad)' }, ' *')), sub ? h('span', {}, sub) : null), box);
  return { el: row, key, get: () => cur || '', required: true, wrap: row };
}
function chips(key, label, options, { required = false, multi = false, col = '', help = '' } = {}) {
  const name = `${key}_${Math.random().toString(36).slice(2, 6)}`;
  const inputs = options.map(o => h('input', { type: multi ? 'checkbox' : 'radio', name, value: o }));
  const box = h('div', { class: 'opt-chips', role: multi ? 'group' : 'radiogroup', 'aria-label': label }, inputs.map((inp, i) => h('label', {}, inp, h('span', {}, options[i]))));
  const wrap = h('div', { class: `field ${col}` }, h('span', { class: 'flabel' }, label, required ? h('span', { class: 'req' }, '*') : null), box, help ? h('div', { class: 'help' }, help) : null);
  inputs.forEach(i => i.addEventListener('change', () => wrap.classList.remove('invalid')));
  return { el: wrap, key, required, wrap, get: () => multi ? inputs.filter(i => i.checked).map(i => i.value).join(', ') : ((inputs.find(i => i.checked) || {}).value || '') };
}
function text(key, label, { required = false, col = '', placeholder = '', value = '', area = false, rows = 3, help = '', type = 'text', max = 2000 } = {}) {
  const id = `f_${key}`;
  const inp = area ? h('textarea', { id, class: 'textarea', rows, placeholder, maxlength: max }) : h('input', { id, class: 'input', type, placeholder, maxlength: max, autocomplete: 'off' });
  inp.value = value || '';
  const wrap = h('div', { class: `field ${col}` }, h('label', { for: id }, label, required ? h('span', { class: 'req' }, '*') : null), inp, help ? h('div', { class: 'help' }, help) : null);
  inp.addEventListener('input', () => wrap.classList.remove('invalid'));
  return { el: wrap, key, required, wrap, get: () => inp.value.trim(), input: inp };
}

/* ---------- Alur ---------- */
const body = $('pf-body');
function stepNim() {
  body.innerHTML = '';
  const nim = h('input', { class: 'input', id: 'nim', inputmode: 'numeric', autocomplete: 'off', placeholder: 'Masukkan NIM Anda', 'aria-label': 'NIM', maxlength: 20 });
  const go = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Lanjutkan', icon('arrow'));
  const msg = h('div');
  const form = h('form', { class: 'pf-nim', novalidate: true }, nim, go);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); msg.innerHTML = '';
    const v = nim.value.replace(/\s/g, '');
    if (v.length < 6) { msg.appendChild(h('div', { class: 'note warn', style: 'margin-top:12px' }, icon('alert'), h('div', {}, 'NIM minimal 6 karakter.'))); nim.focus(); return; }
    go.disabled = true; go.textContent = 'Mengecek…';
    try {
      const r = await cekNim(v);
      if (!r || !r.ok) { msg.appendChild(h('div', { class: 'note warn', style: 'margin-top:12px' }, icon('alert'), h('div', {}, (r && r.pesan) || 'NIM tidak ditemukan.'))); go.disabled = false; go.replaceChildren('Lanjutkan', icon('arrow')); return; }
      stepForm(v, r);
    } catch (err) { msg.appendChild(h('div', { class: 'note warn', style: 'margin-top:12px' }, icon('alert'), h('div', {}, err.message))); go.disabled = false; go.replaceChildren('Lanjutkan', icon('arrow')); }
  });
  body.append(h('section', { class: 'pf-card' },
    h('h2', {}, h('span', { class: 'stepno' }, '1'), 'Masukkan NIM'),
    h('p', { class: 'lead' }, 'Nama, perusahaan, dan posisi magang akan terisi secara otomatis berdasarkan data program studi. Estimasi waktu pengisian ±3 menit.'),
    form, msg));
  setTimeout(() => nim.focus(), 50);
}

function stepForm(nim, info) {
  body.innerHTML = '';
  const F = [];
  const add = (c) => { F.push(c); return c.el; };
  const initials = String(info.nama || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const lain = BATCH && info.batch_id && BATCH !== info.batch_id;

  const sec1 = h('section', { class: 'pf-card' },
    h('h2', {}, h('span', { class: 'stepno' }, '1'), 'Data magang'),
    h('div', { class: 'pf-who' }, h('span', { class: 'ava', 'aria-hidden': 'true' }, initials), h('div', {}, h('strong', {}, info.nama || 'Mahasiswa IBM'), h('span', {}, [`NIM ${nim}`, info.batch || batchLabel(info.batch_id)].filter(Boolean).join(' · '))),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: stepNim }, icon('edit', 'sm'), 'Ganti NIM')),
    lain ? h('div', { class: 'note', style: 'margin-top:12px' }, icon('info'), h('div', {}, `NIM ini terdaftar di ${info.batch || batchLabel(info.batch_id)}, bukan ${batchLabel(BATCH)}. Jawaban tetap disimpan ke ${info.batch || batchLabel(info.batch_id)}.`)) : null,
    info.sudah_mengisi ? h('div', { class: 'note', style: 'margin-top:12px' }, icon('info'), h('div', {}, `Anda telah mengisi formulir ini${info.terakhir_diisi ? ` pada ${fmtTgl(info.terakhir_diisi)}` : ''}. Pengiriman ulang untuk perusahaan yang sama akan memperbarui jawaban sebelumnya.`)) : null,
    h('div', { class: 'form-grid' },
      add(text('perusahaan', 'Perusahaan tempat magang', { required: true, value: info.perusahaan || '', col: 'half', max: 200 })),
      add(text('kota', 'Kota', { required: true, value: info.kota || '', col: 'half', max: 100 })),
      add(text('posisi', 'Posisi / jabatan magang', { required: true, value: info.posisi || '', col: 'half', max: 150 })),
      add(text('divisi', 'Divisi / departemen', { required: true, value: info.divisi || '', col: 'half', max: 150 })),
      add(text('mulai', 'Tanggal mulai', { required: true, type: 'date', value: info.mulai || '', col: 'third' })),
      add(text('selesai', 'Tanggal selesai', { required: true, type: 'date', value: info.selesai || '', col: 'third' })),
      add(text('durasi', 'Durasi', { required: true, value: info.durasi || '', placeholder: 'mis. 6 bulan', col: 'third', max: 60 })),
      add(chips('mode_kerja', 'Mode kerja', ['WFO', 'Hybrid', 'WFH'], { required: true })),
    ));

  const R = [
    rating('rating_keseluruhan', 'Penilaian keseluruhan', 'Seberapa puas Anda dengan tempat magang ini?', true),
    rating('rating_jobdesk', 'Kesesuaian jobdesk', 'Kesesuaian tugas dengan posisi dan bidang studi'),
    rating('rating_lingkungan', 'Lingkungan kerja', 'Rekan kerja, budaya, dan suasana kantor'),
    rating('rating_bimbingan', 'Bimbingan mentor', 'Arahan dan feedback dari pembimbing lapangan'),
    rating('rating_kompensasi', 'Kompensasi & fasilitas', 'Uang saku, makan, transport, fasilitas kerja'),
    rating('rating_pengembangan', 'Pengembangan skill', 'Ilmu dan pengalaman baru yang didapat'),
  ];
  R.forEach(r => F.push(r));
  const sec2 = h('section', { class: 'pf-card' }, h('h2', {}, h('span', { class: 'stepno' }, '2'), 'Penilaian bintang (1–5)'), h('p', { class: 'lead' }, 'Pilih jumlah bintang untuk memberikan penilaian. Seluruh aspek wajib diisi.'), h('div', {}, R.map(r => r.el)));

  const sec3 = h('section', { class: 'pf-card' },
    h('h2', {}, h('span', { class: 'stepno' }, '3'), 'Kesesuaian'),
    h('div', { class: 'form-grid' },
      add(chips('jobdesk_sesuai', 'Apakah jobdesk sesuai dengan posisi/bidang studi Anda?', ['Ya', 'Sebagian', 'Tidak'], { required: true })),
      add(chips('lingkungan_cocok', 'Apakah lingkungan kerja sesuai dengan Anda?', ['Ya', 'Cukup', 'Tidak'], { required: true })),
      add(chips('kompensasi_diterima', 'Kompensasi yang Anda terima (dapat memilih lebih dari satu)', ['Uang saku', 'Uang makan', 'Transport', 'Tidak ada'], { required: true, multi: true })),
      add(chips('kompensasi_sepadan', 'Apakah kompensasi sepadan dengan beban kerja?', ['Ya', 'Cukup', 'Tidak'], { required: true })),
      add(chips('beban_kerja', 'Beban kerja', ['Ringan', 'Sesuai', 'Berat'], { required: true })),
      add(text('jam_kerja', 'Jam kerja', { required: true, placeholder: 'mis. Senin–Jumat 08.00–17.00', max: 150 })),
      add(chips('tawaran_kerja', 'Apakah Anda mendapatkan tawaran kerja setelah magang?', ['Ya', 'Belum', 'Tidak'], { required: true })),
      add(chips('rekomendasi', 'Apakah Anda merekomendasikan tempat ini kepada mahasiswa angkatan berikutnya?', ['Ya', 'Mungkin', 'Tidak'], { required: true })),
    ));

  const sec4 = h('section', { class: 'pf-card' },
    h('h2', {}, h('span', { class: 'stepno' }, '4'), 'Pengalaman magang'),
    h('div', { class: 'form-grid' },
      add(text('kelebihan', 'Kelebihan tempat magang', { required: true, area: true, placeholder: 'Hal apa yang paling Anda apresiasi?' })),
      add(text('kekurangan', 'Kekurangan / hal yang perlu diperhatikan', { required: true, area: true, placeholder: 'Hal apa yang perlu diketahui oleh calon peserta magang?' })),
      add(text('skill_didapat', 'Keterampilan yang Anda peroleh', { required: true, area: true, rows: 2, placeholder: 'mis. negosiasi, Canva, Excel, handling tamu' })),
      add(text('saran', 'Saran untuk prodi IBM', { required: true, area: true, rows: 2 })),
    ));

  const send = h('button', { class: 'btn btn-primary', type: 'button' }, icon('check'), 'Kirim penilaian');
  const actions = h('div', { class: 'pf-actions' }, h('span', { class: 'muted' }, 'Semua kolom wajib diisi.'), send);
  body.append(sec1, sec2, sec3, sec4, actions);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  send.addEventListener('click', async () => {
    let first = null;
    for (const c of F) {
      c.wrap.classList.remove('invalid'); const old = c.wrap.querySelector(':scope > .err'); if (old) old.remove();
      if (c.required && !c.get()) { c.wrap.classList.add('invalid'); if (!c.wrap.classList.contains('rate-row')) c.wrap.appendChild(h('div', { class: 'err' }, 'Wajib diisi')); first = first || c.wrap; }
    }
    if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); toast('Mohon lengkapi kolom yang ditandai.', 'bad'); return; }
    const payload = { nim, nama_lengkap: info.nama || '' };
    F.forEach(c => { payload[c.key] = c.get(); });
    send.disabled = true; send.replaceChildren('Mengirim…');
    try {
      await kirim(payload);
      body.innerHTML = '';
      body.append(h('section', { class: 'pf-card pf-done' },
        h('div', { class: 'ok' }, icon('check')), h('h2', {}, 'Terima kasih!'),
        h('p', {}, `Penilaian Anda untuk ${payload.perusahaan} telah berhasil disimpan. Ulasan Anda akan membantu Program Studi IBM dalam mengevaluasi mitra magang serta membantu mahasiswa angkatan berikutnya dalam memilih tempat magang.`),
        h('div', { class: 'pf-actions', style: 'justify-content:center' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: stepNim }, 'Isi penilaian untuk tempat magang lain'))));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { toast(err.message || 'Gagal mengirim. Silakan coba kembali.', 'bad'); send.disabled = false; send.replaceChildren(icon('check'), 'Kirim penilaian'); }
  });
}

stepNim();
