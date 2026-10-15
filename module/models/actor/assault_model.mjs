const {
  HTMLField,
  SchemaField,
  NumberField,
  StringField,
  DocumentUUIDField,
  ForeignDocumentField,
  ArrayField,
  BooleanField,
} = foundry.data.fields;

export class AssaultData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      encounters: new ArrayField(
        new SchemaField({
          name: new StringField({}),
          pid: new StringField({}),
          uuid: new DocumentUUIDField({ type: "Actor" }),
        }),
      ),
      defenders: new ArrayField(
        new SchemaField({
          name: new StringField({}),
          pid: new StringField({}),
          uuid: new DocumentUUIDField({ type: "Actor" }),
        }),
      ),
      gatedefenders: new ArrayField(
        new SchemaField({
          name: new StringField({}),
          pid: new StringField({}),
          uuid: new DocumentUUIDField({ type: "Actor" }),
        }),
      ),
      assaultTables: new ArrayField(
        new SchemaField({
          name: new StringField({}),
          pid: new StringField({}),
          uuid: new DocumentUUIDField({ type: "RollTable" }),
        }),
      ),
      kv: new NumberField({ ...requiredInteger, initial: 1 }),
      dv: new NumberField({ ...requiredInteger, initial: 1 }),
      wallHeight: new NumberField({ ...requiredInteger, initial: 10 }),
      knights: new ArrayField(new ForeignDocumentField(foundry.documents.BaseActor)),
      shortDesc: new StringField({ required: true, blank: true, initial: "" }),
      description: new HTMLField({ required: true, blank: true, initial: "" }),
      notes: new HTMLField({ required: true, blank: true, initial: "" }),
      wins: new NumberField({ ...requiredInteger, initial: 0 }),
      needed: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      openGateRounds: new NumberField({ ...requiredInteger, initial: 1 }),
      towerDoorHP: new NumberField({ ...requiredInteger, initial: 20 }),
      towerDoorAP: new NumberField({ ...requiredInteger, initial: 15 }),
      towerDoorSTR: new NumberField({ ...requiredInteger, initial: 15 }),
      gateDoorHP: new NumberField({ ...requiredInteger, initial: 20 }),
      gateDoorAP: new NumberField({ ...requiredInteger, initial: 15 }),
      gateDoorSTR: new NumberField({ ...requiredInteger, initial: 15 }),
      gateRound: new NumberField({ ...requiredInteger, initial: 0 }),
      floors: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      lock: new BooleanField({ initial: false }),
      noteView: new BooleanField({ initial: false }),
      resultsView: new BooleanField({ initial: false }),
      descripView: new BooleanField({ initial: false }),
      encView: new BooleanField({ initial: false }),
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.needed = Math.ceil((1 + this.knights.length) / 2);
    this.floors = Math.max(1, Math.floor(this.wallHeight / 15));
  }

  async getKnights() {
    return this.knights.map((a) => ({ actor: a() }));
  }
  async addKnight(actor) {
    const membersCollection = this.toObject().knights;
    membersCollection.push(actor.id);
    return this.parent.update({ "system.knights": membersCollection });
  }

  async removeKnight(actor) {
    const membersCollection = this.toObject().knights;
    let actorId = actor;
    if (actor instanceof Actor) actorId = actor.id;
    membersCollection.findSplice((u) => u == actorId);
    return this.parent.update({ "system.knights": membersCollection });
  }
}
