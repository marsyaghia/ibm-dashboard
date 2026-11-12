# CLAUDE.md — Peta kode Dashboard IBM

Panduan singkat untuk revisi lewat ekstensi Claude di VS Code.

## Prinsip

- Vanilla HTML/CSS/JS (ES modules), **tanpa build, tanpa npm**. Jangan menambah framework.
- Bahasa antarmuka utama: **Indonesia**. Setiap teks UI baru perlu terjemahannya ditambahkan di `assets/js/i18n-en.js`:
  - teks tetap → objek `EN`;
  - teks dengan angka/nama → `EN_PATTERNS`.
- Warna hanya dari token di `assets/css/tokens.css`. Mode gelap ditulis di blok `:root[data-theme="dark"]`. Kunci localStorage: `ibm_theme` (tema) dan `ibm_lang` (bahasa).
- Tabel harus memakai `dataTable()` (`assets/js/table.js`). Di layar ≤ 960px tabel otomatis menjadi kartu, jadi tidak ada geser ke samping. Tandai kolom judul kartu dengan `main: true`.
- Urutan bawaan tabel memakai `order` (pembanding), bukan `sort`: data ber-batch → `chain(byBatch(), byText(r => r.nama))` (Batch 1 dulu, lalu abjad). Log/transaksi boleh `sort: { key: 'tanggal', dir: 'desc' }` (terbaru dulu). `groupBy` hanya tampil saat urutan bawaan.
- Popup: `openDrawer` (formulir, lebar sedang) dan `openModal` (`size: 'sm'|'md'|'lg'`, atau `wide: true`). Keduanya tampil di tengah layar.
- Menu bertab memakai `tabPage(root, items, { eyebrow, title, key, def, actions })` dari `ui.js`: judul menu → (pemilih) → tab → isi tab. Judul isi tab otomatis tampil sebagai judul bagian.
- Pemilih batch/periode selalu `batchSelect()` / `picker(label, selectEl(...))` agar seragam. Batch bawaan = `firstBatch()` (Batch 1).
- Huruf judul & tombol: `h1`–`h3` dan teks tombol berkelas `.btn` otomatis Title Case (`tc()` di `ui.js`, aturan PUEBI: kata tugas tetap kecil). Tulis teks sumber dengan huruf biasa; kamus EN tetap cocok karena pencarian tidak membedakan besar/kecil. Nama orang/data di judul: tambahkan atribut `'data-raw': ''`.
- Subtitle judul halaman/tab (`<p>` di blok judul `.page-head`) otomatis dipindah menjadi baris selebar halaman di bawah judul + tombol (`widenPageDesc()` di `ui.js`, CSS `.has-desc`/`.page-desc`). Cukup tulis `h('p', …)` seperti biasa.
- Baris pembatas grup tabel (`groupBy`, mis. "Semester 1") memakai token `--group-bg`.
- Satu cara CRUD: ubah/hapus hanya lewat tombol ikon di kanan (ikon + = isi baru, pensil = ubah, tempat sampah = hapus). `crudView` tidak lagi membuka form saat baris diklik; `onRowClick` hanya untuk aksi lain seperti membuka profil/detail (Mahasiswa, Dosen, respon Magang) atau navigasi.
- Ukuran huruf & tinggi kontrol dari token (`--fs-*`, `--ctl-h`) di `tokens.css`.
- Foto profil: field `type: 'photo'` (`form.js`), tampil dengan `avatar(nama, foto)` (`ui.js`; mendukung link Google Drive & unggahan).
- Waktu selalu WIB (`nowWIB()`, `today()` di `ui.js`).
- Bilah atas (`shell()` di `app.js`): sakelar bahasa ID/EN → sakelar tema (`themeSwitch()`, bentuk sama dengan sakelar bahasa) → muat ulang → akun & keluar. Tidak ada jam di bilah atas (jam ada di Dashboard).
- Footer hak cipta (`footer()` di `app.js`, kelas `.app-footer`) tampil di bawah setiap halaman, warnanya mengikuti sidebar (`--side-bg`), tanpa garis aksen.
- Tampilan per perangkat (`app.css` bagian 15):
  - desktop (> 1024px): sidebar penuh;
  - tablet (641–1024px): sidebar menjadi rel ikon dengan label pendek (`short` di `NAV`, `app.js`); KPI jadi satu kartu 2 kolom; tabel-kartu 3 kolom;
  - HP (≤ 640px): navigasi bawah (`QUICK` di `app.js` = 4 menu + tombol Menu), bilah atas hanya judul + menu avatar (bahasa, tema, muat ulang, keluar), KPI jadi satu kartu berpetak, filter `crudView` dilipat di balik tombol "Filter".
  - Tabel-kartu: tombol ikon saja pindah ke pojok kanan atas; kolom kosong (`is-empty`) disembunyikan.

