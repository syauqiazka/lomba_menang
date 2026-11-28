This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Setup Dataset

Project ini sudah menyertakan GeoJSON Indonesia siap pakai di `public/geo/` (`provinces.geojson` 38 provinsi, `regencies.geojson`, dan `regencies/<code>.geojson` per provinsi).

Dataset mentah batas administrasi BIG (~3.99 GB penuh) di-host di Hugging Face (`syauqisadsaa/lomba`) dan tidak ikut di-commit ke GitHub.

### 1. Buat Virtual Environment & Install Dependensi Python

Membutuhkan Python 3.10+ dan Node.js 20+:

```bash
python -m venv .venv
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Download Dataset dari Hugging Face

Jalankan script otomatis sesuai kebutuhan storage:

```bash
# Mode default (ringan ~0.8 MB: hanya atribut, metadata & script)
python setup_data.py

# Mode consolidated (~2.0 GB: atribut + regency-city-geometries-514.json tanpa batch duplikat)
python setup_data.py --mode consolidated

# Mode full (~4.0 GB: seluruh file termasuk batch mentah & recovered)
python setup_data.py --mode full
```

Atau secara manual menggunakan Hugging Face CLI:

```bash
huggingface-cli download syauqisadsaa/lomba --repo-type dataset --local-dir ./data/raw
```

> Catatan: Folder `data/raw/big-administrative-boundaries/` sudah ditambahkan ke `.gitignore` agar file dataset besar tidak ikut ter-commit ke Git.

### 3. Install Dependensi Node.js & Verifikasi

```bash
npm install
npm test
npm run typecheck
python check_provinces.py
```

Untuk menjalankan development server:

```bash
npm run dev
```

