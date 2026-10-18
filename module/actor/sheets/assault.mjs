const { api, sheets } = foundry.applications;
import { PendragonActor } from "../actor.mjs";
import { PendragonActorSheet } from "./actor-sheet.mjs";
import { PENSelectLists } from "../../apps/select-lists.mjs";
import { RollType, PENCheck, CardType } from "../../apps/checks.mjs";
import { PENUtilities } from "../../apps/utilities.mjs";
import PENDialog from "../../setup/pen-dialog.mjs";

export class PendragonAssaultSheet extends PendragonActorSheet {
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this._createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    classes: ["Pendragon", "sheet", "battle", "assault"],
    position: {
      width: 400,
      height: 760,
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
      noteView: this._noteView,
      toggleActor: this._onToggleActor,
      deleteActr: this._deleteActr,
      viewEnc: this._viewEnc,
      viewKnight: this._viewKnight,
      clearBattle: this._clearBattle,
      addTokensCombat: this._addTokensCombat,
      resultsView: this._resultsView,
      viewTable: this._viewTable,
      deleteTable: this._deleteTable,
      rollAssault: this._rollAssault,
      rollEncounters: this._rollEncounters,
      rollGate: this._rollGate,
      openWiki: this._openWiki,
    },
  };

  static PARTS = {
    header: {
      template: "systems/Pendragon/templates/actor/assault/assault.header.hbs",
      scrollable: [""],
    },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    notes: {
      template: "systems/Pendragon/templates/actor/assault/assault.notes.hbs",
      scrollable: [""],
    },
    turn1: {
      template: "systems/Pendragon/templates/actor/assault/assault.turn1.hbs",
      scrollable: [""],
    },
    turn2: {
      template: "systems/Pendragon/templates/actor/assault/assault.turn2.hbs",
      scrollable: [""],
    },
    turn3: {
      template: "systems/Pendragon/templates/actor/assault/assault.turn3.hbs",
      scrollable: [""],
    },
    turn4: {
      template: "systems/Pendragon/templates/actor/assault/assault.turn4.hbs",
      scrollable: [""],
    },
    results: {
      template: "systems/Pendragon/templates/actor/assault/assault.results.hbs",
      scrollable: [""],
    },
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    //Common parts to the character - this is the order they are show on the sheet
    options.parts = ["header", "tabs", "turn1", "turn2", "turn3", "turn4", "results"];

    //GM only tabs
    if (game.user.isGM) {
      options.parts.push("notes");
    }
  }

  _getTabs(parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = "primary";
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) {
      this.tabGroups[tabGroup] = "turn1";
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
        case "results":
        case "notes":
          return tabs;
        case "turn1":
        case "turn2":
        case "turn3":
        case "turn4":
          tab.id = partId;
          tab.label += partId;
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = "active";
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  async _preparePartContext(partId, context) {
    switch (partId) {
      case "turn1":
      case "turn2":
      case "turn3":
      case "turn4":
        context.tab = context.tabs[partId];
        break;
    }
    return context;
  }

  async _prepareContext(options) {
    const context = {
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      actor: this.actor,
      flags: this.actor.flags,
      isGM: game.user.isGM,
      system: this.actor.system,
      isLocked: this.actor.system.lock,
      showDice: false,
      showEncounterDice: false,
    };
    context.tabs = this._getTabs(options.parts);
    context.displayNotes = this.actor.system.noteView;
    context.displayResults = this.actor.system.resultsView;
    context.showHPVal = await game.settings.get("Pendragon", "showParty");
    context.showNPC = this.actor.system.npcView;
    context.showHelp = game.settings.get("Pendragon", "showHelp");
    if (game.user.isGM) {
      context.showHPVal = true;
    }
    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system.description,
      {
        async: true,
        secrets: this.document.isOwner,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor,
      },
    );
    context.enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system.notes,
      {
        async: true,
        secrets: this.document.isOwner,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor,
      },
    );

    let encounters = [];
    let defenders = [];
    let gateDefenders = [];
    let opportunities = [];
    let defOpportunities = [];
    let knights = [];
    let assaults = [];

    for (let thisEnc of this.actor.system.encounters) {
      let displayName = thisEnc.name;
      let encounter = (await game.system.api.pid.fromPIDBest({ pid: thisEnc.pid }))[0];
      //If no hit on PID then use UUID
      if (!encounter) {
        encounter = await fromUuid(thisEnc.uuid);
      }

      if (encounter) {
        context.showEncounterDice = true;
        if (displayName === "") displayName = encounter.name;
        if (encounter.system.opportunity) {
          opportunities.push({
            name: displayName,
            uuid: thisEnc.uuid,
            pid: thisEnc.pid,
            actr: encounter,
          });
        } else {
          encounters.push({
            name: displayName,
            uuid: thisEnc.uuid,
            pid: thisEnc.pid,
            actr: encounter,
          });
        }
      } else {
        encounters.push({
          name: displayName + " [" + game.i18n.localize("PEN.invalid") + "]",
          uuid: thisEnc.uuid,
          pid: thisEnc.pid,
          actr: false,
        });
      }
    }

    for (let thisEnc of this.actor.system.defenders) {
      let displayName = thisEnc.name;
      let encounter = (await game.system.api.pid.fromPIDBest({ pid: thisEnc.pid }))[0];
      //If no hit on PID then use UUID
      if (!encounter) {
        encounter = await fromUuid(thisEnc.uuid);
      }

      if (encounter) {
        if (displayName === "") displayName = encounter.name;
        if (encounter.system.opportunity) {
          defOpportunities.push({
            name: displayName,
            uuid: thisEnc.uuid,
            pid: thisEnc.pid,
            actr: encounter,
          });
        } else {
          defenders.push({
            name: displayName,
            uuid: thisEnc.uuid,
            pid: thisEnc.pid,
            actr: encounter,
          });
        }
      } else {
        defenders.push({
          name: displayName + " [" + game.i18n.localize("PEN.invalid") + "]",
          uuid: thisEnc.uuid,
          pid: thisEnc.pid,
          actr: false,
        });
      }
    }

    for (let thisEnc of this.actor.system.gatedefenders) {
      let displayName = thisEnc.name;
      let encounter = (await game.system.api.pid.fromPIDBest({ pid: thisEnc.pid }))[0];
      //If no hit on PID then use UUID
      if (!encounter) {
        encounter = await fromUuid(thisEnc.uuid);
      }

      if (encounter) {
        if (displayName === "") displayName = encounter.name;
        gateDefenders.push({
          name: displayName,
          uuid: thisEnc.uuid,
          pid: thisEnc.pid,
          actr: encounter,
        });
      } else {
        gateDefenders.push({
          name: displayName + " [" + game.i18n.localize("PEN.invalid") + "]",
          uuid: thisEnc.uuid,
          pid: thisEnc.pid,
          actr: false,
        });
      }
    }

    for (let assaultTable of this.actor.system.assaultTables) {
      context.showDice = true;
      let displayName = assaultTable.name;
      let thisTable = (await game.system.api.pid.fromPIDBest({ pid: assaultTable.pid }))[0];
      //If no hit on PID then use UUID
      if (!thisTable) {
        thisTable = await fromUuid(assaultTable.uuid);
      }

      if (thisTable) {
        assaults.push({
          name: thisTable.name,
          uuid: thisTable.uuid,
          pid: thisTable.pid,
          table: thisTable,
        });
      } else {
        assaults.push({
          name: assaultTable.name + " [" + game.i18n.localize("PEN.invalid") + "]",
          uuid: assaultTable.uuid,
          pid: assaultTable.pid,
          table: false,
        });
      }
    }

    const kList = await this.actor.system.getKnights();
    for (const { actor: knight } of kList) {
      if (knight) {
        const pid = knight.getFlag("Pendragon", "pidFlag");
        knights.push({
          name: knight.name,
          id: knight.id,
          pid: pid?.id,
          pos: game.i18n.localize("PEN.battlePos." + knight.system.battlePos),
          fieldPos: game.i18n.localize("PEN.fieldPos." + knight.system.fieldPos),
          fieldPosAbbr: game.i18n.localize("PEN.fieldPosAbbr." + knight.system.fieldPos),
          actr: knight,
        });
      } else {
        knights.push({
          name: game.i18n.localize("PEN.invalid"),
          id: null,
          npcPid: null,
          pos: "",
          fieldPos: "",
          fieldPosAbbr: "",
          actr: false,
        });
      }
    }

    context.encounters = encounters.sort((a, b) => a.name.localeCompare(b.name));
    context.opportunities = opportunities.sort((a, b) => a.name.localeCompare(b.name));
    context.defenders = defenders.sort((a, b) => a.name.localeCompare(b.name));
    context.defOpportunities = defOpportunities.sort((a, b) => a.name.localeCompare(b.name));
    context.gateDefenders = gateDefenders.sort((a, b) => a.name.localeCompare(b.name));
    context.knights = knights;
    context.assaults = assaults;

    return context;
  }

  //------------ACTIONS-------------------

  static async _noteView(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    await this.actor.update({ "system.noteView": !this.actor.system.noteView });
  }

  static async _resultsView(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    await this.actor.update({
      "system.resultsView": !this.actor.system.resultsView,
    });
  }

  static async _onToggleActor(event, target) {
    //Only perform on double click
    event.stopPropagation(); // Don't trigger other events
    let checkProp = {};
    let prop = target.dataset.property;
    if (["lock"].includes(prop)) {
      checkProp = { [`system.${prop}`]: !this.actor.system[prop] };
    } else {
      return;
    }
    this.actor.update(checkProp);
  }

  //Delete an Encounter or Knight from battle
  static async _deleteActr(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      event.preventDefault();
      event.stopImmediatePropagation();
      const collectionName = target.closest(".partic-item").dataset.coll;
      if (!collectionName) {
        return;
      }
      const itemId = target.closest(".partic-item").dataset.property;
      if (["encounters", "defenders", "gatedefenders"].includes(collectionName)) {
        const encIndex = this.actor.system[collectionName].findIndex((i) => itemId && i.uuid === itemId);
        if (encIndex > -1) {
          const collection = this.actor.system[collectionName]
            ? foundry.utils.duplicate(this.actor.system[collectionName])
            : [];
          collection.splice(encIndex, 1);
          //await this.actor.update({ "system.encounters": encounters });
          await this.actor.update({ [`system.${collectionName}`]: collection });
        }
        return;
      }
      if (collectionName === "knights") {
        await this.actor.system.removeKnight(itemId);
        return;
      }
    }
  }

  //View Encounter
  static async _viewEnc(event, target) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!game.user.isGM) {
      return;
    }
    const { pid, property: uuid } = target.closest(".partic-item").dataset;
    //Check to see if Encounter is in game world
    let enc =
      pid && game.actors.find((actr) => actr.type === "encounter" && actr.flags?.Pendragon?.pidFlag?.id === pid);
    //If not in game then check compendiums as well
    if (!enc) {
      enc = (await game.system.api.pid.fromPIDBest({ pid: pid }))[0];
    }
    //Older battles may only have a UUID, just as in the encounter list lookup.
    if (!enc && uuid) {
      enc = await fromUuid(uuid);
    }
    if (!enc) {
      ui.notifications.warn(game.i18n.format("PEN.actorNotFound", { type: pid || uuid }));
      return;
    }
    if (enc.pack) {
      enc = await PendragonActor.create(enc);
    }
    await enc.sheet.render(true);
  }

  //View Knight
  static async _viewKnight(event, target) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const pid = target.closest(".partic-item").dataset.pid;
    //Check to see if Encounter is in game world
    let enc = await game.actors.filter((actr) => actr.flags.Pendragon?.pidFlag?.id === pid)[0];
    if (enc) {
      enc.sheet.render(true);
    } else {
      ui.notifications.warn(game.i18n.format("PEN.noWorldActor", { pid: pid }));
    }
  }

  //Reset Battle Encounters
  static async resetEnc(event) {
    let enctrs = await game.actors.filter((a) => a.type === "encounter").filter((a) => a.system.used);
    for (let enc of enctrs) {
      await enc.update({ "system.used": false });
    }
  }

  //Clear BattleField of NPC tokens
  static async _clearBattle(event) {
    if (event.detail === 2) {
      //Only perform on double click
      let tokens = canvas.tokens.placeables.filter((t) => t.actor?.type === "npc").map((itm) => itm.id);
      if (tokens) {
        await canvas.scene.deleteEmbeddedDocuments("Token", tokens);
      }
    }
  }

  //Static Add Tokens to Combat
  static async _addTokensCombat(event, target) {
    let tokens = canvas.scene.tokens;
    if (tokens) {
      TokenDocument.createCombatants(tokens);
    }
  }

  static async _viewTable(event, target) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!game.user.isGM) {
      return;
    }
    const { pid, property: uuid } = target.closest(".partic-item").dataset;
    let thisTable = (await game.system.api.pid.fromPIDBest({ pid: pid }))[0];

    if (!thisTable && uuid) {
      thisTable = await fromUuid(uuid);
    }
    if (!thisTable) {
      ui.notifications.warn(game.i18n.format("PEN.actorNotFound", { type: pid || uuid }));
      return;
    }

    await thisTable.sheet.render(true);
  }

  static async _deleteTable(event, target) {
    if (event.detail === 2) {
      if (!game.user.isGM) {
        return;
      }
      await this.actor.update({ "system.assaultTables": [] });
    }
    return;
  }

  static async _rollAssault(event, target) {
    event.preventDefault();
    event.stopImmediatePropagation();
    let assaultTable = this.actor.system.assaultTables[0];
    if (!assaultTable) {
      return;
    }
    let thisTable = (await game.system.api.pid.fromPIDBest({ pid: assaultTable.pid }))[0];
    //If no hit on PID then use UUID
    if (!thisTable) {
      thisTable = await fromUuid(assaultTable.uuid);
    }
    if (!thisTable) {
      ui.notifications.warn(game.i18n.format("PEN.tableNotFound", { type: assaultTable.pid || assaultTable.uuid }));
      return;
    }

    const kList = await this.actor.system.getKnights();
    if (kList.length < 1) {
      ui.notifications.warn(game.i18n.localize("PEN.assault.noAttackers"));
      return;
    }
    for (const { actor: knight } of kList) {
      //TO DO: Consider adding info in roll table results to make the test roll with follow on Damage roll
      //<p sytle="display:none;">Crossbow/10/1D6+10/Damage can be higher in later periods</p>
      //Then parse the hidden element in to a GM roll and if passed roll damage
      if (knight) {
        const rollResult = await PENUtilities.tableDiceRoll(thisTable);
        const resultText = rollResult.results.map((r) => r.description).join(", ");
        let resultString =
          "<h5>" +
          game.i18n.localize("PEN.assault.turn1") +
          "</h5>" +
          "<p><strong>" +
          knight.name +
          "-" +
          thisTable.name +
          "</strong>" +
          resultText +
          "</p>";
        ChatMessage.create({
          content: resultString,
          speaker: ChatMessage.getSpeaker(),
        });
      }
    }
  }

  static async _rollEncounters(event, target) {
    event.preventDefault();
    event.stopImmediatePropagation();
    let encounters = [];
    for (let thisEnc of this.actor.system.encounters) {
      let displayName = thisEnc.name;
      let encounter = (await game.system.api.pid.fromPIDBest({ pid: thisEnc.pid }))[0];
      //If no hit on PID then use UUID
      if (!encounter) {
        encounter = await fromUuid(thisEnc.uuid);
      }
      if (encounter) {
        //Ignore Used Encounters and any Opportunities
        if (!encounter.system.opportunity && !encounter.system.used) {
          if (displayName === "") displayName = encounter.name;
          encounters.push({ name: displayName });
        }
      }
    }
    if (encounters.length < 1) {
      console.log("No Valid Encounters");
      return;
    }
    encounters = encounters.sort((a, b) => a.name.localeCompare(b.name));
    const kList = await this.actor.system.getKnights();
    if (kList.length < 1) {
      ui.notifications.warn(game.i18n.localize("PEN.assault.noAttackers"));
      return;
    }
    let resultString = "<h5>" + game.i18n.localize("PEN.assault.turn2") + "</h5>";
    for (const { actor: knight } of kList) {
      if (knight) {
        let formula = "1D" + encounters.length;
        let result = await PENUtilities.complexDiceRoll(formula);
        let outcome = result.total;
        resultString =
          resultString +
          "<p><strong>" +
          knight.name +
          "</strong>(" +
          result.total +
          "): " +
          encounters[outcome - 1].name +
          "</p>";
      }
    }
    ChatMessage.create({
      content: resultString,
      speaker: ChatMessage.getSpeaker(),
    });
  }

  static async _rollGate(event, target) {
    let roll = new Roll("1D6+2");
    let results = await roll.evaluate();
    await this.actor.update({ "system.openGateRounds": results.total });
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
      case "RollTable":
        return this._onDropRollTable(event, data);
    }
  }

  //Handle the dropping of ActiveEffect data onto an Actor Sheet
  async _onDropActiveEffect(event, data) {
    return false;
  }

  //Handle dropping of an Actor data onto another Actor sheet
  async _onDropActor(event, data) {
    if (!this.actor.isOwner) return false;
    await this.DropActor(event, data);
  }

  //Handle dropping of an item reference or item data onto an Actor Sheet
  async _onDropItem(event, data) {
    return false;
  }

  //Handle dropping of a Folder on an Actor Sheet.
  async _onDropFolder(event, data) {
    return false;
  }

  //Returns an array of DragDrop instances
  get dragDrop() {
    return this.#dragDrop;
  }

  //Handle dropping of an Roll Table onto another Actor sheet
  async _onDropRollTable(event, data) {
    if (!this.actor.isOwner) return false;
    await this.DropRollTable(data);
  }

  #dragDrop;

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

  //Drop Actor on to an Actor Sheet
  async DropActor(event, data) {
    let newActor = await fromUuid(data.uuid);
    if (!newActor) {
      return;
    }
    let npid = newActor.flags?.Pendragon?.pidFlag?.id;
    if (!npid) {
      ui.notifications.warn(game.i18n.format("PEN.PIDFlag.noPIDFlag", { itemName: newActor.name }));
      return;
    }
    if (newActor.type == "encounter") {
      const collectionName = event.target.closest("[data-coll]")?.dataset?.coll;
      if (!["encounters", "defenders", "gatedefenders"].includes(collectionName)) {
        ui.notifications.warn(game.i18n.localize("PEN.cantDropActor"));
        return;
      }
      if (!collectionName || collectionName === "") {
        return;
      }
      if (["encounter"].includes(newActor.type)) {
        const collection = this.actor.system[collectionName]
          ? foundry.utils.duplicate(this.actor.system[collectionName])
          : [];
        //Check encounter is not in the current list
        if (collection.find((el) => el.pid === npid)) {
          ui.notifications.warn(game.i18n.localize("PEN.dupNPC"));
          return;
        }
        let displayName = newActor.name;
        let msg = game.i18n.localize("PEN.encounterName");
        let inpVal = await PENDialog.input({
          window: { title: game.i18n.localize("TYPES.Actor.encounter") },
          content: `<p>` + msg + `</p><p><input class="centre" type="text" name="inpvalue"></p>`,
        });
        if (inpVal && inpVal.inpvalue != "") {
          displayName = inpVal.inpvalue;
        }

        collection.push({
          name: displayName,
          uuid: data.uuid,
          pid: newActor.flags?.Pendragon?.pidFlag?.id ?? "",
        });
        //await this.actor.update({ "system.encounters": encounters });
        await this.actor.update({ [`system.${collectionName}`]: collection });
      } else {
        ui.notifications.warn(game.i18n.format("PEN.cantDropActor"));
        return;
      }

      //await this.actor.system.addEncounter(newActor);
      return;
    }
    if (newActor.type == "character") {
      await this.actor.system.addKnight(newActor);
      return;
    }
    ui.notifications.warn(game.i18n.format("PEN.cantDropActor"));
    return;
  }

  //Drop Roll Table on Actor Sheet
  async DropRollTable(data) {
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
    const assaultTables = this.actor.system.assaultTables
      ? foundry.utils.duplicate(this.actor.system.assaultTables)
      : [];
    if (assaultTables.length > 0) {
      ui.notifications.warn(game.i18n.format("PEN.dupItemType", { name: game.i18n.localize("DOCUMENT.RollTable") }));
      return;
    }
    assaultTables.push({
      name: newTable.name,
      uuid: data.uuid,
      pid: newTable.flags?.Pendragon?.pidFlag?.id ?? "",
    });
    await this.actor.update({ "system.assaultTables": assaultTables });
    return;
  }
}
