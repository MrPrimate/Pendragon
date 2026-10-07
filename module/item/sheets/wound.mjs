import { PendragonItemSheet } from "./item-sheet.mjs";

export class PendragonWoundSheet extends PendragonItemSheet {
  constructor(options = {}) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    position: {
      width: 560,
      height: 240,
    },
  };

  static PARTS = {
    header: {
      //TODO: static header, no image
      template: "systems/Pendragon/templates/item/header.hbs",
    },
    // each tab gets its own template
    attributes: {
      template: "systems/Pendragon/templates/item/wound.hbs",
    },
  };

  async _prepareContext(options) {
    let sheetData = {
      ...(await super._prepareContext(options)),
    };
    sheetData.source = game.i18n.localize("PEN." + this.item.system.source);

    return sheetData;
  }
}
