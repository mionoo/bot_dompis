# GAUL — gangguan ulang CUSTOMER

DOWNLOAD_AREA3 memasukkan tiket baru CUSTOMER ke antrean SQLite lokal setelah
commit MySQL. Worker memeriksa incident lain dengan service_no yang sama, sumber
CUSTOMER dan status CLOSED. Riwayat dipilih dari reported_date yang paling dekat
sebelum tiket baru. Tiket GAUL dibuka sebelum tanggal riwayat + 3 bulan kalender
WIB; tanggal akhir bulan disesuaikan bila bulan tujuan lebih pendek. Tepat di
batas tiga bulan tidak termasuk. status_date tidak dipakai untuk pencocokan.

Antrean lokal dipertahankan saat restart dan dicoba ulang jika pembacaan MySQL
atau penyimpanan Mongo gagal. Karena commit MySQL dan antrean lokal terpisah,
tiket bisa terlewat jika proses berhenti di antara keduanya atau file antrean
tidak dapat ditulis. Kegagalan menulis antrean dicatat. Tiket yang sudah tersimpan
sebelum aktivasi tidak diperiksa ulang otomatis.

- Di scraper, pasang pymongo seperti konfigurasi FFG dan atur GAUL_ENABLED=1.
  Lihat DOWNLOAD_AREA3/.env.gaul.example. Mongo dapat memakai konfigurasi FFG
  atau GAUL_MONGO_URI dan GAUL_MONGO_DATABASE, dengan database yang sama dengan bot.
  Simpan gaul_pending.sqlite3 di volume persisten; jangan masukkan ke Git.
- Pada bot, koneksi baca MySQL memakai GAUL_MYSQL_* atau FFG_MYSQL_*.
- Binding: /gaul_SURABAYA@NamaBot di grup/topik tujuan. Tes: /tesgaul lewat japri
  mengirim ke binding aktif. Jadwal otomatis aktif dengan GAUL_ENABLED=1 di .env
  bot; setiap jam WIB melalui test.js, sebelum pembersihan segment_tickets.
- gaul_tickets menyimpan pasangan incident unik. Status selalu diverifikasi dari
  MySQL; CLOSED menghentikan pengingat dan tidak menghapus riwayat. Jika status
  tidak tersedia, tiket tidak dikirim pada siklus itu. Segmentasi dan pemetaan
  workzone dipakai untuk menentukan service area dan branch. Jika tidak ada
  pemetaan yang dapat dipakai, tiket tidak dapat diarahkan ke grup.
- Pengingat mencantumkan kedua incident dan tanggal laporan, nomor service,
  workzone serta SLA existing. PIC KORLAP, OSA, HSA, dan Officer 3 ditag melalui ID Telegram
  sesuai service area dan branch jika terisi. Telegram menentukan apakah tag
  berbasis ID dapat memberi notifikasi kepada pengguna.
- Pengiriman per tujuan dan periode disimpan di gaul_deliveries. Kiriman tidak
  pasti tidak diulang pada periode yang sama. Jadwal berikutnya tetap mencoba.

Tidak ada migrasi tabel MySQL. Tes lokal:
node --test tests/gaul.test.js
