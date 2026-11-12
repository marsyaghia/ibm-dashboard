-- =========================================================================
-- Hapus semua mata kuliah Prodi Akuntansi dari menu "Materi & PPT Dosen"
-- (tabel public.materi_ppt). Yang tersisa hanya Prodi IBM dan Manajemen.
--
-- Cara pakai: buka Supabase → SQL Editor, lalu jalankan per langkah.
-- PERHATIAN: penghapusan bersifat permanen. Unduh dulu data menu ini lewat
-- tombol "Ekspor" di dashboard bila ingin menyimpan cadangan.
-- =========================================================================

-- 1) CEK DULU — jumlah baris per prodi (Akuntansi = yang akan dihapus)
select coalesce(nullif(trim(prodi), ''), '(kosong)') as prodi, count(*) as jumlah
from public.materi_ppt
group by 1
order by 1;

-- 2) HAPUS — semua baris Prodi Akuntansi (tidak membedakan huruf besar/kecil & spasi)
begin;
delete from public.materi_ppt
where lower(trim(prodi)) = 'akuntansi';
-- Pastikan jumlah baris yang terhapus sesuai hasil langkah 1, lalu:
commit;
-- (Bila jumlahnya tidak sesuai, jalankan "rollback;" sebagai ganti "commit;")

-- 3) PERBARUI keterangan kolom (sama dengan schema.js / schema.sql terbaru)
comment on column public.materi_ppt.prodi is 'IBM / Manajemen';

-- 4) CEK ULANG — seharusnya hanya tersisa IBM dan Manajemen.
--    Bila masih ada prodi lain (mis. "Lainnya" atau kosong), ubah lewat dashboard
--    atau jalankan, misalnya:
--    update public.materi_ppt set prodi = 'IBM' where prodi is null or trim(prodi) in ('', 'Lainnya');
select coalesce(nullif(trim(prodi), ''), '(kosong)') as prodi, count(*) as jumlah
from public.materi_ppt
group by 1
order by 1;
