/* =========================================================================
   Generator berkas Supabase dari assets/js/schema.js
   Jalankan dari folder proyek:   node tools/build-supabase.mjs
   Menghasilkan:
     supabase/schema.sql            → tabel, keamanan (RLS), storage, superadmin
     supabase/template-csv/*.csv    → header kosong untuk impor per menu
     supabase/data-awal/*.csv       → (opsional, --data-awal) data hasil konversi spreadsheet IBM
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA, dbColumns, toRow } from '../assets/js/schema.js';
import { buildSeed } from '../assets/js/data/seed.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), s); };

const SQLTYPE = { text: 'text', int: 'integer', num: 'numeric', date: 'date', bool: 'boolean', json: 'jsonb', list: 'text' };
const INDEX_COLS = ['batch_id', 'student_id', 'course_id', 'schedule_id', 'periode', 'tanggal', 'nim'];
// Tabel yang id-nya diisi manual di CSV (dipakai sebagai referensi oleh tabel lain)
const ID_IN_TEMPLATE = new Set(['batch', 'pengaturan']);

let sql = `-- =========================================================================
-- DASHBOARD IBM — skema Supabase (dibuat otomatis oleh tools/build-supabase.mjs)
-- Aman dijalankan ulang. Jalankan di Supabase → SQL Editor → New query → Run.
-- =========================================================================

-- 1) SUPERADMIN ---------------------------------------------------------------
-- Hanya email yang terdaftar di tabel ini yang bisa membaca/menulis data.
create table if not exists public.admin_pengguna (
  email      text primary key,
  nama       text not null,
  sapaan     text,
  peran      text not null default 'superadmin',
  created_at timestamptz not null default now()
);
alter table public.admin_pengguna enable row level security;

-- Fungsi pengecek berada di schema "private" (tidak terekspos ke API).
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_pengguna a
    where lower(a.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "admin_pengguna_baca" on public.admin_pengguna;
create policy "admin_pengguna_baca" on public.admin_pengguna
  for select to authenticated using ((select private.is_admin()));

insert into public.admin_pengguna (email, nama, sapaan) values
  ('ibm@asia.ac.id',   'Admin IBM',               'Admin IBM'),
  ('danar@asia.ac.id', 'Karolus Danar Kurniawan', 'Pak Karolus')
on conflict (email) do nothing;

-- 2) FUNGSI BANTU ---------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce((select auth.jwt() ->> 'email'), new.updated_by);
  return new;
end $$;

-- 3) TABEL PER MENU ---------------------------------------------------------------
`;

for (const [key, t] of Object.entries(SCHEMA)) {
  const cols = t.cols.flatMap(c => c.type === 'att'
    ? [`  ${c.name}_label text`, `  ${c.name}_link text`, `  ${c.name}_file jsonb`]
    : [`  ${c.name} ${SQLTYPE[c.type] || 'text'}`]);
  sql += `
-- ${t.menu}: ${t.desc}
create table if not exists public.${t.table} (
  id text primary key default gen_random_uuid()::text,
${cols.join(',\n')},
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);
comment on table public.${t.table} is ${quote(`${t.menu} — ${t.desc}`)};
alter table public.${t.table} enable row level security;
drop policy if exists "${t.table}_superadmin" on public.${t.table};
create policy "${t.table}_superadmin" on public.${t.table}
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop trigger if exists ${t.table}_updated on public.${t.table};
create trigger ${t.table}_updated before insert or update on public.${t.table}
  for each row execute function public.set_updated_at();
`;
  for (const c of t.cols) if (INDEX_COLS.includes(c.name)) sql += `create index if not exists ${t.table}_${c.name}_idx on public.${t.table} (${c.name});\n`;
  for (const c of t.cols) if (c.note) sql += `comment on column public.${t.table}.${c.name}${c.type === 'att' ? '_link' : ''} is ${quote(c.note)};\n`;
}

sql += `
-- 4) PENYIMPANAN BERKAS (bukti transfer, RPS, OBE, sertifikat, dll.) ---------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('dashboard-files', 'dashboard-files', false, 15728640)
on conflict (id) do nothing;

drop policy if exists "dashboard_files_baca"  on storage.objects;
drop policy if exists "dashboard_files_tulis" on storage.objects;
drop policy if exists "dashboard_files_ubah"  on storage.objects;
drop policy if exists "dashboard_files_hapus" on storage.objects;
create policy "dashboard_files_baca"  on storage.objects for select to authenticated using (bucket_id = 'dashboard-files' and (select private.is_admin()));
create policy "dashboard_files_tulis" on storage.objects for insert to authenticated with check (bucket_id = 'dashboard-files' and (select private.is_admin()));
create policy "dashboard_files_ubah"  on storage.objects for update to authenticated using (bucket_id = 'dashboard-files' and (select private.is_admin()));
create policy "dashboard_files_hapus" on storage.objects for delete to authenticated using (bucket_id = 'dashboard-files' and (select private.is_admin()));
`;
sql += `
-- 5) FORM PUBLIK PENILAIAN MAGANG (penilaian-magang.html, dibagikan lewat bit.ly) ----
` + fs.readFileSync(path.join(root, 'supabase/sql/form-penilaian-magang.sql'), 'utf8');
out('supabase/schema.sql', sql);

/* ---------- CSV ---------- */
const esc = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
// Tanpa BOM agar nama kolom pertama terbaca persis oleh importer CSV Supabase
const csv = (rows) => rows.map(r => r.map(esc).join(',')).join('\n') + '\n';
// data-awal hanya dibuat ulang bila diminta (node tools/build-supabase.mjs --data-awal),
// karena data asli kini tersimpan di Supabase dan id-nya harus tetap stabil.
const WITH_SEED = process.argv.includes('--data-awal');
const seed = WITH_SEED ? buildSeed() : {};
const order = [];
for (const [key, t] of Object.entries(SCHEMA)) {
  const cols = t.cols.flatMap(dbColumns).filter(c => !c.endsWith('_file'));
  const head = ID_IN_TEMPLATE.has(t.table) ? ['id', ...cols] : cols;
  out(`supabase/template-csv/${t.table}.csv`, csv([head]));
  const rows = (seed[key] || []);
  if (rows.length) {
    const full = ['id', ...cols];
    out(`supabase/data-awal/${t.table}.csv`, csv([full, ...rows.map(r => { const row = toRow(key, r); return full.map(c => row[c]); })]));
    order.push(`${t.table}.csv (${rows.length} baris)`);
  }
}
console.log('schema.sql OK ·', Object.keys(SCHEMA).length, 'tabel');
if (WITH_SEED) console.log('data-awal:', order.join(', '));

function quote(s) { return `'${String(s).replace(/'/g, "''")}'`; }
