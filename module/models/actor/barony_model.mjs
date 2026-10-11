const {
  HTMLField,
  SchemaField,
  NumberField,
  StringField,
  DocumentUUIDField,
  ForeignDocumentField,
  ArrayField,
  ObjectField,
  BooleanField,
  FilePathField,
} = foundry.data.fields;

import { PENActorData } from "./base_actor_model.mjs";

export class BaronyData extends PENActorData {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      description: new HTMLField({ required: true, blank: true, initial: "" }),
      GMdescription: new HTMLField({ required: true, blank: true, initial: "" }),
      dv: new SchemaField({
        citywalls: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 1 }),
        }),
        outworks: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 2 }),
        }),
        outerbailey1: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 3 }),
        }),
        outerbailey2: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 4 }),
        }),
        outerbailey3: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 5 }),
        }),
        innerbailey1: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 6 }),
        }),
        innerbailey2: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 7 }),
        }),
        innerbailey3: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 8 }),
        }),
        motte1: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 9 }),
          singlemotte: new BooleanField({ initial: true, persisted: false }),
        }),
        motte2: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 10 }),
          singlemotte: new BooleanField({ initial: true, persisted: false }),
        }),
        motte3: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 11 }),
          singlemotte: new BooleanField({ initial: true, persisted: false }),
        }),
        stronghold1: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 12 }),
        }),

        stronghold2: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 13 }),
        }),
        stronghold3: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
          pos: new NumberField({ ...requiredInteger, initial: 14 }),
        }),
      }),
      sol: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      }),
      solCalc: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      rent: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      }),
      armyCost: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      cost: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      income: new SchemaField({
        libra: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
        libraBonus: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        denariiBonus: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      }),
      privyInc: new SchemaField({
        libra: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      }),
      folkCost: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      yearAssized: new NumberField({ ...requiredInteger, initial: 0 }),
      mapImage: new FilePathField({
        required: true,
        categories: ["IMAGE"],
        initial: "systems/Pendragon/assets/sample_manor_img.webp",
      }),
      mesnie: new SchemaField({
        garrisonSoldier: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 120 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
        crossbowman: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 1 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
        spearman: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 120 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
        houseKnights: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 4 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
        vassalKnights: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 4 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
        mountedSerg: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 2 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
        mercKnights: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 4 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
        vetmercKnights: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 5 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
      }),
      armyTotal: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      enfeoffed: new SchemaField({
        npc: new DocumentUUIDField({ type: "Actor" }),
        background: new StringField({ required: true, blank: true, initial: "none" }),
        stewardship: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      county: new StringField({ required: true, blank: true, initial: "" }),
      leige: new StringField({ required: true, blank: true, initial: "" }),
      caput: new StringField({ required: true, blank: true, initial: "" }),
      solMet: new BooleanField({ initial: true, persisted: false }),
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    let tempRent = this.rent.libra * 240 + this.rent.denarii;
    let tempSol = Math.round(this.rent.libra * 0.1) + 5;
    this.solMet = true;
    if (this.sol.libra < tempSol) {
      this.solMet = false;
    }
    this.solCalc.libra = tempSol;
    this.solCalc.denarii = 0;
    //Calculate DV
    this._calcDV();
    //Mesnie Entitlement
    let baseNum = (tempRent / 240) * 0.1;
    let armyCost = Math.floor(tempRent * 0.6);
    let armyTotal = 1;
    let knights = Math.round(baseNum / 2) - 1;
    for (let [key, troop] of Object.entries(this.mesnie)) {
      troop.entitled = 0;
      if (key === "garrisonSoldier") troop.entitled = Math.round(baseNum);
      if (key === "mountedSerg") troop.entitled = Math.round(baseNum / 2);
      if (key === "vassalKnights") troop.entitled = Math.floor(knights * 0.4);
      if (key === "houseKnights") troop.entitled = knights - Math.floor(knights * 0.4);
      if (key === "spearman") troop.entitled = Math.round(baseNum * 3);
      if (key === "crossbowman") troop.entitled = Math.round(baseNum);
      if (key === "garrisonSoldier") troop.entitled = Math.round(baseNum);

      troop.total = troop.entitled + troop.employed;
      armyTotal = armyTotal + troop.total;
      let tempVal = troop.costPer.libra * 240 * troop.employed + troop.costPer.denarii * troop.employed;
      armyCost = armyCost + tempVal;
      troop.costTotal.libra = Math.floor(tempVal / 240);
      troop.costTotal.denarii = tempVal - troop.costTotal.libra * 240;
    }
    this.armyCost.libra = Math.round(armyCost / 240);
    this.armyCost.denarii = 0;
    this.armyTotal = armyTotal;

    //Baronial Expenses
    let tempExp = Math.floor(tempRent * 0.2);
    this.cost.libra = Math.round(tempExp / 240);
    this.cost.denarii = 0;

    //Calculate Cost of Background NPCs & total Folk Cost
    this._calcFolkCost();

    //Calculate Income
    let incomeManorImp = this.parent.items
      .filter((i) => i.type === "manorImp")
      .filter((i) => ["maintained", "unmaintained"].includes(i.system.status));

    let incVal = 0 + this.income.libraBonus * 240 + this.income.denariiBonus;
    for (let itm of incomeManorImp) {
      //Income only includes those built after assized year and not ruined
      if (itm.system.yearAcquired > this.yearAssized) {
        incVal = incVal + itm.system.income.libra * 240 + itm.system.income.denarii;
      }
    }
    this.income.libra = Math.round(incVal / 240);
    this.income.denarii = 0;

    //Calculate Privy Income
    let tempPrivy =
      this.rent.libra +
      this.income.libra -
      (this.cost.libra + this.armyCost.libra + this.sol.libra + this.folkCost.libra);
    this.privyInc.libra = tempPrivy;
    this.privyInc.denarii = 0;
    //Calculate skill scores

    //Get Stewardship Score
    this._getStewardship();
  }
}
