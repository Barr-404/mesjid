# Dokumentasi Fitur Baru - Sistem Masjid Muhammadiyah

## 🎨 Desain Minimalist

### Perubahan Desain UI
1. **Color Scheme Baru**
   - Background: `#fafafa` (abu-abu sangat terang)
   - Primary: `#10b981` (emerald)
   - Accent: Gradien dari emerald ke biru
   - Border: `#e5e7eb` (abu-abu terang)

2. **Komponen yang Diupdate**
   - ✅ Layout dengan background minimalist
   - ✅ Sidebar dengan border subtle (tanpa shadow berat)
   - ✅ Cards dengan border tipis dan shadow halus
   - ✅ Buttons dengan border-radius yang lebih rounded
   - ✅ Modal dengan shadow yang lebih lembut
   - ✅ Alert dengan border dan warna yang lebih soft

3. **Typography**
   - Font: Inter (system font)
   - Heading: font-semibold (bukan bold)
   - Body text: lebih ringan dengan spacing yang baik

## 💰 Fitur Donatur Bulanan

### Deskripsi
Fitur untuk mengelola donatur yang menyumbang secara rutin setiap bulan. Sistem akan tracking pembayaran bulanan dan histori donasi.

### Tabel Database

#### `donatur_bulanan`
- `id`: Primary key
- `nama`: Nama donatur
- `alamat`: Alamat donatur (optional)
- `no_telepon`: Nomor telepon (optional)
- `email`: Email donatur (optional)
- `jumlah_donasi`: Jumlah donasi per bulan
- `tanggal_mulai`: Tanggal mulai menjadi donatur
- `status`: 'aktif', 'non-aktif', 'berhenti'
- `metode_pembayaran`: 'transfer', 'tunai', 'auto-debit'
- `tanggal_pembayaran`: Tanggal pembayaran setiap bulan (1-31)
- `keterangan`: Catatan tambahan

#### `pembayaran_donatur`
- `id`: Primary key
- `donatur_id`: Foreign key ke donatur_bulanan
- `tanggal_bayar`: Tanggal pembayaran
- `bulan`: Bulan pembayaran (1-12)
- `tahun`: Tahun pembayaran
- `jumlah`: Jumlah yang dibayar
- `metode_pembayaran`: Metode pembayaran
- `status`: 'lunas', 'pending', 'terlambat'
- `bukti_pembayaran`: Path file bukti (optional)
- `keterangan`: Catatan tambahan

### API Endpoints

#### GET /api/donatur-bulanan
Mengambil semua data donatur bulanan
- Query params: `status` (optional)
- Response: Array donatur dengan total pembayaran

#### POST /api/donatur-bulanan
Menambahkan donatur baru
- Body: Data donatur (nama, jumlah_donasi, tanggal_mulai required)

#### GET /api/donatur-bulanan/[id]
Mengambil detail donatur dan histori pembayaran
- Response: Data donatur + array histori pembayaran

#### PUT /api/donatur-bulanan/[id]
Update data donatur
- Body: Field yang ingin diupdate

#### DELETE /api/donatur-bulanan/[id]
Menghapus donatur (cascade ke pembayaran)

#### POST /api/pembayaran-donatur
Mencatat pembayaran donatur
- Body: donatur_id, tanggal_bayar, bulan, tahun, jumlah
- Otomatis update kas_harian

#### GET /api/pembayaran-donatur
Mengambil histori pembayaran
- Query params: `donatur_id`, `tahun`

### Fitur UI
- ✅ Dashboard donatur bulanan
- ✅ Card untuk setiap donatur dengan info lengkap
- ✅ Form tambah donatur baru
- ✅ Form catat pembayaran
- ✅ Stats: Total donatur aktif, target per bulan
- ✅ Search donatur
- ✅ Status badge (aktif/non-aktif)

## 🐑 Fitur Tabungan Qurban

### Deskripsi
Fitur untuk mengelola tabungan hewan qurban dengan sistem cicilan. Penabung dapat menabung secara bertahap hingga target terpenuhi.

### Tabel Database

#### `tabungan_qurban`
- `id`: Primary key
- `nama_penabung`: Nama penabung
- `alamat`: Alamat (optional)
- `no_telepon`: Nomor telepon (optional)
- `email`: Email (optional)
- `jenis_hewan`: 'kambing', 'sapi', 'domba'
- `target_tabungan`: Target jumlah tabungan
- `total_terkumpul`: Total yang sudah terkumpul
- `sisa_kekurangan`: Sisa yang perlu dibayar
- `tanggal_mulai`: Tanggal mulai menabung
- `target_qurban_tahun`: Target tahun qurban (Hijriah)
- `status`: 'menabung', 'terpenuhi', 'diambil', 'dibatalkan'
- `keterangan`: Catatan tambahan

#### `cicilan_qurban`
- `id`: Primary key
- `tabungan_id`: Foreign key ke tabungan_qurban
- `tanggal_bayar`: Tanggal pembayaran cicilan
- `jumlah`: Jumlah cicilan
- `metode_pembayaran`: 'tunai', 'transfer', 'qris'
- `bukti_pembayaran`: Path file bukti (optional)
- `petugas`: Nama petugas yang menerima
- `keterangan`: Catatan tambahan

