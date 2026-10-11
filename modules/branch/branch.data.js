//branch.data.js

const SEGMENT_PRIORITY = {
  NODE_B_PREMIUM: 1,
  NODE_CRITICAL: 1,
  NODE_B_MAJOR: 1,
  NODE_B_MINOR: 1,
  NODE_B_LOW: 1,
  NODE_B_CNQ:1,
  GAMAS_FEEDER: 2,
  GAMAS: 2,
  GAMAS_GPON: 3,
  GAMAS_DISTRIBUSI: 4,
  GAMAS_ODP: 5,
  TOP_OLO: 6,
  HVC_DIAMOND: 7,
  DIAMOND: 8,
  VVIP: 9,
  HVC_PLATINUM: 10,
  HVC_GOLD: 11,
  GOLD: 12,
  DATIN: 13,
  INDIBIZ: 14,
  RESELLER: 15,
  REGULER: 16,
  WIFI_ID: 17,
  FTTH_OLO: 18,
};

const SEGMENT_B2B = {
  NODE_B_PREMIUM: 1,
  NODE_CRITICAL: 1,
  NODE_B_MAJOR: 1,
  NODE_B_MINOR: 1,
  NODE_B_LOW: 1,
  NODE_B_CNQ:1,
  TOP_OLO: 2,
  DATIN: 3,
  INDIBIZ: 4,
  RESELLER: 5,
  WIFI_ID: 6,
  FTTH_OLO: 7,
};

const SLA_MAPS = {
  HVC_DIAMOND: 3,
  VVIP: 3,

  HVC_PLATINUM: 6,

  HVC_GOLD: 12,
  RESELLER: 24,
  DATIN: 3,

  INDIBIZ: 4,

  REGULER: 24,
  TOP_OLO: 4,
  WIFI_ID: 24,
  FTTH_OLO: 4,
  GOLD: 12,
  DIAMOND: 3,

  GAMAS: 6,
  GAMAS_FEEDER: 10,
  GAMAS_GPON: 1,
  GAMAS_DISTRIBUSI: 4,
  GAMAS_ODP: 3,
  GAMAS_ODC: 18,
  NODE_B_PREMIUM: 2,
  NODE_CRITICAL: 4,
  NODE_B_MAJOR: 8,
  NODE_B_MINOR: 16,
  NODE_B_LOW: 24,
  NODE_B_CNQ:6
};

const SLA_MAP = {
  HVC_DIAMOND: 3,
  VVIP: 3,
  HVC_PLATINUM: 6,
  HVC_GOLD: 12,
  INDIBIZ: 4,
  RESELLER: 6,
  DATIN: 3,
  REGULER: 24,
  TOP_OLO: 6,
  NODE_B: 6,
  WIFI_ID: 12,
  FTTH_OLO: 6,
  GOLD: 12,
  DIAMOND: 3,
  GAMAS: 6,
  GAMAS_FEEDER: 10,
  GAMAS: 2,
  GAMAS_GPON: 1,
  GAMAS_DISTRIBUSI: 4,
  GAMAS_ODP: 3,
  GAMAS_ODC: 4,
};
/////////////////////////////////////////////
/// bot server
const BOT_ALLOCATION = {
  8635133424: [
    "MAGELANG",
    "PEKALONGAN",
    "PURWOKERTO",
    "SEMARANG",
    "SURAKARTA",
    "YOGYAKARTA",
  ],

  8581567403: [
    "JEMBER",
    "LAMONGAN",
    "MADIUN",
    "MALANG",
    "SIDOARJO",
  ],

  8625553403: [
    "DENPASAR",
    "FLORES",
    "KUPANG",
    "MATARAM",
  ],

  8008187485: [
    "SURABAYA",
  ],
};

