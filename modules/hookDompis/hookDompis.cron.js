const { processEvent } = require('./hookDompis.service');

async function handleCronDispatch(req, res) {
  try {
    const secret = req.headers['x-cron-secret'];

    if (
      process.env.CRON_ENABLED === "true" &&
      secret !== process.env.CRON_SECRET
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    console.log("🔥 CRON TRIGGERED");

    const events = req.body?.events || [];

    for (const event of events) {
      await processEvent(event);
    }

    return res.json({
      success: true,
      total: events.length
    });

  } catch (err) {
    console.error("CRON ERROR:", err);
    return res.status(500).json({ success: false });
  }
}

module.exports = { handleCronDispatch };
