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

Batas SLA dihitung dari reported_date + SLA_MAPS[jenis_tiket]. Setelah work log,
laporan menampilkan Reported Date, Batas SLA (beserta target jam), dan Status SLA.
Contoh: `Sisa 2 jam 15 menit | SAFE 🟢` atau `Lewat 42 menit | OVER SLA 🔴`.
Tanggal ditampilkan konsisten dalam WIB. Ambang WARNING/CRITICAL tetap sama.
Tanggal reported_date memakai timestamp hasil normalisasi pipeline yang ada.
Tanggal work log tanpa offset dianggap waktu WIB. Data kosong/invalid tidak
menghasilkan angka SLA palsu.

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
