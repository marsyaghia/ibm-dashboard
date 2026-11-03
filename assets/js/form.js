/* =========================================================================
   FORM — pembentuk formulir dari definisi field.
   Field: { key, label, type, options, required, col: 'half'|'third', help,
            placeholder, default, accept, batchKey, min, max, step }
   type: text | email | tel | url | number | money | decimal | date | select |
         textarea | checkbox | checks | radio | rating (bintang 1–5) | attachment | batch | student | readonly
   ========================================================================= */
import { h, icon, toNumber, fmtNum, batchOptions, toast, findStudent } from './ui.js';
import { store } from './store.js';

const optList = (o, rec) => (typeof o === 'function' ? o(rec) : o || []).map(x => typeof x === 'object' ? x : { value: x, label: x });

export function buildForm(sections, record = {}, { onChange } = {}) {
  const controls = {};       // key → { get(), set(), el, field }
  const pendingFiles = {};   // key → File
  const root = h('div', { class: 'form' });
  const changed = () => onChange && onChange(collectSync());

  for (const sec of sections) {
    const grid = h('div', { class: 'form-grid' });
    const s = h('section', { class: 'form-section' }, sec.title ? h('h3', {}, sec.title) : null, sec.note ? h('p', {}, sec.note) : null, grid);
    root.appendChild(s);
    for (const f of sec.fields) {
      const id = `f_${f.key}_${Math.random().toString(36).slice(2, 6)}`;
      let val = record[f.key] !== undefined && record[f.key] !== null && record[f.key] !== '' ? record[f.key] : (typeof f.default === 'function' ? f.default(record) : f.default);
      if (f.type === 'student' && !val) val = (findStudent(record) || {}).id || '';
      const wrap = h('div', { class: `field ${f.col || ''}`, dataset: { key: f.key } });
      const label = h('label', { for: id }, f.label, f.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, '*') : null);
      let ctrl;

      switch (f.type) {
        case 'textarea': {
          const el = h('textarea', { id, class: 'textarea', placeholder: f.placeholder || '', rows: f.rows || 3 });
          el.value = val ?? ''; el.addEventListener('input', changed);
          ctrl = { el, get: () => el.value.trim(), set: v => (el.value = v ?? '') }; break;
        }
        case 'select': case 'batch': case 'student': {
          const el = h('select', { id, class: 'select' });
          const fill = (r) => {
            const cur = el.value || val || '';
            el.innerHTML = '';
            el.appendChild(h('option', { value: '' }, f.placeholder || '— Pilih —'));
            let opts;
            if (f.type === 'batch') opts = batchOptions(f.allowAll);
            else if (f.type === 'student') {
              const b = r && f.batchKey ? r[f.batchKey] : '';
              opts = store.all('students').filter(s => !b || s.batch_id === b).sort((a, z) => a.nama.localeCompare(z.nama)).map(s => ({ value: s.id, label: s.nim ? `${s.nama} · ${s.nim}` : s.nama }));
            } else opts = optList(f.options, r);
            opts.forEach(o => el.appendChild(h('option', { value: o.value }, o.label)));
            if (cur && !opts.some(o => String(o.value) === String(cur))) el.appendChild(h('option', { value: cur }, cur));
            el.value = cur;
          };
          fill(record);
          el.addEventListener('change', changed);
          ctrl = { el, get: () => el.value, set: v => (el.value = v ?? ''), refill: fill }; break;
        }
        case 'checkbox': {
          const el = h('input', { id, type: 'checkbox' }); el.checked = !!val; el.addEventListener('change', changed);
          const lab = h('label', { class: 'check', for: id }, el, f.checkLabel || f.label);
          ctrl = { el: lab, get: () => el.checked, set: v => (el.checked = !!v) };
          wrap.appendChild(h('span', { class: 'flabel' }, f.groupLabel || ' ')); wrap.appendChild(lab);
          if (f.help) wrap.appendChild(h('div', { class: 'help' }, f.help));
          grid.appendChild(wrap); controls[f.key] = { ...ctrl, field: f, wrap }; continue;
        }
        case 'checks': case 'radio': {
          const multi = f.type === 'checks'; const current = multi ? (Array.isArray(val) ? val : []) : val;
          const box = h('div', { class: `checks ${multi ? '' : 'radios'}`, role: multi ? 'group' : 'radiogroup', 'aria-label': f.label });
          const name = id + '_n';
          const inputs = optList(f.options).map(o => {
            const inp = h('input', { type: multi ? 'checkbox' : 'radio', name, value: o.value });
            inp.checked = multi ? current.includes(o.value) : String(current) === String(o.value);
            inp.addEventListener('change', changed);
            box.appendChild(h('label', { class: 'check' }, inp, o.label)); return inp;
          });
          ctrl = { el: box, get: () => multi ? inputs.filter(i => i.checked).map(i => i.value) : ((inputs.find(i => i.checked) || {}).value || ''), set: v => inputs.forEach(i => (i.checked = multi ? (v || []).includes(i.value) : i.value === v)) };
          wrap.appendChild(h('span', { class: 'flabel' }, f.label, f.required ? h('span', { class: 'req' }, '*') : null));
          wrap.appendChild(box); if (f.help) wrap.appendChild(h('div', { class: 'help' }, f.help));
          grid.appendChild(wrap); controls[f.key] = { ...ctrl, field: f, wrap }; continue;
        }
        case 'rating': {
          let cur = Number(val) || 0;
          const box = h('div', { class: 'stars-input', role: 'radiogroup', 'aria-label': f.label });
          const out = h('span', { class: 'stars-label' });
          const LBL = f.labels || ['Sangat kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat baik'];
          const btns = [1, 2, 3, 4, 5].map(n => h('button', { type: 'button', role: 'radio', 'aria-label': `${n} bintang`, title: LBL[n - 1], onclick: () => { cur = cur === n && !f.required ? 0 : n; paint(); changed(); } }, icon('star')));
          const paint = () => { btns.forEach((b, i) => { b.classList.toggle('on', i < cur); b.setAttribute('aria-checked', String(i + 1 === cur)); }); out.textContent = cur ? `${cur}/5 · ${LBL[cur - 1]}` : 'Belum dinilai'; };
          btns.forEach(b => box.appendChild(b)); box.appendChild(out); paint();
          wrap.append(h('span', { class: 'flabel' }, f.label, f.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, '*') : null), box);
          if (f.help) wrap.appendChild(h('div', { class: 'help' }, f.help));
          controls[f.key] = { el: box, get: () => cur || '', set: v => { cur = Number(v) || 0; paint(); }, field: f, wrap };
          grid.appendChild(wrap); continue;
        }
        case 'money': case 'decimal': {
          const el = h('input', { id, class: 'input num', inputmode: 'decimal', placeholder: f.placeholder || '0', autocomplete: 'off' });
          const dec = f.type === 'decimal' ? 4 : 0;
          const show = (v) => (v === '' || v === null || v === undefined) ? '' : fmtNum(v, dec);
          el.value = show(val);
          el.addEventListener('focus', () => { const n = el.value === '' ? '' : toNumber(el.value); el.value = n === '' ? '' : String(n).replace('.', ','); });
          el.addEventListener('blur', () => { el.value = el.value.trim() === '' ? '' : show(toNumber(el.value)); changed(); });
          el.addEventListener('input', changed);
          const prefix = f.prefix ?? (f.type === 'money' ? 'Rp' : '');
          ctrl = { el: prefix ? h('div', { class: 'input-group' }, h('span', { class: 'prefix' }, prefix), el) : el, input: el, get: () => el.value.trim() === '' ? '' : toNumber(el.value), set: v => (el.value = show(v)) };
          break;
        }
        case 'attachment': {
          const att = val && typeof val === 'object' ? { ...val } : {};
          const labelIn = h('input', { class: 'input', placeholder: 'Nama dokumen (opsional)', value: att.label || '' });
          const linkIn = h('input', { class: 'input', type: 'url', placeholder: 'Tempelkan tautan Google Drive / Docs / Sheets…', value: att.link || '' });
          const fileIn = h('input', { type: 'file', class: 'hidden', accept: f.accept || '' });
          const chipBox = h('div', { class: 'attach-row' });
          let fileMeta = att.file || null;
          const renderChip = () => {
            chipBox.innerHTML = '';
            const pend = pendingFiles[f.key];
            const name = pend ? pend.name : fileMeta ? fileMeta.name : '';
            chipBox.appendChild(h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => fileIn.click() }, icon('upload', 'sm'), name ? 'Ganti berkas' : 'Unggah berkas'));
            if (name) chipBox.appendChild(h('span', { class: 'file-chip' }, icon('file', 'sm'), h('span', {}, name + (pend ? ' (baru)' : '')),
              h('button', { type: 'button', 'aria-label': 'Hapus berkas', onclick: () => { delete pendingFiles[f.key]; fileMeta = null; fileIn.value = ''; renderChip(); changed(); } }, icon('x', 'sm'))));
          };
          fileIn.addEventListener('change', () => {
            const file = fileIn.files[0]; if (!file) return;
            if (file.size > 15 * 1024 * 1024) { toast('Ukuran berkas maksimal 15 MB. Untuk berkas berukuran besar, gunakan tautan Google Drive.', 'bad'); fileIn.value = ''; return; }
            pendingFiles[f.key] = file; if (!labelIn.value) labelIn.value = file.name.replace(/\.[^.]+$/, ''); renderChip(); changed();
          });
          renderChip();
          const box = h('div', { class: 'attach' }, h('div', { class: 'attach-row' }, labelIn), h('div', { class: 'attach-row' }, linkIn), chipBox, fileIn);
          ctrl = {
            el: box,
            get: () => {
              const o = { label: labelIn.value.trim(), link: linkIn.value.trim(), file: fileMeta || null };
              return (o.label || o.link || o.file || pendingFiles[f.key]) ? o : null;
            },
            set: () => { }, setFile: (m) => { fileMeta = m; },
          };
          wrap.append(h('span', { class: 'flabel' }, f.label), box);
          if (f.help) wrap.appendChild(h('div', { class: 'help' }, f.help));
          grid.appendChild(wrap); controls[f.key] = { ...ctrl, field: f, wrap }; continue;
        }
        case 'readonly': {
          const el = h('input', { id, class: 'input', readonly: true, value: typeof f.compute === 'function' ? f.compute(record) : (val ?? '') });
          ctrl = { el, get: () => record[f.key], set: () => { }, recompute: (r) => (el.value = f.compute ? f.compute(r) : '') }; break;
        }
        default: {
          const type = ({ email: 'email', tel: 'tel', url: 'url', number: 'number', date: 'date' })[f.type] || 'text';
          const el = h('input', { id, class: `input ${type === 'number' ? 'num' : ''}`, type, placeholder: f.placeholder || '', autocomplete: 'off', min: f.min, max: f.max, step: f.step });
          el.value = val ?? ''; el.addEventListener('input', changed); el.addEventListener('change', changed);
          ctrl = { el, get: () => type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value.trim(), set: v => (el.value = v ?? '') };
        }
      }
      wrap.append(label, ctrl.el);
      if (f.help) wrap.appendChild(h('div', { class: 'help' }, f.help));
      grid.appendChild(wrap);
      controls[f.key] = { ...ctrl, field: f, wrap };
    }
  }

  // Field student bergantung pada batch
  const deps = () => {
    const r = collectSync();
    Object.values(controls).forEach(c => { if (c.field.type === 'student' && c.refill) c.refill(r); if (c.recompute) c.recompute(r); });
  };
  Object.values(controls).forEach(c => { if (c.field.type === 'batch') c.el.addEventListener('change', deps); });
  root.addEventListener('input', () => Object.values(controls).forEach(c => c.recompute && c.recompute(collectSync())));

  function collectSync() {
    const out = { ...record };
    for (const [k, c] of Object.entries(controls)) out[k] = c.get();
    return out;
  }
  function validate() {
    let ok = true; let first = null;
    for (const c of Object.values(controls)) {
      c.wrap.classList.remove('invalid'); const old = c.wrap.querySelector('.err'); if (old) old.remove();
      if (!c.field.required) continue;
      const v = c.get();
      const empty = v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length) || (c.field.type === 'attachment' && !v);
      if (empty) { ok = false; c.wrap.classList.add('invalid'); c.wrap.appendChild(h('div', { class: 'err' }, 'Wajib diisi')); first = first || c.wrap; }
    }
    if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return ok;
  }
  /** Validasi + unggah berkas tertunda → objek siap disimpan */
  async function collect() {
    if (!validate()) return null;
    for (const [k, file] of Object.entries(pendingFiles)) {
      const meta = await store.putFile(file);
      const prev = record[k] && record[k].file;
      if (prev && prev.id !== meta.id) store.deleteFile(prev).catch(() => { });
      controls[k].setFile(meta); delete pendingFiles[k];
    }
    return collectSync();
  }
  return { el: root, collect, collectSync, validate, controls };
}
