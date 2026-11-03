/* =========================================================================
   SKEMA DATABASE — satu sumber kebenaran untuk:
   • tabel & kolom di Supabase (supabase/schema.sql dibuat dari file ini)
   • template CSV untuk impor per menu (supabase/template-csv/)
   • pemetaan data aplikasi ⇄ baris tabel (store.js)

   Tipe kolom:
     text · int · num · date · bool · json
     list  → di aplikasi berupa array, di database teks dipisah koma ("CV, Transkrip Nilai")
     att   → lampiran; di database menjadi 3 kolom: <nama>_label, <nama>_link, <nama>_file (json)
   Setiap tabel otomatis punya: id (text, otomatis bila kosong), created_at, updated_at, updated_by.
   ========================================================================= */

const T = (table, menu, desc, cols) => ({ table, menu, desc, cols: cols.map(c => (Array.isArray(c) ? { name: c[0], type: c[1] || 'text', note: c[2] || '' } : c)) });

export const SCHEMA = {
  batches: T('batch', 'Master Data', 'Daftar angkatan. Isi kolom id dengan kode singkat: B1, B2, B3, …', [
    ['nama', 'text', 'Batch 1'], ['angkatan', 'int', '2023'], ['periode', 'text', '2023 – 2027'], ['status', 'text', 'Aktif / Lulus / Belum mulai'], ['catatan'],
  ]),
  courses: T('kurikulum', 'Master Data', 'Kurikulum / CSPP: satu baris per mata kuliah.', [
    ['semester', 'int', '1–8'], ['kode', 'text', 'MJF231002'], ['nama_en', 'text', 'Micro Economy'], ['nama_id', 'text', 'Ekonomi Mikro'], ['sks', 'int'],
    ['rumpun', 'text', 'MKD/MKF/MKI/MKP/MKPil/MKL/MKK/IBM Activity'], ['jenis_pengampu', 'text', 'Dosen Internal / Dosen External / Ikut Fakultas'],
    ['pengampu'], ['mitra'], ['mode', 'text', 'Onsite / Hybrid / Online / Konversi Magang / Immersion'], ['trent_code', 'text', 'DTG-04, ITH-01 … (kosong bila bukan Trent)'], ['obe', 'bool', 'true / false'],
  ]),
  expenses: T('pengeluaran', 'Pengeluaran Divisi', 'Transaksi pengeluaran divisi IBM.', [
    ['tanggal', 'date', 'YYYY-MM-DD'], ['kategori'], ['uraian'], ['jumlah', 'num', 'angka tanpa titik, mis. 1750000'], ['status', 'text', 'Lunas / Menunggu Pembayaran / Diajukan (Reimburse) / Dibatalkan'],
    ['penerima'], ['metode'], ['batch_id', 'text', 'B1, B2 … (kosong = umum)'], ['no_bukti'], ['bukti', 'att'], ['catatan'],
  ]),
  incomes: T('pemasukan', 'Perolehan Mahasiswa', 'Biaya per mahasiswa: DU, DPP, dan UKT per semester.', [
    ['batch_id', 'text', 'B1, B2 …'], ['nim'], ['nama_mahasiswa'],
    ['du', 'num', 'DU / Daftar Ulang (Rp), angka tanpa titik'], ['dpp', 'num', 'DPP (Rp), angka tanpa titik'], ['ukt_per_semester', 'num', 'UKT per semester (Rp), angka tanpa titik'],
  ]),
  rpsTemplates: T('rps_obe_template', 'RPS & OBE', 'Draft/template RPS dan OBE untuk setiap mata kuliah.', [
    ['course_id', 'text', 'id kurikulum (opsional bila kode_mk/mata_kuliah diisi)'], ['kode_mk'], ['mata_kuliah'], ['semester', 'int'], ['versi', 'text', 'mis. OBE 2024'],
    ['dosen_penyusun'], ['template_rps', 'att'], ['template_obe', 'att'], ['status', 'text', 'Draft / Revisi / Final'], ['catatan'],
  ]),
  obeAssessments: T('penilaian_obe', 'RPS & OBE', 'Penilaian OBE per mata kuliah, batch, dan periode (wajib diisi tim untuk Dosen External).', [
    ['periode', 'text', 'Ganjil 2026/2027'], ['batch_id'], ['course_id'], ['kode_mk'], ['mata_kuliah'], ['semester', 'int'], ['dosen'],
    ['jenis_dosen', 'text', 'Dosen External / Dosen Internal'], ['berkas', 'att'], ['status', 'text', 'Belum / Proses / Selesai'], ['tanggal_selesai', 'date'], ['catatan'],
  ]),
  materials: T('materi_ppt', 'Materi & PPT Dosen', 'Link materi/PPT tiap mata kuliah.', [
    ['mata_kuliah'], ['dosen'], ['prodi', 'text', 'IBM / Manajemen / Akuntansi / Lainnya'], ['periode', 'text', 'Ganjil 2025/2026'], ['batch_id'], ['materi', 'att'],
    ['pertemuan_tersedia', 'int'], ['target_pertemuan', 'int'], ['status', 'text', 'Lengkap / Belum Lengkap'], ['cakupan', 'text', 'Pertemuan 1-14'], ['gclassroom'], ['catatan'],
  ]),
  calendar: T('kalender_akademik', 'Jadwal Kuliah', 'Kalender akademik dari bagian akademik (sesuai PDF).', [
    ['semester', 'text', 'Ganjil / Genap'], ['tahun_ajaran', 'text', '2026/2027'], ['kegiatan', 'text', 'mis. Perkuliahan, UTS, UAS, Libur Natal'],
    ['mulai', 'date', 'YYYY-MM-DD'], ['selesai', 'date', 'YYYY-MM-DD'], ['kategori', 'text', 'Perkuliahan / UTS / UAS / Libur / Lainnya (kosong = dideteksi otomatis)'], ['catatan'],
  ]),
  schedules: T('jadwal_kuliah', 'Jadwal Kuliah', 'Slot kuliah mingguan per batch per periode.', [
    ['periode', 'text', 'Ganjil 2026/2027'], ['batch_id'], ['semester', 'int'], ['tipe', 'text', 'Kuliah / Trent / IBM Activity'], ['course_id'], ['kode'], ['mata_kuliah'], ['nama_id'],
    ['dosen'], ['jenis_dosen', 'text', 'Dosen External / Dosen Internal / Ikut Fakultas (kosong = otomatis)'], ['hari', 'text', 'Senin … Sabtu (kosong = tanpa hari tetap)'],
    ['jam_mulai', 'text', '09:30'], ['jam_selesai', 'text', '12:00'], ['ruang'], ['sks', 'int'], ['mode'], ['jumlah_pertemuan', 'int', '16'], ['status', 'text', 'Confirmed / TBC'], ['classroom'], ['catatan'],
  ]),
  attendance: T('absensi_dosen', 'Absensi Dosen', 'Absensi Dosen External per pertemuan (diisi tim IBM).', [
    ['schedule_id'], ['periode'], ['batch_id'], ['mata_kuliah'], ['pertemuan', 'int'], ['jenis', 'text', 'Kuliah / UTS / UAS'], ['tanggal', 'date'],
    ['status', 'text', 'Hadir / Terlambat / Online (daring) / Diganti dosen lain / Tugas mandiri / Tidak hadir / Dijadwal ulang / Libur'],
    ['dosen_jadwal'], ['dosen_hadir'], ['jam_masuk'], ['jam_keluar'], ['catatan'], ['dicatat_oleh'],
  ]),
  trentSubjects: T('trent_mata_kuliah', 'Trent Global College', 'Mata kuliah Trent & silabus (satu pertemuan per baris).', [
    ['kode', 'text', 'DTG-04'], ['asia_code'], ['nama'], ['semester', 'int'], ['link_mdd'], ['link_rps'], ['silabus'],
  ]),
  trentPayments: T('trent_pembayaran', 'Trent Global College', 'Tagihan & pembayaran Trent per batch per mata kuliah.', [
    ['batch_id'], ['trent_code'], ['asia_code'], ['subjek'], ['semester', 'int'], ['progres', 'text', 'Upcoming / On Progress / Done'], ['jumlah_mahasiswa', 'int'], ['mahasiswa_aktif', 'int'],
    ['tuition_sgd', 'num'], ['total_sgd', 'num'], ['gst_sgd', 'num'], ['kurs', 'num'], ['total_idr', 'num'], ['status_bayar', 'text', 'Lunas / Belum Dibayar / Belum Ditagih'],
    ['tanggal_bayar', 'date'], ['invoice_no'], ['bukti', 'att'], ['marksheet', 'att'], ['marksheet_status'], ['catatan'],
  ]),
  trentEnrollments: T('trent_progres_mahasiswa', 'Trent Global College', 'Centang mata kuliah Trent yang sudah diselesaikan tiap mahasiswa.', [
    ['student_id'], ['nim'], ['nama_mahasiswa'], ['batch_id'],
    ['dtg_04', 'bool'], ['dtg_03', 'bool'], ['ith_01', 'bool'], ['ith_02', 'bool'], ['ith_03', 'bool'], ['ith_04', 'bool'],
    ['remarks'], ['status_bayar'], ['tanggal_bayar'], ['bukti_nama'],
  ]),
  certificates: T('sertifikat', 'Sertifikat Mahasiswa', 'Sertifikat tiap mahasiswa per batch.', [
    ['batch_id'], ['student_id'], ['nim'], ['nama_mahasiswa'], ['jenis'], ['nama_sertifikat'], ['penerbit'], ['nomor'], ['tanggal_terbit', 'date'], ['berlaku_sampai', 'date'],
    ['skor'], ['status', 'text', 'Sudah Terbit / Proses / Belum'], ['berkas', 'att'], ['catatan'],
  ]),
  students: T('mahasiswa', 'Biodata Mahasiswa', 'Biodata sesuai Formulir Pendataan Mahasiswa IBM.', [
    ['nama'], ['nim'], ['nik'], ['tempat_lahir'], ['tanggal_lahir', 'date'], ['jk', 'text', 'L / P'], ['agama'], ['kewarganegaraan'], ['telp'], ['email'], ['alamat_ktp'], ['kota'], ['kode_pos'],
    ['nama_ayah'], ['nama_ibu'], ['telp_ayah'], ['telp_ibu'], ['pekerjaan_ayah'], ['pekerjaan_ibu'], ['penghasilan_ayah'], ['penghasilan_ibu'], ['wali_nama'], ['wali_telp'], ['wali_hubungan'],
    ['prodi'], ['fakultas'], ['batch_id'], ['angkatan', 'int'], ['status_mhs', 'text', 'Mahasiswa Aktif / Cuti / Lulus / Non-aktif / Mengundurkan Diri'],
    ['hardskill_1'], ['hardskill_2'], ['hardskill_3'], ['softskill'],
    ['magang_instansi'], ['magang_alamat'], ['magang_posisi'], ['magang_mulai', 'date'], ['magang_selesai', 'date'], ['pembimbing_lapangan'], ['pembimbing_akademik'],
    ['dokumen_magang', 'list', 'CV, Surat Permohonan, Transkrip Nilai, Lainnya'], ['berkas_magang', 'att'], ['pernyataan', 'bool'], ['tempat_ttd'], ['tanggal_ttd', 'date'], ['formulir', 'att'],
  ]),
  lecturers: T('dosen', 'Biodata Dosen', 'Biodata dosen internal & Dosen External (format Google Form Data Dosen).', [
    ['nama'], ['tipe', 'text', 'Dosen Internal / Dosen External'], ['status', 'text', 'Aktif / Tidak aktif'], ['nidn'], ['instansi'], ['jabatan'], ['email'], ['telp'], ['tanggal_lahir', 'date'], ['alamat'],
    ['s1'], ['s2'], ['s3'], ['lainnya'], ['mata_kuliah'], ['pengalaman_kerja'], ['pengalaman_organisasi'], ['rekening'], ['npwp'], ['honor_per_sks', 'num'], ['foto_link'], ['cv_link'], ['dokumen', 'att'],
  ]),
  immersionTargets: T('immersion_target', 'Immersion', 'Target tabungan immersion per batch.', [
    ['batch_id'], ['program', 'text', 'Immersion Osaka 2027'], ['destinasi'], ['target_per_mahasiswa', 'num'], ['tenggat', 'date'], ['status', 'text', 'Aktif / Selesai'], ['catatan'],
  ]),
  immersionSavings: T('immersion_tabungan', 'Immersion', 'Log setoran tabungan immersion per mahasiswa.', [
    ['tanggal', 'date'], ['batch_id'], ['student_id'], ['nim'], ['nama_mahasiswa'], ['cicilan_ke', 'int', '1, 2, 3 … (urutan cicilan mahasiswa)'], ['jumlah', 'num'], ['metode'],
    ['status', 'text', 'Terverifikasi / Menunggu verifikasi / Ditolak'], ['bukti', 'att'], ['catatan'],
  ]),
  immersionExpenses: T('immersion_pengeluaran', 'Immersion', 'Arus kas dana immersion per batch: pengeluaran, pemasukan lain (mis. dana fasilitator), penukaran uang, dan rencana anggaran.', [
    ['tanggal', 'date'], ['batch_id'], ['jenis', 'text', 'Pengeluaran / Pemasukan lain / Penukaran uang'], ['status', 'text', 'Realisasi / Rencana'],
    ['kategori'], ['uraian'], ['vendor', 'text', 'Invoice / vendor, mis. Scoot, Airbnb'], ['pax', 'int', 'jumlah orang/unit'],
    ['mata_uang', 'text', 'IDR / JPY / SGD / USD'], ['nominal_asing', 'num', 'nominal dalam mata uang asing'], ['kurs', 'num', 'kurs ke Rupiah'],
    ['jumlah', 'num', 'total dalam Rupiah, angka tanpa titik'], ['student_id', 'text', 'kosong = kolektif'], ['nim'], ['nama_mahasiswa'], ['bukti', 'att'], ['catatan'],
  ]),
  internships: T('magang', 'Data Magang', 'Penempatan magang (PKL) mahasiswa per batch.', [
    ['batch_id', 'text', 'B1, B2 …'], ['student_id'], ['nim'], ['nama_mahasiswa'], ['panggilan'], ['periode', 'text', 'Semester 5 · Ganjil 2026/2027'],
    ['perusahaan', 'text', 'tempat magang final (diterima)'], ['kandidat', 'text', 'tempat yang dilamar / dipertimbangkan'], ['posisi'], ['divisi'], ['kota'],
    ['durasi', 'text', '6 Months'], ['mulai', 'date'], ['selesai', 'date'], ['status', 'text', 'Proses / Diterima / Berjalan / Selesai / Dihentikan'],
    ['jenis', 'text', 'Penempatan prodi / Inisiatif mahasiswa / Permintaan perusahaan'], ['form_pkl', 'bool', 'Form PKL Prodi sudah diisi'],
    ['pembimbing_lapangan'], ['pembimbing_akademik'], ['kontak_perusahaan'], ['dokumen', 'att'], ['catatan'],
  ]),
  internshipReviews: T('penilaian_magang', 'Data Magang', 'Penilaian tempat magang oleh mahasiswa (diisi lewat form publik / bit.ly).', [
    ['batch_id'], ['magang_id'], ['student_id'], ['nim'], ['nama_lengkap'], ['email'], ['perusahaan'], ['posisi'], ['divisi'], ['kota'],
    ['mulai', 'date'], ['selesai', 'date'], ['durasi'], ['mode_kerja', 'text', 'WFO / Hybrid / WFH'],
    ['rating_keseluruhan', 'int', '1–5 bintang'], ['rating_jobdesk', 'int', '1–5'], ['rating_lingkungan', 'int', '1–5'], ['rating_bimbingan', 'int', '1–5'],
    ['rating_kompensasi', 'int', '1–5'], ['rating_pengembangan', 'int', '1–5'],
    ['jobdesk_sesuai', 'text', 'Ya / Sebagian / Tidak'], ['lingkungan_cocok', 'text', 'Ya / Cukup / Tidak'], ['kompensasi_diterima', 'text', 'Uang saku / Uang makan / Transport / Tidak ada'],
    ['kompensasi_sepadan', 'text', 'Ya / Cukup / Tidak'], ['jam_kerja', 'text', 'mis. Senin–Jumat 08.00–17.00'], ['beban_kerja', 'text', 'Ringan / Sesuai / Berat'],
    ['skill_didapat'], ['kelebihan'], ['kekurangan'], ['rekomendasi', 'text', 'Ya / Mungkin / Tidak'], ['tawaran_kerja', 'text', 'Ya / Belum / Tidak'],
    ['saran'], ['tampilkan_anonim', 'bool'], ['sumber', 'text', 'Form publik / Input admin'], ['status_review', 'text', 'Baru / Ditinjau / Disembunyikan'], ['catatan_admin'],
  ]),
  settings: T('pengaturan', 'Pengaturan', 'Pengaturan aplikasi (dikelola dari menu Pengaturan).', [
    ['nilai', 'json'],
  ]),
};

