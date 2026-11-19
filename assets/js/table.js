/* =========================================================================
   DATA TABLE — lebar penuh, urut kolom, paginasi, baris bisa diklik.
   Di layar ≤ 960px setiap baris otomatis tampil sebagai kartu (CSS .tbl.stack),
   jadi tidak ada tabel yang perlu digeser ke samping.
   column: { key, label, render(row), value(row), align: 'right'|'center',
             sortable (default true), width, main (kolom judul kartu di HP), cls (kelas tambahan <td>) }
   ========================================================================= */
import { h, icon, clear } from './ui.js';

export function cellValue(col, row) { return col.value ? col.value(row) : row[col.key]; }

/**
 * order: pembanding urutan bawaan (mis. batch → nama). Bila ada, klik judul kolom
 * berputar: naik → turun → kembali ke urutan bawaan. groupBy hanya dipakai saat
 * tabel memakai urutan bawaan, agar baris kelompok tidak terpecah.
 *
 * Paginasi per kelompok (hanya saat urutan bawaan; bila kolom diurutkan → per pageSize baris):
 *   pageBy(row) → kunci halaman (mis. minggu / batch). Satu kunci tidak pernah terpecah ke dua halaman.
 *   pageGroups  → maksimal jumlah kunci per halaman (mis. 4 batch).
 *   pageRows    → batas lunak baris per halaman: kunci berikutnya pindah ke halaman baru bila melebihi.
 * page / onPage(p): halaman awal & pemberitahuan pindah halaman (agar tidak kembali ke halaman 1 saat render ulang).
 * rowClass(row) → kelas tambahan untuk <tr> (mis. 'is-today').
 */
