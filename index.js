//index.js

require('dotenv').config()

const express = require('express')
const connectDB = require('./config/db')

// =====================================================================
// 🛡️ Jaring pengaman terakhir (defense in depth)
// =====================================================================
// Perbaikan utama untuk crash total ada di adapters/telegram.js (bot.catch
// di tiap instance Telegraf). Listener ini adalah lapisan cadangan untuk
// error tak terduga dari luar alur Telegram (mis. route Express lain,
// library pihak ketiga) supaya selalu ter-log dengan jelas, bukan diam-diam
// mematikan proses tanpa jejak.
process.on('unhandledRejection', (reason) => {
  console.error('🔥 Unhandled Rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err)
})

const app = express()

app.use(express.json({
  limit: "50mb",

  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: "50mb",
}));


// connect DB
connectDB()

// webhook route
const webhookRoute = require('./routers/webhook')
app.use('/webhook', webhookRoute)

// init bots
require('./adapters/telegram')
//require('./adapters/whatsapp')
require('./test') // 🔥 scheduler TTR

app.listen(process.env.PORT, () => {
  console.log(`Server jalan di port ${process.env.PORT}`)
})

