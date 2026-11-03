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

/** Terjemahkan satu string (untuk dipakai langsung di kode bila perlu) */
export function t(s) {
  if (current !== 'en' || s === null || s === undefined) return s;
  const str = String(s); const trimmed = str.trim(); if (!trimmed) return str;
  if (EN[trimmed] !== undefined) return str.replace(trimmed, EN[trimmed]);
  for (const [re, rep] of EN_PATTERNS) { if (re.test(trimmed)) return str.replace(trimmed, trimmed.replace(re, rep)); }
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
