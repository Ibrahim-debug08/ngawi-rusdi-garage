# 🏍️ Ngawi Rusdi Garage - Sistem Manajemen Bengkel Motor

Aplikasi web manajemen bengkel motor modern dengan antarmuka bertema **Racing (Hitam & Merah Maroon)** yang dirancang untuk efisiensi admin bengkel dalam mengelola alur kerja servis, pengerjaan montir, dan transaksi pelanggan.

---

## 🏁 Fitur Utama

1. **🏎️ Dashboard & Statistik Real-Time**
   - Ringkasan unit aktif, antrian, pengerjaan, selesai hari ini, dan total pendapatan harian.
   - Filter cepat berdasarkan status pengerjaan: Antrian, Dikerjakan, Menunggu Part, Selesai, Diambil.

2. **📝 Registrasi Kendaraan Masuk**
   - Input data pelanggan (Nama, No. Telepon).
   - Data detail motor (Merk, Tipe/Model, No. Plat, Tahun, Warna).
   - Pemilihan paket servis / jasa dengan kalkulasi estimasi biaya langsung.
   - Input keluhan kerusakan & penugasan nama mekanik.

3. **🔧 Daftar Layanan & Jasa (10+ Pilihan)**
   - Service Ringan (Ganti oli, cek kelistrikan, rem, filter)
   - Service Besar / Tune Up Lengkap
   - Ganti Ban & Balancing
   - Service Injeksi / Karburator & Kalibrasi ECU
   - Perbaikan Body & Cat Oven
   - Overhaul Mesin Total
   - Service CVT (Motor Matic)
   - Ganti Kampas Rem & Bleeding System
   - Spooring & Lurusin Rangka Motor
   - Kelistrikan & Rewiring Body

4. **🔄 Pelacakan & Pengubahan Status Pengerjaan**
   - Transisi status: `Antrian` ➔ `Sedang Dikerjakan` ➔ `Menunggu Part` ➔ `Selesai` ➔ `Sudah Diambil`.
   - Update nama montir/mekanik penanggung jawab & catatan teknisi.
   - Fitur penambahan biaya tambahan (sparepart ekstra, pengerjaan darurat) beserta keterangannya.

5. **🧾 Struk Pembayaran / Resi Digital (Bisa Cetak/Print)**
   - Format nomor resi unik otomatis: `NRG-YYYYMMDD-XXXX`.
   - Rincian item servis, biaya tambahan, subtotal, dan metode pembayaran (Cash, Transfer Bank, QRIS, e-Wallet).
   - Desain struk thermal profesional dengan garansi servis dan fitur cetak langsung (*window.print*).

6. **🗑️ Manajemen & Penghapusan Data Selesai**
   - Fitur penghapusan unit yang sudah selesai / diambil dengan konfirmasi dialog aman.

7. **🎨 Desain Nuansa Racing (Hitam & Merah Maroon)**
   - Dark theme modern dengan palet warna Maroon Red (`#8B0000`, `#C41E3A`) dan Jet Black.
   - Aksen racing stripe, status badge responsif, serta typography sporty.

---

## 🛠️ Tech Stack

- **Backend**: Node.js & Express.js
- **Database**: SQLite (better-sqlite3 / WAL Mode)
- **Frontend**: Single Page Application (Vanilla JavaScript, Modern HTML5, Responsive CSS3)
- **Desain**: Racing Theme (Black & Maroon Red)

---

## 🚀 Cara Menjalankan Aplikasi

1. **Clone repository**:
   ```bash
   git clone <repo-url>
   cd EXPECTIK
   ```

2. **Install dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan server**:
   ```bash
   npm start
   ```

4. **Buka di browser**:
   ```
   http://localhost:3000
   ```

---

© 2026 Ngawi Rusdi Garage — *Speed • Power • Trust*
