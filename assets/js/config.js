/* =========================================================================
   KONFIGURASI DASHBOARD IBM
   -------------------------------------------------------------------------
   • Data disimpan di Supabase project "IBM's Dashboard".
   • URL & publishable key di bawah AMAN berada di kode frontend: data tetap
     terkunci oleh Row Level Security — hanya email di tabel admin_pengguna
     (superadmin) yang bisa membaca/menulis.
   • Mode demo (tanpa login, data contoh di browser): buka dashboard dengan
     akhiran  ?demo=1  — berguna untuk mencoba fitur tanpa mengubah data asli.
   ========================================================================= */
export const CONFIG = {
  supabase: {
    url: 'https://vhecgwfuoapzdwvephhz.supabase.co',
    key: 'sb_publishable_t6KaePTmiBYwI5wvbMZsEg_okAQirJf',
    bucket: 'dashboard-files',
    // Versi library dari CDN (jsDelivr). Untuk offline: simpan berkasnya di assets/vendor/supabase.min.js
    sdk: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
  },

  app: {
    name: 'Dashboard IBM',
    org: 'Institut Asia Malang',
    program: 'International Business Management',
    url: 'https://dashboard.ibmasia.ac.id',
    website: 'https://ibmasia.ac.id',
    timezone: 'Asia/Jakarta',        // WIB — Malang
    kota: 'Malang',
  },

  // Nilai awal pengaturan operasional (bisa diubah di menu Pengaturan; tersimpan di tabel "pengaturan")
  defaults: {
    profil: {
      nama_divisi: 'Divisi International Business Management (IBM)',
      koordinator: 'Karolus Danar Kurniawan, S.I.Kom., M.I.Kom.',
      rektor: 'Risa Santoso, B.A., M.Ed.',
      fakultas: 'Fakultas Ekonomi dan Bisnis',
      kota: 'Malang',
      email: 'ibm@asia.ac.id',
      telepon: '',
    },
    daftar: {
      kategori_pengeluaran: ['Honor Dosen & Praktisi', 'Pembayaran Trent Global College', 'Kegiatan & Event', 'Immersion / Kunjungan Industri', 'Sertifikasi & Pelatihan', 'Promosi & Marketing', 'Konsumsi & Rapat', 'Transportasi & Akomodasi', 'ATK & Perlengkapan', 'Langganan & Software', 'Lain-lain'],
      metode_bayar: ['Transfer Bank', 'Virtual Account', 'Tunai', 'QRIS / E-wallet', 'Lainnya'],
      jenis_sertifikat: ['Trent Global College', 'English Score Test', 'Altissia English Course', 'Public Speaking (Carabicara)', 'Immersion Study', 'Magang / Internship', 'Club / Workshop IBM', 'Personal Development', 'Event Production', 'Expo / Pameran', 'Kompetisi / Lomba', 'Lainnya'],
      kategori_immersion: ['Tiket Pesawat', 'Akomodasi', 'Visa & Dokumen', 'Asuransi', 'Transportasi Lokal', 'Konsumsi', 'Kunjungan Industri / Kampus', 'Perlengkapan', 'Penukaran Uang', 'Pengembalian Dana', 'Dana Mahasiswa', 'Dana Fasilitator', 'Sponsor', 'Lainnya'],
      bidang_magang: ['Marketing & Sales', 'Content & Digital Marketing', 'Hospitality (Hotel & Resort)', 'Food & Beverage', 'Operasional', 'Administrasi & Keuangan', 'HR & GA', 'IT & Data', 'Lainnya'],
      ruang: ['202', 'EXE', 'Lounge', 'LAB'],
    },
    // Link form penilaian magang per batch (bit.ly dibuat manual oleh tim IBM, disimpan di sini)
    magang_form: {},
    akademik: {
      target_pertemuan: 16, minggu_uts: 8, minggu_uas: 16,
      tarif_trent_sgd: 50, gst_trent: 9,
    },
  },
};
