import { ActorImporterDialog } from "./actor-importer-input.mjs";

const { api } = foundry.applications;
export class ActorImport extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  constructor() {
    super();
    this.parsed = {};
    this.itemLocations = "";
  }

  static get asNumber() {
    return "n";
  }

  static get asString() {
    return "s";
  }

  /**
   * cleanString, removes new line and carrier return character and lateral spaces from a string
   * @param {String} s the string to clean
   * @returns {String} the cleaned string
   */
  cleanString(s) {
    return s
      .replace(/(\n|\r)/g, " ")
      .replace(/^\s*/, "")
      .replace(/\s*\.?\s*\.?$/, "");
  }

  static async getImportText() {
    const dlg = await new ActorImporterDialog();
    dlg.render(true);
  }

  static async processSourceText(inputs, actorType) {
    let srcText = inputs.text;
    //console.log(srcText, actorType);

    if (inputs.text[inputs.text.length] !== ".") {
      inputs.text += "."; // Add a dot a the end to help the regex find the end
    }
    const actor = new PendragonActorImporter();
    const createdActor = await actor.createActor(inputs);
    return;
  }

  /**
   * translateRoll, translates language specific shortform of dice (D) in rolls
   * Example for German rolls: 1W4 => 1D4.
   * Dice shortform is configured using keys.diceShort
   * @param {String} s the roll to be translated
   * @returns {String} the translated roll
   */
  translateRoll(s) {
    if (typeof s === "undefined") return s;
    if (typeof this.keys.diceShort !== "undefined") {
      const regEx = new RegExp("(?<n1>\\d+)" + this.keys.diceShort + "(?<n2>\\d+)", "iug");
      return s.replace(regEx, "$<n1>D$<n2>");
    } else {
      return s;
    }
  }
}