## Alur data

- `schema.js` adalah **satu-satunya sumber** struktur tabel Supabase. Kunci koleksi di aplikasi (misalnya `expenses`) dipetakan ke nama tabel (`pengeluaran`). Tipe `att` menjadi 3 kolom: `_label`, `_link`, `_file`.
- `store.js` adalah satu-satunya pintu data: `store.all(col)`, `store.save(col, rec)`, `store.remove(col, id)`, `store.setting(key)`, `store.list(nama)`. Mode demo aktif lewat `?demo=1`.
- Saat menambah kolom:
  1. tambah di `schema.js`;
  2. jalankan `node tools/build-supabase.mjs`;
  3. jalankan `alter table … add column …` di Supabase SQL Editor;
  4. tambahkan field di `sections` modul terkait.
- Daftar dropdown operasional (kategori, metode, ruang, …) diambil dari `store.list('…')`. Nilai awalnya ada di `config.js → defaults.daftar`, dan bisa diubah di menu Pengaturan.

## Modul (`assets/js/modules/`)

| File | Menu |
|---|---|
| `beranda.js` | Dashboard (dulu Beranda): sapaan + kalimat semester otomatis (`periodeLine()`) + keterangan isi halaman (satu baris di layar ≥ 1280px), jam WIB, kalender + jadwal harian dengan "Pertemuan ke-…" (kolom lebar), pengingat 5 teratas + "Tampilkan lainnya" (kolom kecil), rekap menu. Kalender: latar `--brand-50` = masa perkuliahan; titik merah UTS/UAS, hijau libur (termasuk Sabtu/Minggu tanpa jadwal dalam semester), biru = ada kelas (`calendarMarks()`); tanpa tooltip kegiatan |
| `pengeluaran.js` | Pengeluaran + Laporan |
| `pemasukan.js` | Perolehan Mahasiswa + Rekapitulasi (grafik) |
| `rps.js` | Template RPS & OBE, Penilaian OBE |
| `materi.js` | Materi & PPT |
| `jadwal.js` | Jadwal Full / Weekly / Daily / List Jadwal (id tab `slot`) / Kalender akademik (logika tanggal di `jadwal-lib.js`) |
| `absensi.js` | Absensi Dosen Eksternal: Lembar absensi (selalu dibuka pertama) / Log / Rekap |
| `trent.js` | Trent Global College |
| `immersion.js` | Immersion per batch: rekap, matriks cicilan, log setoran, kas & pengeluaran (valas, rencana/realisasi), target |
| `magang.js` | Data Magang per batch: penempatan, penilaian per perusahaan, respon form, link form/bit.ly |
| `sertifikat.js`, `mahasiswa.js`, `dosen.js` | Data mahasiswa & dosen (klik nama → popup profil; mahasiswa punya kolom `foto`, migrasi di `supabase/sql/migrasi-foto-mahasiswa.sql`) |
| `pengaturan.js` | Pengaturan |

Sebagian besar menu daftar memakai `crudView(cfg)` dari `crud.js`, sehingga cukup mengubah konfigurasinya: `sections` (formulir), `columns`, `filters`, `kpis`, `aliases` (nama kolom impor).

## Form publik penilaian magang

- `penilaian-magang.html` + `assets/js/penilaian-form.js` + `assets/css/form-publik.css`, tanpa login. Parameter `?batch=B2`; `?demo=1` untuk simulasi tanpa Supabase.
- Hanya memanggil RPC `magang_cek_nim(p_nim)` dan `kirim_penilaian_magang(p jsonb)` (SQL di `supabase/sql/form-penilaian-magang.sql`, ikut digabung ke `schema.sql`). Bila menambah kolom penilaian, ubah juga kedua fungsi ini.
- Field bintang di dashboard: `type: 'rating'` di `form.js`; tampilan baca-saja: `stars()` di `modules/magang.js`.

## Uji cepat

Buka `index.html?demo=1` lewat Live Server. Lalu cek:

- mode terang/gelap;
- ID/EN;
- lebar layar 390px, yaitu ukuran HP (tidak boleh ada geser horizontal di halaman);
- lebar layar 820px, yaitu ukuran tablet.
