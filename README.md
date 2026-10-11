# bot_12Agustus

Bot Telegram (Telegraf) untuk operasional tiket/teknisi: registrasi naker (binding NIK ↔ akun Telegram), setup grup (ORDER/REPORT/KAWAL/B2B/HD), reminder TTR terjadwal, dan penerimaan webhook event dari sistem Dompis.

## Menjalankan proyek

```bash
npm install
cp .env.example .env   # lalu isi nilai sebenarnya di .env
npm run dev             # nodemon, auto-restart saat file berubah
# atau
npm start                # node biasa, untuk production
```

Lihat `.env.example` untuk daftar lengkap env var yang dibutuhkan (Mongo, 4 token bot Telegram, webhook, Google Sheets, dst).

## Struktur proyek

```
index.js                 # entrypoint: Express app, koneksi DB, load adapter bot, jaring pengaman error
adapters/telegram.js      # setup 4 instance Telegraf (Assist1/2/3/AssistSuramadu), wiring session + error handler
core/
  dispatcher.js           # routing semua command & flow teks per chat
  groupSetupSession.js    # state sementara (in-memory) untuk wizard /set di grup
  privateFlowSession.js   # state sementara (in-memory) untuk flow /start & /register di chat pribadi
  globalSender.js         # kirim pesan lintas-bot berdasarkan zona
  botLogic.js             # fallback reply generik (halo, /help)
modules/                  # satu folder per domain (auth, naker, branch, ttr, ttrb2b, ttrHD, ttrOfficer,
                          #   ploting, hookDompis, segmentasiTiket, group, kawal, notification)
models/                   # schema Mongoose
routers/webhook.js        # route Express utk terima webhook eksternal
scripts/                  # utility satu-kali yang dijalankan manual (bukan bagian dari server):
                          #   tambahnaker.js (import CSV), cekdataevent.js (debug), teswebhook.js (kirim dummy webhook)
_archive/                 # file lama yang sudah tidak dipakai (backup/duplikat), disimpan agar tidak hilang,
                          # tapi tidak lagi di-require oleh kode manapun. Riwayat lengkap ada di git log.
```

## Empat bot, satu kode

Ada 4 token bot Telegram (`Assist1`, `Assist2`, `Assist3`, `AssistSuramadu`) yang menjalankan **kode yang sama persis** — pemisahannya berdasarkan alokasi branch/zona (lihat `modules/branch/branch.data.js` → `BOT_ALLOCATION`). Kalau user registrasi lewat bot yang salah untuk branch-nya, bot akan mengarahkan ke bot yang benar.

## Penanganan error (penting untuk stabilitas)

Sebelumnya **tidak ada** `bot.catch()` yang didaftarkan, dan `bot.launch()` dipanggil tanpa `.catch()`. Efeknya: satu error yang tidak tertangani di salah satu handler tombol (klik pilih posisi/branch/service area, dsb) bisa jadi *unhandled promise rejection* di level proses Node, yang **mematikan keempat bot sekaligus**. Ini sudah diperbaiki:

- Setiap instance bot sekarang punya `bot.catch(...)` global (di `adapters/telegram.js`) yang menangkap error dari *semua* jenis update (teks maupun tombol), me-reset sesi yang sedang error, dan mengirim notifikasi ke admin — tanpa mematikan proses.
- `bot.launch()` dibungkus `.catch()` per bot, jadi kalau satu token bermasalah, bot lain tetap jalan.
- `index.js` punya jaring pengaman tambahan (`process.on('unhandledRejection'/'uncaughtException')`) untuk error di luar alur Telegram, supaya selalu ter-log jelas.

Karena tidak ada proses manager (pm2/systemd) yang terdeteksi di server saat ini, sangat disarankan menjalankan bot ini di belakang salah satu dari itu di production, supaya kalau suatu saat proses tetap berhenti (mis. karena kehabisan memori), ia otomatis restart.

## Keterbatasan yang perlu diketahui

- **Sesi in-memory**: state wizard (`/set` di grup, `/start`/`/register` di chat pribadi) disimpan di memory proses (Map/objek biasa), bukan Redis/DB. Restart proses = semua progres user yang sedang di tengah flow hilang. Untuk skala kecil ini biasanya tidak masalah, tapi kalau proses sering restart, pertimbangkan pindah ke session store eksternal.
- Kalau user mengetik teks biasa padahal bot sedang menunggu klik tombol (mis. saat pilih posisi/branch), bot sekarang **selalu membalas** mengarahkan untuk pakai tombol atau `/cancel` — sebelumnya bot diam total sampai sesi expired (15 menit), yang terlihat seperti bot stuck.

## Riwayat perubahan

Riwayat lengkap perubahan (termasuk kode asli sebelum dirapikan) ada di `git log`. Commit pertama (`chore: baseline snapshot...`) adalah kondisi kode sebelum sesi cleanup ini, jadi bisa dibandingkan kapan saja dengan `git diff <hash-baseline> HEAD`.
