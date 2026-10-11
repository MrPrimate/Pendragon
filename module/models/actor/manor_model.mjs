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

export class ManorData extends PENActorData {
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
      currVal: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      rent: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      }),
      cost: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      armyCost: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      income: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        libraBonus: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        denariiBonus: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      }),
      folkCost: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      privyInc: new SchemaField({
        libra: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
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
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    //Calculate DV
    this._calcDV();
    //Calculate Current Value - base £10 + any built Enhancements or Investments (not other types)
    let valManorImp = this.parent.items
      .filter((i) => i.type === "manorImp")
      .filter((i) => !i.system.starter)
      .filter((i) => ["maintained", "unmaintained", "ruined"].includes(i.system.status))
      .filter((i) => ["enh", "inv"].includes(i.system.subtype));
    let tempValue = 2400; //£10 in denarii
    for (let itm of valManorImp) {
      tempValue = tempValue + itm.system.cost.libra * 240 + itm.system.cost.denarii;
    }
    this.currVal.libra = Math.floor(tempValue / 240);
    this.currVal.denarii = tempValue - 240 * this.currVal.libra;

    //Mesnie Entitlement
    let baseNum = Math.floor(this.rent.libra / 10);
    let armyCost = 0;
    let armyTotal = 0;
    for (let [key, troop] of Object.entries(this.mesnie)) {
      troop.entitled = 0;
      if (key === "garrisonSoldier") troop.entitled = baseNum;
      if (key === "spearman") troop.entitled = baseNum * 2;
      troop.total = troop.entitled + troop.employed;
      armyTotal = armyTotal + troop.total;
      let tempVal = troop.costPer.libra * 240 * troop.employed + troop.costPer.denarii * troop.employed;
      armyCost = armyCost + tempVal;
      troop.costTotal.libra = Math.floor(tempVal / 240);
      troop.costTotal.denarii = tempVal - troop.costTotal.libra * 240;
    }
    this.armyCost.libra = Math.floor(armyCost / 240);
    this.armyCost.denarii = armyCost - 240 * this.armyCost.libra;
    this.armyTotal = armyTotal;

    //Calculate Cost of Background NPCs & Total Folk Cost
    this._calcFolkCost();
    let folkCost = this.folkCost.libra * 240 + this.folkCost.denarii;

    //Calculate Income/Cost
    let costManorImp = this.parent.items
      .filter((i) => i.type === "manorImp")
      .filter((i) => ["maintained", "unmaintained", "ruined"].includes(i.system.status));

    let incVal = 240 + this.income.libraBonus * 240 + this.income.denariiBonus; //Include Basic £1 income
    let costVal = 0;
    for (let itm of costManorImp) {
      //Income only includes those built after assized year and not ruined, but cost includes all
      if (itm.system.yearAcquired > this.yearAssized && itm.system.status != "ruined") {
        incVal = incVal + itm.system.income.libra * 240 + itm.system.income.denarii;
      }
      costVal = costVal + itm.system.annualCost.libra * 240 + itm.system.annualCost.denarii;
    }
    this.income.libra = Math.floor(incVal / 240);
    this.income.denarii = incVal - 240 * this.income.libra;
    this.cost.libra = Math.floor(costVal / 240);
    this.cost.denarii = costVal - 240 * this.cost.libra;

    //Calculate Privy Income
    let tempPrivy = incVal - (costVal + folkCost + armyCost);
    this.privyInc.libra = Math.floor(tempPrivy / 240);
    this.privyInc.denarii = tempPrivy - 240 * this.privyInc.libra;

    //Get Stewardship Score
    this._getStewardship();
  }
}
