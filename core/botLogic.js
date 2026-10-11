// core/botLogic.js

async function handleMessage({ userId, text, platform, name, chatId, isGroup }) {

  // ========================
  // GREETING
  // ========================
  if (text.toLowerCase() === 'halo') {
    return { reply: `Halo ${name} 👋` }
  }

  // ========================
  // HELP
  // ========================
  if (text === '/help') {
    return {
      reply: `
📌 Daftar Perintah:

/start - Registrasi
      `
    }
  }



  // ========================
  // DEFAULT RESPONSE
  // ========================
  return {
   // reply: "❓ Command tidak dikenali\nKetik /help untuk bantuan"
  }
}

module.exports = { handleMessage }