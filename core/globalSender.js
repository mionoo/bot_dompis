//globalSender.js

const { Assist1, Assist2, Assist3, AssistSuramadu } = require('./telegramInstance')
const { sendWithSplit } = require('../modules/ttr/ttr.sender') // ⚠️ penting

const BOT_MAP = {
  Assist1,
  Assist2,
  Assist3,
  AssistSuramadu,
};

function delay(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}


// 🔥 ambil bot berdasarkan zone
async function getBotByZone(zone) {
  const bot = BOT_MAP[zone];

  if (!bot) {
    console.warn(`⚠️ Zone "${zone}" tidak dikenal → fallback Assist1`);

    try {
      await AssistSuramadu.telegram.sendMessage(
        process.env.ADMIN_BOT,
        `⚠️ <b>ZONEBOT TIDAK DITEMUKAN</b>

📍 Zone: <b>${zone || "NULL"}</b>
🕒 ${new Date().toLocaleString("id-ID")}

➡️ Menggunakan fallback: <b>Assist1</b>`,
        { parse_mode: "HTML" }
      );
    } catch (err) {
      console.error("❌ Gagal kirim notifikasi:", err.message);
    }

    return Assist1;
  }

  return bot;
}

// 🔥 SATU PINTU KIRIM PESAN
async function sendGlobal({ zone, bot, chatId, message, topic }) {
  let selectedBot = bot;

  if (!selectedBot && zone) {
    selectedBot = await getBotByZone(zone);
  }

  if (!selectedBot) {
    selectedBot = Assist1;
  }

  return sendWithSplit({
    bot: selectedBot,
    chatId,
    message,
    topic,
  });
}

module.exports = { sendGlobal, getBotByZone, delay }
