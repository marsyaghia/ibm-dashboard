-- Form publik penilaian magang (dibagikan lewat bit.ly). Tabel tetap terkunci RLS;
-- mahasiswa hanya bisa: (1) mengecek NIM sendiri, (2) mengirim/memperbarui penilaiannya.

create or replace function public.magang_cek_nim(p_nim text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_nim text := regexp_replace(coalesce(p_nim, ''), '\s', '', 'g');
        m record; s record; b record; r record;
begin
  if length(v_nim) < 6 or length(v_nim) > 20 then
    return jsonb_build_object('ok', false, 'pesan', 'NIM tidak valid.');
  end if;
  select * into m from public.magang where nim = v_nim order by coalesce(mulai, created_at::date) desc limit 1;
  select * into s from public.mahasiswa where nim = v_nim limit 1;
  if m is null and s is null then
    return jsonb_build_object('ok', false, 'pesan', 'NIM tidak terdaftar sebagai mahasiswa IBM. Hubungi tim IBM.');
  end if;
  select nama into b from public.batch where id = coalesce(m.batch_id, s.batch_id);
  select id, updated_at into r from public.penilaian_magang where nim = v_nim order by updated_at desc limit 1;
  return jsonb_build_object(
    'ok', true,
    'nama', coalesce(s.nama, m.nama_mahasiswa),
    'batch_id', coalesce(m.batch_id, s.batch_id),
    'batch', b.nama,
    'magang_id', m.id,
    'perusahaan', m.perusahaan,
    'posisi', m.posisi,
    'divisi', m.divisi,
    'kota', m.kota,
    'durasi', m.durasi,
    'mulai', m.mulai,
    'selesai', m.selesai,
    'sudah_mengisi', r.id is not null,
    'terakhir_diisi', r.updated_at
  );
end $$;

create or replace function public.kirim_penilaian_magang(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_nim text := regexp_replace(coalesce(p->>'nim', ''), '\s', '', 'g');
  v_perusahaan text := left(trim(coalesce(p->>'perusahaan', '')), 200);
  m record; s record; v_id text; v_rating int;
  k text;
begin
  if length(v_nim) < 6 or length(v_nim) > 20 then raise exception 'NIM tidak valid.'; end if;
  select * into m from public.magang where nim = v_nim order by coalesce(mulai, created_at::date) desc limit 1;
  select * into s from public.mahasiswa where nim = v_nim limit 1;
  if m is null and s is null then raise exception 'NIM tidak terdaftar sebagai mahasiswa IBM.'; end if;
  if v_perusahaan = '' then v_perusahaan := coalesce(m.perusahaan, ''); end if;
  if v_perusahaan = '' then raise exception 'Nama perusahaan wajib diisi.'; end if;
  foreach k in array array['rating_keseluruhan','rating_jobdesk','rating_lingkungan','rating_bimbingan','rating_kompensasi','rating_pengembangan'] loop
    v_rating := nullif(p->>k, '')::int;
    if v_rating is null or v_rating < 1 or v_rating > 5 then raise exception 'Semua penilaian bintang wajib diisi (1–5).'; end if;
  end loop;

  -- satu penilaian per mahasiswa per tempat magang; kirim ulang = memperbarui
  select id into v_id from public.penilaian_magang
   where nim = v_nim and lower(perusahaan) = lower(v_perusahaan) limit 1;
  if v_id is null then v_id := gen_random_uuid()::text; end if;

  insert into public.penilaian_magang as t (
    id, batch_id, magang_id, student_id, nim, nama_lengkap, email, perusahaan, posisi, divisi, kota,
    mulai, selesai, durasi, mode_kerja,
    rating_keseluruhan, rating_jobdesk, rating_lingkungan, rating_bimbingan, rating_kompensasi, rating_pengembangan,
    jobdesk_sesuai, lingkungan_cocok, kompensasi_diterima, kompensasi_sepadan, jam_kerja, beban_kerja,
    skill_didapat, kelebihan, kekurangan, rekomendasi, tawaran_kerja, saran, tampilkan_anonim,
    sumber, status_review, updated_by)
  values (
    v_id, coalesce(m.batch_id, s.batch_id), m.id, s.id, v_nim,
    left(coalesce(nullif(trim(p->>'nama_lengkap'), ''), s.nama, m.nama_mahasiswa), 150),
    left(nullif(trim(p->>'email'), ''), 150), v_perusahaan,
    left(nullif(trim(p->>'posisi'), ''), 150), left(nullif(trim(p->>'divisi'), ''), 150), left(nullif(trim(p->>'kota'), ''), 100),
    nullif(p->>'mulai', '')::date, nullif(p->>'selesai', '')::date, left(nullif(trim(p->>'durasi'), ''), 60),
    left(nullif(p->>'mode_kerja', ''), 20),
    (p->>'rating_keseluruhan')::int, (p->>'rating_jobdesk')::int, (p->>'rating_lingkungan')::int,
    (p->>'rating_bimbingan')::int, (p->>'rating_kompensasi')::int, (p->>'rating_pengembangan')::int,
    left(nullif(p->>'jobdesk_sesuai', ''), 20), left(nullif(p->>'lingkungan_cocok', ''), 20),
    left(nullif(p->>'kompensasi_diterima', ''), 200), left(nullif(p->>'kompensasi_sepadan', ''), 20),
    left(nullif(trim(p->>'jam_kerja'), ''), 150), left(nullif(p->>'beban_kerja', ''), 20),
    left(nullif(trim(p->>'skill_didapat'), ''), 2000), left(nullif(trim(p->>'kelebihan'), ''), 2000),
    left(nullif(trim(p->>'kekurangan'), ''), 2000), left(nullif(p->>'rekomendasi', ''), 20),
    left(nullif(p->>'tawaran_kerja', ''), 20), left(nullif(trim(p->>'saran'), ''), 2000),
    coalesce((p->>'tampilkan_anonim')::boolean, false),
    'Form publik', 'Baru', 'form:' || v_nim)
  on conflict (id) do update set
    batch_id = excluded.batch_id, magang_id = excluded.magang_id, student_id = excluded.student_id,
    nama_lengkap = excluded.nama_lengkap, email = excluded.email, posisi = excluded.posisi, divisi = excluded.divisi,
    kota = excluded.kota, mulai = excluded.mulai, selesai = excluded.selesai, durasi = excluded.durasi,
    mode_kerja = excluded.mode_kerja, rating_keseluruhan = excluded.rating_keseluruhan,
    rating_jobdesk = excluded.rating_jobdesk, rating_lingkungan = excluded.rating_lingkungan,
    rating_bimbingan = excluded.rating_bimbingan, rating_kompensasi = excluded.rating_kompensasi,
    rating_pengembangan = excluded.rating_pengembangan, jobdesk_sesuai = excluded.jobdesk_sesuai,
    lingkungan_cocok = excluded.lingkungan_cocok, kompensasi_diterima = excluded.kompensasi_diterima,
    kompensasi_sepadan = excluded.kompensasi_sepadan, jam_kerja = excluded.jam_kerja, beban_kerja = excluded.beban_kerja,
    skill_didapat = excluded.skill_didapat, kelebihan = excluded.kelebihan, kekurangan = excluded.kekurangan,
    rekomendasi = excluded.rekomendasi, tawaran_kerja = excluded.tawaran_kerja, saran = excluded.saran,
    tampilkan_anonim = excluded.tampilkan_anonim, status_review = 'Baru', updated_by = excluded.updated_by;

  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

revoke all on function public.magang_cek_nim(text) from public;
revoke all on function public.kirim_penilaian_magang(jsonb) from public;
grant execute on function public.magang_cek_nim(text) to anon, authenticated;
grant execute on function public.kirim_penilaian_magang(jsonb) to anon, authenticated;
