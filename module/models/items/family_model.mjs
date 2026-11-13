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

export class FamilyData extends foundry.abstract.TypeDataModel {
  //Stands for the character who owns the family item in parentIds and spouseId. A fixed value rather than the
  //actor's UUID, so links survive duplicating, importing or exporting the actor and work for unlinked tokens
  static CHARACTER = "character";

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
      //Ids of the parents' family items on the same actor (up to two; often one, as in-laws aren't recorded)
      //A parent can also be the character, stored as FamilyData.CHARACTER
      parentIds: new ArrayField(new StringField({ required: true, blank: false })),
      //Id of the spouse's family item on the same actor, or FamilyData.CHARACTER for the character's own spouse
      spouseId: new StringField({ required: true, blank: true, initial: "" }),
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

  //Update data for the family members left behind when some are deleted (deleted = a Set of item ids):
  //they lose any parent or spouse link to a deleted member
  static unlinkUpdates(actor, deleted) {
    return actor.items
      .filter(
        (itm) =>
          itm.type === "family" &&
          !deleted.has(itm.id) &&
          (itm.system.parentIds.some((id) => deleted.has(id)) || deleted.has(itm.system.spouseId)),
      )
      .map((itm) => ({
        _id: itm.id,
        "system.parentIds": itm.system.parentIds.filter((id) => !deleted.has(id)),
        "system.spouseId": deleted.has(itm.system.spouseId) ? "" : itm.system.spouseId,
      }));
  }

  //The character's spouse is married to the character
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    if (this.parent?.parent && this.relation === "spouse" && !this.spouseId)
      this.parent.updateSource({ "system.spouseId": FamilyData.CHARACTER });
  }

  //Link to or unlink from the character when the relation changes to or from spouse
  async _preUpdate(changes, options, user) {
    if ((await super._preUpdate(changes, options, user)) === false) return false;
    const { relation, spouseId } = changes.system ?? {};
    //Leave it alone if the spouse is being set in the same update
    if (!this.parent?.parent || relation === undefined || relation === this.relation) return;
    if (spouseId !== undefined && spouseId !== this.spouseId) return;
    if (relation === "spouse" && !this.spouseId) changes.system.spouseId = FamilyData.CHARACTER;
    else if (relation !== "spouse" && this.spouseId === FamilyData.CHARACTER) changes.system.spouseId = "";
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.age = game.time.components.year - this.born;
    if (Number(this.died) > 0) {
      this.age = Number(this.died) - this.born;
    }
  }
}
