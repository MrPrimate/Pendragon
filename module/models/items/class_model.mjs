const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class ClassData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      starter: new BooleanField({ initial: false }),
      age: new NumberField({ required: true, nullable: true, integer: true }),
      gear: new ArrayField(new DataField(), { initial: [] }),
      passions: new ArrayField(new DataField(), { initial: [] }),
    };
  }
}
