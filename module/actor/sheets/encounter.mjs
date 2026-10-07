const { api, sheets } = foundry.applications;
import { PendragonActor } from "../actor.mjs";
import { PendragonActorSheet } from "./actor-sheet.mjs";
import PENDialog from "../../setup/pen-dialog.mjs";

export class PendragonEncounterSheet extends PendragonActorSheet {
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this._createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    classes: ["Pendragon", "sheet", "actor", "encounter"],
    position: {
      width: 400,
      height: 550,
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
      deleteNPC: this._deleteNPC,
      viewNPC: this._viewFromUuid,
      addToken: this._addToken,
      moraleloss: this._moraleLoss,
    },
  };

  static PARTS = {
    header: {
      template: "systems/Pendragon/templates/actor/encounter.header.hbs",
      scrollable: [""],
    },
    notes: {
      template: "systems/Pendragon/templates/actor/encounter.notes.hbs",
      scrollable: [""],
    },
    npc: {
      template: "systems/Pendragon/templates/actor/encounter.npc.hbs",
      scrollable: [""],
    },
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    //Common parts to the character - this is the order they are show on the sheet
    options.parts = ["header", "notes", "npc"];
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
    context.showHPVal = await game.settings.get("Pendragon", "showParty");
    context.showNPC = this.actor.system.npcView;
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

    let npcs = [];
    for (let thisNPC of this.actor.system.npcs) {
      let displayName = thisNPC.name;
      let npc = (await game.system.api.pid.fromPIDBest({ pid: thisNPC.pid }))[0];
      //If no hit on PID then use UUID
      if (!npc) {
        npc = await fromUuid(thisNPC.uuid);
      }

      if (npc) {
        let skills = "";
        let armour = "";
        for (let itm of npc.items) {
          if (["skill", "trait", "passion"].includes(itm.type)) {
            let label = itm.name + " " + itm.system.total;
            if (skills.length === 0) {
              skills = skills + label;
            } else {
              skills = skills + ", " + label;
            }
          } else if (itm.type === "armour") {
            if (armour.length === 0) {
              armour = armour + itm.name;
            } else {
              armour = armour + ", " + itm.name;
            }
          }
          if (displayName === "") displayName = npc.name;
        }
        npcs.push({
          name: displayName,
          uuid: thisNPC.uuid,
          pid: thisNPC.pid,
          actr: npc,
          skills: skills,
          armour: armour,
        });
      } else {
        npcs.push({
          name: thisNPC.name + " [" + game.i18n.localize("PEN.invalid") + "]",
          uuid: thisNPC.uuid,
          pid: thisNPC.pid,
          actr: false,
          skills: "",
          armour: "",
        });
      }
    }
    context.npcs = npcs;
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
    await this.render["notes"];
  }

  static async _onToggleActor(event, target) {
    //Only perform on double click
    event.stopPropagation(); // Don't trigger other events
    let checkProp = {};
    let prop = target.dataset.property;
    if (["lock", "opportunity", "used"].includes(prop)) {
      checkProp = { [`system.${prop}`]: !this.actor.system[prop] };
    } else {
      return;
    }
    this.actor.update(checkProp);
  }

  //Delete an NPC from encounter
  static async _deleteNPC(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      event.preventDefault();
      event.stopImmediatePropagation();
      const itemId = target.closest(".partic-cell").dataset.property;
      const npcIndex = this.actor.system.npcs.findIndex((i) => itemId && i.uuid === itemId);
      if (npcIndex > -1) {
        const npcs = this.actor.system.npcs ? foundry.utils.duplicate(this.actor.system.npcs) : [];
        npcs.splice(npcIndex, 1);
        await this.actor.update({ "system.npcs": npcs });
      }
    }
  }

  //View NPC details
  static async _viewFromUuid(event, target) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const npcIndex = Number(target.closest(".partic-cell").dataset.index);
    const itemId = target.closest(".partic-cell").dataset.property;
    if (npcIndex === this.actor.system.npcView) {
      await this.actor.update({ "system.npcView": 99 });
    } else {
      await this.actor.update({ "system.npcView": npcIndex });
    }
    await this.render["npc"];
  }

  //Add Tokens to Current Scene
  static async _addToken(event, target) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const itemId = target.closest(".partic-cell").dataset.property;
    const pid = target.closest(".partic-cell").dataset.pid;
    const npcIndex = Number(target.closest(".partic-cell").dataset.index);
    let count = target.dataset.count;
    let encNPC = this.actor.system.npcs.find((i) => itemId && i.uuid === itemId);
    //Check Scene is present
    if (!canvas.scene) {
      ui.notifications.error(game.i18n.localize("PEN.noScene"));
      return;
    }

    let actor = (await game.system.api.pid.fromPIDBest({ pid: pid }))[0];
    if (!actor) {
      actor = await fromUuid(itemId);
      if (!actor) {
        ui.notifications.error(game.i18n.format("PEN.actorNotFound", { type: pid }));
        return;
      }
    }

    // Check actor exists in the game world and if not create it
    let tempActor = await game.actors.filter(
      (actr) =>
        actr.flags?.Pendragon?.pidFlag?.id === actor.flags?.Pendragon?.pidFlag?.id &&
        actr.flags?.Pendragon?.pidFlag?.priority === actor.flags?.Pendragon?.pidFlag?.priority,
    )[0];
    if (tempActor) {
      actor = tempActor;
    } else {
      tempActor = await PendragonActor.create(actor);
      actor = tempActor;
    }

    let newTokens = [];
    let current = (await game.canvas.scene.tokens.filter((t) => t.actorId === actor.id)).length;
    let placeY = 800;
    for (let yc = 1540; yc <= 2940; yc = yc + 280) {
      let occupied = (await game.canvas.scene.tokens.filter((t) => t.y === yc)).length;
      if (occupied === 0) {
        placeY = yc;
        yc = 3000;
      }
    }

    for (let ctr = 1; ctr <= count; ctr++) {
      let counter = ctr + current;
      let tokenLabel = encNPC.name ?? actor.name;
      let tokenName = tokenLabel + "(" + counter + ")";
      // Define token data
      const tokenData = {
        name: tokenName,
        actorId: actor.id,
        x: 1260 + 280 * ctr, // X position in pixels
        y: placeY, // Y position in pixels
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE, // Hostile, Neutral, Friendly
        displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
        lockRotation: true,
        vision: true,
        actorLink: false,
        texture: {
          src: actor.prototypeToken.texture.src,
        },
        ring: {
          enabled: actor.prototypeToken.ring.enabled,
          subject: {
            texture: actor.prototypeToken.ring.subject.texture,
          },
        },
      };
      newTokens.push(tokenData);
    }
    // Create the token in the current scene
    await canvas.scene.createEmbeddedDocuments("Token", newTokens);
  }

  //Roll Morale Loss
  static async _moraleLoss(event, target) {
    if (!Roll.validate(this.actor.system.moraleLoss)) {
      ui.notifications.error(
        game.i18n.format("PEN.formulaError", {
          formula: this.actor.system.moraleLoss,
        }),
      );
      return;
    }
    let roll = new Roll(this.actor.system.moraleLoss);
    await roll.evaluate();
    await roll.toMessage({
      flavor:
        "<strong style='color:black; font-size:14px; font-family:`Signika`;'>" +
        game.i18n.localize("PEN.moraleLoss") +
        ": " +
        this.actor.name +
        "</strong>",
    });
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
    if (["npc"].includes(newActor.type)) {
      const npcs = this.actor.system.npcs ? foundry.utils.duplicate(this.actor.system.npcs) : [];
      //Check npc is not in npc list
      if (npcs.find((el) => el.pid === npid)) {
        ui.notifications.warn(game.i18n.localize("PEN.dupNPC"));
        return;
      }
      let displayName = newActor.name;
      let msg = game.i18n.localize("PEN.npcName");
      let inpVal = await PENDialog.input({
        window: { title: game.i18n.localize("TYPES.Actor.npc") },
        content: `<p>` + msg + `</p><p><input class="centre" type="text" name="inpvalue"></p>`,
      });
      if (inpVal && inpVal.inpvalue != "") {
        displayName = inpVal.inpvalue;
      }

      npcs.push({
        name: displayName,
        uuid: data.uuid,
        pid: newActor.flags?.Pendragon?.pidFlag?.id ?? "",
      });
      await this.actor.update({ "system.npcs": npcs });
    } else {
      ui.notifications.warn(game.i18n.format("PEN.cantDropActor"));
      return;
    }
  }
}
