export const PENDRAGON = {};

/**
 * The set of Stats and Traits used within the sytem.
 * @type {Object}
 */
PENDRAGON.stats = {
  str: "PENDRAGON.StatStr",
  dex: "PENDRAGON.StatDex",
  con: "PENDRAGON.StatCon",
  siz: "PENDRAGON.StatSiz",
  app: "PENDRAGON.StatApp",
};

PENDRAGON.statsAbbreviations = {
  str: "PENDRAGON.StatStrAbbr",
  dex: "PENDRAGON.StatDexAbbr",
  con: "PENDRAGON.StatConAbbr",
  siz: "PENDRAGON.StatSizAbbr",
  app: "PENDRAGON.StatAppAbbr",
};

PENDRAGON.keysActiveEffects = {
  "system.stats.siz.effects": "PEN.effectLabels.sizadj",
  "system.stats.dex.effects": "PEN.effectLabels.dexadj",
  "system.stats.str.effects": "PEN.effectLabels.stradj",
  "system.stats.con.effects": "PEN.effectLabels.conadj",
  "system.stats.app.effects": "PEN.effectLabels.appadj",
  "system.hp.effects": "PEN.effectLabels.hpadj",
  "system.damEffects": "PEN.effectLabels.damadj",
  "system.damBonus": "PEN.effectLabels.dambonus",
  "system.moveEffects": "PEN.effectLabels.moveadj",
  "system.armourEffects": "PEN.effectLabels.armouradj",
  "system.healRateEffects": "PEN.effectLabels.healadj",
  "system.genialityAdj": "PEN.effectLabels.genialityadj",
  "system.income.libraBonus": "PEN.effectLabels.incomeLibraAdj",
  "system.income.denariiBonus": "PEN.effectLabels.incomeDenariiAdj",
};
