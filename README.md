# Data Induk Siswa

Aplikasi web untuk mengelola data induk siswa (CRUD), dibangun dengan
**Next.js**, **Tailwind CSS**, dan **Supabase**.

## Fitur

- Login admin (Supabase Auth)
- Daftar siswa: pencarian nama/NISN/NIPD, pagination
- Tambah & edit siswa lewat form multi-tab: Data Pribadi, Alamat & Kontak,
  Orang Tua & Wali, Akademik, Bantuan & Ekonomi
- Hapus data siswa dengan konfirmasi
- Proteksi halaman: hanya bisa diakses setelah login

## 1. Setup Supabase

1. Buka project Supabase Anda -> **SQL Editor**.
2. Jalankan isi file `supabase/schema-and-policies.sql`. File ini:
   - Membuat ulang tabel `siswa01` dengan **perbaikan bug**: constraint
     `status_siswa` pada file asli Anda mereferensikan kolom
     `status_alumni` yang tidak ada di tabel, sehingga query tersebut
     akan gagal dijalankan. Sudah diperbaiki menjadi `status_siswa`.
   - Menambahkan **RLS policy** agar user yang sudah login (admin) bisa
     select/insert/update/delete data. Tanpa policy ini, RLS yang sudah
     aktif akan memblokir semua akses meski Anda sudah login.
3. Buat akun admin: **Authentication -> Users -> Add user**, isi email &
   password. Akun inilah yang dipakai untuk login di aplikasi.
4. Ambil kredensial di **Project Settings -> API**:
   - `Project URL`
   - `anon public` key

## 2. Setup Lokal

```bash
npm install
cp .env.local.example .env.local
```

Isi `.env.local` dengan kredensial Supabase Anda:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=isi-anon-key-anda
```

Jalankan mode development:

```bash
npm run dev
```

Buka `http://localhost:3000` -- akan otomatis diarahkan ke `/login`.

## 3. Deploy ke Vercel

1. Push project ini ke repository GitHub.
2. Buka vercel.com -> **New Project** -> import repo.
3. Di bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Klik **Deploy**. Selesai -- Next.js otomatis dikenali tanpa konfigurasi
   tambahan.

## 4. Deploy ke Netlify

1. Push project ini ke repository GitHub.
2. Buka netlify.com -> **Add new site** -> import repo.
3. Netlify akan otomatis mendeteksi Next.js dan memasang
   `@netlify/plugin-nextjs`. Build command: `next build`, publish
   directory bisa dibiarkan default.
4. Tambahkan environment variables yang sama seperti di atas pada
   **Site settings -> Environment variables**.
5. Klik **Deploy site**.

## Struktur Folder Penting

```
src/
├── app/
│   ├── login/page.tsx              # Halaman login
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + proteksi login
│   │   └── siswa/
│   │       ├── page.tsx            # Daftar siswa
│   │       ├── tambah/page.tsx     # Form tambah siswa
│   │       └── [id]/page.tsx       # Form edit siswa
├── components/
│   ├── SiswaForm.tsx                # Form multi-tab (inti CRUD)
│   ├── SidebarNav.tsx
│   └── form-fields.tsx              # Komponen input reusable
├── lib/supabase/                    # Client Supabase (browser/server/proxy)
├── types/siswa.ts                   # Tipe data & opsi dropdown
└── proxy.ts                         # Proteksi route (dulu middleware.ts)

supabase/schema-and-policies.sql      # Skema tabel + RLS policy (perbaikan bug)
```

## Menambah Field Baru

Kalau nanti Anda menambah kolom baru di tabel `siswa01`:

1. Tambahkan field-nya di `src/types/siswa.ts` (interface `Siswa`).
2. Tambahkan `<TextField />` / `<SelectField />` yang sesuai di
   `src/components/SiswaForm.tsx`, di tab yang paling relevan.
3. Kalau ingin field itu tampil di kolom tabel daftar siswa, tambahkan di
   query `select(...)` pada `src/app/(dashboard)/siswa/page.tsx`.
