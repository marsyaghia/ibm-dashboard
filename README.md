# Dashboard IBM — Institut Asia Malang

Dashboard internal **Divisi International Business Management (IBM)**.

- Alamat: **https://dashboard.ibmasia.ac.id** (subdomain dari ibmasia.ac.id, hosting Jagoan Hosting).
- Database & login: **Supabase**, project *dashboard* (`vhecgwfuoapzdwvephhz`), terpisah dari project website.
- Hanya **2 superadmin** yang bisa masuk: Karolus Danar (`danar@asia.ac.id`) dan Admin IBM (`ibm@asia.ac.id`). Sapaan di beranda mengikuti akun yang login.
- Tampilan memakai design token website IBM: biru `#173671`, emas `#EBB213`, Plus Jakarta Sans + Inter. Ada mode terang dan gelap (kunci `ibm_theme`, sama dengan website).
- Bahasa Indonesia sebagai bahasa utama, dengan tombol **ID / EN** di kanan atas.
- Responsif untuk Windows, macOS, iOS, dan Android. Di HP, tabel otomatis berubah menjadi kartu, jadi tidak perlu geser ke samping. Popup input muncul di tengah layar.

Dibuat dengan HTML, CSS, dan JavaScript murni (ES modules), tanpa `npm install` dan tanpa proses build.

---

## 1. Menjalankan di VS Code

1. Buka folder `ibm-dashboard` di VS Code.
2. Pasang ekstensi **Live Server** (VS Code akan menawarkannya otomatis).
3. Klik kanan `index.html`, lalu pilih **Open with Live Server**.

Ada dua cara membuka dashboard:

| Alamat | Mode |
|---|---|
| `http://127.0.0.1:5500/` | **Supabase**: login superadmin, data asli |
| `http://127.0.0.1:5500/?demo=1` | **Demo**: tanpa login, berisi data contoh di browser. Cocok untuk mencoba fitur tanpa menyentuh data asli |

> Jangan buka `index.html` dengan klik dua kali (`file://`), karena browser memblokir ES modules dari `file://`.
>
> Agar login juga bisa dipakai di Live Server, tambahkan `http://127.0.0.1:5500/**` di Redirect URLs Supabase (lihat panduan Supabase).

---

## 2. Panduan lain

| Dokumen | Isi |
|---|---|
| [`docs/PANDUAN-SUPABASE.md`](docs/PANDUAN-SUPABASE.md) | Membuat akun superadmin, pengaturan Auth, impor CSV per menu, urutan impor, dan menambah atau mencabut akses |
| [`docs/PANDUAN-DEPLOY.md`](docs/PANDUAN-DEPLOY.md) | Membuat subdomain `dashboard.ibmasia.ac.id` di Jagoan Hosting, mengunggah file, SSL, dan `.htaccess` |
| [`CLAUDE.md`](CLAUDE.md) | Peta kode untuk revisi lewat ekstensi Claude di VS Code |

---

## 3. Menu