const BOT_INFO = {
  8635133424: {
    name: "Assist1",
    username: "@Assrn_Dompis1bot",
  },

  8581567403: {
    name: "Assist2",
    username: "@Assrn_Dompis2bot",
  },

  8625553403: {
    name: "Assist3",
    username: "@Assrn_Dompis3bot",
  },

  8008187485: {
    name: "Assist_SuraMadu",
    username: "@Assist_SuraMadu_bot",
  },
};
//bot server
// ======================================================================================================
// bot lokal
// const BOT_ALLOCATION = {
//   8765886232: [
//     "MAGELANG",
//     "PEKALONGAN",
//     "PURWOKERTO",
//     "SEMARANG",
//     "SURAKARTA",
//     "YOGYAKARTA",
//   ],

//   5429648276: ["JEMBER", "LAMONGAN", "MADIUN", "MALANG", "SIDOARJO"],

//   8566616471: ["DENPASAR", "FLORES", "KUPANG", "MATARAM"],

//   5275788185: ["SURABAYA"],
// };

// const BOT_INFO = {
//   8765886232: {
//     name: "Assist1",
//     username: "@Assrn_Dompis1bot",
//   },

//   5429648276: {
//     name: "Assist2",
//     username: "@Assrn_Dompis2bot",
//   },

//   8566616471: {
//     name: "Assist3",
//     username: "@Assrn_Dompis3bot",
//   },

//   5275788185: {
//     name: "Assist_SuraMadu",
//     username: "@Assist_SuraMadu_bot",
//   },
// };
// //<TOKEN_REMOVED>
//bot lokal
// ======================================================================================================

