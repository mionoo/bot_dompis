// hookDompis.kirimTelegram.js
const { Input } = require('telegraf');
const fs = require('fs');
const path = require('path');



function getNowWIB() {
  return new Date(
    Utilities.formatDate(
      new Date(),
      "Asia/Jakarta",
      "yyyy-MM-dd'T'HH:mm:ss"
    )
  );
}

async function sendEvidence({ incident, type, chatId, topicId, bot, caption }) {
  if (!bot) {
    return { success: false, reasonCode: "BOT_NOT_FOUND", reason: "Bot tidak tersedia", itemsSent: 0 };
  }

  if (!chatId) {
    return { success: false, reasonCode: "CHAT_ID_EMPTY", reason: "chatId kosong", itemsSent: 0 };
  }

  try {
    //const basePath = path.resolve(__dirname, '../../mnt/evidence', incident);
	const basePath = path.join('/mnt/evidence', incident);
    if (!fs.existsSync(basePath)) {
      console.log(`❌ Folder tidak ditemukan: ${basePath}`);
      return { success: false, reasonCode: "EVIDENCE_FOLDER_NOT_FOUND", reason: `Folder tidak ditemukan: ${basePath}`, itemsSent: 0 };
    }

    const allFiles = fs.readdirSync(basePath);

    const filteredFiles = allFiles
      .filter(file => file.toLowerCase().startsWith(type.toLowerCase()))
      .sort();

    if (filteredFiles.length === 0) {
      return { success: false, reasonCode: "EVIDENCE_FILE_NOT_FOUND", reason: `File evidence ${type} tidak ditemukan`, itemsSent: 0 };
    }

    const chunkSize = 10;

    let itemsSent = 0;
    for (let i = 0; i < filteredFiles.length; i += chunkSize) {
      const chunk = filteredFiles.slice(i, i + chunkSize);

      const media = chunk.map((file, index) => ({
        type: 'photo',
        media: Input.fromLocalFile(path.join(basePath, file)),

        // 🔥 caption persis dari pesan
        caption: index === 0 ? caption : undefined,

        // 🔥 WAJIB biar <b> kebaca
        parse_mode: index === 0 ? "HTML" : undefined
      }));

      await bot.telegram.sendMediaGroup(chatId, media, {
        message_thread_id: topicId
      });
      itemsSent += chunk.length;

      await new Promise(r => setTimeout(r, 500));
    }

    return { success: true, itemsSent };

  } catch (err) {
    console.error("❌ sendEvidence error:", err);
    return {
      success: false,
      reasonCode: "TELEGRAM_API_ERROR",
      reason: err.message || "Gagal mengirim evidence",
      telegramErrorCode: err.response?.error_code,
      telegramErrorDescription: err.response?.description,
      itemsSent: 0,
    };
  }
}


const MAX_LENGTH = 4000;

// 🔥 helper split pesan panjang
function splitText(text, max = MAX_LENGTH) {
  const chunks = [];
  for (let i = 0; i < text.length; i += max) {
    chunks.push(text.substring(i, i + max));
  }
  return chunks;
}


// await sendMessage({
//   bot: selectedBot,
//   chatId: group.ID_GRUP,
//   topicId: group.ID_TOPIC_GRUP,
//   text: `
// 📂 ${tiket}
// 📌 CLOSE
// 🔧 ${noServis}
// `
// });
async function sendMessage({
  bot,
  chatId,
  text,
  topicId = null,
  parseMode = 'HTML',
  disablePreview = true
}) {
  if (!bot) {
    console.log("❌ Bot tidak tersedia");
    return { success: false, reasonCode: "BOT_NOT_FOUND", reason: "Bot tidak tersedia", itemsSent: 0 };
  }

  if (!chatId) {
    console.log("❌ chatId kosong");
    return { success: false, reasonCode: "CHAT_ID_EMPTY", reason: "chatId kosong", itemsSent: 0 };
  }

  if (!text) {
    console.log("❌ text kosong");
    return { success: false, reasonCode: "MESSAGE_EMPTY", reason: "text kosong", itemsSent: 0 };
  }

  const messages = splitText(text);

  let messagesSent = 0;
  for (const msg of messages) {
    try {
      await bot.telegram.sendMessage(chatId, msg, {
        parse_mode: parseMode,
        disable_web_page_preview: disablePreview,
        ...(topicId && { message_thread_id: topicId }) // 🔥 optional topic
      });
      messagesSent += 1;

      // 🔥 anti flood
      await new Promise(r => setTimeout(r, 300));

    } catch (err) {
      console.error(`❌ Gagal kirim pesan ke ${chatId}`, err);
      return {
        success: false,
        reasonCode: "TELEGRAM_API_ERROR",
        reason: err.message || "Gagal mengirim pesan Telegram",
        telegramErrorCode: err.response?.error_code,
        telegramErrorDescription: err.response?.description,
        itemsSent: messagesSent,
      };
    }
  }

  return { success: true, itemsSent: messagesSent };
}



module.exports = { sendEvidence, sendMessage };
