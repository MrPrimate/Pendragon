import { PendragonItemSheet } from "./item-sheet.mjs";
import PENDialog from "../../setup/pen-dialog.mjs";
import { PENSelectLists } from "../../apps/select-lists.mjs";

export class PendragonCareerSheet extends PendragonItemSheet {
  #dragDrop;
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    classes: ["Pendragon", "sheet", "itemV2"],
    position: {
      width: 560,
      height: 720,
    },
    actions: {
      deleteItem: this.#deleteItem,
      viewItem: this.#viewItem,
      addLevel: this.#addLevel,
      deleteLevel: this.#deleteLevel,
      changeRank: this.#changeRank,
      viewLevel: this.#viewLevel,
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
      template: "systems/Pendragon/templates/item/career.attributes.hbs",
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
    sheetData.genderOptions = await PENSelectLists.getCareerGender();
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

    const religions = [];
    for (let religion of this.item.system.religions) {
      let thisReligion = (await game.system.api.pid.fromPIDBest({ pid: religion.pid }))[0];
      //If no hit on PID then use UUID
      if (!thisReligion) {
        thisReligion = await fromUuid(religion.uuid);
      }

      //Keep the stored UUID so the entry can be deleted even if the PID resolves to a different document
      religions.push({
        name: thisReligion?.name ?? religion.name,
        uuid: religion.uuid,
        pid: religion.pid,
        religionUuid: thisReligion?.uuid ?? "",
        valid: !!thisReligion,
      });
    }

    const ranks = [];
    for (let rank of this.item.system.ranks) {
      ranks.push(rank);
    }

    sheetData.religions = religions;
    sheetData.ranks = ranks;
    sheetData.lastRank = ranks.length - 1;
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

  /* -------------------------------------------- */
  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  _onRender(context, _options) {
    // Everything below here is only needed if the sheet is editable
    if (!context.editable) return;
    this.#dragDrop.forEach((d) => d.bind(this.element));
  }

  /* -------------ACTIONS------------------------ */
  //View Item from collection
  static async #viewItem(event, target) {
    const itemUuid = target.closest("[data-religion-uuid]")?.dataset?.religionUuid;
    if (!itemUuid) return;
    const viewItem = await fromUuid(itemUuid);
    if (!viewItem) return;
    viewItem.sheet.render(true);
  }

