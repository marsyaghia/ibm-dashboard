/* =========================================================================
   DATA AWAL (SEED)
   Dipakai sekali saat dashboard dibuka pertama kali (atau saat "Reset ke data awal").
   Sumber: CSPP IBM, Link RPS OBE IBM, MATKUL DAN LINK PPT, IBM x Trent Global,
   Data Dosen IBM 2024. Data pribadi sensitif (tgl lahir, alamat, no. HP, rekening,
   password) sengaja TIDAK dimasukkan ke kode — impor dari CSV Google Form lewat
   menu Biodata Dosen.
   ========================================================================= */
import { RAW } from './seed-raw.js';
import { SLOTS } from './seed-jadwal.js';

export const BATCHES = [
  { id: 'B1', nama: 'Batch 1', angkatan: 2023, periode: '2023 – 2027', status: 'Aktif', catatan: '' },
  { id: 'B2', nama: 'Batch 2', angkatan: 2024, periode: '2024 – 2028', status: 'Aktif', catatan: '' },
  { id: 'B3', nama: 'Batch 3', angkatan: 2025, periode: '2025 – 2029', status: 'Aktif', catatan: '' },
  { id: 'B4', nama: 'Batch 4', angkatan: 2026, periode: '2026 – 2030', status: 'Aktif', catatan: '' },
];

/* Kurikulum IBM (CSPP). Kolom: semester, kode, nama (EN), nama (ID), sks, rumpun, pengampu, mitra, mode, trent */
const INTERNAL = /risa santoso|lussia|reza ra|agus purnomo|nur elif|ronald|puji subekti|yuniar|yunus handoko|mulyaningtyas|ratna putri|widiya|ditya|abdul aziz|karolus|nita indriyani/i;
const FAKULTAS = /fakultas|team teaching|magang|online|pembimbing/i;
export const jenisPengampu = (nama) => !nama ? '' : FAKULTAS.test(nama) ? 'Ikut Fakultas' : INTERNAL.test(nama) ? 'Dosen Internal' : 'Dosen External';
const C = (semester, kode, nama_en, nama_id, sks, rumpun, pengampu, mitra = 'Asia', mode = 'Onsite', trent = '') =>
  ({ semester, kode, nama_en, nama_id, sks, rumpun, pengampu, jenis_pengampu: jenisPengampu(pengampu), mitra, mode, trent_code: trent, obe: !trent });

