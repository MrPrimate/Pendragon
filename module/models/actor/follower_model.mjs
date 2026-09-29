const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField } =
  foundry.data.fields;

export class FollowerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      hp: new SchemaField({
        value: new NumberField({ ...requiredInteger, min: 0, initial: 10 }),
        min: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        max: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        adj: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
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
          youth: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          major: new NumberField({ ...requiredInteger, initial: 0 }),
          winter: new NumberField({ ...requiredInteger, initial: 0 }),
          growth: new NumberField({ ...requiredInteger, initial: 0 }),
          formula: new StringField({ required: false }),
        }),
        dex: new SchemaField({
          value: new NumberField({ ...requiredInteger, min: 0, initial: 10 }),
          culture: new NumberField({ ...requiredInteger, initial: 0 }),
          create: new NumberField({ ...requiredInteger, initial: 0 }),
          poison: new NumberField({ ...requiredInteger, initial: 0 }),
          disease: new NumberField({ ...requiredInteger, initial: 0 }),
          sol: new NumberField({ ...requiredInteger, initial: 0 }),
          age: new NumberField({ ...requiredInteger, initial: 0 }),
          youth: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          major: new NumberField({ ...requiredInteger, initial: 0 }),
          winter: new NumberField({ ...requiredInteger, initial: 0 }),
          growth: new NumberField({ ...requiredInteger, initial: 0 }),
          formula: new StringField({ required: false }),
        }),
        str: new SchemaField({
          value: new NumberField({ ...requiredInteger, min: 0, initial: 10 }),
          culture: new NumberField({ ...requiredInteger, initial: 0 }),
          create: new NumberField({ ...requiredInteger, initial: 0 }),
          poison: new NumberField({ ...requiredInteger, initial: 0 }),
          disease: new NumberField({ ...requiredInteger, initial: 0 }),
          sol: new NumberField({ ...requiredInteger, initial: 0 }),
          age: new NumberField({ ...requiredInteger, initial: 0 }),
          youth: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          major: new NumberField({ ...requiredInteger, initial: 0 }),
          winter: new NumberField({ ...requiredInteger, initial: 0 }),
          growth: new NumberField({ ...requiredInteger, initial: 0 }),
          formula: new StringField({ required: false }),
        }),
        con: new SchemaField({
          value: new NumberField({ ...requiredInteger, min: 0, initial: 10 }),
          culture: new NumberField({ ...requiredInteger, initial: 0 }),
          create: new NumberField({ ...requiredInteger, initial: 0 }),
          poison: new NumberField({ ...requiredInteger, initial: 0 }),
          disease: new NumberField({ ...requiredInteger, initial: 0 }),
          sol: new NumberField({ ...requiredInteger, initial: 0 }),
          age: new NumberField({ ...requiredInteger, initial: 0 }),
          youth: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          major: new NumberField({ ...requiredInteger, initial: 0 }),
          winter: new NumberField({ ...requiredInteger, initial: 0 }),
          growth: new NumberField({ ...requiredInteger, initial: 0 }),
          formula: new StringField({ required: false }),
        }),
        app: new SchemaField({
          value: new NumberField({ ...requiredInteger, min: 0, initial: 10 }),
          culture: new NumberField({ ...requiredInteger, initial: 0 }),
          create: new NumberField({ ...requiredInteger, initial: 0 }),
          poison: new NumberField({ ...requiredInteger, initial: 0 }),
          disease: new NumberField({ ...requiredInteger, initial: 0 }),
          sol: new NumberField({ ...requiredInteger, initial: 0 }),
          age: new NumberField({ ...requiredInteger, initial: 0 }),
          youth: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          major: new NumberField({ ...requiredInteger, initial: 0 }),
          winter: new NumberField({ ...requiredInteger, initial: 0 }),
          growth: new NumberField({ ...requiredInteger, initial: 0 }),
          formula: new StringField({ required: false }),
        }),
      }),
      subtype: new StringField({ required: true, blank: true, initial: "squire" }),
      description: new HTMLField({ required: true, blank: true, initial: "" }),
      sol: new StringField({ required: true, blank: true, initial: "ordinary" }),
      woundTotal: new NumberField({ ...requiredInteger, initial: 0 }),
      manMove: new NumberField({ ...requiredInteger, initial: 0 }),
      manArm: new NumberField({ ...requiredInteger, initial: 0 }),
      manShd: new NumberField({ ...requiredInteger, initial: 0 }),
      manMaxHP: new NumberField({ ...requiredInteger, initial: 0 }),
      manKnockdown: new NumberField({ ...requiredInteger, initial: 0 }),
      manMjrWnd: new NumberField({ ...requiredInteger, initial: 0 }),
      manDmg: new NumberField({ ...requiredInteger, initial: 0 }),
      manHealRate: new NumberField({ ...requiredInteger, initial: 0 }),
      manUnconscious: new NumberField({ ...requiredInteger, initial: 0 }),
      squire: new NumberField({ ...requiredInteger, initial: 0 }),
      born: new NumberField({ ...requiredInteger, initial: 487 }),
      died: new NumberField({ ...requiredInteger, initial: 0 }),
      culture: new StringField({ required: true, blank: true, initial: "" }),
      religion: new StringField({ required: true, blank: true, initial: "" }),
      homeland: new StringField({ required: true, blank: true, initial: "" }),
      family: new StringField({ required: true, blank: true, initial: "" }),
      features: new StringField({ required: true, blank: true, initial: "" }),
      heir: new BooleanField({ initial: false }),
      lock: new BooleanField({ initial: false }),
      barren: new BooleanField({ initial: false }),
      view: new BooleanField({ initial: false }),
    };
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
      //If follower age <13 reduce stats
      if (this.age < 13) {
        stat.youth = Math.round((Number(stat.value) + Number(stat.culture)) * ((13 - Math.max(7, this.age)) / -12));
      }
      stat.total =
        Number(stat.value) +
        Number(stat.culture) +
        Number(stat.create) +
        Number(stat.poison) +
        Number(stat.disease) +
        Number(stat.sol) +
        Number(stat.age) +
        Number(stat.youth) +
        Number(stat.major) +
        Number(stat.winter);
    }
  }
}
