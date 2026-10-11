const { api, sheets } = foundry.applications;
import { PendragonActor } from "../actor.mjs";
import { PendragonActorSheet } from "./actor-sheet.mjs";
import { PENSelectLists } from "../../apps/select-lists.mjs";
import { RollType, PENCheck, CardType } from "../../apps/checks.mjs";
import PENDialog from "../../setup/pen-dialog.mjs";

export class PendragonBattleSheet extends PendragonActorSheet {
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this._createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    classes: ["Pendragon", "sheet", "actor", "battle"],
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
      battleTurn: this._battleTurn,
      viewEnc: this._viewEnc,
      viewKnight: this._viewKnight,
      resetPosture: this._resetPosture,
      gmRoll: this._gmRoll,
      clearBattle: this._clearBattle,
      addTokensCombat: this._addTokensCombat,
      resultsView: this._resultsView,
    },
  };

  static PARTS = {
    header: {
      template: "systems/Pendragon/templates/actor/battle.header.hbs",
      scrollable: [""],
    },
    notes: {
      template: "systems/Pendragon/templates/actor/battle.notes.hbs",
      scrollable: [""],
    },
    results: {
      template: "systems/Pendragon/templates/actor/battle.results.hbs",
      scrollable: [""],
    },
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    //Common parts to the character - this is the order they are show on the sheet
    options.parts = ["header", "results"];

    //GM only tabs
    if (game.user.isGM) {
      options.parts.push("notes");
    }
  }

  _getTabs(parts) {}

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
    };
    //context.tabs = this._getTabs(options.parts);
    context.displayNotes = this.actor.system.noteView;
    context.displayResults = this.actor.system.resultsView;
    context.showHPVal = await game.settings.get("Pendragon", "showParty");
    context.showNPC = this.actor.system.npcView;
    if (game.user.isGM) {
      context.showHPVal = true;
    }
    context.fieldPosType = await PENSelectLists.getFieldPos();

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
    let knights = [];

    for (let thisEnc of this.actor.system.encounters) {
      let displayName = thisEnc.name;
      let encounter = (await game.system.api.pid.fromPIDBest({ pid: thisEnc.pid }))[0];
      //If no hit on PID then use UUID
      if (!encounter) {
        encounter = await fromUuid(thisEnc.uuid);
      }

      if (encounter) {
        let morale = true;
        if (this.actor.system.currMorale < encounter.system.moraleMin && context.isGM) {
          morale = false;
        }
        if (displayName === "") displayName = encounter.name;
        encounters.push({
          name: displayName,
          uuid: thisEnc.uuid,
          pid: thisEnc.pid,
          actr: encounter,
          morale: morale,
        });
      } else {
        encounters.push({
          name: displayName + " [" + game.i18n.localize("PEN.invalid") + "]",
          uuid: thisEnc.uuid,
          pid: thisEnc.pid,
          actr: false,
          morale: false,
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

    //Sort Encounters on Enc/Opp then name
    encounters.sort(function (a, b) {
      let x = a.name;
      let y = b.name;
      let r = a.actr.system?.opportunity;
      let s = b.actr.system?.opportunity;
      if (r < s) {
        return -1;
      }
      if (r > s) {
        return 1;
      }
      if (x < y) {
        return -1;
      }
      if (x > y) {
        return 1;
      }
      return 0;
    });
    context.encounters = encounters;
    context.knights = knights;

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
    }
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
      if (collectionName === "encounters") {
        const encIndex = this.actor.system.encounters.findIndex((i) => itemId && i.uuid === itemId);
        if (encIndex > -1) {
          const encounters = this.actor.system.encounters ? foundry.utils.duplicate(this.actor.system.encounters) : [];
          encounters.splice(encIndex, 1);
          await this.actor.update({ "system.encounters": encounters });
        }
        return;
      }
      if (collectionName === "knights") {
        await this.actor.system.removeKnight(itemId);
        return;
      }
    }
  }

  //Change Battle Turn
  static async _battleTurn(event, target) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const change = Number(target.dataset.property);
    if (change + this.actor.system.currTurn < 1) {
      await this.actor.update({ "system.currTurn": 1 });
    } else if (change + this.actor.system.currTurn > this.actor.system.maxTurns) {
      await this.actor.update({
        "system.currTurn": this.actor.system.maxTurns,
      });
    } else {
      await this.actor.update({
        "system.currTurn": change + this.actor.system.currTurn,
      });
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

  //Reset Battle Posture for all Knights
  static async _resetPosture(event, target) {
    //Only perform on double click
    event.preventDefault();
    event.stopImmediatePropagation();
    const membersCollection = this.actor.toObject().system.knights;
    for (let actr of membersCollection) {
      let knight = await game.actors.get(actr);
      if (knight) {
        await knight.update({ "system.battlePos": 0 });
      }
    }
  }

  //Battle Intensity Roll
  static async _gmRoll(event, target) {
    event.preventDefault();
    event.stopImmediatePropagation();
    let property = target.dataset.property;
    let gmRollName = game.i18n.localize("PEN.battleIntensity");
    let gmRollScore = this.actor.system.intensity;
    if (property === "battle") {
      gmRollName = game.i18n.localize("PEN.battleScore");
      gmRollScore = this.actor.system.battleScore;
    }
    PENCheck._trigger({
      rollType: RollType.SKILL,
      cardType: CardType.UNOPPOSED,
      gmRollName,
      gmRollScore: this.actor.system.intensity,
      shiftKey: false,
      neutralRoll: true,
    });
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

  //Handle dropping of an Actor data onto another Actor sheet
  async _onDropActor(event, data) {
    if (!this.actor.isOwner) return false;
    await this.DropActor(data);
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
  async DropActor(data) {
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
      if (["encounter"].includes(newActor.type)) {
        const encounters = this.actor.system.encounters ? foundry.utils.duplicate(this.actor.system.encounters) : [];
        //Check encounter is not in encounters list
        if (encounters.find((el) => el.pid === npid)) {
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

        encounters.push({
          name: displayName,
          uuid: data.uuid,
          pid: newActor.flags?.Pendragon?.pidFlag?.id ?? "",
        });
        await this.actor.update({ "system.encounters": encounters });
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
}
