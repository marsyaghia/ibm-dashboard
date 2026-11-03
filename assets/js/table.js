/* =========================================================================
   DATA TABLE — lebar penuh, urut kolom, paginasi, baris bisa diklik.
   Di layar ≤ 960px setiap baris otomatis tampil sebagai kartu (CSS .tbl.stack),
   jadi tidak ada tabel yang perlu digeser ke samping.
   column: { key, label, render(row), value(row), align: 'right'|'center',
             sortable (default true), width, main (kolom judul kartu di HP) }
   ========================================================================= */
import { h, icon, clear } from './ui.js';

export function cellValue(col, row) { return col.value ? col.value(row) : row[col.key]; }

export function dataTable({ columns, rows, onRowClick, rowActions, pageSize = 25, sort, footer, emptyNode, compact, groupBy, className = '' }) {
  const state = { sort: sort || null, page: 0 };
  const wrap = h('div', { class: 'dt' });
  const mainIdx = Math.max(0, columns.findIndex(c => c.main));

  function sorted() {
    if (!state.sort) return rows;
    const col = columns.find(c => c.key === state.sort.key); if (!col) return rows;
    const dir = state.sort.dir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const x = cellValue(col, a), y = cellValue(col, b);
      if (x === undefined || x === null || x === '') return 1; if (y === undefined || y === null || y === '') return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x).localeCompare(String(y), 'id', { numeric: true, sensitivity: 'base' }) * dir;
    });
  }

  function render() {
    clear(wrap);
    if (!rows.length) { wrap.appendChild(emptyNode || h('div', { class: 'empty' }, icon('layers'), h('h3', {}, 'Belum ada data'), h('p', {}, 'Data yang cocok dengan filter tidak ditemukan.'))); return; }
    const all = sorted();
    const pages = Math.max(1, Math.ceil(all.length / pageSize));
    state.page = Math.min(state.page, pages - 1);
    const slice = pageSize === Infinity ? all : all.slice(state.page * pageSize, (state.page + 1) * pageSize);

    const thead = h('thead', {}, h('tr', {},
      columns.map(c => {
        const sortable = c.sortable !== false; const isSorted = state.sort && state.sort.key === c.key;
        const th = h('th', { class: [c.align || '', sortable ? 'sortable' : '', isSorted ? 'sorted' : ''].join(' '), scope: 'col', style: c.width ? { width: c.width } : null,
          'aria-sort': isSorted ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : null },
        c.label, sortable ? h('span', { class: 'arrow', 'aria-hidden': 'true' }, isSorted && state.sort.dir === 'desc' ? '▼' : '▲') : null);
        if (sortable) th.addEventListener('click', () => { state.sort = isSorted ? { key: c.key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' }; render(); });
        return th;
      }),
      rowActions ? h('th', { class: 'actions-cell' }, h('span', { class: 'sr-only' }, 'Aksi')) : null));

    const tbody = h('tbody'); let lastGroup = null;
    slice.forEach(r => {
      if (groupBy) { const g = groupBy(r); if (g !== lastGroup) { tbody.appendChild(h('tr', { class: 'group-row' }, h('td', { colspan: columns.length + (rowActions ? 1 : 0) }, g))); lastGroup = g; } }
      const tr = h('tr', { class: onRowClick ? 'clickable' : '' },
        columns.map((c, i) => {
          const v = c.render ? c.render(r) : cellValue(c, r);
          return h('td', { class: [c.align || '', i === mainIdx ? 'cell-main' : '', c.nowrap ? 'nowrap' : ''].join(' '), 'data-label': i === mainIdx ? '' : c.label },
            v === undefined || v === null || v === '' ? h('span', { class: 'muted' }, '–') : v);
        }),
        rowActions ? h('td', { class: 'actions-cell' }, rowActions(r)) : null);
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
      const from = state.page * pageSize + 1, to = Math.min(all.length, (state.page + 1) * pageSize);
      wrap.appendChild(h('div', { class: 'pager' },
        h('span', {}, `Menampilkan ${from}–${to} dari ${all.length}`),
        h('div', { class: 'btns' },
          h('button', { class: 'btn btn-ghost btn-sm', disabled: state.page === 0, onclick: () => { state.page--; render(); } }, '‹ Sebelumnya'),
          h('span', {}, `${state.page + 1} / ${pages}`),
          h('button', { class: 'btn btn-ghost btn-sm', disabled: state.page >= pages - 1, onclick: () => { state.page++; render(); } }, 'Berikutnya ›'))));
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