export const COURSES = [
  C(1, 'MJU231001', 'Business Practice 1', 'Praktik Bisnis 1', 2, 'MKI', 'Team Teaching Fakultas'),
  C(1, 'MJF231002', 'Micro Economy', 'Ekonomi Mikro', 3, 'MKF', 'Risa Santoso, B.A., M.Ed.'),
  C(1, '', 'Intro Business Law', 'Pengantar Hukum Bisnis Indonesia', 3, 'MKP', 'Antonius Adhi S., S.H., M.Hum.', 'Ansugi Law', 'Hybrid'),
  C(1, 'MJF231004', 'Intro to Business', 'Pengantar Bisnis', 3, 'MKF', 'Arie Liyono, S.Kom., M.M.', 'BWI'),
  C(1, 'MJP231005', 'Intro to Management', 'Pengantar Manajemen', 3, 'MKF', 'Lussia Mariesti Andriany, S.E., M.M., Ph.D.'),
  C(1, 'MJD236028', 'Religious Education', 'Pendidikan Agama', 2, 'MKD', 'Ikut Fakultas'),
  C(1, 'MJD231006', 'Citizenship', 'Kewarganegaraan', 2, 'MKD', 'Reza Ramadhania, S.Sos., M.Ak.'),
  C(1, 'MJF231008', 'Computer Application', 'Pengantar Aplikasi Komputer', 2, 'MKF', 'Agus Purnomo Sidi, S.Sos., M.M.'),

  C(2, 'MJF232012', 'English Conversation', 'Percakapan Bahasa Inggris (Professional Communication)', 2, 'MKF', 'Elsafan Nahak, S.Tr.Pt', 'English Cafe', 'Onsite', 'DTG-04'),
  C(2, 'MJF232011', 'Business Communication', 'Komunikasi Bisnis', 3, 'MKF', 'Karolus Danar Kurniawan, S.I.Kom., M.I.Kom.', 'Carabicara'),
  C(2, 'MJF232016', 'Entrepreneurship', 'Kewirausahaan', 3, 'MKF', 'Dr. Puji Subekti, S.Si., M.Si.', 'Asia/InBis'),
  C(2, 'MJP232014', 'Operational Management', 'Manajemen Operasional', 3, 'MKP', 'Rachmat Anggara Supriyadi, S.E.', 'Qasir.id'),
  C(2, 'MJU232010', 'Business Practice 2', 'Praktik Bisnis 2', 2, 'MKI', 'Team Teaching Fakultas'),
  C(2, 'MJD232009', 'Business Ethics', 'Etika Bisnis', 2, 'MKF', 'Ganda Mohamad Pamungkas, S.H., M.M., C-HRA., CLA.'),
  C(2, 'MJU232015', 'Critical Thinking', 'Berpikir Kritis', 2, 'MKI', 'Prof. Dr. Ronald Suryaputra, M.M.', 'Asia/BWI'),
  C(2, 'MJH236206', 'Content and Copywriting', 'Konten dan Penulisan Naskah', 3, 'MKF', 'Nur Elif, S.E., M.M.'),
  C(2, '', 'Professional English Matriculation', 'Matrikulasi Bahasa Inggris', 2, 'IBM Activity', 'Veronica Setijadi, S.Pd.'),

  C(3, 'MJU233017', 'Business Practice 3', 'Praktik Bisnis 3', 3, 'MKI', 'Team Teaching Fakultas', 'Prodi'),
  C(3, 'MJP233018', 'Marketing Management', 'Manajemen Pemasaran', 3, 'MKP', 'Prof. Dr. Ronald Suryaputra, M.M.', 'Recosta'),
  C(3, 'MJP233019', 'Human Resource Management', 'Manajemen Sumber Daya Manusia', 3, 'MKP', 'Novaldi Nur Rochman Putra, S.AB., M.M., CHCM.', 'DSG'),
  C(3, 'MJP233020', 'Financial Management', 'Manajemen Keuangan', 3, 'MKP', 'Mochamad Rizal Rosyadi, S.E.', 'Bingkai Karya'),
  C(3, 'MJF233003', 'Macro Economy', 'Ekonomi Makro', 3, 'MKF', 'Hironimus Hari Kurniawan, S.E., M.M.'),
  C(3, 'MJF233013', 'Banking & Financial Services', 'Perbankan dan Jasa Keuangan', 3, 'MKPil', 'Yuniar Fitriyani, S.E., M.M.'),
  C(3, 'MJH-237327', 'CRPD', 'Career Readiness and Professional Development', 3, 'MKPil', 'Karolus Danar Kurniawan, S.I.Kom., M.I.Kom.', 'Carabicara', 'Onsite', 'DTG-03'),
  C(3, 'MJH-237328', 'Intro to Hospitality', 'Pengenalan Hospitality', 3, 'MKPil', 'Andina Paramita Sari', 'Ngalup.Co/BeOn', 'Onsite', 'ITH-01'),

  C(4, 'MJK234040', 'Strategic Management', 'Manajemen Strategi', 3, 'MKP', 'Dr. Yunus Handoko, S.E., M.M., CRA', 'Pasca Asia'),
  C(4, '', 'Financial Statement', 'Analisa Laporan Keuangan', 3, 'MKL', 'Mulyaningtyas, S.E., M.Ak.'),
  C(4, 'MJH-234331', 'F&B Operations', 'Food & Beverage Operations', 3, 'MKK', 'Puguh Santoso', 'Shanaya Resort', 'Onsite', 'ITH-02'),
  C(4, '', 'Leadership : Building Teamwork and Conflict Resolution', 'Kepemimpinan: Membangun Tim dan Penyelesaian Konflik', 3, 'MKP', 'Arie Liyono, S.Kom., M.M.', 'BWI'),
  C(4, 'MJP234021', 'International Business Export Import', 'Bisnis Internasional dan Ekspor Impor', 3, 'MKP', 'Anggri Sartika Wiguna, S.T., M.T.', 'Exportir.id'),
  C(4, '', 'Innovation & Value Creation', 'Inovasi dan Penciptaan Nilai', 3, 'MKPil', 'Ratna Putri Nilasari, S.E., M.M.'),
  C(4, 'MJP234023', 'Matemathics for Business', 'Matematika Bisnis', 3, 'MKP', 'Widiya Dewi Anjaningrum, S.Si., M.M.'),
  C(4, 'MJH-234330', 'Foundation in Travel and Tourism', 'Dasar-dasar Travel & Tourism', 3, 'MKK', 'Suci Andriani', 'Santika Group', 'Onsite', 'ITH-03'),
  C(4, 'IBMACT05', 'Public Speaking by Carabicara', 'Public Speaking & Komunikasi', 1, 'IBM Activity', 'Karolus Danar Kurniawan, S.I.Kom., M.I.Kom.', 'Carabicara'),

  C(5, 'MJF235024', 'Supply Chain Management', 'Supply Chain Management', 3, 'MKF', 'Konversi Magang', 'Internship', 'Konversi Magang'),
  C(5, 'MJP235025', 'Managerial Economics', 'Ekonomi Manajerial', 3, 'MKP', 'Konversi Magang', 'Internship', 'Konversi Magang'),
  C(5, 'MJP235026', 'Research Methods', 'Metode Penelitian', 3, 'MKP', 'Ikut kelas DM Online', 'Asia', 'Online'),
  C(5, 'MJP235027', 'Statistics', 'Statistik', 3, 'MKP', 'Ikut kelas DM Online', 'Asia', 'Online'),
  C(5, '', 'Management in the Service Industry', 'Manajemen pada Industri Jasa', 3, 'MKL', 'Konversi Magang', 'Internship', 'Konversi Magang'),
  C(5, 'MJH-234329', 'Meetings, Incentives, Conventions, and Exhibitions Management', 'MICE & Event Management', 3, 'MKK', 'Selly Fatmawati', 'LDC', 'Online', 'ITH-04'),
  C(5, '', 'Immersion Studies', 'Program Belajar ke Luar Negeri', 3, 'MKK', 'Karolus Danar Kurniawan, S.I.Kom., M.I.Kom.', 'Osaka, Japan', 'Immersion'),

  C(6, 'MJD236028', 'Indonesian/Religion', 'Bahasa Indonesia / Agama', 2, 'MKD', 'Ikut Fakultas'),
  C(6, 'MJH233301', 'International Business Management', 'Manajemen Bisnis Internasional', 3, 'MKPil', 'Risa Santoso, B.A., M.Ed.'),
  C(6, 'MJP236032', 'Business Valuation', 'Valuasi Bisnis', 3, 'MKPil', 'Arif Bawono Surya', 'Lets Play Indonesia'),
  C(6, 'MJH236306', 'Global Strategic Management', 'Manajemen Strategi Global', 3, 'MKPil', 'Haikal Basagili'),
  C(6, 'MJK234312', 'Digital Marketing : Managing Omnichannels Marketing', 'Pemasaran Digital: Manajemen Omnichannel', 3, 'MKF', 'Hari Obbie'),
  C(6, 'MJF230030', 'Internship', 'Magang (Laporan & Presentasi)', 6, 'MKF', 'Tim Dosen Pembimbing', 'Internship', 'Konversi Magang'),

  C(7, 'MJD232009', 'Pancasila', 'Pendidikan Pancasila', 2, 'MKD', 'Ikut Fakultas'),
  C(7, 'MJF236031', 'Corporate Budgeting', 'Penganggaran Perusahaan', 3, 'MKF', 'Ditya Wardana, S.ST., M.S.A.'),
  C(7, 'MJP237035', 'English Advanced: Pitching & Presentations', 'Bahasa Inggris Lanjutan: Pitching & Presentasi', 2, 'MKP', 'Augy Kurnia Widjaja', 'BWI'),
  C(7, '', 'Big Data Analysis & Management', 'Manajemen dan Analisa Big Data', 3, 'MKK', 'Ziaelfikar Albaba', 'Nortis'),
  C(7, 'MJU230033', 'Capstone Project / Thesis', 'Skripsi', 4, 'MKI', 'Ikut Fakultas'),
  C(7, 'MJU237034', 'Career Development', 'Pengembangan Karir', 2, 'MKI', 'Abdul Aziz Muslim, S.Psi., M.Psi.'),
];

