const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class SquireData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      category: new StringField({ required: true, blank: true, initial: "squire" }),
      age: new NumberField({ ...requiredInteger, initial: 14 }),
      newAge: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      born: new NumberField({ ...requiredInteger, initial: 0 }),
      died: new NumberField({ ...requiredInteger, initial: 0 }),
      gender: new StringField({ required: true, blank: true, initial: "" }),
      skill: new NumberField({ ...requiredInteger, initial: 15 }),
      knightMod: new NumberField({ ...requiredInteger, initial: 0 }),
      glory: new NumberField({ ...requiredInteger, initial: 0 }),
    };
  }

  static migrateData(source) {
    if (source.born === 0) {
      source.born = game.time.components.year - source.age;
    }
    return source;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.newAge = game.time.components.year - this.born;
    if (this.died > 0) {
      this.newAge = this.died - this.born;
    }
  }
}
