const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class SkillData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      specName: new StringField({ required: true, blank: true, initial: "" }),
      mainName: new StringField({ required: true, blank: true, initial: "" }),
      familyChar: new StringField({ required: true, blank: true, initial: "" }),
      specialisation: new BooleanField({ initial: false }),
      combat: new BooleanField({ initial: false }),
      knightly: new BooleanField({ initial: false }),
      starter: new BooleanField({ initial: false }),
      magical: new BooleanField({ initial: false }),
      XP: new BooleanField({ initial: false }),
      weaponType: new StringField({ required: true, blank: true, initial: "" }),
      value: new NumberField({ ...requiredInteger, initial: 0 }),
      effects: new NumberField({ ...requiredInteger, initial: 0 }),
      culture: new NumberField({ ...requiredInteger, initial: 0 }),
      family: new NumberField({ ...requiredInteger, initial: 0 }),
      create: new NumberField({ ...requiredInteger, initial: 0 }),
      winter: new NumberField({ ...requiredInteger, initial: 0 }),
      total: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      base: new SchemaField({
        stat: new StringField({ required: true, blank: true, initial: "" }),
        multi: new NumberField({ required: true, nullable: false, min: 0, initial: 1 }),
        mod: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      categories: new ArrayField(new DataField(), { initial: [] }),
      categoryLabels: new ArrayField(new DataField(), { initial: [], persisted: false }),
      npcSource: new StringField({ required: true, blank: true, initial: "" }),
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    let catLabels = [];
    for (let cat of this.categories) {
      catLabels.push(game.i18n.localize("PEN.skillcat." + cat));
    }
    this.categoryLabels = catLabels;
  }
}