/* Mata kuliah dari Trent Global College + silabus per pertemuan (sheet "IBM By Meets") */
export const TRENT_SUBJECTS = [
  { kode: 'DTG-04', asia_code: 'MJF-232012', nama: 'Professional Communication', semester: 2,
    link_mdd: 'https://docs.google.com/document/d/1ZL4NMv12W9wRniFH02IYJpbTs6PaRGua/edit?usp=sharing',
    link_rps: 'https://docs.google.com/document/d/1mAs0bRvJZjYVLPGYr5Tanckd-jZQ_FCwHQDknGzRd_I/edit?usp=sharing',
    silabus: ['Introduction to Professional Communication and Reading Skill', 'Analyzing Industry Jargon and Terminology', 'Effective Communication in Professional Settings', 'Presenting Information with Technology', 'Reading and Understanding Professional Documents', 'Identifying Industry-Specific Words and Jargon', 'Effective Communication in Professional Writing', 'Mid Terms', 'Professional Correspondence', 'Lettering and Email Etiquette Part 2', 'Enhancing Presentation Skills with Technology Part 1', 'Enhancing Presentation Skills with Technology Part 2', 'Global Communication and Cultural Sensitivity Part 1', 'Global Communication and Cultural Sensitivity Part 2', 'Final Presentation Preparations', 'Final Terms'] },
  { kode: 'DTG-03', asia_code: 'MJH-237327', nama: 'Career Readiness and Professional Development', semester: 3,
    link_mdd: 'https://docs.google.com/document/d/1qfdJ083RspZuWGpEpdDsbM2JuliStBRvFNLcBxH2sao/edit?usp=sharing',
    link_rps: 'https://docs.google.com/document/d/1ZcaF5Wz-vL_5j4fsSId-S-KuXTV5kQAw/edit',
    silabus: ['Overview of industry and sector', 'Personal branding', 'Personal branding', 'Building Your Resume', 'Building Your Resume', 'How to prepare for your job interview (Part 1)', 'How to prepare for your job interview (Part 2)', 'Mid Terms', 'Understanding Job application', 'Understanding Job application', 'Understanding Job application', 'Exploring career pathways in industry/sector', 'Career goal setting Part 1: Creating a personal vision statement', 'Career goal setting Part 2: 12 life categories (A)', 'Career goal setting Part 3: 12 life categories (B)', 'Final Terms'] },
  { kode: 'ITH-01', asia_code: 'MJH-237328', nama: 'Introduction to Hospitality', semester: 3,
    link_mdd: 'https://docs.google.com/document/d/1XEYLoEMtCmr8ttAc80PdkXVwLcwS28CS/edit?usp=sharing', link_rps: '',
    silabus: ['Introduction to the Hospitality Industry', 'Hotel Organizational Structure and Departments', 'Hospitality Sales and Marketing Part 1', 'Hospitality Sales and Marketing Part 2', 'Front Office Operations', 'Guest Services and Concierge Operations Part 1', 'Guest Services and Concierge Operations Part 2', 'Mid Terms — Visit and Observe Theme Park', 'Reservations and Revenue Management', 'Housekeeping and Linen/Laundry Operations Part 1', 'Housekeeping and Linen/Laundry Operations Part 2', 'Customer Service Excellence Part 1', 'Customer Service Excellence Part 2', 'Contemporary Trends in the Hospitality Industry', 'Ethics and Sustainability in Hospitality', 'Final Terms — Hotel and Table Manner Observe + Final Exam'] },
  { kode: 'ITH-03', asia_code: 'MJH-234330', nama: 'Foundation in Travel and Tourism', semester: 4,
    link_mdd: 'https://docs.google.com/document/d/1UHLT74BrZQXDu-zaGlVgmw4EVHRPPt-t/edit?usp=sharing', link_rps: '',
    silabus: ['Introduction to the Travel and Tourism Industry', 'Creating a Travel Itinerary and Proposal & Website Creation', 'Transportation in Travel and Tourism', 'Transportation in Travel and Tourism', 'Accommodation and Hospitality Services Part 1', 'Accommodation and Hospitality Services Part 2', 'Tourist Attractions and Experiences (Visit/Practical)', 'Mid Terms', 'Travel and Tourism Services: Travel Agencies and Tour Operators', 'Economic Impact of Travel and Tourism Part 1', 'Economic Impact of Travel and Tourism Part 2', 'Sustainable Tourism and Responsible Travel Part 1', 'Sustainable Tourism and Responsible Travel Part 2', 'Future Trends in Travel and Tourism Part 1', 'Future Trends in Travel and Tourism Part 2', 'Final Terms — Presentation'] },
  { kode: 'ITH-02', asia_code: 'MJH-234331', nama: 'Food and Beverage Operations', semester: 4,
    link_mdd: 'https://docs.google.com/document/d/1Sb6wiXvX2d3vSZkxNaZr5moLWvgLV8PB/edit?usp=sharing', link_rps: '',
    silabus: ['Introduction to Food and Beverage (F&B) Operations', 'F&B Planning and Preparation', 'F&B Presentation and Service Techniques', 'Strategies for Menu Planning and Pricing Part 1', 'Strategies for Menu Planning and Pricing Part 2', 'Inventory Management in F&B Operations Part 1', 'Inventory Management in F&B Operations Part 2', 'Mid Terms', 'Communication and Teamwork in F&B Service', 'Business Plan Development for F&B Concepts', 'Menu Design for the Business Concept', 'F&B Service', 'F&B Business Proposal Development Part 1', 'F&B Business Proposal Development Part 2', 'Pre-Presentation', 'Final Terms — Presentation'] },
  { kode: 'ITH-04', asia_code: 'MJH-234329', nama: 'MICE & Event Management', semester: 5,
    link_mdd: 'https://docs.google.com/document/d/1_VailosKCYGLQRfd6J-yJMdfJuOmnIdy/edit?usp=sharing', link_rps: '',
    silabus: ['Introduction to MICE and Event Management', 'Understanding Event Planning and Management', 'Marketing and Promotion for Events Part 1', 'Marketing and Promotion for Events Part 2', 'Venue Selection and Logistics Management', 'Programme Design and Content Development Part 1', 'Programme Design and Content Development Part 2', 'Mid Terms', 'Risk Management in Event Planning', 'Technology and Innovation in Event Management', 'Sustainable Event Management Practices Part 1', 'Sustainable Event Management Practices Part 2', 'Event Evaluation and Measurement', 'Specialized Events and Future Trends Part 1', 'Specialized Events and Future Trends Part 2', 'Final Terms'] },
];
export const TRENT_CODES = TRENT_SUBJECTS.map(s => s.kode);

