import { addPIDSheetHeaderButton } from "../../pid/pid-button.mjs";
import { PENSelectLists } from "../../apps/select-lists.mjs";
import { PendragonItemSheet } from "./item-sheet.mjs";
import { PENRandomName } from "../../apps/random-name.mjs";
import { PENRandomCareer } from "../../apps/random-career.mjs";
import { PENCreateFamily } from "../../apps/createFamily.mjs";

export class PendragonFamilySheet extends PendragonItemSheet {
  #dragDrop;
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    position: {
      width: 560,
      height: 675,
    },
    actions: {
      randomName: this._onRandomName,
      deleteItem: this.#deleteItem,
      viewItem: this.#viewItem,
      randomCareer: this._onRandomCareer,
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
      template: "systems/Pendragon/templates/item/family.attributes.hbs",
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
    sheetData.showRandomName = true;
    sheetData.showCareer = this.item.system.age >= 14;
    sheetData.showRandomCareer = this.item.system.age >= 14;
    if (Number(this.item.system.died) > 0) sheetData.showRandomCareer = false;

    sheetData.relationType = PENSelectLists.getRelationTypes();
    //Keep any relation no longer offered so the dropdown still shows it
    const relation = this.item.system.relation;
    if (relation && !(relation in sheetData.relationType)) {
      sheetData.relationType[relation] = game.i18n.localize("PEN.familyRelationship." + relation);
    }
    sheetData.showParental = false;
    if (
      ["uncle", "aunt", "pibling", "grandfather", "grandmother", "grandparent", "cousin"].includes(
        this.item.system.relation,
      )
    ) {
      sheetData.showParental = true;
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

    const careers = [];
    let maxLevel = 0;
    for (let career of this.item.system.careers) {
      sheetData.showRandomCareer = false;
      let thisCareer = (await game.system.api.pid.fromPIDBest({ pid: career.pid }))[0];
      //If no hit on PID then use UUID
      if (!thisCareer) {
        thisCareer = await fromUuid(career.uuid);
      }
      maxLevel = thisCareer?.system?.ranks?.length ?? 0;
      let careerTitle =
        thisCareer?.system?.ranks[this.item.system.careerLevel]?.title ?? game.i18n.localize("PEN.invalid");
      //Keep the stored UUID so the entry can be deleted even if the PID resolves to a different document
      careers.push({
        name: thisCareer?.name ?? career.name,
        uuid: career.uuid,
        pid: career.pid,
        careerUuid: thisCareer?.uuid ?? "",
        valid: !!thisCareer,
        careerTitle,
        careerLevel: this.item?.system?.careerLevel ?? 0,
      });
    }
    sheetData.hasCareer = careers.length > 0;
    sheetData.careerLevels = await PENSelectLists.getCareerLevels(maxLevel);
    sheetData.careers = careers;

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
  /**
   * Activate event listeners using the prepared sheet HTML
   */
  _onRender(context, _options) {
    // Everything below here is only needed if the sheet is editable
    if (!context.editable) return;
    this.#dragDrop.forEach((d) => d.bind(this.element));
    this.element
      .querySelectorAll(".item-toggle")
      .forEach((n) => n.addEventListener("click", this.#onItemToggle.bind(this)));
  }

  //Handle toggle states
  async #onItemToggle(event) {
    event.preventDefault();
    const prop = event.currentTarget.closest(".item-toggle").dataset.property;
    let checkProp = "";
    if (["barrenMarriage", "blessed", "maternal"].includes(prop)) {
      checkProp = { [`system.${prop}`]: !this.item.system[prop] };
    } else {
      return;
    }
    await this.item.update(checkProp);
  }

  //Delete an item from the collection
  static async #deleteItem(event, target) {
    if (event.detail === 2) {
      const itemId = target.closest("[data-item-uuid]")?.dataset.itemUuid ?? "";
      const { collection } = target.closest("[data-collection]").dataset ?? {};
      const coll = this.item.system[collection] ?? [];
      const changes = { [`system.${collection}`]: coll.filter((itm) => itm.uuid != itemId) };
      //If deleting career then reset level and next Promotion
      if (collection === "careers") {
        Object.assign(changes, {
          "system.careerLevel": 0,
          "system.nextPromotion": 0,
          "system.yearPromoted": 0,
        });
      }
      await this.item.update(changes);
    }
  }

  //Open the Career
  static async #viewItem(event, target) {
    const itemUuid = target.closest("[data-item-id]")?.dataset?.itemId ?? {};
    const career = await fromUuid(itemUuid);
    if (!career) return;
    career.sheet.render(true);
  }

  //Roll a random name, using the relation's gender if the gender isn't recognised
  static async _onRandomName(_event, _target) {
    if (!this.isEditable) return;
    const name = await PENRandomName.randomName({
      doc: this.item,
      gender: this.item.system.gender,
      fallback: PENCreateFamily.relationGender(this.item.system.relation),
    });
    if (name) await this.item.update({ name });
  }

  //Roll a random career
  static async _onRandomCareer(_event, _target) {
    if (!this.isEditable) return;
    await PENRandomCareer.randomCareer(this.item);
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
    const newItem = await Item.implementation.fromDropData(data);
    if (!newItem || !newItem.system) return false;
    let collectionName = "";
    // Handle item sorting within the same Actor
    switch (newItem.type) {
      case "career":
        collectionName = "careers";
        break;
      default:
        return false;
    }

    if (collectionName === "") return false;

    const collection = this.item.system[collectionName]
      ? foundry.utils.duplicate(this.item.system[collectionName])
      : [];

    //If no PID then give warning and stop
    if (typeof newItem.flags?.Pendragon?.pidFlag?.id === "undefined") {
      ui.notifications.warn(game.i18n.format("PEN.PIDFlag.noPID", { type: newItem.name }));
      return false;
    }

    //If Duplicate item then give warning and stop
    if (collection.find((el) => el.pid === newItem.flags?.Pendragon?.pidFlag?.id)) {
      ui.notifications.warn(newItem.name + " : " + game.i18n.localize("PEN.dupItem"));
      return false;
    }

    //Only allow one career
    if (collectionName === "careers") {
      if (collection.length > 0) {
        ui.notifications.warn(
          game.i18n.format("PEN.oneItem", {
            child: game.i18n.localize("TYPES.Item." + `${newItem.type}`),
            parent: game.i18n.localize("TYPES.Item." + `${this.document.type}`),
          }),
        );
        return false;
      }
    }
    if (newItem.type === "career") {
      const { position } = await PENRandomCareer.memberInfo(this.item);
      const result = await PENRandomCareer.careerHistory(this.item, newItem, 0, 0, position);
      //The history may have moved them to another career (e.g. Maiden of the Lake)
      collection.push({
        name: result.career.name,
        uuid: result.career.uuid,
        pid: result.career.flags?.Pendragon?.pidFlag?.id ?? "",
      });
      await this.item.update({
        [`system.${collectionName}`]: collection,
        "system.yearPromoted": result.yearPromoted,
        "system.nextPromotion": result.nextPromotion,
        "system.careerLevel": result.level,
      });
    } else {
      collection.push({
        name: newItem.name,
        uuid: newItem.uuid,
        pid: newItem.flags.Pendragon.pidFlag.id,
      });
      await this.item.update({ [`system.${collectionName}`]: collection });
    }
    return true;
  }
}
