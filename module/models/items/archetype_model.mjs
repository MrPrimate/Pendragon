const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class ArchetypeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      stats: new SchemaField({
        siz: new SchemaField({
          min: new NumberField({ ...requiredInteger, initial: 8 }),
          max: new NumberField({ ...requiredInteger, initial: 15 }),
          culturalMax: new NumberField({ ...requiredInteger, initial: 18 }),
          formula: new StringField({ required: true, blank: false, initial: "2D6+5" }),
        }),
        dex: new SchemaField({
          min: new NumberField({ ...requiredInteger, initial: 8 }),
          max: new NumberField({ ...requiredInteger, initial: 15 }),
          culturalMax: new NumberField({ ...requiredInteger, initial: 18 }),
          formula: new StringField({ required: true, blank: false, initial: "2D6+5" }),
        }),
        str: new SchemaField({
          min: new NumberField({ ...requiredInteger, initial: 8 }),
          max: new NumberField({ ...requiredInteger, initial: 15 }),
          culturalMax: new NumberField({ ...requiredInteger, initial: 18 }),
          formula: new StringField({ required: true, blank: false, initial: "2D6+5" }),
        }),
        con: new SchemaField({
          min: new NumberField({ ...requiredInteger, initial: 8 }),
          max: new NumberField({ ...requiredInteger, initial: 15 }),
          culturalMax: new NumberField({ ...requiredInteger, initial: 18 }),
          formula: new StringField({ required: true, blank: false, initial: "2D6+5" }),
        }),
        app: new SchemaField({
          min: new NumberField({ ...requiredInteger, initial: 8 }),
          max: new NumberField({ ...requiredInteger, initial: 15 }),
          culturalMax: new NumberField({ ...requiredInteger, initial: 18 }),
          formula: new StringField({ required: true, blank: false, initial: "2D6+5" }),
        }),
      }),
      skills: new ArrayField(new DataField(), { initial: [] }),
    };
  }
}