export const COLLECTIONS = Object.keys(SCHEMA);

/** Nama kolom database untuk satu kolom skema */
export function dbColumns(col) {
  if (col.type === 'att') return [`${col.name}_label`, `${col.name}_link`, `${col.name}_file`];
  return [col.name];
}

/** record aplikasi → baris tabel */
export function toRow(collection, rec, user) {
  const s = SCHEMA[collection]; const row = { id: rec.id };
  for (const c of s.cols) {
    const v = rec[c.name];
    switch (c.type) {
      case 'att': row[`${c.name}_label`] = v && v.label ? v.label : null; row[`${c.name}_link`] = v && v.link ? v.link : null; row[`${c.name}_file`] = v && v.file ? v.file : null; break;
      case 'list': row[c.name] = Array.isArray(v) ? (v.length ? v.join(', ') : null) : (v || null); break;
      case 'int': case 'num': row[c.name] = v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v); break;
      case 'bool': row[c.name] = v === undefined || v === null || v === '' ? null : !!v; break;
      case 'date': row[c.name] = v ? String(v).slice(0, 10) : null; break;
      case 'json': row[c.name] = v === undefined ? null : v; break;
      default: row[c.name] = v === undefined || v === null || v === '' ? null : String(v);
    }
  }
  if (user) row.updated_by = user;
  return row;
}

/** baris tabel → record aplikasi */
export function fromRow(collection, row) {
  const s = SCHEMA[collection]; const rec = { id: row.id, created_at: row.created_at, updated_at: row.updated_at };
  for (const c of s.cols) {
    switch (c.type) {
      case 'att': {
        const o = { label: row[`${c.name}_label`] || '', link: row[`${c.name}_link`] || '', file: row[`${c.name}_file`] || null };
        rec[c.name] = (o.label || o.link || o.file) ? o : null; break;
      }
      case 'list': rec[c.name] = row[c.name] ? String(row[c.name]).split(/\s*[,;]\s*/).filter(Boolean) : []; break;
      case 'num': case 'int': rec[c.name] = row[c.name] === null || row[c.name] === undefined ? '' : Number(row[c.name]); break;
      case 'bool': rec[c.name] = !!row[c.name]; break;
      default: rec[c.name] = row[c.name] ?? '';
    }
  }
  return rec;
}
