import { PENUtilities } from "../../apps/utilities.mjs";
import { PENCharCreateV2 } from "../../apps/charCreateV2.mjs";
import { PendragonItemSheet } from "./item-sheet.mjs";

export class PendragonIdealSheet extends PendragonItemSheet {
  #dragDrop;
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    position: {
      width: 560,
      height: 670,
    },
    actions: {
      deleteItem: PendragonIdealSheet.#deleteItem,
      promoted: PendragonIdealSheet._promoted,
    },
    dragDrop: [{ dropSelector: ".droppable" }],
  };

  static PARTS = {
    header: {
      template: "systems/Pendragon/templates/item/header.hbs",
      scrollable: [""],
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    // each tab gets its own template
    attributes: {
      template: "systems/Pendragon/templates/item/ideal.attributes.hbs",
      scrollable: [""],
    },
    benefits: {
      template: "systems/Pendragon/templates/item/ideal.benefits.hbs",
      scrollable: [""],
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
    const traitGroup = [];
    const skillGroup = [];
    const require = [];
    const luckTables = [];

    for (let pItm of this.item.system.require) {
      let valid = true;
      if ((await game.system.api.pid.fromPIDBest({ pid: pItm.pid })).length < 1) {
        valid = false;
      }
      let label = " [" + game.i18n.localize("PEN.Entities." + pItm.pid.split(".")[1].capitalize()) + "]";
      if (pItm.score < 0 && pItm.pid.split(".")[1] === "trait") {
        require.push({ name: pItm.oppName + label, uuid: pItm.uuid, pid: pItm.pid, score: -pItm.score, valid: valid });
      } else {
        require.push({ name: pItm.name + label, uuid: pItm.uuid, pid: pItm.pid, score: pItm.score, valid: valid });
      }
    }
    require.sort(function (a, b) {
      let x = a.name;
      let y = b.name;
      if (x < y) {
        return -1;
      }
      if (x > y) {
        return 1;
      }
      return 0;
    });

    for (let pItm of this.item.system.traitGroup) {
      let valid = true;
      if ((await game.system.api.pid.fromPIDBest({ pid: pItm.pid })).length < 1) {
        valid = false;
      }
      traitGroup.push({ name: pItm.name, uuid: pItm.uuid, pid: pItm.pid, valid: valid });
    }
    traitGroup.sort(function (a, b) {
      let x = a.name;
      let y = b.name;
      if (x < y) {
        return -1;
      }
      if (x > y) {
        return 1;
      }
      return 0;
    });

    for (let pItm of this.item.system.skillGroup) {
      let valid = true;
      if ((await game.system.api.pid.fromPIDBest({ pid: pItm.pid })).length < 1) {
        valid = false;
      }
      skillGroup.push({ name: pItm.name, uuid: pItm.uuid, pid: pItm.pid, score: pItm.score, valid: valid });
    }
    skillGroup.sort(function (a, b) {
      let x = a.name;
      let y = b.name;
      if (x < y) {
        return -1;
      }
      if (x > y) {
        return 1;
      }
      return 0;
    });

    for (let pItm of this.item.system.luck) {
      let valid = true;
      if ((await game.system.api.pid.fromPIDBest({ pid: pItm.pid })).length < 1) {
        valid = false;
      }
      luckTables.push({ name: pItm.name, uuid: pItm.uuid, pid: pItm.pid, valid: valid });
    }

    sheetData.require = require;
    sheetData.traitGroup = traitGroup;
    sheetData.skillGroup = skillGroup;
    sheetData.luckTables = luckTables;

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
    let parts = ["attributes", "benefits", "description", "effects"];
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
      case "benefits":
      case "effects":
      case "gmTab":
        context.tab = context.tabs[partId];
        break;
      default:
    }
    return context;
  }
  _onRender(context, _options) {
    this.#dragDrop.forEach((d) => d.bind(this.element));
    this.element
      .querySelectorAll(".item-toggle")
      .forEach((n) => n.addEventListener("click", this.#onItemToggle.bind(this)));
  }

  //Handle toggle states
  async #onItemToggle(event) {
    event.preventDefault();
    const prop = event.currentTarget.closest(".item-toggle").dataset.property;
    let checkProp = {};
    if (["protect"].includes(prop)) {
      checkProp = { [`system.${prop}`]: !this.item.system[prop] };
    } else {
      return;
    }
    await this.item.update(checkProp);
    return;
  }

  static async _promoted(event, target) {
    event.preventDefault();
    if (this.document.system.promoted) {
      let confirm = await PENUtilities.confirmation(game.i18n.localize("PEN.leaveIdeal"));
      if (confirm) {
        await this.document.update({ "system.promoted": false });
      }
    } else {
      if (this.document.system.activeIdeal) {
        await this.document.update({ "system.promoted": true });
      }
    }
  }

  //-----------------------DRAG DROP-----------------------------------

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
    event.stopPropagation();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data.type === "ActiveEffect") {
      return this._onDropActiveEffect(event, data);
    }

    let mainType = "Item";
    const type = ["trait"];
    const collectionName = event.currentTarget.dataset.collection ?? "traitGroup";
    if (["require", "skillGroup"].includes(collectionName)) {
      type.push("passion", "skill");
    }
    if (["luck"].includes(collectionName)) {
      mainType = "RollTable";
    }

    const dataList = await PENUtilities.getDataFromDropEvent(event, mainType);
    const collection = this.item.system[collectionName]
      ? foundry.utils.duplicate(this.item.system[collectionName])
      : [];

    for (const item of dataList) {
      if (!item) continue;
      if (mainType != "RollTable" && !item.system) continue;
      if (mainType != "RollTable" && !type.includes(item.type)) continue;

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

      let score = 0;
      if (["require", "skillGroup"].includes(collectionName)) {
        score = Number((await PENCharCreateV2.inpValue(game.i18n.localize("PEN.minScore"))).age);
      }

      if (collectionName === "luck") {
        collection.push({
          name: item.name,
          uuid: item.uuid,
          pid: item.flags.Pendragon.pidFlag.id,
        });
      } else {
        //Add item to collection
        collection.push({
          name: item.name,
          oppName: item.system.oppName,
          uuid: item.uuid,
          pid: item.flags.Pendragon.pidFlag.id,
          score: Number(score),
        });
      }
    }

    await this.item.update({ [`system.${collectionName}`]: collection });
  }

  //Delete an item from the collection
  static async #deleteItem(event, target) {
    const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
    const { collection } = target.closest("[data-collection]").dataset ?? {};
    const coll = this.item.system[collection] ?? [];
    await this.item.update({ [`system.${collection}`]: coll.filter((itm) => itm.uuid != itemId) });
  }

  //Handle the dropping of ActiveEffect data onto an Item Sheet
  async _onDropActiveEffect(event, effect) {
    let tempEffect = await fromUuid(effect.uuid);
    let newEffect = tempEffect.toObject();
    const item = this.document;
    newEffect.transfer = true;
    if (!this.isEditable || !item.isOwner || item === tempEffect.parent) {
      return null;
    }
    const result = await ActiveEffect.implementation.create(newEffect, { parent: item });
    return result ?? null;
  }
}
