/* =========================================================================
   GRAFIK — batang berkelompok (SVG) + batang horizontal (HTML).
   Warna dari token --chart-1 / --chart-2 (sudah divalidasi buta warna, terang & gelap).
   Setiap grafik punya legenda, tooltip saat hover, dan label nilai.
   ========================================================================= */
import { h, fmtIDRShort, fmtIDR } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

let tip;
function showTip(html, x, y) {
  if (!tip) { tip = h('div', { class: 'chart-tip', role: 'tooltip' }); document.body.appendChild(tip); }
  tip.innerHTML = html; tip.style.display = 'block';
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.min(window.innerWidth - r.width - 8, x + 14) + 'px';
  tip.style.top = Math.max(8, y - r.height - 10) + 'px';
}
const hideTip = () => { if (tip) tip.style.display = 'none'; };

/** Nilai sumbu yang "rapi" */
function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/**
 * groupedBars({ categories: ['Batch 1', ...], series: [{ name, cls: 'bar-1', color: 'var(--chart-1)', values: [] }], format })
 */
export function groupedBars({ categories, series, format = fmtIDRShort, formatFull = fmtIDR, height = 260, width = 640 }) {
  // lebar viewBox mengikuti layar agar teks sumbu tetap terbaca di HP
  const vw = window.innerWidth || 1200;
  const W = Math.round(Math.min(width, Math.max(400, vw - (vw > 900 ? 340 : 48)))), H = height, padL = 64, padR = 8, padT = 22, padB = 30;
  const max = niceMax(Math.max(0, ...series.flatMap(x => x.values)));
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Grafik batang: ' + series.map(x => x.name).join(' dan ') + ' per ' + categories.join(', ') });

  // grid + label sumbu Y
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i; const y = padT + plotH - (v / max) * plotH;
    svg.appendChild(s('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: 'grid-line' }));
    const t = s('text', { x: padL - 8, y: y + 4, 'text-anchor': 'end', class: 'axis-label' }); t.textContent = format(v); svg.appendChild(t);
  }
  const groupW = plotW / Math.max(1, categories.length);
  const barW = Math.min(34, (groupW * 0.62) / series.length);
  const gap = 2;
  categories.forEach((cat, ci) => {
    const gx = padL + groupW * ci + groupW / 2;
    const totalW = series.length * barW + (series.length - 1) * gap;
    const hit = s('rect', { x: padL + groupW * ci, y: padT, width: groupW, height: plotH, fill: 'transparent' });
    const bars = [];
    series.forEach((se, si) => {
      const v = se.values[ci] || 0; const bh = (v / max) * plotH;
      const x = gx - totalW / 2 + si * (barW + gap); const y = padT + plotH - bh;
      if (bh > 0) {
        const r = Math.min(4, barW / 2, bh);
        const d = `M${x},${y + bh} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${y + bh} Z`;
        const p = s('path', { d, class: `bar ${se.cls}` }); svg.appendChild(p); bars.push(p);
        if (categories.length <= 6) { const t = s('text', { x: x + barW / 2, y: y - 6, 'text-anchor': 'middle', class: 'val-label' }); t.textContent = format(v).replace('Rp ', ''); svg.appendChild(t); }
      }
    });
    const t = s('text', { x: gx, y: H - 10, 'text-anchor': 'middle', class: 'axis-label' }); t.textContent = cat; svg.appendChild(t);
    hit.addEventListener('mousemove', (e) => {
      bars.forEach(b => b.classList.add('active'));
      showTip(`<b>${cat}</b>` + series.map(se => `<div class="row"><span><i style="background:${se.color}"></i>${se.name}</span><span class="num">${formatFull(se.values[ci] || 0)}</span></div>`).join(''), e.clientX, e.clientY);
    });
    hit.addEventListener('mouseleave', () => { bars.forEach(b => b.classList.remove('active')); hideTip(); });
    svg.appendChild(hit);
  });
  svg.appendChild(s('line', { x1: padL, x2: W - padR, y1: padT + plotH, y2: padT + plotH, stroke: 'var(--line)' }));

  const legend = series.length > 1 ? h('div', { class: 'legend' }, series.map(se => h('span', {}, h('i', { style: { background: se.color } }), se.name))) : null;
  const box = h('div', { class: 'chart' }, legend); box.appendChild(svg);
  return box;
}

/** items: [{ label, value, display }] — batang horizontal sederhana */
export function hbars(items, { format = fmtIDR, color = 'var(--chart-1)', max: fixedMax } = {}) {
  const max = fixedMax || Math.max(1, ...items.map(i => i.value));
  return h('div', { class: 'hbars' }, items.map(i => h('div', { class: 'hbar' },
    h('span', { class: 'name', title: i.label }, i.label),
    h('span', { class: 'val' }, i.display ?? format(i.value)),
    h('span', { class: 'track' }, h('i', { style: { width: `${(i.value / max) * 100}%`, background: i.color || color } })),
  )));
}
