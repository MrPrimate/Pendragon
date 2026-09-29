const { api, sheets } = foundry.applications;
import { PIDEditor } from "../../pid/pid-editor.mjs";
import { PendragonActor } from "../actor.mjs";
import { PENactorItemDrop } from "../actor-itemDrop.mjs";
import { PENUtilities } from "../../apps/utilities.mjs";
import { PID } from "../../pid/pid.mjs";
import { PENRollType } from "../../cards/rollType.mjs";

export class PendragonManorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  constructor(options = {}) {
    super(options);
    this._dragDrop = this._createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    classes: ["Pendragon", "sheet", "actor2", "manor"],
    position: {
      width: 600,
      height: 710,
    },
    window: {
      resizable: true,
    },
    tag: "form",
    dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }],
    form: {
      submitOnChange: true,
    },
    actions: {
      editPid: this._onEditPid,
      viewDoc: this._viewDoc,
      deleteDoc: this._deleteDoc,
      viewEnf: this._viewEnf,
      deleteEnf: this._deleteEnf,
      itemToggle: this._itemToggle,
      openWiki: this._openWiki,
    },
  };

  static PARTS = {
    header: {
      template: "systems/Pendragon/templates/actor/manor/manor.header.hbs",
      scrollable: [""],
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    details: {
      template: "systems/Pendragon/templates/actor/manor/manor.details.hbs",
      scrollable: [""],
    },
    notes: {
      template: "systems/Pendragon/templates/actor/manor/manor.notes.hbs",
      scrollable: [""],
    },
    location: {
      template: "systems/Pendragon/templates/actor/manor/manor.location.hbs",
      scrollable: [""],
    },
    improvements: {
      template: "systems/Pendragon/templates/actor/manor/manor.improvements.hbs",
      scrollable: [""],
    },
    mesnie: {
      template: "systems/Pendragon/templates/actor/manor/manor.mesnie.hbs",
      scrollable: [""],
    },
    folk: {
      template: "systems/Pendragon/templates/actor/manor/manor.folk.hbs",
      scrollable: [""],
    },
    skills: {
      template: "systems/Pendragon/templates/actor/manor/manor.skills.hbs",
      scrollable: [""],
    },
    gmTab: {
      template: "systems/Pendragon/templates/actor/gmtab.hbs",
      scrollable: [""],
    },
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    //Common parts to the character - this is the order they are show on the sheet
    options.parts = ["header", "tabs", "details", "improvements", "mesnie", "folk", "skills", "location", "notes"];

    //GM only tabs
    if (game.user.isGM) {
      options.parts.push("gmTab");
    }
  }

  _getTabs(parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = "primary";
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) {
      this.tabGroups[tabGroup] = "details";
    }
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: "",
        group: tabGroup,
        id: "",
        icon: "",
        label: "PEN.Tabs.",
      };
      switch (partId) {
        case "header":
        case "tabs":
          return tabs;
        case "gmTab":
        case "details":
        case "notes":
        case "location":
        case "skills":
        case "folk":
        case "mesnie":
        case "improvements":
          tab.id = partId;
          tab.label += partId;
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = "active";
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    context.editable = this.isEditable;
    context.owner = this.document.isOwner;
    context.limited = this.document.limited;
    context.actor = this.actor;
    context.flags = this.actor.flags;
    context.isGM = game.user.isGM;
    context.system = this.actor.system;
    context.enfeoffedLabel = game.i18n.localize("PEN.manor.dropActor");
    context.showHelp = game.settings.get("Pendragon", "showHelp");
    if (this.actor.system.enfeoffed.npc) {
      context.enfeoffedLabel = game.i18n.localize("PEN.invalid");
      let tempActor = await fromUuid(this.actor.system.enfeoffed.npc);
      if (tempActor) {
        context.enfeoffedLabel = tempActor.name;
      }
    }
    context.tabs = this._getTabs(options.parts);

    context.enrichedDescriptionValue = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system.description,
      {
        async: true,
        secrets: this.document.isOwner,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor,
      },
    );
    context.enrichedGMDescriptionValue = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system.GMdescription,
      {
        async: true,
        secrets: this.document.isOwner,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor,
      },
    );

    await this._prepareItems(context);
    if (this.actor.system.enfeoffed.npc != null) {
      context.showOption = false;
    }
    return context;
  }

  async _prepareItems(context) {
    // Initialize containers.
    const improvements = [];
    const defenses = [];
    const folks = [];
    const skills = [];
    const traits = [];
    let options = { none: game.i18n.localize("PEN.manor.selectFrom") };
    context.showOption = false;
    let newOption = {};
    for (let item of this.actor.items) {
      if (item.type === "manorImp") {
        item.label = game.i18n.localize("PEN.manor." + item.system.subtype);
        item.system.dv.label = game.i18n.localize("PEN.dv." + item.system.dv.pos);
        if (item.system.subtype === "def") {
          item.label = item.system.dv.label;
        }
        item.statusLabel = game.i18n.localize("PEN.manor." + item.system.status);
        item.assized = false;
        if (item.system.yearAcquired <= this.actor.system.yearAssized) {
          item.assized = true;
        }
        if (item.system.subtype === "def") {
          item.pos = this.actor.system.dv[item.system.dv.pos].pos;
          defenses.push(item);
        } else {
          improvements.push(item);
        }
      } else if (item.type === "background") {
        item.typeLabel = game.i18n.localize("PEN.manor." + item.system.subtype);
        newOption = { [item.id]: item.name };
        options = Object.assign(options, newOption);
        context.showOption = true;
        folks.push(item);
      } else if (["skill", "trait"].includes(item.type)) {
        if (!item.system.npcSource) {
          item.sourceLabel = "";
        } else {
          let tempID = item.system.npcSource.split("Item.")[1];
          let tempName = this.actor.items.get(tempID);
          if (tempName) {
            item.sourceLabel = tempName.name;
          } else {
            item.sourceLabel = game.i18n.localize("PEN.invalid");
          }
        }
        if (item.type === "skill") {
          skills.push(item);
        } else {
          traits.push(item);
        }
      }
    }
    context.folkList = options;
    context.folks = folks.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    context.improvements = improvements.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    context.defenses = defenses.sort((a, b) => a.pos - b.pos);

    context.skills = skills.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    context.traits = traits.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case "gmTab":
      case "details":
      case "notes":
      case "location":
      case "folk":
      case "skills":
      case "mesnie":
      case "improvements":
        context.tab = context.tabs[partId];
        break;
    }
    return context;
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    //define button
    const sheetPID = this.actor.flags?.Pendragon?.pidFlag;
    const noId = typeof sheetPID === "undefined" || typeof sheetPID.id === "undefined" || sheetPID.id === "";
    //add button
    const label = game.i18n.localize("PEN.PIDFlag.id");
    const pidEditor = `<button type="button" class="header-control fa-solid fa-fingerprint icon ${noId ? "edit-pid-warning" : "edit-pid-exisiting"}"
        data-action="editPid" data-tooltip="${label}" aria-label="${label}"></button>`;
    let el = this.window.close;
    while (el.previousElementSibling.localName === "button") {
      el = el.previousElementSibling;
    }
    el.insertAdjacentHTML("beforebegin", pidEditor);
    return frame;
  }

  //------------ACTIONS-------------------

  // Handle editPid action
  static _onEditPid(event) {
    event.stopPropagation(); // Don't trigger other events
    if (event.detail > 1) return; // Ignore repeated clicks
    new PIDEditor({ document: this.document }, {}).render(true, {
      focus: true,
    });
  }

  //Toggle Item
  static async _itemToggle(event, target) {
    const prop = target.dataset.property;
    const { itemid } = target.closest("[data-itemid]")?.dataset ?? {};
    const item = this.actor.items.get(itemid);
    if (!item) return;
    if (["XP"].includes(prop)) {
      let checkProp = { [`system.${prop}`]: !item.system[prop] };
      await item.update(checkProp);
    }
    return;
  }

  //View an Embedded Document
  static async _viewDoc(event, target) {
    const { itemid } = target.closest("[data-itemid]")?.dataset ?? {};
    const item = this.actor.items.get(itemid);
    if (!item) return;
    item.sheet.render(true);
  }

  //Delete an Embedded Document
  static async _deleteDoc(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      const { itemid } = target.closest("[data-itemid]")?.dataset ?? {};
      const item = this.actor.items.get(itemid);
      if (!item) return;

      if (item.type === "background") {
        let backItems = await this.actor.items
          .filter((itm) => ["skill", "trait"].includes(itm.type))
          .filter((itm) => itm.system.npcSource === item.uuid)
          .map((itm) => itm.id);
        this.actor.deleteEmbeddedDocuments("Item", backItems);
        if (this.actor.system.enfeoffed.background === item.id) {
          await this.actor.update({
            "system.enfeoffed.background": "none",
          });
        }
      }
      item.delete();
    }
  }

  //View Enfeoffed NPC
  static async _viewEnf(event, target) {
    if (!this.actor.system.enfeoffed.npc) {
      return;
    }
    const steward = await fromUuid(this.actor.system.enfeoffed.npc);
    if (!steward) return;
    steward.sheet.render(true);
  }

  //Delete an Enfeoffed NPC
  static async _deleteEnf(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      await this.actor.update({
        "system.enfeoffed.npc": "",
      });
    }
  }

  //Open Wiki Help Page
  static async _openWiki(event, target) {
    const url = target.dataset.property ?? "https://github.com/cragstone/Pendragon/wiki";
    window.open(url, "_blank");
  }

  // -----------------------------------LISTENERS-----------------------------------------
  //Activate event listeners using the prepared sheet HTML
  _onRender(context, _options) {
    this._dragDrop.forEach((d) => d.bind(this.element));
    this.element
      .querySelectorAll(".rollable.skill-name")
      .forEach((n) => n.addEventListener("click", PENRollType._onSkillCheck.bind(this)));
  }

  //-------------Drag and Drop--------------

  // Define whether a user is able to begin a dragstart workflow for a given drag selector
  _canDragStart(selector) {
    return this.isEditable;
  }

  //Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
  _canDragDrop(selector) {
    return this.isEditable;
  }

  //Callback actions which occur at the beginning of a drag start workflow.
  _onDragStart(event) {
    const docRow = event.currentTarget.closest("li");
    if ("link" in event.target.dataset) return;
    // Chained operation
    let dragData = this._getEmbeddedDocument(docRow)?.toDragData();
    if (!dragData) return;
    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  //Callback actions which occur when a dragged element is over a drop target.
  _onDragOver(event) {}

  //Callback actions which occur when a dragged element is dropped on a target.
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const actor = this.actor;
    const allowed = Hooks.call("dropActorSheetData", actor, this, data);
    if (allowed === false) return;

    // Handle different data types
    switch (data.type) {
      case "ActiveEffect":
        return this._onDropActiveEffect(event, data);
      case "Actor":
        return this._onDropActor(event, data);
      case "Item":
        return this._onDropItem(event, data);
      case "Folder":
        return this._onDropFolder(event, data);
    }
  }

  //Handle the dropping of ActiveEffect data onto an Actor Sheet
  async _onDropActiveEffect(event, data) {
    return false;
  }

  //Dropping an actor on to character
  async _onDropActor(event, data) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.actor.isOwner) return false;
    const collectionName = event.target.closest("[data-collection]")?.dataset.collection ?? "enfeoffed";
    const dataList = await PENUtilities.getDataFromDropEvent(event, "Actor");
    if (!dataList) {
      return false;
    }
    if (collectionName === "enfeoffed") {
      if (!["character", "npc", "follower"].includes(dataList[0].type)) {
        ui.notifications.warn(
          game.i18n.format("PEN.itemActormismatch", {
            itemType: game.i18n.localize("TYPES.Actor." + dataList[0].type),
            actorType: game.i18n.localize("TYPES.Actor." + this.actor.type),
          }),
        );
        return false;
      }
      if (this.actor.system.enfeoffed.npc) {
        ui.notifications.warn(game.i18n.localize("PEN.manor.alreadyEnfeoffed"));
        return false;
      }
      await this.actor.update({ "system.enfeoffed.npc": dataList[0].uuid });
      return;
    }
    return;
  }

  //Handle dropping of an item reference or item data onto an Actor Sheet
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);
    // Handle item sorting within the same Actor
    if (this.actor.uuid === item.parent?.uuid) return this._onSortItem(event, item);
    // Create the owned item
    return this._onDropItemCreate(item, event);
  }

  //Handle dropping of a Folder on an Actor Sheet.
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
    const folder = await Folder.implementation.fromDropData(data);
    if (folder.type !== "Item") return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(document instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      }),
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  //Handle the final creation of dropped Item data on the Actor.
  async _onDropItemCreate(itemData, event) {
    itemData = await PENactorItemDrop._PENonDropItemCreate(this.actor, itemData);
    const list = await this.actor.createEmbeddedDocuments("Item", itemData);

    //If a background npc added then update add the skills and calculate background cost
    for (let newItm of list) {
      if (newItm.type === "background") {
        await PENactorItemDrop._addBackgroundSkill(this.actor, newItm);
      }
    }
    return list;
  }

  //Returns an array of DragDrop instances
  get dragDrop() {
    return this._dragDrop;
  }

  _dragDrop;

  //Create drag-and-drop workflow handlers for this Application
  _createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new foundry.applications.ux.DragDrop(d);
    });
  }
}
