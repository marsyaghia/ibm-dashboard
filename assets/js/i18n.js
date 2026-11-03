/* =========================================================================
   BAHASA — Indonesia (utama) & English.
   Teks antarmuka ditulis dalam Bahasa Indonesia di kode. Saat bahasa Inggris
   dipilih, penerjemah otomatis mengganti teks/placeholder/title yang ada di
   kamus (i18n-en.js) — data yang diketik pengguna tidak ikut diterjemahkan.
   Menambah terjemahan: tambahkan pasangan 'Teks Indonesia': 'English text'
   di i18n-en.js.
   ========================================================================= */
import { EN, EN_PATTERNS, EN_PHRASES } from './i18n-en.js';

const KEY = 'ibm_lang';
let current = (() => { try { return localStorage.getItem(KEY) || 'id'; } catch (e) { return 'id'; } })();
export const lang = () => current;
export function setLang(l) {
  current = l === 'en' ? 'en' : 'id';
  try { localStorage.setItem(KEY, current); } catch (e) { /* abaikan */ }
  document.documentElement.lang = current;
}

/* Judul ditampilkan dalam Title Case (ui.js → tc), sedangkan kamus ditulis dengan huruf
   biasa. Karena itu pencarian juga dicoba tanpa membedakan huruf besar/kecil, lalu hasil
   terjemahannya ikut dijadikan Title Case. */
let EN_LC = null; let PAT_I = null;
const SMALL_EN = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'at', 'by', 'per', 'with', 'from', 'as', 'into', 'vs', 'via']);
function titleEN(s) {
  let first = true;
  return s.replace(/[^\s/()–—-]+/g, (w) => {
    const isFirst = first; first = false;
    if (w !== w.toLowerCase() || /\.|@|^\d|^[^\p{L}]*$/u.test(w)) return w;
    if (!isFirst && SMALL_EN.has(w.replace(/[^\p{L}]/gu, ''))) return w;
    return w.replace(/\p{L}/u, (c) => c.toUpperCase());
  });
}
const SMALL_ID = new Set(['dan', 'atau', 'di', 'ke', 'dari', 'untuk', 'yang', 'per', 'pada', 'dengan', 'dalam', 'oleh', 'serta', 'bagi', 'tentang', 'tanpa', 'terhadap', 'hingga', 'vs']);
const isTitled = (s) => { const ws = s.split(/[\s/]+/).filter(w => /\p{L}/u.test(w) && !/\./.test(w)); return ws.length > 1 && ws.every(w => !/^[^\p{L}]*\p{Ll}/u.test(w) || SMALL_ID.has(w.toLowerCase())); };

/** Terjemahkan satu string (untuk dipakai langsung di kode bila perlu) */
export function t(s) {
  if (current !== 'en' || s === null || s === undefined) return s;
  const str = String(s); const trimmed = str.trim(); if (!trimmed) return str;
  if (EN[trimmed] !== undefined) return str.replace(trimmed, EN[trimmed]);
  for (const [re, rep] of EN_PATTERNS) { if (re.test(trimmed)) return str.replace(trimmed, trimmed.replace(re, rep)); }
  // Tidak membedakan huruf besar/kecil (judul Title Case)
  if (!EN_LC) { EN_LC = new Map(Object.entries(EN).map(([k, v]) => [k.toLowerCase(), v])); PAT_I = EN_PATTERNS.map(([re, rep]) => [new RegExp(re.source, re.flags.includes('i') ? re.flags : re.flags + 'i'), rep]); }
  const lc = EN_LC.get(trimmed.toLowerCase());
  if (lc !== undefined) return str.replace(trimmed, isTitled(trimmed) ? titleEN(lc) : lc);
  for (const [re, rep] of PAT_I) { if (re.test(trimmed)) { const o = trimmed.replace(re, rep); return str.replace(trimmed, isTitled(trimmed) ? titleEN(o) : o); } }
  let out = trimmed;
  for (const [re, rep] of EN_PHRASES) out = out.replace(re, rep);
  return out === trimmed ? str : str.replace(trimmed, out);
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);
const ATTRS = ['placeholder', 'title', 'aria-label'];
function translateTree(root) {
  if (current !== 'en' || !root) return;
  if (root.nodeType === 3) { translateText(root); return; }
  if (root.nodeType !== 1 || SKIP.has(root.nodeName) || root.closest?.('[data-no-i18n]')) return;
  ATTRS.forEach(a => { if (root.hasAttribute && root.hasAttribute(a)) { const v = root.getAttribute(a); const n = t(v); if (n !== v) root.setAttribute(a, n); } });
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => n.nodeType === 1 ? (SKIP.has(n.nodeName) || n.hasAttribute('data-no-i18n') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : NodeFilter.FILTER_ACCEPT,
  });
  const texts = []; while (w.nextNode()) texts.push(w.currentNode);
  texts.forEach(translateText);
  root.querySelectorAll && root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
    if (el.closest('[data-no-i18n]')) return;
    ATTRS.forEach(a => { const v = el.getAttribute(a); if (v) { const n = t(v); if (n !== v) el.setAttribute(a, n); } });
  });
}
function translateText(node) {
  const v = node.nodeValue; if (!v || !v.trim()) return;
  if (node.parentElement && node.parentElement.closest('[data-no-i18n]')) return;
  const n = t(v); if (n !== v) node.nodeValue = n;
}

let observer = null;
/** Pasang penerjemah otomatis pada seluruh halaman */
export function startI18n() {
  document.documentElement.lang = current;
  if (observer) observer.disconnect();
  observer = new MutationObserver((muts) => {
    if (current !== 'en') return;
    for (const m of muts) {
      if (m.type === 'characterData') translateText(m.target);
      else if (m.type === 'attributes') { const v = m.target.getAttribute(m.attributeName); const n = t(v); if (n !== v) m.target.setAttribute(m.attributeName, n); }
      else m.addedNodes.forEach(translateTree);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  translateTree(document.body);
}
