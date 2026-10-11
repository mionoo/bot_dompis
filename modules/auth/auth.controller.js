// modules/auth/auth.controller.js
const { findUser } = require('./auth.service')

async function startCommand(ctx) {
  const userId = ctx.from.id
  const name = ctx.from.first_name

  const user = await findUser(userId, 'telegram')

  if (user) {
    return ctx.reply(`✅ Kamu sudah terdaftar\nNama: ${user.name}`)
  }

  // mulai flow
  ctx.session = { step: 'REGISTER_NAME' }

  return ctx.reply("Masukkan nama kamu:")
}

module.exports = {
  startCommand
}