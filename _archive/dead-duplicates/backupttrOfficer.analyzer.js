const SLA_MAP = {
  HVC_DIAMOND: 3,
  VVIP: 3,
  HVC_PLATINUM: 6,
  HVC_GOLD: 12,
  INDIBIZ: 4,
  RESELLER: 6,
  HSI: 4,
  DATIN: 3,
  REGULER: 24,
};

function parseDate(str) {
  if (!str) return null

  const [datePart, timePart] = str.split(" ")
  if (!datePart || !timePart) return null

  const [day, month, year] = datePart.split("/")
  const [hour, minute] = timePart.split(":")

  return new Date(year, month - 1, day, hour, minute)
}

function analyzeTtrOfficer(tickets) {
  const grouped = {}
  const now = new Date()

  tickets.forEach((t) => {
    if (!t.HSA) return

    const sla = SLA_MAP[t.SEGMEN] || 6
    const reported = parseDate(t.REPORTED_DATE)
    if (!reported) return

    const elapsed = (now - reported) / 3600000
    const remaining = sla - elapsed

    let status = "SAFE"
    if (remaining <= 0) status = "OVER SLA"
    else if (remaining <= 1) status = "CRITICAL"
    else if (remaining <= 1.5) status = "WARNING"

    // 🔥 FILTER KHUSUS OFFICER (INI INTI processTiketOfficer)
    const isDiamond = t.SEGMEN === "HVC_DIAMOND"
    const isPlatinum = t.SEGMEN === "HVC_PLATINUM"
    const isFFG = t.STATUS_FFG === "FFG"
    const isGoldOver12 = t.SEGMEN === "HVC_GOLD" && elapsed >= 12
    const isRegulerOver24 = t.SEGMEN === "REGULER" && elapsed >= 24

    if (!(isDiamond || isPlatinum || isFFG || isGoldOver12 || isRegulerOver24)) return

    if (!grouped[t.HSA]) grouped[t.HSA] = []

    grouped[t.HSA].push({
      ...t,
      sla,
      remaining,
      status,
    })
  })

  return grouped
}

module.exports = { analyzeTtrOfficer }