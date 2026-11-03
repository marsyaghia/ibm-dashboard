# Panduan Supabase — Dashboard IBM

Project: **dashboard** (`vhecgwfuoapzdwvephhz`).
Buka di https://supabase.com/dashboard/project/vhecgwfuoapzdwvephhz

## Yang sudah disiapkan

- **20 tabel**, satu tabel per menu (daftar lengkap ada di tabel di bawah). Semuanya dikunci **Row Level Security**: hanya email yang terdaftar di tabel `admin_pengguna` yang bisa membaca atau menulis.
- Tabel `admin_pengguna` berisi 2 superadmin:

  | email | nama | sapaan (tampil di beranda) |
  |---|---|---|
  | `ibm@asia.ac.id` | Admin IBM | Admin IBM |
  | `danar@asia.ac.id` | Karolus Danar Kurniawan | Pak Karolus |

- Bucket penyimpanan privat **`dashboard-files`** (maksimal 15 MB per berkas) untuk bukti transfer, sertifikat, berkas OBE, dan lainnya.
- Skema lengkap ada di `supabase/schema.sql`. Skema ini sudah diterapkan ke project, jadi tidak perlu dijalankan ulang.

---

## Langkah yang perlu dilakukan sendiri (sekali saja)

### 1. Buat akun login untuk Pak Karolus

Akun `ibm@asia.ac.id` sudah ada. Akun `danar@asia.ac.id` belum dibuat.

1. Buka **Authentication → Users → Add user → Create new user**.
2. Isi email `danar@asia.ac.id` dan kata sandi awal. Centang **Auto Confirm User**.
3. Berikan kata sandi awal itu langsung ke Pak Karolus. Setelah masuk, beliau bisa menggantinya di **Pengaturan → Akun superadmin → Ganti kata sandi**.

> Kata sandi tidak pernah melewati Claude atau kode dashboard. Buat dan bagikan sendiri.

### 2. Matikan pendaftaran publik

Buka **Authentication → Sign In / Providers**, lalu matikan **Allow new users to sign up**.

Walaupun RLS sudah menolak email yang tidak terdaftar, mematikan pendaftaran mencegah orang lain membuat akun sama sekali.

### 3. Atur URL situs (untuk tautan "Lupa kata sandi")

Buka **Authentication → URL Configuration**:

- **Site URL**: `https://dashboard.ibmasia.ac.id`
- **Redirect URLs**, tambahkan:
  - `https://dashboard.ibmasia.ac.id/**`
  - `http://127.0.0.1:5500/**` (untuk mencoba lewat Live Server di VS Code)

### 4. Perlindungan kata sandi bocor (disarankan)

Security Advisor menampilkan peringatan *Leaked Password Protection Disabled*. Fitur ini menolak kata sandi yang pernah bocor di internet (dicek ke HaveIBeenPwned).

Buka **Authentication → Attack Protection** (pada versi dashboard lama: **Providers → Email**), lalu aktifkan **Prevent use of leaked passwords**. Fitur ini hanya tersedia di paket Pro ke atas. Jika project masih paket Free, peringatan ini boleh diabaikan; cukup gunakan kata sandi yang panjang dan unik.

---

## Mengimpor data per menu (CSV)

Tidak perlu mengisi tabel satu per satu. Setiap menu punya tabel sendiri, dan cukup diimpor dari CSV.

**Cara 1 — lewat Supabase (Table Editor)**

1. Ambil template di `supabase/template-csv/<nama_tabel>.csv`, atau unduh dari dashboard di **Pengaturan → Data & impor → Template**.
2. Isi di Excel atau Google Sheets dengan baris pertama tetap berupa nama kolom. Kolom yang tidak dipakai boleh dibiarkan kosong.
3. Simpan sebagai **CSV (UTF-8)**.
4. Di Supabase buka **Table Editor → pilih tabel → Insert → Import data from CSV**, pilih berkasnya, lalu **Import data**.
5. Di dashboard, klik tombol **⟳ (Muat ulang data)** di kanan atas.

**Cara 2 — lewat dashboard**

Tombol **Impor** ada di setiap menu. Fitur ini menerima Excel atau CSV dengan judul kolom bebas (nama kolom Google Sheets lama juga dikenali), dan kolom bisa dicocokkan ulang sebelum disimpan.

### Aturan pengisian

| Jenis kolom | Cara mengisi |
|---|---|
| `id` | Kosongkan, karena dibuat otomatis. **Pengecualian:** tabel `batch` wajib diisi kode `B1`, `B2`, … dan tabel `pengaturan` |
| `batch_id` | Kode batch: `B1`, `B2`, `B3`, `B4`, … (lihat **Pengaturan → Batch**) |
| Tanggal | `YYYY-MM-DD`, misalnya `2026-10-28` |
| Angka/uang | Angka saja tanpa titik/Rp, misalnya `1750000` |
| Ya/Tidak (`obe`, `pernyataan`, `dtg_04`…) | `true` / `false` |
| `…_label` + `…_link` | Nama dokumen dan link Google Drive. Kolom `…_file` sengaja tidak ada di template (khusus berkas yang diunggah dari dashboard) |
| `student_id`, `nim`, `nama_mahasiswa` | Cukup isi **NIM** atau **nama mahasiswa**. Dashboard akan mencocokkannya otomatis dengan Biodata Mahasiswa |
| `course_id` | Boleh kosong bila `kode_mk` / `mata_kuliah` diisi |

