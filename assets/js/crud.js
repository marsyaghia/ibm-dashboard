/* =========================================================================
   CRUD — halaman daftar generik: header, KPI, filter, tabel, tambah/ubah/hapus,
   ekspor CSV/Excel, impor. Setiap modul cukup memberi konfigurasi.
   ========================================================================= */
import { h, icon, clear, openDrawer, confirmDialog, toast, dropdown, pref, tc } from './ui.js';
import { dataTable } from './table.js';
import { buildForm } from './form.js';
import { exportRows, importDialog } from './io.js';
import { store } from './store.js';
import { SCHEMA } from './schema.js';

const TYPE_OF = { date: 'date', num: 'decimal', int: 'number', bool: 'checkbox', list: 'checks', text: 'text' };
/** Kolom tabel Supabase yang tidak ada di formulir tetap bisa diisi lewat impor (mis. nim, nama_mahasiswa) */
export function schemaExtras(collection, fields) {
  const s = SCHEMA[collection]; if (!s) return [];
  const have = new Set(fields.map(f => f.key));
  return [{ key: 'id', label: 'id', type: 'text' }, ...s.cols.filter(c => !have.has(c.name) && TYPE_OF[c.type]).map(c => ({ key: c.name, label: c.name, type: TYPE_OF[c.type] }))];
}

export const flatFields = (sections) => sections.flatMap(s => s.fields);

/**
 * cfg: {
 *   id, collection, title, eyebrow, description, noun, addLabel,
 *   sections, columns, filters: [{ key, label, options, match(row, value) }],
 *   search(row) → string, defaults() → {}, sort: { key, dir },
 *   kpis(rows, allRows) → [{ label, value, sub, icon, accent, meter }],
 *   above(rows, allRows) → Node, rowsFilter(rows) → rows, exportName,
 *   extraActions(ctx) → [Node], drawerFooter(rec, close) → [Node],
 *   beforeSave(rec) → rec, aliases, importNote, pageSize, groupBy, footer,
 *   pageBy / pageGroups / pageRows: paginasi per kelompok (lihat dataTable di table.js),
 *   description: teks atau fungsi → teks (dihitung saat halaman dibuka),
 *   importSection: key field yang diisi dari baris judul di berkas impor (mis. "BATCH 1 / 2023" → batch_id),
 *   editable: false → baca-saja: tanpa tombol ubah/hapus di baris (pakai bersama addable/importable: false)
 * }
 */
