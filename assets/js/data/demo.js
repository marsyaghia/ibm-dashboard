/* =========================================================================
   DATA CONTOH — HANYA untuk mode demo (?demo=1).
   Transaksi, setoran immersion, sertifikat, dan absensi di bawah ini fiktif,
   dibuat agar grafik & rekap bisa dicoba. Tidak pernah dikirim ke Supabase
   dan tidak ikut di supabase/data-awal.
   ========================================================================= */
let s = 7;
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const id = (p) => `${p}_demo${Math.floor(rnd() * 1e9).toString(36)}`;
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const DEMO = 'Data contoh (mode demo)';

export function demoExtras(seed) {
  s = 7;
  const studs = seed.students;
  const byBatch = (b) => studs.filter(x => x.batch_id === b);
  const angk = { B1: 2023, B2: 2024, B3: 2025, B4: 2026 };

  // Perolehan mahasiswa: satu baris per mahasiswa (DU, DPP, UKT per semester), nominal fiktif
  const incomes = studs.map(st => ({
    id: id('inc'), batch_id: st.batch_id, nim: st.nim || '', nama_mahasiswa: st.nama,
    du: pick([700000, 1100000, 1700000, 2750000, 5000000]), dpp: pick([0, 6500000, 9000000, 12250000]), ukt_per_semester: pick([4900000, 5900000, 6900000, 7750000, 9900000]),
  }));

  // Pengeluaran divisi
  const E = (tanggal, kategori, uraian, jumlah, status = 'Lunas', batch_id = '') => ({ id: id('exp'), tanggal, kategori, uraian, jumlah, status, batch_id, penerima: '', metode: 'Transfer Bank', catatan: DEMO });
  const expenses = [
    E('2026-01-15', 'Honor Dosen & Praktisi', 'Honor Dosen External Genap 2025/2026 — termin 1', 8400000),
    E('2026-02-20', 'Kegiatan & Event', 'IBM Gathering & Company Visit', 5250000, 'Lunas', 'B3'),
    E('2026-03-12', 'Promosi & Marketing', 'Konten & iklan PMB IBM', 3000000),
    E('2026-04-08', 'Sertifikasi & Pelatihan', 'English Score Test batch 2', 6600000, 'Lunas', 'B2'),
    E('2026-05-22', 'Konsumsi & Rapat', 'Rapat koordinasi Dosen External', 950000),
    E('2026-06-30', 'Honor Dosen & Praktisi', 'Honor Dosen External Genap 2025/2026 — termin 2', 9100000),
    E('2026-08-18', 'ATK & Perlengkapan', 'Perlengkapan kelas Lounge & EXE', 1750000),
    E('2026-09-05', 'Kegiatan & Event', 'Orientasi mahasiswa Batch 4', 4300000, 'Lunas', 'B4'),
    E('2026-10-02', 'Langganan & Software', 'Langganan Canva & Zoom', 1200000),
    E('2026-10-20', 'Honor Dosen & Praktisi', 'Honor Dosen External Ganjil 2026/2027 — termin 1', 9800000, 'Menunggu Pembayaran'),
    E('2026-10-25', 'Transportasi & Akomodasi', 'Transport praktisi tamu dari Surabaya', 650000, 'Diajukan (Reimburse)'),
  ];

  // Immersion: target per batch + setoran
  const immersionTargets = [
    { id: id('imt'), batch_id: 'B1', program: 'Immersion Osaka 2025', destinasi: 'Osaka, Jepang', target_per_mahasiswa: 15000000, tenggat: '2025-09-08', status: 'Selesai', catatan: DEMO },
    { id: id('imt'), batch_id: 'B2', program: 'Immersion Malaysia–Singapura 2027', destinasi: 'Kuala Lumpur & Singapura', target_per_mahasiswa: 12000000, tenggat: '2027-05-31', status: 'Aktif', catatan: DEMO },
    { id: id('imt'), batch_id: 'B3', program: 'Immersion Osaka 2028', destinasi: 'Osaka, Jepang', target_per_mahasiswa: 18000000, tenggat: '2028-03-31', status: 'Aktif', catatan: DEMO },
  ];
  const immersionSavings = [];
  for (const b of ['B2', 'B3']) {
    for (const st of byBatch(b)) {
      const n = Math.floor(rnd() * 8);
      for (let k = 0; k < n; k++) {
        const m = 1 + ((k + (b === 'B2' ? 2 : 4)) % 10);
        const last = k === n - 1;
        immersionSavings.push({ id: id('ims'), tanggal: iso(2026, Math.min(10, m), 1 + Math.floor(rnd() * 27)), batch_id: b, student_id: st.id, nim: st.nim || '', nama_mahasiswa: st.nama,
          jumlah: pick([500000, 750000, 1000000, 1500000, 2000000]), metode: 'Transfer Bank', status: last && rnd() > .6 ? 'Menunggu verifikasi' : 'Terverifikasi',
          bukti: rnd() > .15 ? { label: 'Bukti transfer', link: 'https://drive.google.com/' } : null, catatan: DEMO });
      }
    }
  }
  for (const r of immersionSavings) { const prev = immersionSavings.filter(x => x.student_id === r.student_id && x.tanggal <= r.tanggal); r.cicilan_ke = prev.length; }
  const K = (tanggal, batch_id, jenis, status, kategori, uraian, jumlah, extra = {}) => ({ id: id('ime'), tanggal, batch_id, jenis, status, kategori, uraian, jumlah, student_id: '', nim: '', nama_mahasiswa: '', catatan: DEMO, ...extra });
  const immersionExpenses = [
    K('2025-08-20', 'B1', 'Pemasukan lain', 'Realisasi', 'Dana Fasilitator', 'Dana 6 fasilitator', 53600000, { pax: 6 }),
    K('2025-08-25', 'B1', 'Pemasukan lain', 'Realisasi', 'Dana Mahasiswa', 'Dana immersion 17 mahasiswa', 255000000, { pax: 17 }),
    K('2025-08-28', 'B1', 'Pengeluaran', 'Realisasi', 'Tiket Pesawat', 'Tiket Surabaya–Osaka PP 23 pax', 120319715, { vendor: 'Scoot', pax: 23 }),
    K('2025-09-01', 'B1', 'Pengeluaran', 'Realisasi', 'Akomodasi', 'Penginapan Osaka 5 malam', 28257780, { vendor: 'Airbnb' }),
    K('2025-09-25', 'B1', 'Pengeluaran', 'Realisasi', 'Transportasi Lokal', 'ICOCA 20 pax mahasiswa', 11480000, { vendor: 'ICOCA', pax: 20, mata_uang: 'JPY', nominal_asing: 100000, kurs: 114.8 }),
    K('2025-09-26', 'B1', 'Pengeluaran', 'Realisasi', 'Konsumsi', 'Dinner BBQ rombongan', 5682600, { mata_uang: 'JPY', nominal_asing: 49500, kurs: 114.8 }),
    K('2025-09-27', 'B1', 'Pengeluaran', 'Rencana', 'Kunjungan Industri / Kampus', 'Tiket World Expo 18 orang', 17047800, { vendor: 'World Expo', pax: 18, mata_uang: 'JPY', nominal_asing: 135000, kurs: 126.28 }),
    K('', 'B1', 'Penukaran uang', 'Realisasi', 'Penukaran Uang', 'Penukaran uang Yen mahasiswa', '', { mata_uang: 'JPY', nominal_asing: 20000 }),
    K('2026-09-14', 'B2', 'Pengeluaran', 'Realisasi', 'Tiket Pesawat', 'DP tiket rombongan (uang muka 30%)', 21000000),
    K('2026-10-03', 'B2', 'Pengeluaran', 'Rencana', 'Visa & Dokumen', 'Pengurusan paspor kolektif', 3500000),
  ];

  // Data magang + penilaian tempat magang (fiktif)
  const PT = [['Shanaya Resort Malang', 'Sales & Marketing', 'Malang'], ['Santika Hotel Malang', 'Front Office', 'Malang'], ['Dea Bakery Factory', 'Operational Team', 'Malang'], ['Carabicara Speaking Smart', 'Marketing Strategist', 'Malang'], ['PT. Benteng Api Technic Tbk', 'Marketing', 'Surabaya'], ['Digital Solusindo Group', 'HRGA Intern', 'Malang']];
  const internships = []; const internshipReviews = [];
  for (const b of ['B1', 'B2']) {
    byBatch(b).forEach((st, i) => {
      const [perusahaan, posisi, kota] = PT[(i + (b === 'B1' ? 3 : 0)) % PT.length];
      const status = b === 'B1' ? (i % 9 === 8 ? 'Dihentikan' : 'Selesai') : (i % 7 === 6 ? 'Diterima' : 'Berjalan');
      const m = { id: id('mg'), batch_id: b, student_id: st.id, nim: st.nim || '', nama_mahasiswa: st.nama, periode: b === 'B1' ? 'Semester 5 · Ganjil 2025/2026' : 'Semester 5 · Ganjil 2026/2027',
        perusahaan, posisi, kota, durasi: '6 Months', mulai: b === 'B1' ? '2025-08-01' : '2026-09-01', selesai: b === 'B1' ? '2026-02-01' : '2027-03-01', status, jenis: 'Penempatan prodi', form_pkl: rnd() > .3, catatan: DEMO };
      internships.push(m);
      if (['Selesai', 'Berjalan'].includes(status) && rnd() > .35) {
        const base = 3 + Math.floor(rnd() * 3); const r5 = () => Math.max(1, Math.min(5, base + Math.floor(rnd() * 3) - 1));
        internshipReviews.push({ id: id('pm'), batch_id: b, magang_id: m.id, student_id: st.id, nim: st.nim || '', nama_lengkap: st.nama, perusahaan, posisi, kota, durasi: '6 bulan', mode_kerja: pick(['WFO', 'WFO', 'Hybrid']),
          rating_keseluruhan: base, rating_jobdesk: r5(), rating_lingkungan: r5(), rating_bimbingan: r5(), rating_kompensasi: r5(), rating_pengembangan: r5(),
          jobdesk_sesuai: pick(['Ya', 'Ya', 'Sebagian']), lingkungan_cocok: pick(['Ya', 'Ya', 'Cukup']), kompensasi_diterima: pick(['Uang saku', 'Uang makan, Transport', 'Tidak ada']), kompensasi_sepadan: pick(['Ya', 'Cukup', 'Tidak']),
          jam_kerja: 'Senin–Jumat 08.00–17.00', beban_kerja: pick(['Sesuai', 'Sesuai', 'Berat']), kelebihan: 'Mentor suportif dan banyak praktik langsung. (contoh)', kekurangan: 'Jam kerja kadang melebihi jadwal saat event. (contoh)',
          skill_didapat: 'Komunikasi dengan klien, administrasi, Canva', rekomendasi: base >= 4 ? 'Ya' : pick(['Mungkin', 'Ya']), tawaran_kerja: pick(['Belum', 'Tidak', 'Ya']), saran: '', tampilkan_anonim: rnd() > .7,
          sumber: 'Form publik', status_review: pick(['Baru', 'Ditinjau', 'Ditinjau']), created_at: `${b === 'B1' ? '2026-02' : '2026-10'}-${String(5 + Math.floor(rnd() * 20)).padStart(2, '0')}T09:00:00Z` });
      }
    });
  }

  // Sertifikat
  const certificates = [];
  for (const st of byBatch('B1')) {
    certificates.push({ id: id('cert'), batch_id: 'B1', student_id: st.id, nim: st.nim || '', nama_mahasiswa: st.nama, jenis: 'English Score Test', nama_sertifikat: 'English Score Test 1', penerbit: 'British Council', status: rnd() > .2 ? 'Sudah Terbit' : 'Proses', skor: String(110 + Math.floor(rnd() * 60)), catatan: DEMO });
    certificates.push({ id: id('cert'), batch_id: 'B1', student_id: st.id, nim: st.nim || '', nama_mahasiswa: st.nama, jenis: 'Public Speaking (Carabicara)', nama_sertifikat: 'Public Speaking Carabicara', penerbit: 'Carabicara', status: rnd() > .4 ? 'Sudah Terbit' : 'Belum', catatan: DEMO });
  }
  return { incomes, expenses, immersionTargets, immersionSavings, immersionExpenses, internships, internshipReviews, certificates };
}
