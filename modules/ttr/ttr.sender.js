
//ttr.sender.js 


const { Assist1, Assist2, Assist3, Assist_SuraMadu } = require('../../core/telegramInstance')

async function sendWithSplit({ bot, chatId, message, topic }) {
  const MAX = 4000;

  if (!bot) {
    console.error("❌ Bot tidak tersedia");
    return;
  }

  if (!chatId) {
    console.error("❌ chatId kosong:", chatId);
    return;
  }

  const telegram = bot.telegram;
  const threadId = topic ? Number(topic) : undefined;


  try{

    
  // 🔥 jika pendek langsung kirim
  if (message.length <= MAX) {
    try {
     return await telegram.sendMessage(chatId, message, {
        parse_mode: "HTML",
        ...(threadId && { message_thread_id: threadId }),
      });
    } catch (er) {
     // console.error("❌ Gagal mengirim pesan:", er);
    }
    // return telegram.sendMessage(chatId, message, {
    //   parse_mode: "HTML",
    //   ...(threadId && { message_thread_id: threadId }),
    // });
  }

  // 🔥 split per baris
  const lines = message.split("\n");
  let chunk = "";

  for (const line of lines) {
    if ((chunk + line).length > MAX) {
      try {
        await telegram.sendMessage(chatId, chunk, {
          parse_mode: "HTML",
          ...(threadId && { message_thread_id: threadId }),
        });
      } catch (er) {
      //  console.error("❌ Gagal mengirim pesan:", er);
      }
      chunk = "";
    }
    chunk += line + "\n";
  }

  if (chunk) {
    try {
      await telegram.sendMessage(chatId, chunk, {
        parse_mode: "HTML",
        ...(threadId && { message_thread_id: threadId }),
      });
    } catch (er) {
     // console.error("❌ Gagal mengirim pesan:", er);
    }
  }


  }catch(er){
     await telegram.sendMessage(process.env.ADMIN_BOT, `${er}`)
  }






}

module.exports = { sendWithSplit }