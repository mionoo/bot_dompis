//telegramInstance.js

const { Telegraf } = require('telegraf');

const Assist1 = new Telegraf(process.env.Assist1_TOKEN);
const Assist2 = new Telegraf(process.env.Assist2_TOKEN);
const Assist3 = new Telegraf(process.env.Assist3_TOKEN);
const AssistSuramadu = new Telegraf(process.env.Assist_SuraMadu_TOKEN);

module.exports = { Assist1, Assist2, Assist3, AssistSuramadu };
