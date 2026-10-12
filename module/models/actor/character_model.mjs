import { PendragonStatusEffects } from "../../apps/status-effects.mjs";
const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DocumentUUIDField } =
  foundry.data.fields;

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      hp: new SchemaField({
        value: new NumberField({ ...requiredInteger, min: 0, initial: 10 }),
        min: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        max: new NumberField({ ...requiredInteger, min: 0, initial: 10 }),
        adj: new NumberField({ ...requiredInteger, initial: 0 }),
        effects: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      stats: new SchemaField({
        siz: new SchemaField({
          value: new NumberField({ ...requiredInteger, min: 0, initial: 10 }),
          culture: new NumberField({ ...requiredInteger, initial: 0 }),
          create: new NumberField({ ...requiredInteger, initial: 0 }),
          poison: new NumberField({ ...requiredInteger, initial: 0 }),
          disease: new NumberField({ ...requiredInteger, initial: 0 }),
          sol: new NumberField({ ...requiredInteger, initial: 0 }),
          age: new NumberField({ ...requiredInteger, initial: 0 }),
          effects: new NumberField({ ...requiredInteger, initial: 0 }),
          youth: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          major: new NumberField({ ...requiredInteger, initial: 0 }),
          winter: new NumberField({ ...requiredInteger, initial: 0 }),
          growth: new NumberField({ ...requiredInteger, initial: 0 }),
          formula: new StringField({ required: true, initial: "2D6+5" }),
          min: new NumberField({ ...requiredInteger, initial: 8 }), //Starting Value min
          max: new NumberField({ ...requiredInteger, initial: 15 }), //Starting Value max
          cMax: new NumberField({ ...requiredInteger, initial: 18 }), //Cultural Max from Archetype
          tMax: new NumberField({ ...requiredInteger, initial: 0, persisted: false }), //Total Stat Max adjusted for Culture
        }),
        dex: new SchemaField({
          value: new NumberField({ ...requiredInteger, min: 0, initial: 10 }),
          culture: new NumberField({ ...requiredInteger, initial: 0 }),
          create: new NumberField({ ...requiredInteger, initial: 0 }),
          poison: new NumberField({ ...requiredInteger, initial: 0 }),
          disease: new NumberField({ ...requiredInteger, initial: 0 }),
          sol: new NumberField({ ...requiredInteger, initial: 0 }),
          age: new NumberField({ ...requiredInteger, initial: 0 }),
          effects: new NumberField({ ...requiredInteger, initial: 0 }),
          youth: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          major: new NumberField({ ...requiredInteger, initial: 0 }),
          winter: new NumberField({ ...requiredInteger, initial: 0 }),
          growth: new NumberField({ ...requiredInteger, initial: 0 }),
          formula: new StringField({ required: true, initial: "2D6+5" }),
          min: new NumberField({ ...requiredInteger, initial: 8 }),
          max: new NumberField({ ...requiredInteger, initial: 15 }),
          cMax: new NumberField({ ...requiredInteger, initial: 18 }),
          tMax: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
        }),
        str: new SchemaField({
          value: new NumberField({ ...requiredInteger, min: 0, initial: 10 }),
          culture: new NumberField({ ...requiredInteger, initial: 0 }),
          create: new NumberField({ ...requiredInteger, initial: 0 }),
          poison: new NumberField({ ...requiredInteger, initial: 0 }),
          disease: new NumberField({ ...requiredInteger, initial: 0 }),
          sol: new NumberField({ ...requiredInteger, initial: 0 }),
          age: new NumberField({ ...requiredInteger, initial: 0 }),
          effects: new NumberField({ ...requiredInteger, initial: 0 }),
          youth: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          major: new NumberField({ ...requiredInteger, initial: 0 }),
          winter: new NumberField({ ...requiredInteger, initial: 0 }),
          growth: new NumberField({ ...requiredInteger, initial: 0 }),
          formula: new StringField({ required: true, initial: "2D6+5" }),
          min: new NumberField({ ...requiredInteger, initial: 8 }),
          max: new NumberField({ ...requiredInteger, initial: 15 }),
          cMax: new NumberField({ ...requiredInteger, initial: 18 }),
          tMax: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
        }),
        con: new SchemaField({
          value: new NumberField({ ...requiredInteger, min: 0, initial: 10 }),
          culture: new NumberField({ ...requiredInteger, initial: 0 }),
          create: new NumberField({ ...requiredInteger, initial: 0 }),
          poison: new NumberField({ ...requiredInteger, initial: 0 }),
          disease: new NumberField({ ...requiredInteger, initial: 0 }),
          sol: new NumberField({ ...requiredInteger, initial: 0 }),
          age: new NumberField({ ...requiredInteger, initial: 0 }),
          effects: new NumberField({ ...requiredInteger, initial: 0 }),
          youth: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          major: new NumberField({ ...requiredInteger, initial: 0 }),
          winter: new NumberField({ ...requiredInteger, initial: 0 }),
          growth: new NumberField({ ...requiredInteger, initial: 0 }),
          formula: new StringField({ required: true, initial: "2D6+5" }),
          min: new NumberField({ ...requiredInteger, initial: 8 }),
          max: new NumberField({ ...requiredInteger, initial: 15 }),
          cMax: new NumberField({ ...requiredInteger, initial: 18 }),
          tMax: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
        }),
        app: new SchemaField({
          value: new NumberField({ ...requiredInteger, min: 0, initial: 10 }),
          culture: new NumberField({ ...requiredInteger, initial: 0 }),
          create: new NumberField({ ...requiredInteger, initial: 0 }),
          poison: new NumberField({ ...requiredInteger, initial: 0 }),
          disease: new NumberField({ ...requiredInteger, initial: 0 }),
          sol: new NumberField({ ...requiredInteger, initial: 0 }),
          age: new NumberField({ ...requiredInteger, initial: 0 }),
          effects: new NumberField({ ...requiredInteger, initial: 0 }),
          youth: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          major: new NumberField({ ...requiredInteger, initial: 0 }),
          winter: new NumberField({ ...requiredInteger, initial: 0 }),
          growth: new NumberField({ ...requiredInteger, initial: 0 }),
          formula: new StringField({ required: true, initial: "2D6+5" }),
          min: new NumberField({ ...requiredInteger, initial: 8 }),
          max: new NumberField({ ...requiredInteger, initial: 15 }),
          cMax: new NumberField({ ...requiredInteger, initial: 18 }),
          tMax: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
        }),
      }),
      statTotal: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      coatOfArms: new FilePathField({
        required: true,
        categories: ["IMAGE"],
        initial: "systems/Pendragon/assets/Icons/checked-shield.svg",
      }),
      born: new NumberField({ ...requiredInteger, min: 0, initial: 487 }),
      died: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      age: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      aggravDam: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      deterDam: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      beauty: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      prestige: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      damage: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      damAdj: new NumberField({ ...requiredInteger, initial: 0 }), //To be Deleted
      damEffects: new NumberField({ ...requiredInteger, initial: 0 }),
      damBonus: new StringField({ required: true, blank: true, initial: "" }),
      moveAdj: new NumberField({ ...requiredInteger, initial: 0 }), //To be Deleted
      moveEffects: new NumberField({ ...requiredInteger, initial: 0 }),
      healRate: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      healRateEffects: new NumberField({ ...requiredInteger, initial: 0 }),
      genialityAdj: new NumberField({ ...requiredInteger, initial: 0 }),
      armourAdj: new NumberField({ ...requiredInteger, initial: 0 }), //To be Deleted
      armourEffects: new NumberField({ ...requiredInteger, initial: 0 }),
      impoverished: new NumberField({ ...requiredInteger, initial: 0 }),
      manualGlory: new NumberField({ ...requiredInteger, initial: 0 }),
      lord: new StringField({ required: true, blank: true, initial: "" }),
      class: new StringField({ required: true, blank: true, initial: "" }),
      parentclass: new StringField({ required: true, blank: true, initial: "" }),
      sol: new StringField({ required: true, blank: true, initial: "ordinary" }),
      archetype: new StringField({ required: true, blank: true, initial: "" }),
      culture: new StringField({ required: true, blank: true, initial: "" }),
      religion: new StringField({ required: true, blank: true, initial: "" }),
      homeland: new StringField({ required: true, blank: true, initial: "" }),
      home: new StringField({ required: true, blank: true, initial: "" }),
      family: new StringField({ required: true, blank: true, initial: "" }),
      gender: new StringField({ required: true, blank: true, initial: "" }),
      features: new StringField({ required: true, blank: true, initial: "" }),
      equestrian: new StringField({ required: true, blank: true, initial: "" }),
      heraldry: new StringField({ required: true, blank: true, initial: "" }),
      classID: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      className: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      cultureID: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      cultureName: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      homelandID: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      homelandName: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      religionID: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      religionName: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      archetypeID: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      archetypeName: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      heir: new BooleanField({ initial: false }),
      lock: new BooleanField({ initial: false }),
      motto: new StringField({ required: true, blank: true, initial: "" }),
      battlePos: new StringField({ required: true, blank: true, inital: "0" }),
      fieldPos: new StringField({ required: true, blank: true, initial: "0" }),
      estates: new ArrayField(new DocumentUUIDField({ type: "Actor" })),
      background: new HTMLField({ initial: "" }),
      money: new SchemaField({
        libra: new NumberField({ ...requiredInteger, initial: 0 }),
        denarii: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      equippedHands: new SchemaField({
        primary: new StringField({ required: true, initial: "" }),
        secondary: new StringField({ required: true, initial: "" }),
      }),
      joust: new SchemaField({
        wins: new NumberField({ ...requiredInteger, initial: 0 }),
        losses: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      passglory: new SchemaField({
        estate: new NumberField({ ...requiredInteger, initial: 0 }),
        inyear: new NumberField({ ...requiredInteger, initial: 0 }),
        other: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      status: new SchemaField({
        debilitated: new BooleanField({ initial: false }),
        chirurgery: new BooleanField({ initial: false }),
        unconscious: new BooleanField({ initial: false }),
        nearDeath: new BooleanField({ initial: false }),
        madness: new BooleanField({ initial: false }),
        melancholy: new BooleanField({ initial: false }),
        misery: new BooleanField({ initial: false }),
        winter: new BooleanField({ initial: false }),
        train: new BooleanField({ initial: false }),
        economic: new BooleanField({ initial: false }),
        aging: new BooleanField({ initial: false }),
        squireAge: new BooleanField({ initial: false }),
        horseSurv: new BooleanField({ initial: false }),
        familyRoll: new BooleanField({ initial: false }),
        passiveGlory: new BooleanField({ initial: false }),
        xp: new BooleanField({ initial: false }),
        barren: new BooleanField({ initial: false }),
      }),
      create: new SchemaField({
        stats: new BooleanField({ initial: true }),
        traits: new BooleanField({ initial: true }),
        random: new BooleanField({ initial: false }),
        step: new NumberField({ ...requiredInteger, initial: 1 }),
        charSet: new BooleanField({ initial: false }),
        complete: new BooleanField({ initial: false }),
        toggle: new BooleanField({ initial: true }),
        knighted: new BooleanField({ initial: false }),
        parents: new BooleanField({ initial: false }),
        train: new BooleanField({ initial: false }),
        heirStat: new BooleanField({ initial: false }),
      }),
    };
  }

  static migrateData(source) {
    if (source.stats?.str?.formula === "") {
      source.stats.str.formula = "2D6+5";
    }
    if (source.stats?.dex?.formula === "") {
      source.stats.dex.formula = "2D6+5";
    }
    if (source.stats?.siz?.formula === "") {
      source.stats.siz.formula = "2D6+5";
    }
    if (source.stats?.con?.formula === "") {
      source.stats.con.formula = "2D6+5";
    }
    if (source.stats?.app?.formula === "") {
      source.stats.app.formula = "2D6+5";
    }
    return source;
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    this.age = game.time.components.year - this.born;
    if (this.died > 0) {
      this.age = this.died - this.born;
    }

    // Handle stats scores, adding labels to stats
    for (let [key, stat] of Object.entries(this.stats)) {
      stat.label = game.i18n.localize(CONFIG.PENDRAGON.stats[key]) ?? key;
      stat.labelShort = game.i18n.localize(CONFIG.PENDRAGON.statsAbbreviations[key]) ?? key;
      stat.youth = 0;
      //For "young" characters reduce stats
      if (this.age < game.settings.get("Pendragon", "youthAge")) {
        stat.youth = Math.round(
          (Number(stat.value) + Number(stat.culture)) *
            ((game.settings.get("Pendragon", "youthAge") - Math.max(7, this.age)) /
              -(game.settings.get("Pendragon", "youthAge") - 1)),
        );
      }
      stat.tMax = stat.cMax + stat.culture;
      stat.total = Math.min(
        stat.tMax,
        stat.value +
          stat.culture +
          stat.create +
          stat.poison +
          stat.disease +
          stat.sol +
          stat.age +
          stat.effects +
          stat.youth +
          stat.major +
          stat.winter,
      );
      this.statTotal = this.statTotal + stat.value;
    }

    //Set Culture ID
    const culture = this.parent.items.find((itm) => itm.type === "culture");
    if (culture) {
      this.cultureID = culture._id;
      this.cultureName = culture.name;
    }
    //Set Homeland ID
    const homeland = this.parent.items.find((itm) => itm.type === "homeland");
    if (homeland) {
      this.homelandID = homeland._id;
      this.homelandName = homeland.name;
    }

    //Set Class ID
    const actClass = this.parent.items.find((itm) => itm.type === "class");
    if (actClass) {
      this.classID = actClass._id;
      this.className = actClass.name;
    }

    //Set Religion ID
    const religion = this.parent.items.find((itm) => itm.type === "religion");
    if (religion) {
      this.religionID = religion._id;
      this.religionName = religion.name;
    }

    //Set Archetype ID
    const archetype = this.parent.items.find((itm) => itm.type === "archetype");
    if (archetype) {
      this.archetypeID = archetype._id;
      this.archetypeName = archetype.name;
    }
    this.damage = Math.round((this.stats.str.total + this.stats.siz.total) / 6) + this.damEffects;
    this.move = this.move + this.moveEffects;
    this.armour = this.armour + this.armourEffects;
    this.healRate = Math.round(this.stats.con.total / 5) + this.healRateEffects;
    this.move = Math.round((this.stats.str.total + this.stats.dex.total) / 2) + 5 + this.moveEffects;

    if (game.settings.get("Pendragon", "trackWnd")) {
      this.hp.value = this.hp.max - this.totalWounds - this.aggravDam - this.deterDam;
    }
    this.hp.unconscious = Math.round(this.hp.max / 4);
  }
}
