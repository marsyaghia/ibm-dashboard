# Panduan Deploy — Jagoan Hosting (cPanel)

Target alamat: **https://dashboard.ibmasia.ac.id**

Dashboard ini berupa file statis (HTML, CSS, dan JS) tanpa proses build. Cukup unggah isi folder ke subdomain.

## 1. Buat subdomain

1. Masuk ke **Member Area Jagoan Hosting**, lalu buka **cPanel** untuk hosting `ibmasia.ac.id`.
2. Buka **Domains** (pada cPanel lama: **Subdomains**), lalu pilih **Create A New Domain**.
3. Isi domain dengan `dashboard.ibmasia.ac.id`.
4. Kosongkan centang *Share document root* (bila ada), lalu isi Document Root dengan `dashboard.ibmasia.ac.id` (atau `public_html/dashboard`, sesuai default cPanel).
5. Klik **Submit**.

> Jika DNS domain `ibmasia.ac.id` dikelola di luar Jagoan Hosting, tambahkan record **A** untuk `dashboard` yang mengarah ke IP server hosting (IP terlihat di cPanel → *Server Information*).

## 2. Unggah file

1. Buka **cPanel → File Manager**, lalu masuk ke folder document root subdomain tadi.
2. Unggah **isi** folder `ibm-dashboard`, bukan foldernya. Cara termudah: kompres menjadi `.zip`, unggah, klik kanan → **Extract**, lalu pindahkan isinya sehingga `index.html` berada langsung di document root.
3. Yang perlu diunggah: `index.html`, `.htaccess`, dan folder `assets/`.
4. Folder `supabase/`, `tools/`, `docs/`, `.vscode/`, serta file `README.md` dan `CLAUDE.md` **tidak perlu** diunggah (tidak berbahaya, tetapi tidak dipakai situs).

> File `.htaccess` diawali titik dan kadang tersembunyi. Di File Manager, buka **Settings → Show Hidden Files**.

## 3. SSL (HTTPS)

1. Buka **cPanel → SSL/TLS Status**.
2. Centang `dashboard.ibmasia.ac.id`, lalu klik **Run AutoSSL**. Tunggu beberapa menit.
3. `.htaccess` bawaan sudah memaksa semua akses lewat HTTPS.

## 4. Supabase

Pastikan **Site URL** dan **Redirect URLs** di Supabase sudah diisi `https://dashboard.ibmasia.ac.id` (lihat `docs/PANDUAN-SUPABASE.md`, langkah 3).

## 5. Uji

- Buka https://dashboard.ibmasia.ac.id. Halaman login harus muncul.
- Masuk dengan `ibm@asia.ac.id`. Sapaan "Selamat …, Admin IBM!" harus tampil.
- Untuk mencoba fitur tanpa mengubah data asli, buka https://dashboard.ibmasia.ac.id/?demo=1

## Memperbarui situs

Setelah revisi di VS Code, unggah ulang file yang berubah saja (biasanya di `assets/js/` atau `assets/css/`).

Agar browser langsung memakai versi baru, `.htaccess` mengatur file JS/CSS untuk selalu dicek ulang (`no-cache`). Jika tampilan belum berubah, tekan **Ctrl+F5** (atau **Cmd+Shift+R** di Mac).

## Catatan `.htaccess`

File `.htaccess` sudah berisi:

- pengalihan HTTP ke HTTPS;
- header keamanan (CSP yang hanya mengizinkan Supabase project ini, jsDelivr untuk library Supabase, dan Google Fonts);
- larangan situs dimuat di dalam iframe situs lain;
- kompresi dan cache gambar/font.

Jika suatu saat project Supabase diganti, ubah juga alamat `vhecgwfuoapzdwvephhz.supabase.co` di `.htaccess` dan `assets/js/config.js`.
