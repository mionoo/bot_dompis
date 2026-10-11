//webhook.js

const express = require('express');
const router = express.Router();

const { handleDompisWebhook } = require('../modules/hookDompis/hookDompis.controller');

router.post('/dompis', handleDompisWebhook);

router.post('/aplikasilain', (req, res) => {
  console.log(req.body);
  res.json({ ok: true });
});

module.exports = router;

