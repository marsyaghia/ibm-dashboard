/* Dijalankan paling awal (bukan modul): pasang tema & bahasa sebelum halaman tampil
   agar tidak berkedip. Kunci tema sama dengan website IBM: ibm_theme. */
(function () {
  var root = document.documentElement;
  try {
    var t = localStorage.getItem('ibm_theme');
    if (!t) t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.setAttribute('data-theme', t);
    // warna bilah browser HP mengikuti bilah atas dashboard (terang/gelap)
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'dark' ? '#0A1124' : '#FFFFFF');
    root.lang = localStorage.getItem('ibm_lang') === 'en' ? 'en' : 'id';
  } catch (e) { root.setAttribute('data-theme', 'light'); }
})();