const branches = [
  {
    id: "yogyakarta",
    name: "BRANCH YOGYAKARTA",
    serviceAreas: [
      { id: "kotagede", name: "KOTAGEDE" },
      { id: "kentungan", name: "KENTUNGAN" },
      { id: "sleman", name: "SLEMAN" },
      { id: "bantul", name: "BANTUL" },
      { id: "pakem", name: "PAKEM" },
      { id: "yogyakarta", name: "YOGYAKARTA" },
      { id: "kotabaru", name: "KOTABARU" },
    ],
  },
  {
    id: "semarang",
    name: "BRANCH SEMARANG",
    serviceAreas: [
      { id: "ungaran", name: "UNGARAN" },
      { id: "jepara", name: "JEPARA" },
      { id: "banyumanik", name: "BANYUMANIK" },
      { id: "boja", name: "BOJA" },
      { id: "kudus", name: "KUDUS" },
      { id: "johar", name: "JOHAR" },
      { id: "pati", name: "PATI" },
      { id: "kendal", name: "KENDAL" },
      { id: "rembang", name: "REMBANG" },
      { id: "salatiga", name: "SALATIGA" },
      { id: "tugu", name: "TUGU" },
      { id: "majapahit", name: "MAJAPAHIT" },
    ],
  },
  {
    id: "surakarta",
    name: "BRANCH SURAKARTA",
    serviceAreas: [
      { id: "palur", name: "PALUR" },
      { id: "blora", name: "BLORA" },
      { id: "wonogiri", name: "WONOGIRI" },
      { id: "boyolali", name: "BOYOLALI" },
      { id: "klaten", name: "KLATEN" },
      { id: "purwodadi", name: "PURWODADI" },
      { id: "gladag", name: "GLADAG" },
      { id: "karanganyar", name: "KARANGANYAR" },
      { id: "kerten", name: "KERTEN" },
      { id: "sragen", name: "SRAGEN" },
    ],
  },
  {
    id: "purwokerto",
    name: "BRANCH PURWOKERTO",
    serviceAreas: [
      { id: "cilacap", name: "CILACAP" },
      { id: "purwokerto", name: "PURWOKERTO" },
      { id: "wonosobo", name: "WONOSOBO" },
      { id: "banjarnegara", name: "BANJARNEGARA" },
      { id: "sukaraja", name: "SUKARAJA" },
    ],
  },
  {
    id: "pekalongan",
    name: "BRANCH PEKALONGAN",
    serviceAreas: [
      { id: "tegal", name: "TEGAL" },
      { id: "pekalongan", name: "PEKALONGAN" },
      { id: "brebes", name: "BREBES" },
      { id: "pemalang", name: "PEMALANG" },
      { id: "purbalingga", name: "PURBALINGGA" },
    ],
  },
  {
    id: "magelang",
    name: "BRANCH MAGELANG",
    serviceAreas: [
      { id: "kebumen", name: "KEBUMEN" },
      { id: "purworejo", name: "PURWOREJO" },
      { id: "magelang", name: "MAGELANG" },
      { id: "temanggung", name: "TEMANGGUNG" },
    ],
  },

  // ================= JATIM =================

  {
    id: "surabaya",
    name: "BRANCH SURABAYA",
    serviceAreas: [
      { id: "bangkalan", name: "BANGKALAN" },
      { id: "darmo", name: "DARMO" },
      { id: "gubeng", name: "GUBENG" },
      { id: "injoko", name: "INJOKO" },
      { id: "jagir", name: "JAGIR" },
      { id: "kalianak", name: "KALIANAK" },
      { id: "kandangan", name: "KANDANGAN" },
      { id: "kapasan", name: "KAPASAN" },
      { id: "kebalen", name: "KEBALEN" },
      { id: "kenjeran", name: "KENJERAN" },
      { id: "keputih", name: "KEPUTIH" },
      { id: "lakarsantri", name: "LAKARSANTRI" },
      { id: "karangpilang", name: "KARANGPILANG" },
      { id: "manyar", name: "MANYAR" },
      { id: "mergoyoso", name: "MERGOYOSO" },
      { id: "pamekasan", name: "PAMEKASAN" },
      { id: "rungkut", name: "RUNGKUT" },
      { id: "sampang", name: "SAMPANG" },
      { id: "sumenep", name: "SUMENEP" },
      { id: "tandes", name: "TANDES" },
    ],
  },
  {
    id: "sidoarjo",
    name: "BRANCH SIDOARJO",
    serviceAreas: [
      { id: "gedangan", name: "GEDANGAN" },
      { id: "jombang", name: "JOMBANG" },
      { id: "mojokerto", name: "MOJOKERTO" },
      { id: "pandaan", name: "PANDAAN" },
      { id: "pasuruan", name: "PASURUAN" },
      { id: "sepanjang", name: "SEPANJANG" },
      { id: "sidoarjo", name: "SIDOARJO" },
      { id: "sukodono", name: "SUKODONO" },
      { id: "tropodo", name: "TROPODO" },
      { id: "waru", name: "WARU" },
    ],
  },
  {
    id: "malang",
    name: "BRANCH MALANG",
    serviceAreas: [
      { id: "batu", name: "BATU" },
      { id: "blimbing", name: "BLIMBING" },
      { id: "blitar", name: "BLITAR" },
      { id: "kepanjen", name: "KEPANJEN" },
      { id: "klojen", name: "KLOJEN" },
      { id: "malang", name: "MALANG" },
      { id: "singosari", name: "SINGOSARI" },
      { id: "tulungagung", name: "TULUNGAGUNG" },
      { id: "turen", name: "TUREN" },
    ],
  },
  {
    id: "madiun",
    name: "BRANCH MADIUN",
    serviceAreas: [
      { id: "kediri", name: "KEDIRI" },
      { id: "madiun", name: "MADIUN" },
      { id: "magetan", name: "MAGETAN" },
      { id: "nganjuk", name: "NGANJUK" },
      { id: "pare", name: "PARE" },
      { id: "ponorogo", name: "PONOROGO" },
      { id: "trenggalek", name: "TRENGGALEK" },
    ],
  },
  {
    id: "jember",
    name: "BRANCH JEMBER",
    serviceAreas: [
      { id: "banyuwangi", name: "BANYUWANGI" },
      { id: "bondowoso", name: "BONDOWOSO" },
      { id: "genteng", name: "GENTENG" },
      { id: "jember", name: "JEMBER" },
      { id: "kebonsari", name: "KEBONSARI" },
      { id: "lumajang", name: "LUMAJANG" },
      { id: "probolinggo", name: "PROBOLINGGO" },
      { id: "puger", name: "PUGER" },
      { id: "situbondo", name: "SITUBONDO" },
    ],
  },
  {
    id: "lamongan",
    name: "BRANCH LAMONGAN",
    serviceAreas: [
      { id: "bambe", name: "BAMBE" },
      { id: "bancar", name: "BANCAR" },
      { id: "bojonegoro", name: "BOJONEGORO" },
      { id: "cerme", name: "CERME" },
      { id: "gresik", name: "GRESIK" },
      { id: "lamongan", name: "LAMONGAN" },
      { id: "tuban", name: "TUBAN" },
    ],
  },

  // ================= BALI NUSRA =================

  {
    id: "denpasar",
    name: "BRANCH DENPASAR",
    serviceAreas: [
      { id: "dharmasaba", name: "DHARMASABA" },
      { id: "ubung", name: "UBUNG" },
      { id: "sanur", name: "SANUR" },
      { id: "singaraja", name: "SINGARAJA" },
      { id: "kuta", name: "KUTA" },
      { id: "ubud", name: "UBUD" },
      { id: "semarapura", name: "SEMARAPURA" },
      { id: "jimbaran", name: "JIMBARAN" },
      { id: "monangmaning", name: "MONANG MANING" },
      { id: "gianyar", name: "GIANYAR" },
      { id: "tabanan", name: "TABANAN" },
      { id: "jembrana", name: "JEMBRANA" },
      { id: "kaliasem", name: "KALIASEM" },
    ],
  },
  {
    id: "mataram",
    name: "BRANCH MATARAM",
    serviceAreas: [
      { id: "bima", name: "BIMA" },
      { id: "mataram", name: "MATARAM" },
      { id: "selong", name: "SELONG" },
      { id: "sumbawa", name: "SUMBAWA" },
      { id: "sweta", name: "SWETA" },
    ],
  },
  {
    id: "kupang",
    name: "BRANCH KUPANG",
    serviceAreas: [
      { id: "atambua", name: "ATAMBUA" },
      { id: "kupang", name: "KUPANG" },
      { id: "sumba", name: "SUMBA" },
    ],
  },
  {
    id: "flores",
    name: "BRANCH FLORES",
    serviceAreas: [
      { id: "ende", name: "ENDE" },
      { id: "labuanbajo", name: "LABUAN BAJO" },
      { id: "maumere", name: "MAUMERE" },
    ],
  },
];

