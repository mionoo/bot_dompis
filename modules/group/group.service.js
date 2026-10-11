const { cariGroups } = require('../../models/group')
const { Idgrups , cariidgroup, idgrupKawal, Idgrupb2b} = require('../../models/idgrupTelegram')


async function findGroupByWorkzone(workzone) {
  return cariGroups({ WORKZONE: workzone })
}


async function findIdGroupBySA(serviceArea) {
  return cariidgroup({SERVICE_AREA: serviceArea})
}

async function findGrupOrder() {
  return await cariidgroup({
    TIPE_GRUP: 'ORDER',
    SERVICE_AREA: {
      $exists: true,
      $nin: ['', null]
    }
  });
}

async function findGrupReport() {
  return await cariidgroup({
    TIPE_GRUP: 'REPORT',
    SERVICE_AREA: {
      $exists: true,
      $nin: ['', null]
    }
  });
}



async function findGrupKawal() {
  return await cariidgroup({
    TIPE_GRUP: 'KAWAL',
    SERVICE_AREA: {
      $exists: true,
      $nin: ['', null]
    }
  });
}

async function findGrupb2b() {
  return await cariidgroup({
    TIPE_GRUP: 'B2B',
    SERVICE_AREA: {
      $exists: true,
      $nin: ['', null]
    }
  });
}

async function saveIdGroup(data) {
  return await Idgrups.findOneAndUpdate(
    {
      ID_GRUP: data.ID_GRUP,
      ID_TOPIC_GRUP: data.ID_TOPIC_GRUP
    },
    data,
    {
      upsert: true,
      new: true
    }
  )
}


async function saveIdGroupKAWAL(data) {
  return await idgrupKawal.findOneAndUpdate(
    {
      ID_GRUP: data.ID_GRUP,
      ID_TOPIC_GRUP: data.ID_TOPIC_GRUP
    },
    data,
    {
      upsert: true,
      new: true
    }
  )
}





async function saveGroup(ctx, type) {
  const chatId = ctx.chat.id
  const title = ctx.chat.title

  return Groups.findOneAndUpdate(
    { chat_id: chatId },
    {
      chat_id: chatId,
      title,
      type
    },
    { upsert: true, new: true }
  )
}




module.exports = { 
  findGroupByWorkzone, 
  saveIdGroup, 
  saveGroup, 
  findGrupKawal,
  findGrupOrder,
  findIdGroupBySA,
  // findGroupOrder,
  // findGroupReport,
  findGrupReport,
  saveIdGroupKAWAL,
  findGrupb2b

}