/* Dosen & praktisi pengampu IBM. Riwayat pendidikan/pekerjaan diambil dari Form "Data Dosen IBM 2024"
   (hanya yang bersifat profesional). Lengkapi sisanya lewat Impor CSV di menu Biodata Dosen. */
const L = (nama, tipe, instansi, mata_kuliah, extra = {}) => ({ nama, tipe: tipe === 'Praktisi' ? 'Dosen External' : tipe, instansi, jabatan: '', mata_kuliah, status: 'Aktif', ...extra });
export const LECTURERS = [
  L('Risa Santoso, B.A., M.Ed.', 'Dosen Internal', 'Institut Asia Malang', 'Micro Economy; International Business Management', { jabatan: 'Rektor Institut Asia' }),
  L('Karolus Danar Kurniawan, S.I.Kom., M.I.Kom.', 'Dosen Internal', 'Carabicara', 'Business Communication; CRPD; Public Speaking; Immersion Studies', { jabatan: 'Koordinator IBM · CEO Carabicara' }),
  L('Antonius Adhi S., S.H., M.Hum.', 'Praktisi', 'Ansugi Law', 'Intro Business Law', { jabatan: 'Senior Lawyer' }),
  L('Arie Liyono, S.Kom., M.M.', 'Praktisi', 'Business Wisdom Institute (BWI)', 'Intro to Business; Leadership', { jabatan: 'Senior Trainer BWI', s1: 'Duta Wacana, Yogyakarta', s2: 'Institut Asia, Malang', pengalaman_kerja: 'Soca AI — Board of Advisors (2023–kini); Business Wisdom Institute — Senior Trainer (2022–kini); G45 Ventures — Founding Partner (2018–kini); ADVISA Business Coaching — Founder', foto_link: 'https://drive.google.com/open?id=1PMEXfstzCmHSusnvWGBEL4dEc5bAkaX5', cv_link: 'https://drive.google.com/open?id=1WfHyJ6N5uAOEJUyim3IF_FJAU0ym1gvs' }),
  L('Lussia Mariesti Andriany, S.E., M.M., Ph.D.', 'Dosen Internal', 'Institut Asia Malang', 'Intro to Management; Business Valuation', { jabatan: 'Kaprodi Manajemen' }),
  L('Reza Ramadhania, S.Sos., M.Ak.', 'Dosen Internal', 'Institut Asia Malang', 'Citizenship'),
  L('Agus Purnomo Sidi, S.Sos., M.M.', 'Dosen Internal', 'Institut Asia Malang', 'Computer Application', { s1: 'Brawijaya University, Malang', s2: 'Gadjah Mada University, Yogyakarta', pengalaman_kerja: 'Bitnet Komunikasindo — Account Manager (2008–2012); Elang Perkasa Langgeng — Branch Manager (2013–2015)', foto_link: 'https://drive.google.com/open?id=14wyTJWNUv3hbj3au7I0dqxJDQWeZI-1b', cv_link: 'https://drive.google.com/open?id=1MZQvR965y0zqPgnS5tqP_koR-m6knwT5' }),
  L('Ganda Mohamad Pamungkas, S.H., M.M., C-HRA., CLA.', 'Praktisi', 'Anza Corporation', 'Business Ethics', { jabatan: 'Business Consultant · CEO Anzacorp', s3: 'Sedang berjalan', lainnya: 'Certified Human Resources Analyst (C-HRA) & Certified Legal Analyst (CLA)', pengalaman_kerja: 'ITSK Dr. Soepraoen — Dosen Kewirausahaan (2021–kini); Institut Asia — Dosen (2020–kini); LP3i Business College — Dosen (2017–2019); Anza Corporation — CEO (2011–kini)', foto_link: 'https://drive.google.com/open?id=14OzJP7blZ9y8yGfAshZXg9lQ3_yRAf-m', cv_link: 'https://drive.google.com/open?id=1iEdjwvuHkKvpIj1sek-0IVx5gwzyOf5A' }),
  L('Elsafan Nahak, S.Tr.Pt', 'Praktisi', 'English Cafe Malang', 'English Conversation (Professional Communication)', { jabatan: 'Branch Manager English Cafe', s1: 'Politeknik Pembangunan Pertanian, Malang', lainnya: 'The University of Texas at Austin, USA (YSEALI)', pengalaman_kerja: 'English Café Malang — Branch Manager (2022–2025); Trent Global College — Freelance Education Consultant (2024–kini)', foto_link: 'https://drive.google.com/open?id=1rhGQDMCcFq_ky1R7FrO22smJi23H8dmR', cv_link: 'https://drive.google.com/open?id=1nWoAsykHMlX45ixYJk8xw9AAzJ980Q-E' }),
  L('Nur Elif, S.E., M.M.', 'Dosen Internal', 'Institut Asia Malang', 'Content and Copywriting'),
  L('Rachmat Anggara Supriyadi, S.E.', 'Praktisi', 'Qasir.id', 'Operational Management', { jabatan: 'CEO Qasir.id' }),
  L('Prof. Dr. Ronald Suryaputra, M.M.', 'Dosen Internal', 'Institut Asia Malang', 'Critical Thinking; Marketing Management'),
  L('Dr. Puji Subekti, S.Si., M.Si.', 'Dosen Internal', 'Institut Asia Malang', 'Entrepreneurship', { jabatan: 'Ketua Inkubator Bisnis', s1: 'Universitas Negeri Malang', s2: 'Universitas Brawijaya', s3: 'Universitas Negeri Malang', foto_link: 'https://drive.google.com/open?id=1DZT17h4sDI-fTXlp_KNc7prBxCu9Z597', cv_link: 'https://drive.google.com/open?id=1hdRfOtTJdjEr-baf8zJT5uU7V7yhq_SY' }),
  L('Novaldi Nur Rochman Putra, S.AB., M.M., CHCM.', 'Praktisi', 'Digital Solusindo', 'Human Resource Management', { jabatan: 'COO Digital Solusindo' }),
  L('Mochamad Rizal Rosyadi, S.E.', 'Praktisi', 'Bingkai Karya / Bumi Baik', 'Financial Management', { jabatan: 'CEO Bingkai Karya' }),
  L('Hironimus Hari Kurniawan, S.E., M.M.', 'Praktisi', 'Recosta', 'Macro Economy; Business Practice 2 & 3; Supply Chain Management', { jabatan: 'CEO Recosta' }),
  L('Yuniar Fitriyani, S.E., M.M.', 'Dosen Internal', 'Institut Asia Malang', 'Banking & Financial Services'),
  L('Andina Paramita Sari', 'Praktisi', 'Ngalup Collaborative Network / BEON', 'Intro to Hospitality (ITH-01)', { jabatan: 'CEO Ngalup', s1: 'STIE Malangkucecwara, Malang', s2: 'Universitas Merdeka Malang', pengalaman_kerja: 'CEO Ngalup Collaborative Network; Head of Corporate Communication BEON Intermedia; Marketing & PR Tugu Hotel Malang', pengalaman_organisasi: 'Ketua BPC Perhumas Malang', foto_link: 'https://drive.google.com/open?id=1lTAa8QQLsIcwlfSiRmzDwAvjG1kDnDKl' }),
  L('Dr. Yunus Handoko, S.E., M.M., CRA', 'Dosen Internal', 'Pascasarjana Institut Asia', 'Strategic Management', { jabatan: 'Direktur Program Magister', s1: 'Universitas Abdurrahman Saleh Situbondo', s2: 'Universitas Putra Bangsa Surabaya', s3: 'Universitas Brawijaya Malang', lainnya: 'Sertifikat BNSP', foto_link: 'https://drive.google.com/open?id=1AlK5koigQC7H2BvIhf0vG1YdO1hnkQsm', cv_link: 'https://drive.google.com/open?id=1a-YMiBQG9RLyzgH9uMUJ_hU2rP4RAFvm' }),
  L('Mulyaningtyas, S.E., M.Ak.', 'Dosen Internal', 'Institut Asia Malang', 'Financial Statement'),
  L('Anggri Sartika Wiguna, S.T., M.T.', 'Praktisi', 'PT Guna Berkat Indonesia', 'International Business Export Import', { jabatan: 'Marketing Director', s1: 'Brawijaya University, Malang', s2: 'Brawijaya University, Malang', pengalaman_kerja: 'Agronesian Startup — Founder (2018–kini); PT Guna Berkat Indonesia — Marketing Director (2019–kini); Fasilitator Klinik Ekspor Bea Cukai (2023–kini); Komunitas TEDI — Founder (2024–kini)', foto_link: 'https://drive.google.com/open?id=1dXttq95gJbBsb1NJ0DAdUQfhzNFuxiJ-', cv_link: 'https://drive.google.com/open?id=1b64oADa6QjrlBoy7rvoDgMhnh5aTDyQV' }),
  L('Ratna Putri Nilasari, S.E., M.M.', 'Dosen Internal', 'Institut Asia Malang', 'Innovation & Value Creation; Pembimbing Magang'),
  L('Widiya Dewi Anjaningrum, S.Si., M.M.', 'Dosen Internal', 'Institut Asia Malang', 'Mathematics for Business; Statistics'),
  L('Puguh Santoso', 'Praktisi', 'Shanaya Resort', 'F&B Operations (ITH-02)'),
  L('Suci Andriani', 'Praktisi', 'Hotel Santika Premiere Malang', 'Foundation in Travel and Tourism (ITH-03)', { jabatan: 'Asst. General Manager' }),
  L('Selly Fatmawati', 'Praktisi', 'Long Distance Creator (LDC)', 'MICE & Event Management (ITH-04)'),
  L('Arif Bawono Surya', 'Praktisi', 'Lets Play Indonesia', 'Business Valuation', { jabatan: 'COO Lets Play Indonesia', s1: 'Universitas Negeri Malang', pengalaman_kerja: 'Business Owner School — General Manager (2014–2018); Lets Play Indonesia — COO (2019–kini)', pengalaman_organisasi: 'Gekrafs Jawa Timur; Komite Ekonomi Kreatif Jatim; Game Developer Malang', foto_link: 'https://drive.google.com/open?id=1bJi3v1TIDRxahZX2xlu4j3OD1gJ5HCTx', cv_link: 'https://drive.google.com/open?id=12TkTMvgX2liS_ts3z_6-PQesiV47yD9Z' }),
  L('Haikal Basagili', 'Praktisi', '', 'Global Strategic Management'),
  L('Hari Obbie', 'Praktisi', '', 'Digital Marketing: Managing Omnichannels Marketing'),
  L('Augy Kurnia Widjaja', 'Praktisi', 'Business Wisdom Institute (BWI)', 'English Advanced: Pitching & Presentations', { jabatan: 'Consultant BWI', s1: 'Institut Asia, Malang', s2: 'Institut Asia, Malang', foto_link: 'https://drive.google.com/open?id=1kg6nrd3a66a0GzedZDPm4TIKmIwLSbDb', cv_link: 'https://drive.google.com/open?id=1EFRxUnC4Ie0mjlCiIHXQyfzKXxsD1hZo' }),
  L('Veronica Setijadi, S.Pd.', 'Praktisi', '', 'Professional English Matriculation'),
  L('Ditya Wardana, S.ST., M.S.A.', 'Dosen Internal', 'Institut Asia Malang', 'Corporate Budgeting'),
  L('Abdul Aziz Muslim, S.Psi., M.Psi.', 'Dosen Internal', 'Institut Asia Malang', 'Career Development'),
  L('Ziaelfikar Albaba', 'Praktisi', 'Nortis', 'Big Data Analysis & Management', { jabatan: 'CEO Nortis' }),
  L('Azariel, S.Sn., M.M.', 'Praktisi', '', '', { s1: 'Universitas Kristen Petra, Surabaya', s2: 'STIE Malangkucecwara, Malang', foto_link: 'https://drive.google.com/open?id=13DNV7cp7lkqhzbmRFmWBU2g7qtxmxbIT', cv_link: 'https://drive.google.com/open?id=15hvGyQfL0W--UAIZkDyXpCU6i3ydldn6' }),
  L('Arif Dwi Cahyono', 'Praktisi', '', '', { s1: 'Wijaya Kusuma University of Surabaya', s2: 'Surabaya University & STKIP PGRI Sidoarjo', pengalaman_kerja: 'Trainer & People Development (CIMB Niaga, Cigna, Kompakindo Media Dewata)', foto_link: 'https://drive.google.com/open?id=1nFdHLb65nDr9SwSzR-vRd6Lo89n84Fcp', cv_link: 'https://drive.google.com/open?id=146WvzVVG2EpKEfXfelCr7HUjK3mkCm-h' }),
];