export function dataTable({ columns, rows, onRowClick, rowActions, pageSize = 25, sort, order, footer, emptyNode, compact, groupBy, className = '', pageBy, pageGroups = Infinity, pageRows = Infinity, page = 0, onPage, rowClass }) {
  columns = columns.filter(Boolean);
  const state = { sort: sort || null, page };
  const isDefaultOrder = () => !state.sort || (sort && state.sort.key === sort.key && state.sort.dir === sort.dir);
  // Pindah halaman: bila awal tabel sudah tergulir lewat, gulir kembali ke awal tabel
  const goPage = (p) => {
    state.page = p; if (onPage) onPage(p); render();
    if (wrap.getBoundingClientRect().top < 0) wrap.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  /** Pecah baris menjadi halaman: per kelompok pageBy, atau per pageSize baris */
  function paginate(all) {
    if (!pageBy || !isDefaultOrder()) {
      if (pageSize === Infinity) return [all];
      const out = []; for (let i = 0; i < all.length; i += pageSize) out.push(all.slice(i, i + pageSize));
      return out.length ? out : [[]];
    }
    const groups = []; let last;
    all.forEach(r => { const k = pageBy(r); if (!groups.length || k !== last) { groups.push([]); last = k; } groups[groups.length - 1].push(r); });
    const out = []; let cur = [], n = 0;
    groups.forEach(g => {
      if (cur.length && (n >= pageGroups || cur.length + g.length > pageRows)) { out.push(cur); cur = []; n = 0; }
      cur = cur.concat(g); n++;
    });
    if (cur.length) out.push(cur);
    return out.length ? out : [[]];
  }
  const wrap = h('div', { class: 'dt' });
  const mainIdx = Math.max(0, columns.findIndex(c => c.main));

  function sorted() {
    const base = order ? [...rows].sort(order) : rows;
    if (!state.sort) return base;
    const col = columns.find(c => c.key === state.sort.key); if (!col) return base;
    const dir = state.sort.dir === 'desc' ? -1 : 1;
    return [...base].sort((a, b) => {
      const x = cellValue(col, a), y = cellValue(col, b);
      if (x === undefined || x === null || x === '') return 1; if (y === undefined || y === null || y === '') return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x).localeCompare(String(y), 'id', { numeric: true, sensitivity: 'base' }) * dir;
    });
  }

  function render() {
    clear(wrap);
    if (!rows.length) { wrap.appendChild(emptyNode || h('div', { class: 'empty' }, icon('layers'), h('h3', {}, 'Tidak ada data untuk ditampilkan'), h('p', {}, 'Ubah pilihan filter, atau tambahkan data baru.'))); return; }
    const all = sorted();
    const chunks = paginate(all);
    const pages = chunks.length;
    state.page = Math.max(0, Math.min(state.page, pages - 1));
    const slice = chunks[state.page];

    const thead = h('thead', {}, h('tr', {},
      columns.map(c => {
        const sortable = c.sortable !== false; const isSorted = state.sort && state.sort.key === c.key;
        const th = h('th', { class: [c.align || '', sortable ? 'sortable' : '', isSorted ? 'sorted' : ''].join(' '), scope: 'col', style: c.width ? { width: c.width } : null,
          'aria-sort': isSorted ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : null },
        c.label, sortable ? h('span', { class: 'arrow', 'aria-hidden': 'true' }, isSorted && state.sort.dir === 'desc' ? '▼' : '▲') : null);
        if (sortable) th.addEventListener('click', () => {
          if (!isSorted) state.sort = { key: c.key, dir: 'asc' };
          else if (state.sort.dir === 'asc') state.sort = { key: c.key, dir: 'desc' };
          else state.sort = order ? null : { key: c.key, dir: 'asc' };
          render();
        });
        return th;
      }),
      rowActions ? h('th', { class: 'actions-cell' }, h('span', { class: 'sr-only' }, 'Aksi')) : null));

    const tbody = h('tbody'); let lastGroup = null;
    const grouping = groupBy && isDefaultOrder();
    slice.forEach(r => {
      if (grouping) { const g = groupBy(r); if (g !== lastGroup) { tbody.appendChild(h('tr', { class: 'group-row' }, h('td', { colspan: columns.length + (rowActions ? 1 : 0) }, g))); lastGroup = g; } }
      // Mode kartu (HP/tablet): tombol ikon saja → pojok kanan atas kartu; tombol berteks tetap di baris bawah
      const acts = rowActions ? rowActions(r) : null;
      const nBtn = acts ? acts.querySelectorAll('.btn').length : 0;
      const iconOnly = nBtn > 0 && !acts.querySelector('.btn:not(.btn-icon)');
      const tr = h('tr', { class: [onRowClick ? 'clickable' : '', iconOnly ? 'icon-actions' : '', rowClass ? rowClass(r) || '' : ''].join(' ').trim() },
        columns.map((c, i) => {
          const v = c.render ? c.render(r) : cellValue(c, r);
          const empty = v === undefined || v === null || v === '';
          // is-empty: kolom kosong disembunyikan saat tampil sebagai kartu agar tidak penuh tanda "–"
          return h('td', { class: [c.align || '', i === mainIdx ? 'cell-main' : '', c.nowrap ? 'nowrap' : '', c.cls || '', empty && i !== mainIdx ? 'is-empty' : ''].join(' '), 'data-label': i === mainIdx ? '' : c.label },
            empty ? h('span', { class: 'muted' }, '–') : v);
        }),
        acts ? h('td', { class: 'actions-cell' }, acts) : null);
      if (iconOnly) tr.style.setProperty('--act-n', nBtn);
      if (onRowClick) {
        tr.tabIndex = 0;
        tr.addEventListener('click', (e) => { if (e.target.closest('button, a, input, select, label')) return; onRowClick(r); });
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === tr) onRowClick(r); });
      }
      tbody.appendChild(tr);
    });

    const table = h('table', { class: `tbl stack ${compact ? 'compact' : ''} ${className}` }, thead, tbody);
    if (footer) {
      const f = footer(all);
      if (f) table.appendChild(h('tfoot', {}, h('tr', {}, f.map((x, i) => h('td', { class: (columns[i] && columns[i].align) || '', 'data-label': x !== '' && i > 0 && columns[i] ? columns[i].label : '' }, x ?? '')), rowActions ? h('td') : null)));
    }
    wrap.appendChild(h('div', { class: 'table-wrap' }, table));

    if (pages > 1) {
      const from = chunks.slice(0, state.page).reduce((n, c) => n + c.length, 0) + 1, to = from + slice.length - 1;
      wrap.appendChild(h('div', { class: 'pager' },
        h('span', {}, `Menampilkan ${from}–${to} dari ${all.length}`),
        h('div', { class: 'btns' },
          h('button', { class: 'btn btn-ghost btn-sm', disabled: state.page === 0, onclick: () => goPage(state.page - 1) }, '‹ Sebelumnya'),
          h('span', {}, `${state.page + 1} / ${pages}`),
          h('button', { class: 'btn btn-ghost btn-sm', disabled: state.page >= pages - 1, onclick: () => goPage(state.page + 1) }, 'Berikutnya ›'))));
    }
  }
  render();
  return { el: wrap, update(newRows) { rows = newRows; render(); }, getSorted: sorted };
}

/* ---------- Tabel otomatis menjadi kartu bila tidak muat ---------- */
let fitQueued = false;
export function fitTables(root = document) {
  const small = window.innerWidth <= 960;
  root.querySelectorAll('.tbl.stack').forEach(t => {
    if (small) { t.classList.add('as-cards'); return; }
    const wrap = t.closest('.table-wrap') || t.parentElement;
    t.classList.remove('as-cards');
    if (wrap && wrap.scrollWidth > wrap.clientWidth + 1) t.classList.add('as-cards');
  });
}
export function queueFit() {
  if (fitQueued) return; fitQueued = true;
  requestAnimationFrame(() => { fitQueued = false; fitTables(); });
}
if (typeof window !== 'undefined') {
  window.addEventListener('resize', queueFit);
  new MutationObserver((muts) => { if (muts.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.matches('.tbl, .table-wrap, .dt') || n.querySelector && n.querySelector('.tbl.stack'))))) queueFit(); })
    .observe(document.documentElement, { childList: true, subtree: true });
}
if (typeof document !== 'undefined' && document.fonts) document.fonts.ready.then(() => queueFit());
