import { PendragonActorSheet } from "./actor-sheet.mjs";
const { api, sheets } = foundry.applications;

export class PendragonPartySheet extends PendragonActorSheet {
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this._createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    classes: ["Pendragon", "sheet", "actor", "party"],
    position: {
      width: 1210,
      height: 180,
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
      template: "systems/Pendragon/templates/actor/party.header.hbs",
      scrollable: [""],
    },
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    //Common parts to the actor - this is the order they are show on the sheet
    options.parts = ["header"];
  }

  _getTabs(parts) {}

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;
    context.isGM = game.user.isGM;
    context.showHPVal = await game.settings.get("Pendragon", "showParty");
    if (game.user.isGM) {
      context.showHPVal = true;
    }

    //Prepare Party Members
    const members = [];

    // Not strictly items but get party members
    const memberList = await this.actor.system.getMembers();
    for (const { actor: member } of memberList) {
      let highScoreLabel = "";
      if (!member) {
        members.push({
          name: game.i18n.localize("PEN.invalid"),
          uuid: null,
          image: "icons/svg/mystery-man.svg",
          hpLabel: "0/0",
          hpPerc: "0%",
          highScoreLabel: highScoreLabel,
        });
      } else {
        let hpLabel = member.system.hp.value + "/" + member.system.hp.max;
        let hpPerc = Number((100 * member.system.hp.value) / member.system.hp.max) + "%";
        let bigScores = await member.items.filter((i) => ["skill", "passion", "trait"].includes(i.type));

        let tempList = [];
        for (let bScore of bigScores) {
          if (bScore.type === "skill" && bScore.system.total > 15) {
            tempList.push({
              name: bScore.name,
              value: bScore.system.total,
              priority: 3,
            });
          } else if (bScore.type === "passion" && bScore.system.total > 15) {
            tempList.push({
              name: bScore.name,
              value: bScore.system.total,
              priority: 2,
            });
          } else if (bScore.type === "trait" && bScore.system.total > 15) {
            tempList.push({
              name: bScore.name,
              value: bScore.system.total,
              priority: 1,
            });
          } else if (bScore.type === "trait" && bScore.system.total < 5) {
            tempList.push({
              name: bScore.system.oppName,
              value: bScore.system.oppvalue,
              priority: 1,
            });
          }
        }
        // Sort TempList to prioritise Traits, then Passions, then Skills
        tempList.sort(function (a, b) {
          let x = a.priority;
          let y = b.priority;
          let p = a.value;
          let q = b.value;
          if (x < y) {
            return -1;
          }
          if (x > y) {
            return 1;
          }
          if (p < q) {
            return 1;
          }
          if (p > q) {
            return -1;
          }

          return 0;
        });
        let count = 0;
        for (let tItm of tempList) {
          count++;
          if (count === 1) {
            highScoreLabel = highScoreLabel + tItm.name;
          } else {
            highScoreLabel = highScoreLabel + ", " + tItm.name;
          }
        }

        members.push({
          name: member.name,
          uuid: member.uuid,
          image: member.img,
          hpLabel: hpLabel,
          hpPerc: hpPerc,
          highScoreLabel: highScoreLabel,
        });
      }
    }
    //context.members = members.sort(function (a, b) {return a.name.localeCompare(b.name)});
    context.members = members;
    return context;
  }

  // -----------------------------------LISTENERS-----------------------------------------
  //Activate event listeners using the prepared sheet HTML
  _onRender(context, _options) {
    this.#dragDrop.forEach((d) => d.bind(this.element));
    this.element.querySelectorAll(".item-edit").forEach((n) => n.addEventListener("click", this.#viewItem.bind(this)));
    this.element
      .querySelectorAll(".viewFromUuid")
      .forEach((n) => n.addEventListener("click", this.#viewFromUuid.bind(this)));
    this.element
      .querySelectorAll(".deleteMember")
      .forEach((n) => n.addEventListener("dblclick", this.#deleteMember.bind(this)));
  }

  async #viewItem(event) {
    const li = $(ev.currentTarget).parents(".item");
    const item = this.actor.items.get(li.data("itemid"));
    if (item.type === "relationship") {
      this._updateRelationship(li.data("itemid"), item.system.person1Name);
      return;
    }
    item.sheet.render(true);
  }

  //View Party Member
  async #viewFromUuid(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const itemId = event.currentTarget.closest(".party-member").dataset.itemId;
    let viewDoc = await fromUuid(itemId);
    if (viewDoc) viewDoc.sheet.render(true);
  }

  //Delete a Party Member
  async #deleteMember(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const itemId = event.currentTarget.closest(".party-member").dataset.itemId;
    const member = await fromUuid(itemId);
    await this.actor.system.removeMember(member);
  }

  //Drop Actor on to an Actor Sheet
  async DropActor(data) {
    let newActor = await fromUuid(data.uuid);
    if (this.actor.type === "party" && ["character"].includes(newActor.type)) {
      // TODO: we need to do duplicate check in the data model
      // see dnd5e module/data/actor/group.mjs for example
      await this.actor.system.addMember(newActor);
      return;
    } else {
      ui.notifications.warn(
        game.i18n.format("PEN.cantDropActor", {
          itemType: game.i18n.localize("TYPES.Actor." + newActor.type),
          actorType: game.i18n.localize("TYPES.Actor." + this.actor.type),
        }),
      );
      return;
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

  //Dropping an actor on to character
  async _onDropActor(event, data) {
    event.preventDefault();
    if (!this.actor.isOwner) return false;
    await this.DropActor(data);
    return;
  }

  //Handle dropping of an item reference or item data onto an Actor Sheet
  async _onDropItem(event, data) {
    return false;
  }

  //Handle dropping of a Folder on an Actor Sheet.
  async _onDropFolder(event, data) {
    return false;
  }

  //Handle the final creation of dropped Item data on the Actor.
  async _onDropItemCreate(itemData, event) {
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
}