| Menu | Isi |
|---|---|
| **Beranda** | Sapaan sesuai akun yang login, jam dan tanggal real-time WIB (Malang), kalender bulanan berisi kegiatan akademik (UTS/UAS/libur) dengan agenda kelas per tanggal, **pengingat data yang belum lengkap** (lengkap dengan tombol ke menunya), dan rekap setiap menu |
| **Pengeluaran Divisi** | Transaksi beserta bukti. Tab **Laporan** merekap pengeluaran per kategori, per batch, dan per bulan, termasuk pembayaran Trent yang sudah lunas. Bisa diekspor ke Excel/CSV dan dicetak/PDF |
| **Perolehan Mahasiswa** | Satu baris per mahasiswa: **Batch, NIM, Nama, DU, DPP, UKT per semester** (format sheet "Biaya Batch 1 sd 4", bisa diimpor langsung). Tab **Rekapitulasi** berisi grafik dan tabel total per batch, serta ekspor Excel |
| **RPS & OBE** | Tab **Template RPS & OBE** menampilkan semua mata kuliah kurikulum beserta link draft/template RPS dan OBE masing-masing. Tab **Penilaian OBE** berisi daftar per periode dan batch (diambil dari jadwal). Tim IBM mengisi mata kuliah **Dosen External**, sedangkan dosen internal mengisi sendiri; statusnya tetap bisa dicatat |
| **Materi & PPT Dosen** | Link folder PPT, progres pertemuan, status, dan daftar dosen yang perlu ditagih |
| **Jadwal Kuliah** | Urutan tab: **Jadwal Full** (seluruh pertemuan satu semester, dikelompokkan per minggu), **Weekly** (grid jam × Senin–Sabtu dengan navigasi minggu dan tanda UTS/UAS/libur), **Daily** (kelas per tanggal dan absensi cepat Dosen External). Ada juga bagian kelas **tanpa hari/jam tetap**, tab **Slot jadwal**, dan tab **Kalender akademik** (format PDF akademik: Semester, Tahun Ajaran, Jenis Kegiatan, tanggal "… s.d. …") |
| **Absensi Dosen External** | Khusus kelas Dosen External. Berisi rekap kehadiran per kelas atau per dosen, **lembar absensi** (status, *dosen mengajar* dipilih dari dropdown Biodata Dosen, jam masuk–keluar, catatan), dan log absensi |
| **Trent Global College** | Pembayaran per batch per mata kuliah, matriks progres mahasiswa, dan silabus |
| **Immersion** | **Dipisah per batch** (pemilih batch di atas tab berlaku untuk semua tab). **Rekap**: tabungan terkumpul, pemasukan lain, pengeluaran realisasi, saldo, progres per mahasiswa, pengeluaran per kategori, dan perbandingan antarbatch. **Cicilan per mahasiswa**: matriks mahasiswa × cicilan ke-1, ke-2, … (format sheet "B2 - Cicilan"). **Log setoran** (cicilan ke-, tanggal, jumlah, bukti TF, verifikasi). **Kas & pengeluaran**: pengeluaran, pemasukan lain (dana fasilitator/sponsor), penukaran uang, status *Realisasi/Rencana*, vendor, pax, mata uang asing + kurs. **Target** per batch |
| **Data Magang** | **Dipisah per batch** (atau semua batch). **Penempatan**: perusahaan, posisi, kota, durasi, mulai–selesai, status (Proses/Diterima/Berjalan/Selesai/Dihentikan), pembimbing, dokumen. **Penilaian tempat magang**: rating bintang rata-rata per perusahaan, rata-rata per aspek, % rekomendasi, % jobdesk sesuai, % kompensasi sepadan, dan semua ulasan. **Respon penilaian**: jawaban form (tinjau / sembunyikan). **Link form (bit.ly)**: link form publik per batch, tempat menyimpan bit.ly, pesan pengumuman, dan daftar mahasiswa yang belum mengisi |
| **Sertifikat Mahasiswa** | Matriks per batch dan daftar sertifikat |
| **Biodata Mahasiswa** | Mengikuti Formulir Pendataan Mahasiswa. Bisa mencetak formulir yang sudah terisi maupun formulir kosong |
| **Biodata Dosen** | Dosen Internal dan Dosen External. Bisa diimpor dari Google Form Data Dosen |
| **Pengaturan** | **Umum** (profil divisi, penandatangan formulir, jumlah pertemuan, tarif & GST Trent), **Daftar pilihan** (kategori pengeluaran, metode bayar, jenis sertifikat, kategori kas immersion, bidang magang, ruang), **Batch**, **Kurikulum**, **Akun superadmin** (daftar akses dan ganti kata sandi), serta **Data & impor** (template CSV per tabel Supabase, unduh data CSV, cadangan JSON, semua data ke Excel) |

Semua tabel mendukung pencarian, filter, urut kolom, ekspor Excel/CSV, dan impor Excel/CSV. Saat impor, kolom dicocokkan otomatis: nama kolom Google Sheets maupun nama kolom database Supabase dikenali.

---

## 4. Struktur folder

