const {
  HTMLField,
  SchemaField,
  NumberField,
  StringField,
  FilePathField,
  ArrayField,
  BooleanField,
  DataField,
  DocumentUUIDField,
} = foundry.data.fields;

export class CareerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      ranks: new ArrayField(
        new SchemaField({
          title: new StringField ({ required: true, blank: true, initial: "" }),
          description: new HTMLField ({ required: true, blank: true, initial: "" }),
          promotion: new StringField ({ required: true, blank: true, initial: "" }),  // "roll" (default) | "age" | "none" | special key
          ageTest : new StringField ({ required: true, blank: true, initial: "" }),        // "21", "1D6+15"  — used when promotion = "age"
          minYears: new StringField ({ required: true, blank: true, initial: "" }),   // "6", "3D6+10", "10" — no yearly roll until passed
          special: new StringField ({ required: true, blank: true, initial: "none" }),    // hook for code: "swordProspects", "maidenOfLake", "maidInWaiting" or "none"
          noPromotion: new BooleanField ({ initial: false }), //No further promotion from here
          marriage: new NumberField ({ ...requiredInteger, initial: 0, min:0, max: 6 }),   // 0 = no roll | 1 = always succeeds | 5 = 5-6
          marriagePromotes: new BooleanField ({ initial: false }),
        }),
      ),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      gender: new StringField({ required: true, blank: true, initial: "either" }),
      religions: new ArrayField(
        new SchemaField({
          name: new StringField({}),
          pid: new StringField({}),
          uuid: new DocumentUUIDField({ type: "Item" }),
        }),
      ),
  };
  }
}
