const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class FamilyData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      died: new StringField({ required: true, blank: true, initial: "" }),
      gender: new StringField({ required: true, blank: true, initial: "" }),
      relation: new StringField({ required: true, blank: true, initial: "" }),
      barrenMarriage: new BooleanField({ initial: false }),
      blessed: new BooleanField({ initial: false }),

      born: new NumberField({ ...requiredInteger, initial: 0 }),
      glory: new NumberField({ ...requiredInteger, initial: 0 }),
      heroic: new NumberField({ ...requiredInteger, initial: 0 }),
      age: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.age = game.time.components.year - this.born;
    if (this.died > 0) {
      this.age = this.died - this.born;
    }
  }
}
