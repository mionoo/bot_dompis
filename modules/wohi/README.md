# Laporan WO HI

Mengambil semua tiket `piloting_tickets` yang dibuka hari ini berdasarkan
`reported_date` dalam WIB, tanpa filter status atau klasifikasi sumber.
`CLOSED` (setelah trim dan normalisasi kapitalisasi) dihitung CLOSE; seluruh
status lain dihitung OPEN. Tidak ada perhitungan SLA.

Kategori memakai fungsi classifyTicket existing, dengan masukan segmen/jenis
pelanggan/layanan yang dinormalisasi. Kategori yang tidak dikenali masuk LAINNYA,
bukan dihapus. Workzone dipetakan ke branch melalui collection groups existing.
Incident unik dihitung satu kali; duplikat memakai updated_at terbaru.
Data tanpa pemetaan branch dicatat dan jumlahnya dibalas pada tes manual.

## Konfigurasi dan penggunaan

1. Gunakan akun MySQL SELECT saja dan pastikan reported_date disimpan sebagai
   waktu WIB. Koneksi mengikuti FFG_MYSQL_*; opsional WOHI_MYSQL_* menggantikannya.
   Lihat .env.wohi.example. Tidak diperlukan tabel atau migrasi MySQL baru.
2. Restart bot setelah pembaruan. Kirim `/wohi_SURABAYA` di grup/topik tujuan.
   Ganti SURABAYA dengan branch yang terdaftar. Binding tersimpan di wohi_groups,
   terpisah dari grup FFG/B2B. Hanya binding ACTIVE yang menerima laporan.
3. Kirim `/teswohi` lewat japri bot untuk mengirim ke seluruh binding WO HI.
   Command langsung membalas lalu masuk antrean bersama laporan existing.
4. Atur WOHI_ENABLED=1 untuk jadwal setiap jam. Job WO HI berjalan setelah
   operasional dan FFG pada antrean test.js. Tidak ada cron tambahan.
   Default nonaktif sampai tujuan dan data selesai ditinjau.

Ringkasan Telegram: Kategori | OPEN | CLOSE | TOTAL. Excel memuat tab Ringkasan
dan Semua Tiket, termasuk kategori, bucket OPEN/CLOSE, status asli, dan seluruh
kolom sumber. Ringkasan dan detail berasal dari hasil SELECT yang sama agar
angka konsisten. Nomor service disimpan sebagai teks. Semua string Excel adalah
nilai literal, bukan formula. Tidak menyimpan salinan tiket permanen di MongoDB.

Laporan kosong tidak dikirim dan alasan tercatat di console. wohi_deliveries
mencatat pengiriman per periode/tujuan, tahap gagal, serta hasil pesan/Excel.
UNKNOWN tidak dicoba ulang otomatis karena kiriman mungkin sudah sampai.
Tes manual memakai kunci terpisah dan tidak memengaruhi jadwal otomatis.

Tanggal laporan mengikuti waktu jadwal awal, walaupun job mengantre sampai hari
berikutnya. Status mengikuti data MySQL saat SELECT dijalankan, bukan rekonstruksi
status historis. Validator yang belum memperbarui INSERA dapat membuat status
laporan tertinggal. Jangan menjalankan beberapa proses scheduler sekaligus.

Pengujian lokal tidak mengakses database/API atau mengirim Telegram:
`node --test tests/wohi.test.js`.
