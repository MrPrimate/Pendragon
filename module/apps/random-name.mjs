import { PENUtilities } from "./utilities.mjs";

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
    const type = await PENUtilities.resolveGender(gender, fallback);
    const culture = this.resolveCulture(doc, "culture");
    const table = await this.getNameTable(type, culture);
    if (!table) {
      ui.notifications.warn("PEN.noNameTable", { localize: true });
      return null;
    }
    const tableResults = await PENUtilities.tableDiceRoll(table);
    const name = tableResults?.results[0]?.name;
    return name || null;
  }

  //Returns the specified item type that applies to the document, or null
  //Embedded items (family, squire) use their owner's culture, religion etc
  static resolveCulture(doc, type = "culture") {
    const actor = doc instanceof Actor ? doc : doc?.parent instanceof Actor ? doc.parent : null;
    if (!actor) return null;
    return actor.items.find((itm) => itm.type === type) ?? null;
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
}
