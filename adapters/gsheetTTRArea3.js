
// adapters/gsheetTTRArea3.js
const path = require('path');
const { google } = require('googleapis');

if (!process.env.GOOGLE_CREDENTIAL) {
  throw new Error('GOOGLE_CREDENTIAL belum diset di .env');
}

const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(process.env.GOOGLE_CREDENTIAL),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function getSheetData(spreadsheetId, range) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return res.data.values || [];
  } catch (err) {
    console.error('Error getSheetData:', err.message);
    throw err;
  }
}


// 🔥 Tambahan function append
async function saveEventDompisSheet(spreadsheetId, data) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'eventDompis!A:C',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [
          [
            data.tiket || '',
            data.nama || '',
            data.event || '',
          ],
        ],
      },
    });

    console.log('✅ Event berhasil disimpan ke Google Sheet');
  } catch (err) {
    console.error('❌ Error saveEventDompisSheet:', err.message);
  }
}

module.exports = { getSheetData , saveEventDompisSheet};
