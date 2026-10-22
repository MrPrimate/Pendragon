import { PENUtilities } from "./utilities.mjs";
import { PENCreateFamily } from "./createFamily.mjs";

export class PENRandomName {
  //Default name tables, used when no culture specific table is found
  //Found by PID so the highest priority version wins (e.g. Core Rulebook tables over the base system ones,
  //or a world copy with a higher priority over both)
  static DEFAULT_TABLES = {
    male: "rt..male-names",
    female: "rt..female-names",
  };

  //Roll a random name
  //doc = the actor or item being named (used to find the culture)
  //gender = free text gender, fallback = "male"/"female" to use if gender not recognised
  //Returns the name or null if no name table could be found
  static async randomName({ doc = null, gender = "", fallback = "" } = {}) {
    const type = await this.resolveGender(gender, fallback);
    const culture = this.resolveCulture(doc);
    const table = await this.getNameTable(type, culture);
    if (!table) {
      ui.notifications.warn("PEN.noNameTable", { localize: true });
      return null;
    }
    const tableResults = await PENUtilities.tableDiceRoll(table);
    const name = tableResults?.results[0]?.name;
    return name || null;
  }

  //Returns "male" or "female" from the gender, then the fallback, otherwise at random
  static async resolveGender(gender = "", fallback = "") {
    const type = PENUtilities.genderType(gender) || fallback;
    if (["male", "female"].includes(type)) return type;
    const roll = await new Roll("1D2").evaluate();
    return roll.total === 2 ? "female" : "male";
  }

  //Returns "male", "female" or "" for a family relation (e.g. mother -> female, sibling -> "")
  static relationGender(relation) {
    if (PENCreateFamily.FEMALE_RELATIONS.includes(relation)) return "female";
    if (relation in PENCreateFamily.NEUTRAL_RELATIONS) return "male";
    return "";
  }

  //Returns the culture item that applies to the document, or null
  //Embedded items (family, squire) use their owner's culture
  static resolveCulture(doc) {
    const actor = doc instanceof Actor ? doc : doc?.parent instanceof Actor ? doc.parent : null;
    if (!actor) return null;
    return actor.items.find((itm) => itm.type === "culture") ?? null;
  }

  //Returns the first name table found for the gender, checking the culture before the defaults
  static async getNameTable(gender, culture = null) {
    const sources = [
      //Culture specific table e.g. culture.system.nameTables.female[0] = {name, pid, uuid}
      culture?.system?.nameTables?.[gender]?.[0],
      { pid: this.DEFAULT_TABLES[gender] },
    ];
    for (const source of sources) {
      const table = await this.tableFromSource(source);
      if (table) return table;
    }
    return null;
  }

  //Find a table from a {pid, uuid} reference
  static async tableFromSource(source) {
    if (!source) return null;
    if (source.pid) {
      const table = (await game.system.api.pid.fromPIDBest({ pid: source.pid }))[0];
      if (table) return table;
    }
    if (source.uuid) {
      const table = await fromUuid(source.uuid);
      if (table instanceof RollTable) return table;
    }
    return null;
  }

  //Gender and fallback for a document being named from its sheet
  static docGender(doc) {
    const gender = doc.system?.gender ?? "";
    const fallback = doc.type === "family" ? this.relationGender(doc.system.relation) : "";
    return { gender, fallback };
  }

  //Sheet action - roll a random name for the sheet's document
  static async onSheetAction(event, _target) {
    event.preventDefault();
    if (!this.isEditable) return;
    const doc = this.document;
    //Player characters can only be renamed when unlocked or in character creation mode, NPCs and followers when unlocked
    if (doc.type === "character" && doc.system.lock && !game.settings.get("Pendragon", "creation")) return;
    if (["npc", "follower"].includes(doc.type) && doc.system.lock) return;
    const name = await PENRandomName.randomName({ doc, ...PENRandomName.docGender(doc) });
    if (name) await doc.update({ name });
  }

  //Wire up a random name button in a dialog, filling the named input with a name for the actor
  static activateNameButton(element, actor, inputName) {
    const button = element.querySelector(".random-name");
    const nameInput = element.querySelector(`[name="${inputName}"]`);
    if (!button || !nameInput) return;
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const name = await PENRandomName.randomName({ doc: actor, ...PENRandomName.docGender(actor) });
      if (name) nameInput.value = name;
    });
  }

  //Wire up a random gender button in a dialog, filling the named input with Male or Female
  static activateGenderButton(element, inputName) {
    const button = element.querySelector(".random-gender");
    const genderInput = element.querySelector(`[name="${inputName}"]`);
    if (!button || !genderInput) return;
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const gender = await PENRandomName.resolveGender();
      genderInput.value = game.i18n.localize("PEN." + gender);
    });
  }

  //Wire up the random name buttons in the add parents dialog
  //Each button has a data-index matching the familyName and gender inputs (1 = father, 2 = mother)
  static activateParentButtons(element, actor) {
    for (const button of element.querySelectorAll(".random-name[data-index]")) {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const index = button.dataset.index;
        const nameInput = element.querySelector(`[name="familyName${index}"]`);
        const gender = element.querySelector(`[name="gender${index}"]`)?.value ?? "";
        const fallback = index === "2" ? "female" : "male";
        const name = await PENRandomName.randomName({ doc: actor, gender, fallback });
        if (name && nameInput) nameInput.value = name;
      });
    }
  }
}
