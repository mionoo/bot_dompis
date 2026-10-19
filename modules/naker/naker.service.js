// naker.service.js
const { Nakers } = require('../../models/users')

async function findNaker(nik) {
  return Nakers.findOne({ NIK: nik })
}

async function simpanNewNaker(data) {
  const naker = new Nakers(data)
  return naker.save()
}

async function updateLabour(nik, labour, telegramId) {
  return Nakers.updateOne(
    { NIK: nik },
    {
      $set: {
        LABOUR: labour,
        ID_TELEGRAM: telegramId,
      },
    }
  )
}


async function findOfficer() {
  return await Nakers.find({
    LEVEL: {
      $regex: /^\s*(?:MANAGER|OFFICER\s+[12])\s*$/i
    },
    BRANCH: {
      $exists: true,
      $nin: ['', null]
    },
    ID_TELEGRAM: {
      $exists: true,
      $nin: ['', null]
    }
  });
}


async function getPicMappingByHSA() {
  const data = await Nakers.find({
    SERVICE_AREA: { $exists: true, $nin: ['', null] },
    LEVEL: { $regex: /^\s*(?:HSA|KORLAP|OFFICER\s+3)\s*$/i }
  })

  const mapping = {}

  data.forEach(user => {
    const hsa = (user.SERVICE_AREA || '').toUpperCase().trim()
    const branch = (user.BRANCH || '').toUpperCase().trim()

    if (!hsa || !branch) return

    if (!mapping[hsa]) mapping[hsa] = []

    mapping[hsa].push({
      chatId: user.ID_TELEGRAM,
      topic: user.ID_TOPIC_GRUP,
      branch
    })
  })

  return mapping
}

// async function getPicMappingByHSA() {
//   return await Nakers.find({
//     LEVEL: {
//       $in: ['HSA', 'Korlap', 'Officer 3']
//     },
//     SERVICE_AREA: {
//       $exists: true,
//       $nin: ['', null]
//     },
//     ID_TELEGRAM: {
//       $exists: true,
//       $nin: ['', null]
//     }
//   });
// }
// HSA
// Korlap
// Officer 3

async function updateTelegramId(nik, telegramId) {
  return Nakers.updateOne(
    { NIK: nik },
    {
      $set: {
        ID_TELEGRAM: telegramId,
      },
    }
  )
}

function escapeMarkdown(text = "") {
  return text
    .toString()
    .replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&")
}

function formatField(label, value) {
  if (!value || value === "" || value === "-") {
    return `${label}\n⚠️ Belum tersedia \\(Silakan hubungi PIC Area\\)\n`
  }

  return `${label}\n${escapeMarkdown(value)}\n`
}

module.exports = { 
  findNaker, 
  updateLabour, 
  findOfficer, 
  getPicMappingByHSA, 
  updateTelegramId,
  escapeMarkdown,
  formatField,
  simpanNewNaker
}