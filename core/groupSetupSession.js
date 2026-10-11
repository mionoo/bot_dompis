const SETUP_TTL_MS = 15 * 60 * 1000;
const activeSetups = new Map();

// Bersihkan entry yang sudah expired secara berkala, supaya Map ini tidak
// tumbuh tanpa batas kalau ada banyak setup grup yang ditinggal begitu saja
// (di-generate lewat /set tapi tidak pernah diselesaikan). .unref() supaya
// timer ini tidak mencegah proses exit secara normal.
setInterval(() => {
  const now = Date.now();
  for (const [key, setup] of activeSetups) {
    if (setup.expiresAt <= now) activeSetups.delete(key);
  }
}, 5 * 60 * 1000).unref();

function getSetupKey(ctx) {
  const botId = ctx.botInfo?.id || "unknown-bot";
  const threadId = ctx.message?.message_thread_id || ctx.callbackQuery?.message?.message_thread_id || "main";
  return `${botId}:${ctx.chat.id}:${threadId}`;
}

function startGroupSetup(ctx) {
  const key = getSetupKey(ctx);
  const setup = {
    key,
    step: "GROUP_PICK_MAIN_TYPE",
    groupType: null,
    kawalMode: null,
    messageId: null,
    expiresAt: Date.now() + SETUP_TTL_MS,
    group: {
      chat_id: ctx.chat.id,
      title: ctx.chat.title,
      thread_id: ctx.message?.message_thread_id || null,
      topic_name: null,
    },
  };

  activeSetups.set(key, setup);
  return setup;
}

function setSetupMessage(ctx, setup, messageId) {
  if (activeSetups.get(setup.key) === setup) {
    setup.messageId = messageId;
  }
}

function getActiveGroupSetup(ctx) {
  const key = getSetupKey(ctx);
  const setup = activeSetups.get(key);

  if (!setup || setup.expiresAt <= Date.now()) {
    activeSetups.delete(key);
    return null;
  }

  const callbackMessageId = ctx.callbackQuery?.message?.message_id;
  if (callbackMessageId && setup.messageId !== callbackMessageId) {
    return null;
  }

  return setup;
}

function finishGroupSetup(setup) {
  if (activeSetups.get(setup.key) === setup) {
    activeSetups.delete(setup.key);
  }
}

module.exports = {
  startGroupSetup,
  setSetupMessage,
  getActiveGroupSetup,
  finishGroupSetup,
};
