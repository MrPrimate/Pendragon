import { PIDEditor } from "../../pid/pid-editor.mjs";

const { api, sheets } = foundry.applications;

export class PendragonActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  constructor(options = {}) {
    super(options);
  }
  // handle editPid action
  static _onEditPid(event) {
    event.stopPropagation(); // Don't trigger other events
    if (event.detail > 1) return; // Ignore repeated clicks
    new PIDEditor(this.actor, {}).render(true, { focus: true });
  }

  // adds the PID editor to the sheet frame
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

  _initTabs(group, tabNames) {
    const tabs = {};
    tabNames.forEach((name) => {
      tabs[name] = {
        cssClass: this.tabGroups[group] === name ? "active" : "",
        group,
        id: name,
        label: `PEN.${name}`,
      };
    });
    return tabs;
  }

  //Open Wiki Help Page
  static async _openWiki(event, target) {
    const url = target.dataset.property ?? "https://github.com/cragstone/Pendragon/wiki";
    window.open(url, "_blank");
  }

  //Create a Direct Active Effect
  static async _createEffect(event, target) {
    this.document.createEmbeddedDocuments("ActiveEffect", [
      { name: ActiveEffect.defaultName({ parent: this.document }) },
    ]);
  }

  //Clear All Direct Effects
  static async _clearEffects(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      const docs = this.document.effects.map((itm) => {
        return itm.id;
      });
      await ActiveEffect.deleteDocuments(docs, { parent: this.document });
    }
  }

  //Toggle Active Effect
  static async _toggleEffect(event, target) {
    const id = target.closest(".item-edit")?.dataset?.effectId;
    if (id) {
      const doc = this.document.effects.get(id);
      if (doc) {
        if (doc.isSuppressed) {
          doc.update({
            disabled: false,
            "duration.expired": false,
          });
        } else {
          doc.update({
            disabled: !doc.disabled,
          });
        }
      }
    }
  }

  //View Active Effect
  static async _viewActiveEffect(event, target) {
    const id = target.closest(".item-edit")?.dataset?.effectId;
    if (id) {
      const doc = this.document.effects.get(id);
      if (doc) {
        doc.sheet.render({ force: true });
      }
    }
  }

  //Delete Active Effect
  static async _deleteActiveEffect(event, target) {
    if (event.detail === 2) {
      const id = target.closest(".item-edit")?.dataset?.effectId;
      if (id) {
        const doc = this.document.effects.get(id);
        if (doc) {
          await doc.delete();
        }
      }
    }
  }
}