/* Kalender akademik — PERKIRAAN agar jadwal bisa dihitung sebelum data resmi (PDF akademik) diimpor.
   Format sama dengan PDF: semester, tahun ajaran, kegiatan, mulai s.d. selesai. */
const K = (semester, tahun_ajaran, kegiatan, mulai, selesai, kategori) => ({ semester, tahun_ajaran, kegiatan, mulai, selesai, kategori, catatan: 'Perkiraan — ganti dengan data kalender akademik resmi' });
export const KALENDER = [
  K('Ganjil', '2024/2025', 'Perkuliahan Semester Ganjil', '2024-09-02', '2024-12-20', 'Perkuliahan'),
  K('Ganjil', '2024/2025', 'Ujian Tengah Semester (UTS)', '2024-10-21', '2024-10-26', 'UTS'),
  K('Ganjil', '2024/2025', 'Ujian Akhir Semester (UAS)', '2024-12-16', '2024-12-21', 'UAS'),
  K('Genap', '2024/2025', 'Perkuliahan Semester Genap', '2025-02-17', '2025-06-07', 'Perkuliahan'),
  K('Genap', '2024/2025', 'Ujian Tengah Semester (UTS)', '2025-04-07', '2025-04-12', 'UTS'),
  K('Genap', '2024/2025', 'Ujian Akhir Semester (UAS)', '2025-06-02', '2025-06-07', 'UAS'),
  K('Ganjil', '2025/2026', 'Perkuliahan Semester Ganjil', '2025-09-01', '2025-12-19', 'Perkuliahan'),
  K('Ganjil', '2025/2026', 'Ujian Tengah Semester (UTS)', '2025-10-20', '2025-10-25', 'UTS'),
  K('Ganjil', '2025/2026', 'Ujian Akhir Semester (UAS)', '2025-12-15', '2025-12-20', 'UAS'),
  K('Genap', '2025/2026', 'Perkuliahan Semester Genap', '2026-02-16', '2026-06-06', 'Perkuliahan'),
  K('Genap', '2025/2026', 'Libur Idul Fitri', '2026-03-16', '2026-03-28', 'Libur'),
  K('Genap', '2025/2026', 'Ujian Tengah Semester (UTS)', '2026-04-13', '2026-04-18', 'UTS'),
  K('Genap', '2025/2026', 'Ujian Akhir Semester (UAS)', '2026-06-08', '2026-06-13', 'UAS'),
  K('Ganjil', '2026/2027', 'Perkuliahan Semester Ganjil', '2026-09-07', '2026-12-26', 'Perkuliahan'),
  K('Ganjil', '2026/2027', 'Ujian Tengah Semester (UTS)', '2026-10-26', '2026-10-31', 'UTS'),
  K('Ganjil', '2026/2027', 'Libur Natal', '2026-12-24', '2026-12-26', 'Libur'),
  K('Ganjil', '2026/2027', 'Ujian Akhir Semester (UAS)', '2026-12-21', '2026-12-23', 'UAS'),
];

