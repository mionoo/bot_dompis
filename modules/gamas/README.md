# Report GAMAS

Tambahkan salah satu bot operasional ke grup Telegram khusus GAMAS. Admin grup
menjalankan `/setgamas` di grup atau topik tujuan. Binding disimpan di collection
`idgroupgamas`, termasuk bot yang menerima command. Setiap tujuan menerima seluruh
GAMAS AREA 3; tidak difilter berdasarkan alokasi branch bot.

Scheduler `test.js` memanggil `runGamas()` setelah segmentasi dan sebelum koleksi
sementara dibersihkan, hanya pada jadwal menit 00 setiap jam selama 24 jam,
zona Asia/Jakarta. Modul lain tetap mengikuti jadwal 15 menit/jam yang ada.
Penanda pengiriman GAMAS mengikuti waktu jadwal cron dan dipertahankan saat
antrean digantikan job terbaru, sehingga tidak hilang bila proses terlambat. Restart proses bot setelah memasang perubahan.
Tidak ada pengiriman langsung saat binding.

Sumber laporan hanya `segment_tickets`, jenis GAMAS dan GAMAS_FEEDER/GPON/
DISTRIBUSI/ODP/ODC, tanpa filter status tambahan. Incident dideduplikasi.
Urutan pesan: pembuka, BRANCH beserta jumlahnya, lalu satu pesan per incident.
Judul incident menyertakan jenis GAMAS; detail memakai BRANCH tanpa Regional/Witel. Grup kosong tetap mendapat pembuka dengan total 0.

Detail baru diteruskan oleh pipeline segmentasi: region, witel, perangkat,
device_name, summary, incident_domain, description_actual_solution,
worklog_summary, last_update_worklog. Dokumen lama yang belum mempunyai field
tersebut menampilkan `-` sampai segmentasi berikutnya.

TTR (jam) adalah umur tiket saat laporan dibuat: (waktu laporan - reported_date)
dalam jam desimal dengan dua angka di belakang titik. Contoh `14.75` berarti
14 jam 45 menit. Baris Reported Date dan TTR berada setelah work log, tanpa
Batas SLA atau Status SLA. Semua tiket dalam satu laporan memakai waktu acuan sama.
Tanggal reported_date memakai timestamp hasil normalisasi pipeline yang ada.
Tanggal work log tanpa offset dianggap waktu WIB. Tanggal kosong, invalid, atau
reported_date di masa depan menghasilkan TTR `-`.

Blok monospace dikirim menggunakan HTML pre tanpa label bahasa, dengan escaping.
Incident panjang dipecah menjadi blok lengkap, tanpa memotong pasangan surrogate
emoji. Pesan diberi jeda dan kegagalan rate limit mengikuti retry_after maksimal
3 kali; kegagalan satu tujuan dicatat dan tidak menghentikan tujuan berikutnya.

Uji tanpa Mongo/Telegram: `node --test tests/gamas.test.js`.

Tes manual: kirim `/tesgamas` ke bot (mendukung `/tesgamas@NamaBot` di grup).
Bot membalas bahwa laporan sedang diproses, menjalankan segmentasi terbaru,
lalu mengirim laporan ke seluruh grup GAMAS aktif yang terdaftar lewat `/setgamas`.
Command ini tidak mengubah jadwal cron dan tidak langsung mengirim ke chat pemanggil
kecuali chat tersebut memang terdaftar sebagai grup GAMAS.

BRANCH mengikuti field `BRANCH` hasil mapping workzone ke master `groups` pada
pipeline segmentasi, sama dengan modul lainnya. Prefix AREA/BRANCH dibersihkan
dan nama dinormalkan ke huruf besar untuk pengelompokan dan detail. BRANCH kosong
ditampilkan sebagai `-`, tanpa fallback ke witel atau summary; tiket tetap dihitung.

Admin grup dapat menjalankan `/hapusgamas` (atau dengan mention bot) untuk
menghapus binding GAMAS hanya pada grup/topik saat ini. Command tanpa topik
tidak menghapus binding topik lainnya. Binding modul lain tidak berubah.
Gunakan `/setgamas` untuk mendaftarkan kembali. Laporan yang sudah dalam proses
pengiriman dapat tetap selesai karena daftar tujuan sudah dimuat sebelumnya.
