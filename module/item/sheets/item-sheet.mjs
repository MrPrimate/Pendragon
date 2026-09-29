import { yearToPeriodName } from "../../apps/chronology.mjs";
import { PIDEditor } from "../../pid/pid-editor.mjs";
const { api, sheets } = foundry.applications;

export class PendragonItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  constructor(options = {}) {
    super(options);
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    //define button
    const sheetPID = this.item.flags?.Pendragon?.pidFlag;
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

  async _prepareContext(options) {
    return {
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      item: this.item,
      system: this.item.system,
      hasOwner: this.item.isEmbedded === true,
      isGM: game.user.isGM,
      fields: this.document.schema.fields,
      period: yearToPeriodName(this.item.system.yearAvailable),
      showHelp: game.settings.get("Pendragon", "showHelp"),
    };
  }

  /**
   * Handle changing a Document's image.
   *
   * @this PendragonItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  // handle editPid action
  static _onEditPid(event) {
    event.stopPropagation(); // Don't trigger other events
    if (event.detail > 1) return; // Ignore repeated clicks
    new PIDEditor(this.document, {}).render(true, { focus: true });
  }

  _initTabs(group, tabNames) {
    const tabs = {};
    tabNames.forEach((name) => {
      tabs[name] = {
        cssClass: this.tabGroups[group] === name ? "active" : "",
        group,
        id: name,
        label: `PEN.Tabs.${name}`,
      };
    });
    return tabs;
  }

  static _onCreateActiveEffect(event, target) {
    if (event.detail === 0) {
      return;
    }
    const cls = foundry.utils.getDocumentClass("ActiveEffect");
    cls.createDialog({}, { parent: this.document });
  }

  static async _onEditActiveEffect(event, target) {
    const { effectId } = target.closest("[data-effect-id]")?.dataset ?? {};
    const effect = this.item.effects.get(effectId);
    if (!effect) return;
    effect.sheet.render(true);
  }

  static _onDeleteActiveEffect(event, target) {
    const { effectId } = target.closest("[data-effect-id]")?.dataset ?? {};
    const effect = this.item.effects.get(effectId);
    if (!effect) return;
    effect.delete();
  }

  static _onToggleActiveEffect(event, target) {
    const { effectId } = target.closest("[data-effect-id]")?.dataset ?? {};
    const effect = this.item.effects.get(effectId);
    if (!effect) return;
    effect.update({ disabled: !effect.disabled });
  }

  //Update Skill/Passion Name
  static async skillChangeName(skill) {
    let newName = "";
    let specialName = skill.system.specName;
    if (skill.system.mainName === "") {
      await skill.update({
        "system.mainName": skill.name,
      });
    }
    if (skill.system.specialisation) {
      if (specialName === "") {
        specialName = game.i18n.localize("PEN.specify");
      }
      newName = skill.system.mainName + " (" + specialName + ")";
    } else {
      newName = skill.system.mainName;
    }
    if (skill.name != newName || skill.system.specName != specialName) {
      await skill.update({
        name: newName,
        "system.specName": specialName,
      });
    }
  }

  //Open Wiki Help Page
  static async _openWiki(event, target) {
    const url = target.dataset.property ?? "https://github.com/cragstone/Pendragon/wiki";
    window.open(url, "_blank");
  }
}
