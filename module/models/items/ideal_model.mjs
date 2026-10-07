const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class IdealData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      traitGroupScore: new NumberField({ ...requiredInteger, initial: 0 }),
      age: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      glory: new NumberField({ ...requiredInteger, initial: 0 }),
      armour: new NumberField({ ...requiredInteger, initial: 0 }), //TO BE DELETED - now Active Effects
      hp: new NumberField({ ...requiredInteger, initial: 0 }), //TO BE DELETED - now Active Effects
      hr: new NumberField({ ...requiredInteger, initial: 0 }), //TO BE DELETED - now Active Effects
      dam: new StringField({ required: true, blank: true, initial: "" }), //TO BE DELETED - now Active Effects
      move: new NumberField({ ...requiredInteger, initial: 0 }), //TO BE DELETED - now Active Effects
      protect: new BooleanField({ initial: false }),
      traitGroup: new ArrayField(new DataField(), { initial: [] }),
      skillGroupCount: new NumberField({ ...requiredInteger, initial: 0 }),
      skillGroup: new ArrayField(new DataField(), { initial: [] }),
      require: new ArrayField(new DataField(), { initial: [] }),
      luck: new ArrayField(new DataField(), { initial: [] }),
      activeIdeal: new BooleanField({ initial: false, persisted: false }),
      promoted: new BooleanField({ initial: false }),
      reqMsg: new StringField({ required: true, blank: true, initial: "", persisted: false }),
    };
  }
}