```
ibm-dashboard/
├── index.html                  ← halaman utama
├── penilaian-magang.html       ← form publik penilaian magang (dibagikan lewat bit.ly, tanpa login)
├── .htaccess                   ← HTTPS, header keamanan, cache (untuk hosting)
├── assets/
│   ├── css/tokens.css          ← design token (sama dengan website)
│   ├── css/app.css             ← tata letak & komponen
│   ├── css/form-publik.css     ← tata letak form publik penilaian magang
│   ├── img/logo.svg
│   └── js/
│       ├── boot.js             ← pasang tema & bahasa sebelum halaman tampil
│       ├── app.js              ← kerangka, menu, login, router
│       ├── config.js           ← URL Supabase, alamat situs, nilai awal pengaturan
│       ├── schema.js           ← SKEMA DATABASE (satu sumber untuk tabel & CSV)
│       ├── store.js            ← akses data (Supabase / demo)
│       ├── i18n.js, i18n-en.js ← penerjemah ID → EN
│       ├── penilaian-form.js   ← logika form publik (memanggil fungsi aman Supabase)
│       ├── ui.js, form.js, table.js, crud.js, io.js, charts.js, jadwal-lib.js
│       ├── lib/sheet.js        ← baca/tulis Excel & CSV tanpa library
│       ├── data/               ← data awal (seed) & data contoh mode demo
│       └── modules/            ← satu file per menu
├── supabase/
│   ├── schema.sql              ← skema lengkap (sudah diterapkan ke project)
│   ├── sql/                    ← SQL tambahan (fungsi form publik penilaian magang)
│   ├── template-csv/           ← header CSV kosong per tabel, untuk impor
│   └── data-awal/              ← data hasil konversi Google Sheets (opsional diimpor)
├── tools/build-supabase.mjs    ← membuat ulang schema.sql & CSV dari schema.js
└── docs/                       ← panduan Supabase & deploy
```

Jika menambah atau mengubah kolom: ubah `assets/js/schema.js`, jalankan `node tools/build-supabase.mjs`, lalu terapkan perubahan kolom di Supabase (SQL Editor) dan tambahkan field-nya di formulir modul terkait.

---

## 5. Keamanan

- `config.js` hanya berisi **publishable key**, yang aman berada di frontend. Seluruh tabel dikunci Row Level Security: hanya email yang terdaftar di tabel `admin_pengguna` yang bisa membaca atau menulis.
- Form publik `penilaian-magang.html` **tidak membuka tabel** ke publik. Form hanya bisa memanggil dua fungsi Supabase: `magang_cek_nim` (mengecek NIM dan mengisi otomatis nama/perusahaan) dan `kirim_penilaian_magang` (menyimpan atau memperbarui penilaian milik NIM tersebut). Membaca hasil penilaian tetap hanya untuk superadmin.
- Berkas unggahan disimpan di bucket privat `dashboard-files` dan dibuka lewat link sementara (30 menit).
- Jangan pernah menyimpan kata sandi (misalnya SIMAKA) di dashboard. Kolom tersebut sengaja diabaikan saat impor data dosen.
- Cadangan JSON berisi data pribadi, jadi simpan di tempat aman dan jangan diunggah ke repositori publik.

---

## 6. Form penilaian magang lewat bit.ly

1. Buka **Data Magang → Link form (bit.ly)**, pilih batch, lalu klik **Salin** pada *Link panjang* (contoh: `https://dashboard.ibmasia.ac.id/penilaian-magang.html?batch=B2`).
2. Buka [bitly.com](https://bitly.com) → **Create new → Link**, tempel link panjang, isi *back-half* (misalnya `PenilaianMagangIBM-B2`), lalu buat.
3. Tempel hasil bit.ly ke kolom **Link bit.ly** dan klik **Simpan**. Link tersimpan di Supabase (tabel `pengaturan`, kunci `magang_form`) sehingga semua admin melihat link yang sama.
4. Klik **Salin pesan pengumuman** untuk dibagikan ke grup mahasiswa. Mahasiswa cukup memasukkan NIM; nama, perusahaan, posisi, dan durasi terisi otomatis dari tab Penempatan.
5. Jawaban masuk ke tab **Respon penilaian** dengan status *Baru*. Rekap per perusahaan muncul otomatis di tab **Penilaian tempat magang**. Mahasiswa yang mengirim ulang untuk perusahaan yang sama akan memperbarui jawabannya (tidak dobel).

Buat satu bit.ly per batch agar jawaban otomatis terpisah per batch.