function findBranch(branchName) {
  const target = branchName
    .replace(/^BRANCH\s*/i, "")
    .trim()
    .toUpperCase();

  return branches.find(
    (branch) =>
      branch.name
        .replace(/^BRANCH\s*/i, "")
        .trim()
        .toUpperCase() === target,
  );
}

function normalizeBranchName(branchName = "") {
  return String(branchName)
    .replace(/^BRANCH\s*/i, "")
    .trim()
    .toUpperCase();
}

function getAllocatedBranches(botId) {
  return BOT_ALLOCATION[botId] || [];
}

function getBranchAllocation(botId, branchName) {
  const normalizedBranch = normalizeBranchName(branchName);
  const isAllowed = getAllocatedBranches(botId).includes(normalizedBranch);

  let correctBot = null;
  for (const [allocatedBotId, allocatedBranches] of Object.entries(
    BOT_ALLOCATION,
  )) {
    if (allocatedBranches.includes(normalizedBranch)) {
      correctBot = BOT_INFO[allocatedBotId] || null;
      break;
    }
  }

  return { normalizedBranch, isAllowed, correctBot };
}

function getBranchesForBot(botId) {
  return branches.filter((branch) =>
    getAllocatedBranches(botId).includes(normalizeBranchName(branch.name)),
  );
}

module.exports = {
  branches,
  BOT_ALLOCATION,
  BOT_INFO,
  SEGMENT_PRIORITY,
  SLA_MAP,
  SLA_MAPS,
  findBranch,
  normalizeBranchName,
  getAllocatedBranches,
  getBranchAllocation,
  getBranchesForBot,
  SEGMENT_B2B,
};