/* ---------- Pembentuk koleksi ---------- */
let n = 0;
const sid = (p) => `${p}_${(++n).toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const keyName = (t) => String(t || '').toLowerCase().replace(/by tgc|[^a-z]/g, '');
const TCOL = (code) => code.toLowerCase().replace('-', '_');

export function buildSeed() {
  n = 0;
  const stamp = (o, p) => ({ id: o.id || sid(p), created_at: now(), updated_at: now(), ...o });
  const B = (no) => `B${no}`;

  const batches = BATCHES.map(b => stamp(b, 'b'));
  const courses = COURSES.map(c => stamp(c, 'mk'));
  const trentSubjects = TRENT_SUBJECTS.map(t => stamp({ ...t, silabus: t.silabus.join('\n') }, 'ts'));
  const lecturers = LECTURERS.map(l => stamp(l, 'dsn'));

  // Mahasiswa dari daftar Trent (Batch 1–3). Biodata lain dilengkapi lewat formulir / impor.
  const students = RAW.students.map(s => stamp({
    nama: s.nama, nim: '', batch_id: B(s.batch), angkatan: s.angkatan,
    prodi: 'International Business Management', fakultas: 'Fakultas Ekonomi dan Bisnis',
    status_mhs: 'Mahasiswa Aktif', kewarganegaraan: 'Indonesia',
  }, 'mhs'));
  const stu = (name, b) => students.find(s => s.nama === name && s.batch_id === B(b)) || {};

  const trentEnrollments = RAW.enroll.map(e => stamp({
    student_id: stu(e.nama, e.batch).id, nama_mahasiswa: e.nama, nim: '', batch_id: B(e.batch),
    ...Object.fromEntries(TRENT_CODES.map(c => [TCOL(c), !!e[c]])),
    remarks: e.remarks, status_bayar: e.status_bayar, tanggal_bayar: e.tanggal_bayar, bukti_nama: e.bukti_nama,
  }, 'te'));

  const subjMatch = (a, b) => a.toLowerCase().replace(/^introductions?/, 'intro').trim().slice(0, 18) === b.toLowerCase().replace(/^introductions?/, 'intro').trim().slice(0, 18);
  const trentPayments = RAW.trentPay.map(p => {
    const mk = RAW.marks.find(m => m.batch === p.batch && subjMatch(m.subjek, p.subjek)) || {};
    return stamp({
      batch_id: B(p.batch), trent_code: p.trent_code, asia_code: p.asia_code, subjek: p.subjek,
      semester: p.semester, progres: p.progres, jumlah_mahasiswa: p.jumlah_mahasiswa, mahasiswa_aktif: p.mahasiswa_aktif,
      tuition_sgd: p.tuition_sgd, total_sgd: p.total_sgd, gst_sgd: p.gst_sgd, kurs: p.kurs, total_idr: p.total_idr,
      status_bayar: p.status_bayar === 'Paid' ? 'Lunas' : (p.progres === 'Upcoming' ? 'Belum Ditagih' : 'Belum Dibayar'),
      tanggal_bayar: p.tanggal_bayar, bukti: p.bukti_link ? { link: p.bukti_link, label: p.bukti_nama } : null,
      marksheet: mk.link ? { link: mk.link, label: mk.status } : null,
      marksheet_status: mk.link ? 'Tersedia' : (mk.status || 'TBC'),
    }, 'tp');
  });

  // Template RPS & OBE: satu baris per mata kuliah kurikulum (nama dokumen dari sheet "Link RPS OBE IBM")
  const docByTrent = Object.fromEntries(TRENT_SUBJECTS.map(t => [t.kode, t]));
  const rpsTemplates = courses.map(c => {
    const r = RAW.rps.find(x => x.semester === c.semester && keyName(c.nama_en).startsWith(keyName(x.mata_kuliah).slice(0, 10))) || {};
    const t = c.trent_code ? docByTrent[c.trent_code] : null;
    return stamp({
      course_id: c.id, kode_mk: c.kode, mata_kuliah: c.nama_en, semester: c.semester, versi: 'OBE 2024', dosen_penyusun: r.dosen || '',
      template_rps: r.rps_judul ? { label: r.rps_judul, link: t ? t.link_mdd : '' } : (t ? { label: `MDD ${t.kode}`, link: t.link_mdd } : null),
      template_obe: r.obe_judul ? { label: r.obe_judul, link: '' } : null,
      status: r.rps_judul ? 'Draft' : 'Belum ada', catatan: '',
    }, 'rpt');
  });

  const materials = RAW.materi.map(m => stamp({
    ...m,
    target_pertemuan: (m.pertemuan_tersedia || 0) > 14 ? 16 : 14,
    materi: m.link_ppt ? { link: m.link_ppt, label: m.label_link || 'Folder materi' } : null,
  }, 'mt')).map(({ link_ppt, label_link, ...rest }) => rest);

  const calendar = KALENDER.map(k => stamp(k, 'kal'));
  const lectFor = (nama) => lecturers.find(l => keyName(l.nama).slice(0, 8) && keyName(nama).replace(/^(sr|ms|mr|dr|prof)/, '').includes(keyName(l.nama).slice(0, 8)));
  const schedules = SLOTS.map(x => {
    const c = courses.find(c => keyName(c.nama_en) && (keyName(c.nama_en) === keyName(x.mata_kuliah) || keyName(x.mata_kuliah).startsWith(keyName(c.nama_en)) || keyName(c.nama_en).startsWith(keyName(x.mata_kuliah))));
    const { batch, stat, ...rest } = x;
    const l = lectFor(x.dosen);
    return stamp({ ...rest, batch_id: B(batch), course_id: c ? c.id : '', jumlah_pertemuan: 16,
      jenis_dosen: (l && l.tipe === 'Dosen Internal') ? 'Dosen Internal' : jenisPengampu(x.dosen) }, 'jd');
  });

  return {
    batches, courses, trentSubjects, students, trentEnrollments, trentPayments, rpsTemplates, obeAssessments: [], materials, lecturers,
    calendar, schedules, attendance: [], expenses: [], incomes: [], certificates: [],
    immersionTargets: [], immersionSavings: [], immersionExpenses: [], settings: [],
  };
}
