import { PendragonItemSheet } from "./item-sheet.mjs";

export class PendragonRelationshipSheet extends PendragonItemSheet {
  constructor(options = {}) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    position: {
      width: 610,
      height: 480,
    },
  };

  static PARTS = {
    header: {
      template: "systems/Pendragon/templates/item/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    // each tab gets its own template
    attributes: {
      template: "systems/Pendragon/templates/item/relationship.attributes.hbs",
    },
    description: {
      template: "systems/Pendragon/templates/item/base.description.hbs",
    },
    effects: {
      template: "systems/Pendragon/templates/item/effects.hbs",
    },
    gmTab: {
      template: "systems/Pendragon/templates/item/gmtab.hbs",
    },
  };

  async _prepareContext(options) {
    // Default tab for first time it's rendered this session
    if (!this.tabGroups.primary) this.tabGroups.primary = "attributes";

    let sheetData = {
      ...(await super._prepareContext(options)),
    };
    sheetData.person1Name = "";
    sheetData.person2Name = "";
    let actr1 = await fromUuid(this.item.system.sourceUuid);
    let actr2 = await fromUuid(this.item.system.targetUuid);
    if (actr1) {
      sheetData.person1Name = actr1.name;
    }
    if (actr2) {
      sheetData.person2Name = actr2.name;
    }

    // these two values could be set during _preparePartContext
    sheetData.enrichedDescriptionValue = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.item.system.description,
      {
        async: true,
        secrets: sheetData.editable,
        relativeTo: this.item,
      },
    );
    sheetData.enrichedGMDescriptionValue = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.item.system.GMdescription,
      {
        async: true,
        secrets: sheetData.editable,
      },
    );
    let parts = ["attributes", "description", "effects"];
    if (game.user.isGM) {
      parts.push("gmTab");
    }
    sheetData.tabs = this._initTabs("primary", parts);
    return sheetData;
  }

  // this does the minimum currently, just sets the tab
  // could also prepare tab-specific fields
  async _preparePartContext(partId, context) {
    switch (partId) {
      case "attributes":
      case "description":
      case "effects":
      case "gmTab":
        context.tab = context.tabs[partId];
        break;
      default:
    }
    return context;
  }
}
