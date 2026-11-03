/* Dijalankan paling awal (bukan modul): pasang tema & bahasa sebelum halaman tampil
   agar tidak berkedip. Kunci tema sama dengan website IBM: ibm_theme. */
(function () {
  var root = document.documentElement;
  try {
    var t = localStorage.getItem('ibm_theme');
    if (!t) t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.setAttribute('data-theme', t);
    root.lang = localStorage.getItem('ibm_lang') === 'en' ? 'en' : 'id';
  } catch (e) { root.setAttribute('data-theme', 'light'); }
})();