#### `pengambilan_qurban`
- `id`: Primary key
- `tabungan_id`: Foreign key ke tabungan_qurban
- `tanggal_pengambilan`: Tanggal pengambilan hewan
- `jenis_hewan`: Jenis hewan yang diambil
- `jumlah_hewan`: Jumlah hewan
- `harga_hewan`: Harga hewan
- `supplier`: Nama supplier (optional)
- `keterangan`: Catatan tambahan
- `petugas`: Nama petugas

### API Endpoints

#### GET /api/tabungan-qurban
Mengambil semua tabungan qurban
- Query params: `status`, `tahun`
- Response: Array tabungan dengan persentase progress

#### POST /api/tabungan-qurban
Membuat tabungan qurban baru
- Body: Data tabungan (nama_penabung, jenis_hewan, target_tabungan required)

#### GET /api/tabungan-qurban/[id]
Mengambil detail tabungan dengan histori cicilan
- Response: Data tabungan + histori cicilan + pengambilan

#### PUT /api/tabungan-qurban/[id]
Update data tabungan
- Body: Field yang ingin diupdate

#### DELETE /api/tabungan-qurban/[id]
Menghapus tabungan (cascade ke cicilan)

#### POST /api/cicilan-qurban
Bayar cicilan tabungan
- Body: tabungan_id, tanggal_bayar, jumlah
- Otomatis update total_terkumpul, sisa_kekurangan
- Otomatis update status jika terpenuhi
- Otomatis update kas_harian

#### GET /api/cicilan-qurban
Mengambil histori cicilan
- Query params: `tabungan_id`

### Fitur UI
- ✅ Dashboard tabungan qurban
- ✅ Card untuk setiap tabungan dengan progress bar
- ✅ Emoji icon hewan (🐐🐄🐏)
- ✅ Form buat tabungan baru
- ✅ Form bayar cicilan
- ✅ Progress indicator visual
- ✅ Stats: Tabungan aktif, total terkumpul, target total
- ✅ Search penabung
- ✅ Status badge dengan warna berbeda
- ✅ Info persentase tercapai

## 🔧 Cara Install

### 1. Update Database Schema
```bash
# Jalankan migration SQL
psql -U username -d database_name -f database/add-new-features.sql
```

Atau melalui script:
```bash
npm run db:migrate
```

### 2. Restart Server
```bash
npm run dev
```

### 3. Akses Menu Baru
- Donatur Bulanan: `/donatur-bulanan`
- Tabungan Qurban: `/tabungan-qurban`

## 📱 Fitur-fitur

### Donatur Bulanan
- ✅ Tambah donatur baru
- ✅ Edit donatur
- ✅ Hapus donatur
- ✅ Catat pembayaran bulanan
- ✅ Lihat histori pembayaran
- ✅ Filter berdasarkan status
- ✅ Search donatur
- ✅ Auto update kas harian

### Tabungan Qurban
- ✅ Buat tabungan baru
- ✅ Bayar cicilan kapan saja
- ✅ Progress tracking visual
- ✅ Auto kalkulasi sisa
- ✅ Status otomatis (menabung → terpenuhi)
- ✅ Histori cicilan lengkap
- ✅ Filter berdasarkan tahun/status
- ✅ Search penabung
- ✅ Auto update kas harian

## 🎯 Best Practices

### Donatur Bulanan
1. Set tanggal pembayaran sesuai kesepakatan
2. Catat pembayaran tepat waktu
3. Update status jika donatur berhenti
4. Backup bukti pembayaran jika ada

### Tabungan Qurban
1. Set target realistis sesuai harga pasar
2. Cicil secara berkala
3. Catat setiap pembayaran dengan detail
4. Monitor progress secara rutin
5. Koordinasi dengan supplier sebelum Idul Adha

## 🔒 Security
- Validasi input di frontend dan backend
- Sanitasi data sebelum query
- Transaction untuk operasi penting
- Cascade delete untuk data terkait
- Error handling yang baik

## 📊 Reporting
Kedua fitur ini terintegrasi dengan:
- Kas Harian (auto update)
- Laporan Keuangan
- Dashboard utama

## 🎨 Design System

### Colors
- Emerald: Zakat & Kas
- Blue: Donatur Bulanan  
- Purple: Tabungan Qurban
- Orange: Pengeluaran
- Red: Danger actions

### Components
- Card: border-radius 12px, shadow-sm
- Button: border-radius 8px, font-medium
- Modal: border-radius 12px, backdrop blur
- Alert: border-radius 12px, icon left

## 🚀 Future Enhancements
- [ ] Notifikasi otomatis untuk donatur bulanan
- [ ] Reminder pembayaran
- [ ] Export laporan donatur/tabungan
- [ ] Dashboard analytics
- [ ] WhatsApp integration
- [ ] Email notification
- [ ] Print bukti pembayaran
- [ ] QR Code untuk pembayaran
