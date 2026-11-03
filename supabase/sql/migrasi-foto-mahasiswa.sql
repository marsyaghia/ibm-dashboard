-- =========================================================================
-- MIGRASI: kolom foto profil di tabel mahasiswa (Biodata Mahasiswa)
-- Jalankan sekali di Supabase → SQL Editor → New query → Run.
-- Aman dijalankan ulang (memakai "if not exists").
--
-- foto_label : nama/keterangan foto (opsional)
-- foto_link  : tautan Google Drive / URL gambar (akses "Siapa saja yang memiliki link")
-- foto_file  : metadata berkas bila foto diunggah langsung dari dashboard
--              (berkasnya tersimpan di bucket Storage "dashboard-files")
-- =========================================================================
alter table public.mahasiswa
  add column if not exists foto_label text,
  add column if not exists foto_link  text,
  add column if not exists foto_file  jsonb;

comment on column public.mahasiswa.foto_link is 'foto profil: link Google Drive (foto_link) atau unggahan (foto_file)';

-- Muat ulang cache skema API agar kolom baru langsung dikenali dashboard
notify pgrst, 'reload schema';