### Urutan impor yang disarankan

| # | Tabel | Menu | Data awal siap impor (`supabase/data-awal/`) |
|---|---|---|---|
| 1 | `batch` | Pengaturan → Batch | ✔ 4 batch |
| 2 | `kurikulum` | Pengaturan → Kurikulum | ✔ 53 mata kuliah |
| 3 | `dosen` | Biodata Dosen | ✔ 36 dosen (tanpa data pribadi) |
| 4 | `mahasiswa` | Biodata Mahasiswa | ✔ 47 mahasiswa (nama + batch) |
| 5 | `kalender_akademik` | Jadwal Kuliah → Kalender akademik | ✔ 17 kegiatan (**perkiraan**, ganti dengan PDF resmi) |
| 6 | `jadwal_kuliah` | Jadwal Kuliah → Slot jadwal | ✔ 117 slot |
| 7 | `rps_obe_template` | RPS & OBE → Template | ✔ 53 baris (link perlu dilengkapi) |
| 8 | `penilaian_obe` | RPS & OBE → Penilaian OBE | — |
| 9 | `materi_ppt` | Materi & PPT | ✔ 98 materi |
| 10 | `trent_mata_kuliah` | Trent → Mata kuliah & silabus | ✔ 6 |
| 11 | `trent_pembayaran` | Trent → Pembayaran | ✔ 18 |
| 12 | `trent_progres_mahasiswa` | Trent → Progres mahasiswa | ✔ 47 |
| 13 | `pengeluaran` | Pengeluaran Divisi | — |
| 14 | `pemasukan` | Perolehan Mahasiswa | — |
| 15 | `sertifikat` | Sertifikat Mahasiswa | — |
| 16 | `immersion_target` | Immersion → Target per batch | — |
| 17 | `immersion_tabungan` | Immersion → Log setoran (kolom `cicilan_ke` = urutan cicilan) | — |
| 18 | `immersion_pengeluaran` | Immersion → Kas & pengeluaran (kolom `jenis`: Pengeluaran / Pemasukan lain / Penukaran uang; `status`: Realisasi / Rencana) | — |
| 18a | `magang` | Data Magang → Penempatan | — |
| 18b | `penilaian_magang` | Data Magang → Respon penilaian (biasanya masuk otomatis dari form publik) | — |
| 19 | `absensi_dosen` | Absensi Dosen External (biasanya diisi dari dashboard) | — |
| 20 | `pengaturan` | Pengaturan (diisi dari dashboard) | — |

Berkas di `supabase/data-awal/` adalah hasil konversi Google Sheets yang pernah dikirim, dan sudah memuat kolom `id` agar relasinya (misalnya `course_id` di jadwal) tetap cocok. Impor **batch → kurikulum → dosen → mahasiswa** dulu, baru tabel lainnya. Jika ingin memakai versi rapian sendiri, cukup pakai template kosong di `supabase/template-csv/`.

### Status data per 3 November 2026

Data dari Google Sheets/Drive yang dikirim sudah dimasukkan langsung ke Supabase (tidak perlu impor ulang): 65 mahasiswa, 42 dosen, 47 template RPS & OBE, 102 materi & PPT (termasuk 4 folder PPT Trent), 124 slot jadwal, 217 catatan absensi Dosen External, 116 sertifikat, 46 progres Trent, 16 setoran + 56 transaksi kas immersion (Batch 1 & 2), dan 32 data magang (Batch 1 & 2). Untuk data susulan, gunakan template CSV di `supabase/template-csv/` atau tombol **Impor** di menu terkait.

### Kalender akademik dari PDF

Salin tabel PDF akademik ke Google Sheets dengan kolom berikut:

| Semester | Tahun Ajaran | Jenis Kegiatan | Tanggal |
|---|---|---|---|
| Ganjil | 2026/2027 | Perkuliahan Semester Ganjil | 7 September 2026 s.d. 26 Desember 2026 |
| Ganjil | 2026/2027 | Ujian Tengah Semester (UTS) | 26 s.d. 31 Oktober 2026 |
| Ganjil | 2026/2027 | Libur Natal | 24 s.d. 26 Desember 2026 |

Impor lewat **Jadwal Kuliah → Kalender akademik → Impor**. Kolom tanggal "… s.d. …" otomatis dipecah menjadi `mulai` dan `selesai`, dan kategori (Perkuliahan/UTS/UAS/Libur) dikenali dari nama kegiatan.

Jika mengimpor langsung ke Supabase, pisahkan sendiri menjadi kolom `mulai` dan `selesai` dengan format `YYYY-MM-DD`.

---

## Menambah atau mencabut akses superadmin

Buka **SQL Editor** di Supabase.

```sql
-- tambah
insert into admin_pengguna (email, nama, sapaan) values ('nama@asia.ac.id', 'Nama Lengkap', 'Sapaan');
-- ubah sapaan
update admin_pengguna set sapaan = 'Pak Danar' where email = 'danar@asia.ac.id';
-- cabut
delete from admin_pengguna where email = 'nama@asia.ac.id';
```

Setelah menambah, buat juga akun loginnya di **Authentication → Users** (langkah 1 di atas).

## Cadangan

Supabase membuat cadangan database harian secara otomatis. Dari dashboard juga bisa mengunduh cadangan JSON atau semua data ke Excel di **Pengaturan → Data & impor**.