  //Delete an item from the collection
  static async #deleteItem(event, target) {
    if (event.detail === 2) {
      const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
      const { collection } = target.closest("[data-collection]").dataset ?? {};
      const coll = this.item.system[collection] ?? [];

      await this.item.update({ [`system.${collection}`]: coll.filter((itm) => itm.uuid != itemId) });
    }
  }

  //Add a Rank/Level
  static async #addLevel(event, target) {
    const collection = this.item.system.ranks ? foundry.utils.duplicate(this.item.system.ranks) : [];
    let level = collection.length;
    let usage = await PendragonCareerSheet._careerRankDialog(level);
    if (!usage) return false;
    let newRank = await PendragonCareerSheet._prepareRank(usage, collection);
    if (!newRank) return;
    collection.push(newRank);
    await this.item.update({ "system.ranks": collection });
    return;
  }

  //Open Rank/Level Dialog box
  static async _careerRankDialog(level, formData) {
    const data = {};
    data.level = level;
    data.specials = await PENSelectLists.careerSpecials();
    data.formData = formData;
    data.isGM = game.user.isGM;
    let label = game.i18n.localize("PEN.update");
    if (!formData) label = game.i18n.localize("PEN.addLevel");
    if (!game.user.isGM) label = game.i18n.localize("PEN.close");
    const html = await foundry.applications.handlebars.renderTemplate(
      "systems/Pendragon/templates/dialog/careerRank.hbs",
      data,
    );
    const usage = await PENDialog.input({
      window: { title: game.i18n.localize("TYPES.Item.career") },
      content: html,
      position: { width: 600 },
      ok: {
        label: label,
      },
    });
    return usage;
  }

  //Delete a Rank/Level
  static async #deleteLevel(event, target) {
    if (event.detail === 2) {
      const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
      let thisIndex = Number(itemId);
      const coll = this.item.system.ranks ?? [];
      if (thisIndex < 0 || thisIndex >= coll.length) return false;
      await this.item.update({ "system.ranks": coll.filter((_, idx) => thisIndex != idx) });
    }
  }

  //Change position of item in rank
  static async #changeRank(event, target) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
    let fromIndex = Number(itemId);
    const move = Number(target?.dataset?.move);
    const coll = this.item.system.ranks ?? [];
    let toIndex = fromIndex + move;
    if (toIndex === fromIndex) return;
    if (toIndex < 0 || toIndex >= coll.length) return;
    if (fromIndex < 0 || fromIndex >= coll.length) return;
    const [element] = coll.splice(fromIndex, 1);
    coll.splice(toIndex, 0, element);
    await this.item.update({ "system.ranks": coll });
  }

  //View a rank item
  static async #viewLevel(event, target) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
    let fromIndex = Number(itemId);
    const coll = this.item.system.ranks ?? [];
    if (fromIndex < 0 || fromIndex >= coll.length) return;
    const element = coll[fromIndex];
    let usage = await PendragonCareerSheet._careerRankDialog(element.level, element);
    if (!usage || !game.user.isGM) return;
    let newRank = await PendragonCareerSheet._prepareRank(usage, coll);
    if (!newRank) return;
    coll.splice(fromIndex, 1, newRank);
    await this.item.update({ "system.ranks": coll });
  }

  //Prepare a rank item
  static async _prepareRank(usage, collection) {
    //Set Title
    let title = usage.title;
    if (title === "") {
      let level = collection.length;
      title = game.i18n.format("PEN.career.rank", { rank: level });
    }
    //Set Promotion
    let promotion = "roll";
    if (usage.ageTest != "") {
      promotion = "age";
    } else if (usage.noPromotion) {
      promotion = "none";
    } else if (usage.special != "none" && usage.special != "") {
      promotion = usage.special;
    }
    let newRank = {
      title: title,
      description: usage.description,
      promotion: promotion,
      ageTest: usage.ageTest,
      minYears: usage.minYears,
      special: usage.special,
      noPromotion: usage.noPromotion,
      marriage: usage.marriage ?? 0,
      marriagePromotes: usage.marriagePromotes,
    };
    return newRank;
  }

  /* -------------DRAG AND DROP------------------ */

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

  async _onDrop(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    // Handle different data types
    switch (data.type) {
      case "Item":
        return this._onDropItem(event, data);
      default:
        return false;
    }
  }

  //Handle dropping of an item reference or item data onto an Actor Sheet
  async _onDropItem(event, data) {
    const item = await Item.implementation.fromDropData(data);
    if (!item || !item.system) return false;
    let collectionName = "";
    // Handle item sorting within the same Actor
    switch (item.type) {
      case "religion":
        collectionName = "religions";
        break;
      default:
        return false;
    }

    if (collectionName === "") return false;

    const collection = this.item.system[collectionName]
      ? foundry.utils.duplicate(this.item.system[collectionName])
      : [];

    //If no PID then give warning and stop
    if (typeof item.flags?.Pendragon?.pidFlag?.id === "undefined") {
      ui.notifications.warn(game.i18n.format("PEN.PIDFlag.noPID", { type: item.name }));
      return false;
    }

    //If Duplicate item then give warning and stop
    if (collection.find((el) => el.pid === item.flags?.Pendragon?.pidFlag?.id)) {
      ui.notifications.warn(item.name + " : " + game.i18n.localize("PEN.dupItem"));
      return false;
    }

    //Only allow one religion
    if (collectionName === "religions") {
      if (collection.length > 0) {
        ui.notifications.warn(
          game.i18n.format("PEN.oneItem", {
            child: game.i18n.localize("TYPES.Item." + `${item.type}`),
            parent: game.i18n.localize("TYPES.Item." + `${this.document.type}`),
          }),
        );
        return false;
      }
    }
    collection.push({
      name: item.name,
      uuid: item.uuid,
      pid: item.flags.Pendragon.pidFlag.id,
    });
    await this.item.update({ [`system.${collectionName}`]: collection });
    return true;
  }
}
