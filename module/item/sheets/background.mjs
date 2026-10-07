import { PENRollType } from "../../cards/rollType.mjs";
import { PENSelectLists } from "../../apps/select-lists.mjs";
import { PIDEditor } from "../../pid/pid-editor.mjs";
import PENDialog from "../../setup/pen-dialog.mjs";
import { PendragonItemSheet } from "./item-sheet.mjs";
import { PENUtilities } from "../../apps/utilities.mjs";
const { api, sheets } = foundry.applications;

export class PendragonBackgroundSheet extends PendragonItemSheet {
  #dragDrop;
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    position: {
      width: 560,
      height: 630,
    },
    actions: {
      deleteItem: PendragonBackgroundSheet.#deleteItem,
      itemToggle: PendragonBackgroundSheet.#onItemToggle,
    },
    dragDrop: [{ dropSelector: ".droppable" }],
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
      template: "systems/Pendragon/templates/item/background.attributes.hbs",
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

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    //Common parts to the character - this is the order they are show on the sheet
    options.parts = ["header", "tabs", "attributes", "description", "effects"];

    //GM only tabs
    if (game.user.isGM) {
      options.parts.push("gmTab");
    }
  }

  async _prepareContext(options) {
    // Default tab for first time it's rendered this session
    if (!this.tabGroups.primary) this.tabGroups.primary = "attributes";

    let sheetData = {
      ...(await super._prepareContext(options)),
    };
    sheetData.backgroundType = await PENSelectLists.getBackgroundType();
    sheetData.canEdit = sheetData.isGM; //Consider other circumstances to allow edit

    const tempSkills = this.item.system.skills ?? [];
    const skills = [];

    for (let pItm of tempSkills) {
      let valid = true;
      let tempItm = (await game.system.api.pid.fromPIDBest({ pid: pItm.pid }))[0];
      let tempName = game.i18n.localize("invalid");
      if (tempItm) {
        tempName = tempItm.name;
      } else {
        tempName = pItm.name;
        valid = false;
      }

      let tempScore = pItm.score;
      if (tempScore[0] === "-") {
        tempScore = tempScore.slice(1);
        if (tempItm.type === "trait") {
          tempName = tempItm.system.oppName;
        }
      }
      skills.push({
        name: tempName,
        uuid: pItm.uuid,
        pid: pItm.pid,
        valid: valid,
        score: tempScore,
      });
    }
    skills.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    sheetData.skills = skills;

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
    sheetData.tabs = this._initTabs("primary", ["attributes", "description", "effects", "gmTab"]);
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

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  _onRender(context, _options) {
    this.#dragDrop.forEach((d) => d.bind(this.element));
  }

  //Listeneres

  //Handle toggle states
  static async #onItemToggle(event, target) {
    event.preventDefault();
    const prop = target.closest("[data-property]").dataset.property;
    let checkProp = {};
    if (["starting"].includes(prop)) {
      checkProp = { [`system.${prop}`]: !this.item.system[prop] };
    } else {
      return;
    }
    await this.item.update(checkProp);
    return;
  }

  //Drag and Drop

  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        //dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        //dragstart: this._onDragStart.bind(this),
        //dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new foundry.applications.ux.DragDrop.implementation(d);
    });
  }
  _canDragDrop(selector) {
    return this.isEditable;
  }

  //Allow for an actor or item being dragged and dropped on to the sheet
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    event.preventDefault();
    event.stopPropagation();

    let type = ["skill", "trait"];
    const collectionName = event.currentTarget.dataset.collection ?? "skills";
    const dataList = await PENUtilities.getDataFromDropEvent(event, "Item");
    const collection = this.item.system[collectionName]
      ? foundry.utils.duplicate(this.item.system[collectionName])
      : [];

    for (const item of dataList) {
      if (!item || !item.system) continue;
      if (!type.includes(item.type)) {
        continue;
      }

      //If no PID then give warning and move to next item
      if (typeof item.flags?.Pendragon?.pidFlag?.id === "undefined") {
        ui.notifications.warn(game.i18n.format("PEN.PIDFlag.noPID", { type: item.name }));
        continue;
      }

      //If Duplicate item then give warning and move to next item
      if (collection.find((el) => el.pid === item.flags?.Pendragon?.pidFlag?.id)) {
        ui.notifications.warn(item.name + " : " + game.i18n.localize("PEN.dupItem"));
        continue;
      }

      let inpVal = await PENDialog.input({
        window: { title: game.i18n.localize("PEN.startingFormula") },
        content: `<input class="centre" type="text" name="inpvalue">`,
      });

      let itemName = item.name;
      if (item.type === "trait" && inpVal.inpvalue[0] === "-") {
        itemName = item.system.oppName;
      }

      //Add item to collection
      collection.push({
        name: itemName,
        uuid: item.uuid,
        pid: item.flags.Pendragon.pidFlag.id,
        score: inpVal.inpvalue,
        subType: item.type,
      });

      await this.item.update({ [`system.${collectionName}`]: collection });
      //Empty Array
      collection.length = 0;
      return;
    }
  }

  //Delete an trait from the collection
  static async #deleteItem(event, target) {
    if (event.detail === 2) {
      const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
      const { collection } = target.closest("[data-collection]").dataset ?? {};
      const { opptest } = target.closest("[data-opptest]")?.dataset ?? {};
      const coll = this.item.system[collection] ?? [];
      await this.item.update({
        [`system.${collection}`]: coll.filter((itm) => itm.uuid != itemId),
      });
    }
    return;
  }
}
