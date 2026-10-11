const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class TraitData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      oppName: new StringField({ required: true, blank: true, initial: "" }),
      directed: new StringField({ required: true, blank: true, initial: "" }),
      XP: new BooleanField({ initial: false }),
      oppXP: new BooleanField({ initial: false }),
      value: new NumberField({ ...requiredInteger, initial: 0 }),
      archetype: new NumberField({ ...requiredInteger, initial: 0 }),
      effects: new NumberField({ ...requiredInteger, initial: 0 }),
      religious: new NumberField({ ...requiredInteger, initial: 0 }),
      winter: new NumberField({ ...requiredInteger, initial: 0 }),
      total: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      oppvalue: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      flavour: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      oppFlavour: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      npcSource: new StringField({ required: true, blank: true, initial: "" }),
    };
  }
}
