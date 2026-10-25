import { PENUtilities } from "../../apps/utilities.mjs";
import { PendragonItemSheet } from "./item-sheet.mjs";

export class PendragonCultureSheet extends PendragonItemSheet {
  #dragDrop;
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    position: {
      width: 560,
      height: 760,
    },
    actions: {
      deleteItem: PendragonCultureSheet.#deleteItem,
      viewTable: PendragonCultureSheet.#viewTable,
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
      template: "systems/Pendragon/templates/item/culture.attributes.hbs",
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
      skills.push({ name: skill.name, uuid: skill.uuid, pid: skill.pid, valid: valid });
    }

    sheetData.skills = skills.sort(PENUtilities.sortByNameKey);
    sheetData.religionTables = await this.#prepareTables(itemData.system.religionTables);
    sheetData.nameTables = [];
    for (const gender of ["male", "female"]) {
      sheetData.nameTables.push({
        label: "PEN." + gender + "NameTable",
        collection: "nameTables." + gender,
        tables: await this.#prepareTables(itemData.system.nameTables[gender]),
      });
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

  //Find the Roll Tables for a list of table references, using the PID before the UUID
  async #prepareTables(list) {
    const tables = [];
    for (let tableRef of list ?? []) {
      let thisTable = (await game.system.api.pid.fromPIDBest({ pid: tableRef.pid }))[0];
      //If no hit on PID then use UUID
      if (!thisTable) {
        thisTable = await fromUuid(tableRef.uuid);
      }

      //Keep the stored UUID so the entry can be deleted even if the PID resolves to a different document
      tables.push({
        name: thisTable?.name ?? tableRef.name,
        uuid: tableRef.uuid,
        pid: tableRef.pid,
        tableUuid: thisTable?.uuid ?? "",
        valid: !!thisTable,
      });
    }
    return tables;
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
    const type = "skill";
    const collectionName = event.currentTarget.dataset.collection ?? "skills";
    if (collectionName === "religionTables" || collectionName.startsWith("nameTables.")) {
      const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
      await this.DropRollTable(data, collectionName);
      return;
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

      //Add item to collection
      collection.push({
        name: item.name,
        oppName: item.system.oppName,
        uuid: item.uuid,
        pid: item.flags.Pendragon.pidFlag.id,
      });
    }
    await this.item.update({ [`system.${collectionName}`]: collection });
  }

  //Delete an item from the collection
  static async #deleteItem(event, target) {
    if (event.detail === 2) {
      const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
      const { collection } = target.closest("[data-collection]").dataset ?? {};
      const coll = foundry.utils.getProperty(this.item.system, collection) ?? [];
      await this.item.update({ [`system.${collection}`]: coll.filter((itm) => itm.uuid != itemId) });
    }
  }

  //Open the Starting Religion Table
  static async #viewTable(event, target) {
    const { tableUuid } = target.closest("[data-table-uuid]")?.dataset ?? {};
    const table = await fromUuid(tableUuid);
    if (!table) return;
    table.sheet.render(true);
  }

  //Drop a Roll Table on to the Starting Religion Table or a Name Table list
  async DropRollTable(data, collectionName = "religionTables") {
    const isReligion = collectionName === "religionTables";
    if (data.type !== "RollTable") {
      ui.notifications.warn(isReligion ? "PEN.religionTableOnly" : "PEN.nameTableOnly", { localize: true });
      return;
    }
    let newTable = await fromUuid(data.uuid);
    if (!newTable) {
      return;
    }
    //Check for PID
    let npid = newTable.flags?.Pendragon?.pidFlag?.id;
    if (!npid) {
      ui.notifications.warn(game.i18n.format("PEN.PIDFlag.noPIDFlag", { itemName: newTable.name }));
      return;
    }
    //Check if there already is a rollable table
    const current = foundry.utils.getProperty(this.item.system, collectionName);
    const tables = current ? foundry.utils.duplicate(current) : [];
    if (tables.length > 0) {
      ui.notifications.warn(isReligion ? "PEN.religionTableDup" : "PEN.nameTableDup", { localize: true });
      return;
    }
    tables.push({
      name: newTable.name,
      uuid: data.uuid,
      pid: newTable.flags?.Pendragon?.pidFlag?.id ?? "",
    });
    await this.item.update({ [`system.${collectionName}`]: tables });
    return;
  }
}
