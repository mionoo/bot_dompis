// modules/auth/auth.service.js
const User = require('../../models/group')

async function findUser(userId, platform) {
  return User.findOne({ userId, platform })
}

async function registerUser({ userId, platform, name }) {
  return User.findOneAndUpdate(
    { userId, platform },
    { userId, platform, name, registered: true },
    { upsert: true, new: true }
  )
}

module.exports = {
  findUser,
  registerUser
}
