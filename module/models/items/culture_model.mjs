const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class CultureData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      stats: new SchemaField({
        siz: new SchemaField({
          bonus: new NumberField({ ...requiredInteger, initial: 0 }),
          max: new NumberField({ ...requiredInteger, initial: 18 }), //Delete in future once Archetype done
          formula: new StringField({ required: true, blank: false, initial: "2D6+5" }), //Delete in future once Archetype done
        }),
        dex: new SchemaField({
          bonus: new NumberField({ ...requiredInteger, initial: 0 }),
          max: new NumberField({ ...requiredInteger, initial: 18 }), //Delete in future once Archetype done
          formula: new StringField({ required: true, blank: false, initial: "2D6+5" }), //Delete in future once Archetype done
        }),
        str: new SchemaField({
          bonus: new NumberField({ ...requiredInteger, initial: 0 }),
          max: new NumberField({ ...requiredInteger, initial: 18 }), //Delete in future once Archetype done
          formula: new StringField({ required: true, blank: false, initial: "2D6+5" }), //Delete in future once Archetype done
        }),
        con: new SchemaField({
          bonus: new NumberField({ ...requiredInteger, initial: 0 }),
          max: new NumberField({ ...requiredInteger, initial: 18 }), //Delete in future once Archetype done
          formula: new StringField({ required: true, blank: false, initial: "2D6+5" }), //Delete in future once Archetype done
        }),
        app: new SchemaField({
          bonus: new NumberField({ ...requiredInteger, initial: 0 }),
          max: new NumberField({ ...requiredInteger, initial: 18 }), //Delete in future once Archetype done
          formula: new StringField({ required: true, blank: false, initial: "2D6+5" }), //Delete in future once Archetype done
        }),
      }),
      skills: new ArrayField(new DataField(), { initial: [] }),
    };
  }
}
