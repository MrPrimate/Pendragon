import { addPIDSheetHeaderButton } from "../../pid/pid-button.mjs";
import { PENUtilities } from "../../apps/utilities.mjs";
import { PendragonItemSheet } from "./item-sheet.mjs";
import { PENSelectLists } from "../../apps/select-lists.mjs";
import PENDialog from "../../setup/pen-dialog.mjs";

export class PendragonManorimpSheet extends PendragonItemSheet {
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
      deleteItem: PendragonManorimpSheet.#deleteItem,
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
      template: "systems/Pendragon/templates/item/manorImp.attributes.hbs",
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
    sheetData.subType = await PENSelectLists.getImprovType();
    sheetData.dvType = await PENSelectLists.getDVImprovType();
    sheetData.subLabel = sheetData.subType[this.item.system.subtype];
    sheetData.maintList = await PENSelectLists.getMaintType();
    sheetData.canEdit = sheetData.isGM; //Consider other circumstances to allow edit
    sheetData.showCheck = false;
    if (["enh", "inv"].includes(this.item.system.subtype)) {
      sheetData.showCheck = true;
    }

    const tempChecks = this.item.system.annchecks ?? [];
    const tempRolls = this.item.system.annrolls ?? [];
    const tempOptChecks = this.item.system.optchecks ?? [];
    const tempOptRolls = this.item.system.optrolls ?? [];
    const tempFolks = this.item.system.npcs ?? [];
    const annualChecks = [];
    const annualRolls = [];
    const optChecks = [];
    const optRolls = [];
    const folks = [];
    tempChecks.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    tempRolls.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    tempOptChecks.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    tempOptRolls.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    tempFolks.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    for (let pItm of tempChecks) {
      let valid = true;
      if ((await game.system.api.pid.fromPIDBest({ pid: pItm.pid })).length < 1) {
        valid = false;
      }
      let typeLabel = game.i18n.localize("TYPES.Item." + pItm.subType);
      annualChecks.push({
        name: pItm.name,
        uuid: pItm.uuid,
        pid: pItm.pid,
        opposed: pItm.opposed,
        typeLabel: typeLabel,
        valid: valid,
      });
    }
    for (let pItm of tempRolls) {
      let valid = true;
      if ((await game.system.api.pid.fromPIDBest({ pid: pItm.pid })).length < 1) {
        valid = false;
      }
      let typeLabel = game.i18n.localize("TYPES.Item." + pItm.subType);
      annualRolls.push({
        name: pItm.name,
        uuid: pItm.uuid,
        pid: pItm.pid,
        opposed: pItm.opposed,
        typeLabel: typeLabel,
        valid: valid,
      });
    }
    for (let pItm of tempOptChecks) {
      let valid = true;
      if ((await game.system.api.pid.fromPIDBest({ pid: pItm.pid })).length < 1) {
        valid = false;
      }
      let typeLabel = game.i18n.localize("TYPES.Item." + pItm.subType);
      optChecks.push({
        name: pItm.name,
        uuid: pItm.uuid,
        pid: pItm.pid,
        opposed: pItm.opposed,
        typeLabel: typeLabel,
        valid: valid,
      });
    }
    for (let pItm of tempOptRolls) {
      let valid = true;
      if ((await game.system.api.pid.fromPIDBest({ pid: pItm.pid })).length < 1) {
        valid = false;
      }
      let typeLabel = game.i18n.localize("TYPES.Item." + pItm.subType);
      optRolls.push({
        name: pItm.name,
        uuid: pItm.uuid,
        pid: pItm.pid,
        opposed: pItm.opposed,
        typeLabel: typeLabel,
        valid: valid,
      });
    }

    for (let pAct of tempFolks) {
      let valid = true;
      if ((await game.system.api.pid.fromPIDBest({ pid: pAct.pid })).length < 1) {
        valid = false;
      }
      let typeLabel = game.i18n.localize("TYPES.Actor." + pAct.subtype);
      folks.push({
        name: pAct.name,
        uuid: pAct.uuid,
        pid: pAct.pid,
        typeLabel: typeLabel,
        valid: valid,
      });
    }

    sheetData.annualChecks = annualChecks;
    sheetData.annualRolls = annualRolls;
    sheetData.optChecks = optChecks;
    sheetData.optRolls = optRolls;
    sheetData.folks = folks;

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

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  _onRender(context, _options) {
    this.#dragDrop.forEach((d) => d.bind(this.element));
    this.element
      .querySelectorAll(".item-toggle")
      .forEach((n) => n.addEventListener("click", this.#onItemToggle.bind(this)));
  }

  //Listeneres

  //Handle toggle states
  async #onItemToggle(event) {
    event.preventDefault();
    const prop = event.currentTarget.closest(".item-toggle").dataset.property;
    let checkProp = {};
    if (["drawFunds", "starter"].includes(prop)) {
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

    //If dropping an Actor add the background character PID

    let type = ["passion", "skill", "trait", "background"];
    const collectionName = event.currentTarget.dataset.collection ?? "annchecks";
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

      let opposed = false;
      let tempName = item.name;

      //If a trait check to see if opposed is selected
      if (item.type === "trait") {
        let confirmation = await PENDialog.wait({
          window: { title: "Select Trait?" },
          content: '<br><div class="stat-name centre bold">Please select the trait to add</div><div></div><br>',
          buttons: [
            { label: item.name, action: false },
            { label: item.system.oppName, action: true },
          ],
        });
        if (confirmation === null) {
          continue;
        }
        if (confirmation) {
          tempName = item.system.oppName;
          opposed = true;
        }
      }

      //If Duplicate item then give warning and move to next item
      if (item.type != "trait") {
        if (collection.find((el) => el.pid === item.flags?.Pendragon?.pidFlag?.id)) {
          ui.notifications.warn(item.name + " : " + game.i18n.localize("PEN.dupItem"));
          continue;
        }
      } else if (collection.find((el) => el.pid === item.flags?.Pendragon?.pidFlag?.id && el.opposed === opposed)) {
        ui.notifications.warn(item.name + " : " + game.i18n.localize("PEN.dupItem"));
        continue;
      }

      //Add item to collection
      collection.push({
        name: tempName,
        opposed: opposed,
        uuid: item.uuid,
        pid: item.flags.Pendragon.pidFlag.id,
        subType: item.type,
      });
    }
    await this.item.update({ [`system.${collectionName}`]: collection });
    //Empty Array
    collection.length = 0;
    return;
  }

  //Delete an trait from the collection
  static async #deleteItem(event, target) {
    if (event.detail === 2) {
      const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
      const { collection } = target.closest("[data-collection]").dataset ?? {};
      const { opptest } = target.closest("[data-opptest]")?.dataset ?? {};
      const coll = this.item.system[collection] ?? [];
      if (collection === "npcs") {
        await this.item.update({
          [`system.${collection}`]: coll.filter((itm) => itm.uuid != itemId),
        });
      } else {
        await this.item.update({
          [`system.${collection}`]: coll.filter(
            (itm) => itm.uuid != itemId || (itm.uuid === itemId && itm.name !== opptest),
          ),
        });
      }
    }
    return;
  }
}