export function crudView(cfg) {
  return function mount(root) {
    const key = `filters_${cfg.id || cfg.collection}`;
    const state = { q: '', f: pref.get(key, {}) };
    const fields = flatFields(cfg.sections);

    const searchIn = h('input', { class: 'input', type: 'search', placeholder: cfg.searchPlaceholder || 'Cari…', 'aria-label': 'Cari' });
    const countEl = h('span', { class: 'count' });
    const emptyEl = h('div', { class: 'empty' });
    const kpiBox = h('div');
    const aboveBox = h('div');
    const tableBox = h('div');

    const all = () => (cfg.rowsFilter ? cfg.rowsFilter(store.all(cfg.collection)) : store.all(cfg.collection));
    function filtered() {
      const q = state.q.toLowerCase().trim();
      return all().filter(r => {
        for (const f of cfg.filters || []) {
          const v = state.f[f.key]; if (v === undefined || v === '') continue;
          if (f.match ? !f.match(r, v) : String(r[f.key]) !== String(v)) return false;
        }
        if (!q) return true;
        const hay = (cfg.search ? cfg.search(r) : fields.map(f => r[f.key]).join(' ')).toLowerCase();
        return q.split(/\s+/).every(t => hay.includes(t));
      });
    }

    function openForm(rec) {
      const isNew = !rec || !rec.id;
      const data = isNew ? { ...(cfg.defaults ? cfg.defaults() : {}), ...(rec || {}) } : rec;
      const form = buildForm(cfg.sections, data);
      const save = h('button', { class: 'btn btn-primary', type: 'button' }, icon('check'), isNew ? 'Simpan' : 'Simpan perubahan');
      const cancel = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Batal');
      const del = !isNew ? h('button', { class: 'btn btn-danger', type: 'button' }, icon('trash', 'sm'), 'Hapus') : null;
      const extra = cfg.drawerFooter && !isNew ? cfg.drawerFooter(data, () => d.close()) : [];
      const d = openDrawer({
        title: isNew ? `Tambah ${cfg.noun || 'data'}` : (cfg.drawerTitle ? cfg.drawerTitle(data) : `Ubah ${cfg.noun || 'data'}`),
        subtitle: cfg.drawerSubtitle ? cfg.drawerSubtitle(data, isNew) : null,
        body: [cfg.formIntro ? cfg.formIntro(data, isNew) : null, form.el],
        footer: [h('div', { class: 'left' }, del, ...extra), cancel, save],
      });
      cancel.addEventListener('click', d.close);
      save.addEventListener('click', async () => {
        save.disabled = true;
        try {
          let out = await form.collect();
          if (!out) { save.disabled = false; return; }
          if (cfg.beforeSave) out = cfg.beforeSave(out, data);
          await store.save(cfg.collection, out);
          toast(isNew ? `${cap(cfg.noun || 'Data')} ditambahkan.` : 'Perubahan disimpan.', 'ok');
          d.close();
        } catch (e) { toast(e.message, 'bad'); save.disabled = false; }
      });
      if (del) del.addEventListener('click', async () => {
        if (await confirmDialog(`Hapus ${cfg.noun || 'data'} ini? Tindakan ini tidak dapat dibatalkan.`)) { await removeRow(data); d.close(); }
      });
      setTimeout(() => { const first = form.el.querySelector('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([data-nofocus]), select, textarea'); first && first.focus(); }, 60);
    }

    async function removeRow(r) {
      try {
        for (const f of fields.filter(f => f.type === 'attachment' || f.type === 'photo')) if (r[f.key] && r[f.key].file) store.deleteFile(r[f.key].file).catch(() => { });
        await store.remove(cfg.collection, r.id); toast(`${cap(cfg.noun || 'Data')} dihapus.`, 'ok');
      } catch (e) { toast(e.message, 'bad'); }
    }

    /* Impor: bila cfg.mergeKey ada, baris dengan kunci sama (mis. nama) diperbarui, bukan diduplikasi */
    async function importRecords(recs) {
      const existing = store.all(cfg.collection);
      const out = recs.map(r => {
        const prev = cfg.mergeKey ? existing.find(e => cfg.mergeKey(e) && cfg.mergeKey(e) === cfg.mergeKey(r)) : null;
        const x = prev ? { ...prev, ...r } : { ...(cfg.defaults ? cfg.defaults() : {}), ...r };
        return cfg.beforeSave ? cfg.beforeSave(x, prev || {}) : x;
      });
      return store.saveMany(cfg.collection, out);
    }

    const ctx = { openForm, filtered, all, state, refresh: () => refresh() };

    // Header
    const exportMenu = dropdown('Ekspor', [
      { label: 'Excel (.xlsx) — sesuai filter', icon: 'sheet', onClick: () => exportRows(cfg.exportName || cfg.title, exportCols(), table.getSorted(), 'xlsx') },
      { label: 'CSV — sesuai filter', icon: 'file', onClick: () => exportRows(cfg.exportName || cfg.title, exportCols(), table.getSorted(), 'csv') },
      '-',
      { label: 'Excel — semua data', icon: 'sheet', onClick: () => exportRows(cfg.exportName || cfg.title, exportCols(), all(), 'xlsx') },
    ]);
    const exportCols = () => cfg.exportColumns || cfg.columns;
    // Subtitle otomatis selebar halaman (lihat widenPageDesc di ui.js).
    // description boleh berupa fungsi agar teks dinamis (mis. tahun ajaran berjalan) dihitung saat dibuka.
    const desc = typeof cfg.description === 'function' ? cfg.description() : cfg.description;
    const openImport = () => importDialog({ title: cfg.title, fields: [...fields, ...(cfg.importExtra || []), ...schemaExtras(cfg.collection, [...fields, ...(cfg.importExtra || [])])], aliases: cfg.aliases, note: cfg.importNote, sectionKey: cfg.importSection, onImport: (recs) => importRecords(recs) });
    const addLabel = cfg.addLabel || `Tambah ${cfg.noun || ''}`.trim();
    const head = h('div', { class: 'page-head' },
      h('div', {}, cfg.eyebrow ? h('span', { class: 'eyebrow' }, cfg.eyebrow) : null, h('h1', {}, cfg.title), desc ? h('p', {}, desc) : null),
      h('div', { class: 'actions no-print' },
        ...(cfg.extraActions ? cfg.extraActions(ctx) : []),
        cfg.importable === false ? null : h('button', { class: 'btn btn-ghost', type: 'button', onclick: openImport }, icon('upload'), 'Impor'),
        exportMenu,
        cfg.addable === false ? null : h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openForm(null) }, icon('plus'), addLabel),
      ));

    // Filter bar
    // Di HP, pilihan filter dilipat di balik tombol "Filter" (angka = filter yang aktif)
    const hasFilters = (cfg.filters || []).length > 0;
    const filterN = h('span', { class: 'filter-n hidden' });
    const filterBtn = hasFilters ? h('button', { class: 'btn btn-ghost filter-toggle', type: 'button', 'aria-expanded': 'false',
      onclick: () => { const open = toolbar.classList.toggle('filters-open'); filterBtn.setAttribute('aria-expanded', String(open)); } }, icon('filter', 'sm'), 'Filter', filterN) : null;
    const toolbar = h('div', { class: `toolbar ${hasFilters ? 'has-filters' : ''}`.trim() }, h('div', { class: 'search' }, icon('search'), searchIn), filterBtn);
    (cfg.filters || []).forEach(f => {
      const sel = h('select', { class: 'select', 'aria-label': f.label });
      const fill = () => {
        const opts = (typeof f.options === 'function' ? f.options() : f.options).map(o => typeof o === 'object' ? o : { value: o, label: o });
        sel.innerHTML = ''; sel.appendChild(h('option', { value: '' }, f.all || `Semua ${f.label.toLowerCase()}`));
        opts.forEach(o => sel.appendChild(h('option', { value: o.value }, o.label)));
        sel.value = state.f[f.key] ?? '';
        if (sel.value !== String(state.f[f.key] ?? '')) state.f[f.key] = '';
      };
      fill(); f._fill = fill;
      sel.addEventListener('change', () => { state.f[f.key] = sel.value; pref.set(key, state.f); refresh(); });
      toolbar.appendChild(sel);
    });
    // Hapus filter: tampil hanya bila ada filter/kata kunci aktif
    const resetFilters = () => { state.f = {}; state.q = ''; searchIn.value = ''; pref.set(key, state.f); refresh(); searchIn.focus(); };
    const clearBtn = h('button', { class: 'btn btn-sm btn-ghost filter-clear hidden', type: 'button', onclick: resetFilters }, icon('x', 'sm'), 'Hapus filter');
    toolbar.append(clearBtn, countEl);
    searchIn.addEventListener('input', () => { state.q = searchIn.value; refresh(); });

    // editable: false → tabel baca-saja (tanpa tombol pensil/tempat sampah); klik baris tetap memakai onRowClick
    const rowActions = cfg.editable === false ? null : (r) => h('div', { class: 'row-actions' },
      ...(cfg.rowExtra ? cfg.rowExtra(r, ctx) : []),
      h('button', { class: 'btn btn-icon', type: 'button', title: 'Ubah', 'aria-label': 'Ubah', onclick: () => openForm(r) }, icon('edit', 'sm')),
      h('button', { class: 'btn btn-icon danger', type: 'button', title: 'Hapus', 'aria-label': 'Hapus', onclick: async () => { if (await confirmDialog(`Hapus ${cfg.noun || 'data'} ini?`)) removeRow(r); } }, icon('trash', 'sm')));

    const table = dataTable({
      // Satu cara CRUD: ubah/hapus hanya lewat tombol ikon di kanan. Klik baris hanya dipakai bila
      // modul memberi aksi lain (mis. membuka profil/detail), bukan membuka form ubah.
      columns: cfg.columns, rows: [], sort: cfg.sort, order: cfg.order, onRowClick: cfg.onRowClick ? (r) => cfg.onRowClick(r, ctx) : null, rowActions,
      pageSize: cfg.pageSize || 25, footer: cfg.footer, groupBy: cfg.groupBy, className: cfg.tableClass || '', pageBy: cfg.pageBy, pageGroups: cfg.pageGroups, pageRows: cfg.pageRows,
      emptyNode: emptyEl,
    });
    tableBox.appendChild(table.el);

    /* Tampilan kosong dua jenis: (1) memang belum ada data → ajakan tambah/impor;
       (2) data ada tetapi tersembunyi oleh filter/kata kunci → ajakan "Hapus filter",
       agar filter tersimpan dari sesi lalu tidak terbaca seperti data hilang. */
    function fillEmpty(filteredOut, nActive) {
      clear(emptyEl); emptyEl.classList.toggle('is-filtered', filteredOut);
      if (filteredOut) {
        const q = state.q.trim();
        emptyEl.append(icon('search'), h('h3', {}, 'Tidak ada data yang cocok'),
          h('p', {}, q ? (nActive ? `Tidak ada hasil untuk “${q}” dengan ${nActive} filter aktif.` : `Tidak ada hasil untuk “${q}”.`) : `${nActive} filter aktif menyembunyikan semua data.`),
          h('div', { class: 'empty-actions' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: resetFilters }, icon('x', 'sm'), 'Hapus filter')));
        return;
      }
      emptyEl.append(icon(cfg.emptyIcon || 'layers'), h('h3', {}, cfg.emptyTitle || 'Belum ada data'), h('p', {}, cfg.emptyText || 'Tambahkan data baru atau impor dari Excel/CSV.'),
        cfg.addable === false && cfg.importable === false ? null : h('div', { class: 'empty-actions' },
          cfg.addable === false ? null : h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openForm(null) }, icon('plus'), addLabel),
          cfg.importable === false ? null : h('button', { class: 'btn btn-ghost', type: 'button', onclick: openImport }, icon('upload'), 'Impor')));
    }

    function refresh() {
      (cfg.filters || []).forEach(f => f._fill && f._fill());
      const rows = filtered(); const allRows = all();
      countEl.textContent = `${rows.length} dari ${allRows.length} ${cfg.unit || 'baris'}`;
      const nActive = (cfg.filters || []).filter(f => state.f[f.key] !== undefined && state.f[f.key] !== '').length;
      filterN.textContent = String(nActive); filterN.classList.toggle('hidden', !nActive);
      const searching = !!state.q.trim();
      clearBtn.classList.toggle('hidden', !(nActive || searching));
      fillEmpty(!rows.length && allRows.length > 0 && (nActive > 0 || searching), nActive);
      clear(kpiBox); if (cfg.kpis) kpiBox.appendChild(kpiRow(cfg.kpis(rows, allRows)));
      clear(aboveBox); if (cfg.above) { const n = cfg.above(rows, allRows, ctx); if (n) aboveBox.appendChild(n); }
      table.update(rows);
    }

    root.append(head, kpiBox, aboveBox, h('div', { class: 'card' }, toolbar, tableBox));
    refresh();
    const unsub = store.subscribe(() => refresh());
    return { destroy: unsub, ctx };
  };
}

export function kpiRow(items) {
  return h('div', { class: 'kpis' }, items.filter(Boolean).map(k => h('div', { class: `kpi ${k.accent ? 'accent' : ''}` },
    h('div', { class: 'label' }, k.icon ? h('span', { class: 'kpi-ico' }, icon(k.icon)) : null, h('span', {}, tc(k.label))),
    h('div', { class: `value ${k.small ? 'small' : ''}` }, k.value),
    k.sub ? h('div', { class: 'sub' }, k.sub) : null,
    k.meter !== undefined ? h('div', { class: `meter ${k.meterTone || ''}`, role: 'meter', 'aria-valuenow': k.meter, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': k.label }, h('i', { style: { width: `${Math.max(0, Math.min(100, k.meter))}%` } })) : null,
  )));
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
