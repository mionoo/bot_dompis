# FFG Dompis

Python `DOWNLOAD_AREA3` memeriksa tiket baru setelah commit MySQL dan menyimpan
detail tiket MATCH ke collection `ffg_tickets`. Bot Node.js menangani sinkronisasi
status, perhitungan SLA, dan laporan Telegram.

Notifikasi login INSERA tetap memakai mekanisme existing. Tidak diperlukan
perubahan Apps Script atau migrasi tabel MySQL. Collection MongoDB `ffg_tickets`,
`ffg_state`, dan `ffg_deliveries`, dan `ffg_groups` terpisah dari collection operasional yang dihapus
oleh `test.js`.

## Persiapan dan aktivasi

1. Periksa skema asli `piloting_tickets`, termasuk keunikan `incident`, tipe teks
   pada `service_no`, serta kolom tanggal dan status yang diperbarui validator.
   Siapkan akun MySQL dengan izin SELECT saja yang dapat diakses dari bot-dompis.
2. Isi konfigurasi Node.js sesuai `.env.ffg.example`. Untuk Python, isi `config.py`
   di `DOWNLOAD_AREA3`; environment variable dapat menggantikan nilai tersebut.
   Gunakan token Apps Script yang sudah dirotasi.
3. Daftarkan tujuan FFG dengan command `/ffg_SURABAYA` di grup atau topik tujuan.
   Ganti SURABAYA dengan branch yang terdaftar pada data master. Binding disimpan
   di collection `ffg_groups`, terpisah dari TTR/B2B. Kedua jadwal memakai tujuan
   yang sama. Satu branch dapat memiliki beberapa tujuan grup atau topik.
4. Pasang dependensi Node.js dengan `npm ci`. Uji menggunakan database MongoDB
   percobaan dan pemetaan grup percobaan terlebih dahulu. Tanggal MySQL dianggap
   sebagai waktu WIB; pastikan sesuai dengan data sumber.
5. Aktifkan `FFG_ENABLED=1` di Node.js dan konfigurasi Python. Jalankan satu worker
   dengan `npm run ffg:worker`, terpisah dari bot yang dijalankan dengan `npm start`.
   Worker Node.js hanya menyinkronkan status; scraper Python melakukan matching
   dan penyimpanan langsung ke MongoDB. Gunakan pengelola proses. Kunci MySQL
   mencegah dua worker sinkronisasi berjalan bersamaan.
6. Uji perubahan OPEN ke CLOSE, empat status penghenti SLA, batas hari WIB,
   timeout API Python, kegagalan penyimpanan, restart, dan pengiriman Excel.
   Pengujian lokal tidak mengirim pesan ke grup produksi.

## Alur pemeriksaan dan sinkronisasi

- Matching dilakukan oleh `DOWNLOAD_AREA3/ffg_checker.py` untuk tiket baru yang
  sudah di-commit. Tidak ada matching atau batas tanggal awal di Node.js.
  Python mencoba ulang kegagalan maksimal tiga kali. Pekerjaan yang hilang saat
  proses berhenti tidak dipulihkan otomatis. Lihat `DOWNLOAD_AREA3/README_FFG.md`.
- Hanya tiket MATCH dengan `status_validasi=OPEN` di MongoDB yang disinkronkan
  dari MySQL. Pencarian berdasarkan incident tetap mengambil perubahan terakhir
  ke CLOSE. Setelah perubahan disimpan, tiket CLOSE tidak disinkronkan lagi.
- Tiket CLOSE tetap tersedia untuk rekap per jam dan Excel tanpa batas usia
  sinkronisasi per tiket. Tiket yang dibuka kembali tidak terdeteksi otomatis.
- Dokumen versi lama mengambil `ticket.status_validasi` jika tersedia. Nilai
  yang hilang atau tidak diketahui tidak otomatis dianggap OPEN.
- Incident yang tidak ditemukan di sumber mempertahankan status terakhir,
  mendapat `sync_error`, dan dikecualikan dari laporan. Kegagalan sinkronisasi
  tidak mengubah data sumber MySQL.

## Jadwal notifikasi dan SLA

- Setiap 15 menit sepanjang hari: tiket FFG aktif dengan `status_validasi=OPEN`
  dari seluruh tanggal laporan, beserta SLA, tanpa Excel.
  Format mengikuti TTR HD: kelompok HSA, lalu segmen dan tahap SLA; setiap baris
  berisi indikator warna, incident, sisa waktu jam:menit, workzone, serta booking
  date jika tersedia. Tiket paling mendesak berada di atas pada tiap kelompok.
  Pesan panjang dipecah dengan judul, HSA dan segmen diulang pada pesan lanjutan.
- Status `CLOSED`, `RESOLVED`, `MEDIACARE`, dan `SALAMSIM` menghentikan SLA.
  Status kosong, UNKNOWN, dan STATUS tidak masuk notifikasi aktif.
- Setiap 1 jam: seluruh tiket FFG yang dilaporkan pada hari tersebut dalam WIB,
  semua status, dengan lampiran XLSX yang memuat seluruh kolom sumber.
  Pada menit 00, kedua laporan dikirim.
- SLA menggunakan `classifyTicket` dan `SLA_MAPS` existing, dengan nilai default
  24 jam. Pemilihan tahap mengikuti B2B, dengan kategori SAFE, WARNING, CRITICAL,
  dan OVER SLA. Untuk tiket selesai, waktu berhenti memakai `status_date`, atau
  `resolve_date` jika tidak tersedia. Waktu berhenti yang hilang ditandai,
  bukan diganti waktu sekarang. Nomor service di Excel disimpan sebagai teks.
- Tujuan pengiriman memakai binding `ffg_groups` yang ACTIVE. Tiket dikelompokkan
  per branch berdasarkan workzone pada pemetaan MongoDB existing; bot memakai
  ZONEBOT branch tersebut. `FFG_GROUP_TYPE` tidak digunakan lagi. Tiket tanpa pemetaan dicatat
  dan tidak dikirim ke grup sembarang. Laporan dilewati jika sinkronisasi sumber
  terlalu lama, default 10 menit. Laporan kosong tidak dikirim.

## Pencegahan pengiriman ganda

Setiap tujuan dan periode memiliki kunci pengiriman unik. Status SENDING atau
UNKNOWN setelah proses berhenti atau pengiriman sebagian tidak dicoba ulang
secara otomatis. Periksa pesan Telegram sebelum menghapus kunci pengiriman
secara manual untuk mengizinkan percobaan ulang pada periode yang sama.
Periode berikutnya berdiri sendiri; sistem tidak menjamin pengiriman tepat satu
kali pada seluruh kemungkinan gangguan.

## Pengujian lokal

Dari folder `bot_12Agustus`, jalankan:

```bash
npm run test:ffg
```

Pengujian menggunakan data contoh dan simulasi, tanpa koneksi MySQL/MongoDB,
pemanggilan Apps Script, atau pengiriman Telegram. Excel diperiksa dengan
membuat lalu membaca kembali isinya secara lokal.

## Batasan

Tiket sebelum aktivasi FFG Python tidak diperiksa otomatis. Pekerjaan background
yang hilang atau gagal setelah seluruh percobaan memerlukan pemulihan manual.
Hasil matching disimpan per incident; perubahan spreadsheet memerlukan aturan
pemeriksaan ulang yang belum diterapkan. Tiket CLOSE tidak disinkronkan ulang,
sehingga pembukaan kembali tidak terdeteksi. Sinkronisasi tidak memperbaiki
tanggal sumber yang keliru atau validator yang belum memperbarui status INSERA.
