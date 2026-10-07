import { PENUtilities } from "../../apps/utilities.mjs";
import { PendragonItemSheet } from "./item-sheet.mjs";
import PENDialog from "../../setup/pen-dialog.mjs";

export class PendragonArchetypeSheet extends PendragonItemSheet {
  #dragDrop;
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    position: {
      width: 610,
      height: 570,
    },
    actions: {
      deleteItem: PendragonArchetypeSheet.#deleteItem,
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
      template: "systems/Pendragon/templates/item/archetype.attributes.hbs",
    },
    skills: {
      template: "systems/Pendragon/templates/item/archetype.skills.hbs",
    },
    traits: {
      template: "systems/Pendragon/templates/item/archetype.traits.hbs",
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
    const itemData = sheetData.item;
    const skills = [];
    for (let skill of itemData.system.skills) {
      let valid = true;
      if ((await game.system.api.pid.fromPIDBest({ pid: skill.pid })).length < 1) {
        valid = false;
      }
      skills.push({ name: skill.name, formula: skill.formula, uuid: skill.uuid, pid: skill.pid, valid: valid });
    }
    const traits = [];
    for (let trait of itemData.system.bonusTraits) {
      let valid = true;
      if ((await game.system.api.pid.fromPIDBest({ pid: trait.pid })).length < 1) {
        valid = false;
      }
      traits.push({
        name: trait.name,
        constructed: trait.constructed,
        formula: trait.formula,
        uuid: trait.uuid,
        pid: trait.pid,
        valid: valid,
      });
    }
    const ideals = [];
    for (let ideal of itemData.system.ideals) {
      let valid = true;
      if ((await game.system.api.pid.fromPIDBest({ pid: ideal.pid })).length < 1) {
        valid = false;
      }
      ideals.push({ name: ideal.name, uuid: ideal.uuid, pid: ideal.pid, valid: valid });
    }

    const classes = [];
    for (let thisClass of itemData.system.classes) {
      let valid = false;
      let label = thisClass.name;
      let validClass = await game.system.api.pid.fromPIDBest({ pid: thisClass.pid });
      let age = 99;
      if (validClass.length > 0) {
        valid = true;
        if (validClass[0].system.age > 0) {
          age = validClass[0].system.age;
        }
        if (age != 99) label = label + " (" + game.i18n.localize("PEN.age") + ": " + age + ")";
      }
      classes.push({ name: label, uuid: thisClass.uuid, pid: thisClass.pid, valid: valid, age: age });
    }
    sheetData.skills = skills.sort(PENUtilities.sortByNameKey);
    sheetData.traits = traits.sort(PENUtilities.sortByNameKey);
    sheetData.ideals = ideals;
    sheetData.classes = classes.sort((a, b) => a.age - b.age);

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
    let parts = ["attributes", "skills", "traits", "description", "effects"];
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
      case "skills":
      case "traits":
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
    this.element
      .querySelectorAll(".item-toggle")
      .forEach((n) => n.addEventListener("click", this.#onItemToggle.bind(this)));
  }

  //Handle toggle states
  async #onItemToggle(event) {
    event.preventDefault();
    const prop = event.currentTarget.closest(".item-toggle").dataset.property;
    let checkProp = "";
    if (["startertrait"].includes(prop)) {
      checkProp = { [`system.${prop}`]: !this.item.system[prop] };
    } else {
      return;
    }
    await this.item.update(checkProp);
    return;
  }

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

  //Allow for an item being dragged and dropped on to the sheet
  async _onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    let type = "skill";
    const collectionName = event.currentTarget.dataset.collection ?? "skills";
    if (collectionName === "classes") {
      type = "class";
    }
    if (collectionName === "ideals") {
      type = "ideal";
    }
    if (collectionName === "bonusTraits") {
      type = "trait";
    }

    const dataList = await PENUtilities.getDataFromDropEvent(event, "Item");
    const collection = this.item.system[collectionName]
      ? foundry.utils.duplicate(this.item.system[collectionName])
      : [];

    for (const item of dataList) {
      if (!item || !item.system) continue;
      if (![type].includes(item.type)) {
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

      //Only allow one ideal
      if (collectionName === "ideals") {
        if (collection.length > 0) {
          ui.notifications.warn(
            game.i18n.format("PEN.oneItem", {
              child: game.i18n.localize("TYPES.Item." + `${item.type}`),
              parent: game.i18n.localize("TYPES.Item." + `${this.document.type}`),
            }),
          );
          continue;
        }
      }

      if (["skill"].includes(collectionName)) {
        let inpVal = await PENDialog.input({
          window: { title: game.i18n.localize("PEN.startingFormula") },
          content: `<div><input class="centre" type="text" name="inpvalue"/></div>`,
        });
        let start = "0";
        if (inpVal.inpvalue != "") start = inpVal.inpvalue;
        //Add item to collection
        collection.push({
          name: item.name,
          formula: start,
          uuid: item.uuid,
          pid: item.flags.Pendragon.pidFlag.id,
        });
      } else if (["bonusTraits"].includes(collectionName)) {
        let inpVal = await PENDialog.input({
          window: { title: game.i18n.localize("PEN.startingValues") },
          content:
            "<div style='gap:0px;'><p class='stat-name bold'>" +
            game.i18n.localize("PEN.fixedValue") +
            "</p><p><input class='stat-name bold centre' type='number' name='fixedvalue'/></p>" +
            "<br>" +
            "<p class='stat-name bold'>" +
            game.i18n.localize("PEN.rolledValue") +
            "</p><p><input class='stat-name bold centre' type='text' name='inpvalue'/></p></div>",
        });
        let start = "0";
        let fixedVal = 0;
        if (inpVal.inpvalue != "") start = inpVal.inpvalue;
        if (inpVal.fixedvalue) fixedVal = inpVal.fixedvalue;
        collection.push({
          name: item.name,
          formula: start,
          constructed: fixedVal,
          uuid: item.uuid,
          pid: item.flags.Pendragon.pidFlag.id,
        });
      } else {
        collection.push({
          name: item.name,
          uuid: item.uuid,
          pid: item.flags.Pendragon.pidFlag.id,
        });
      }
    }
    await this.item.update({ [`system.${collectionName}`]: collection });
  }

  //Delete an trait from the collection
  static async #deleteItem(event, target) {
    const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
    const { collection } = target.closest("[data-collection]").dataset ?? {};
    const coll = this.item.system[collection] ?? [];
    await this.item.update({ [`system.${collection}`]: coll.filter((itm) => itm.uuid != itemId) });
  }
}
