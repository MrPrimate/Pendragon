const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField, DocumentUUIDField } =
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
      relation: new StringField({ required: true, blank: true, initial: "other" }),
      barrenMarriage: new BooleanField({ initial: false }),
      blessed: new BooleanField({ initial: false }),
      maternal: new BooleanField({ initial: false }),
      born: new NumberField({ ...requiredInteger, initial: 0 }),
      married: new NumberField({ ...requiredInteger, initial: 0 }),
      glory: new NumberField({ ...requiredInteger, initial: 0 }),
      heroic: new NumberField({ ...requiredInteger, initial: 0 }),
      age: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      careers: new ArrayField(
        new SchemaField({
          name: new StringField({}),
          pid: new StringField({}),
          uuid: new DocumentUUIDField({ type: "Item" }),
        }),
      ),
      careerLevel: new NumberField({ ...requiredInteger, initial: 0 }),
      yearPromoted: new NumberField({ ...requiredInteger, initial: 0 }),
      profession: new StringField({ required: true, blank: true, initial: "" }),
      nextPromotion: new NumberField({ ...requiredInteger, initial: 0 }),
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.age = game.time.components.year - this.born;
    if (Number(this.died) > 0) {
      this.age = Number(this.died) - this.born;
    }
  }
}
