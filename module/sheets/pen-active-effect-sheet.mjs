import PENDialog from "../setup/pen-dialog.mjs";
import { PendragonActiveEffect } from "../apps/active-effects.mjs";

export class PENActiveEffectSheet {
  static getItemEffectsFromSheet(document) {
    let thisDocument = document.effects.reduce((c, i) => {
      c.push({
        id: i.id,
        uuid: i.uuid,
        name: i.name,
        isActive: i.active ?? false,
      });
      return c;
    }, []);
    return (document.items ?? []).reduce((c, i) => {
      for (const effect of i.effects) {
        c.push({
          id: effect.id,
          uuid: effect.uuid,
          name: effect.name,
          isActive: i.active ?? false,
        });
      }
      return c;
    }, thisDocument);
  }

  static getEffectChangesFromSheet(document) {
    const effectChanges = [];
    const effectKeys = foundry.utils.duplicate(CONFIG.PENDRAGON.keysActiveEffects);
    for (const effect of document.effects) {
      for (const change of effect.system.changes) {
        let effValue = change.value;
        if (typeof change.value === "number") {
          effValue = Math.abs(change.value);
        }
        effectChanges.push({
          key: change.key,
          name: game.i18n.localize(effectKeys[change.key] ?? change.key),
          negative: change.value < 0,
          type: game.i18n.localize("EFFECT.CHANGES.TYPES." + change.type),
          value: effValue,
          source: effect.name,
          itemSource: effect.parent.name,
        });
      }
    }
    return {
      effectChanges,
    };
  }

  static async getActorEffectsFromSheet(document) {
    const effectKeys = foundry.utils.duplicate(CONFIG.PENDRAGON.keysActiveEffects);
    const conditionIds = CONFIG.statusEffects.map((c) => c.id);
    let aEffects = this.getItemEffectsFromSheet(document);
    let effects = [];
    for (let eff of aEffects) {
      let penAE = await fromUuid(eff.uuid);
      if (penAE) {
        const sourceItem =
          penAE.parent.parent instanceof Item ? penAE.parent.parent : penAE.parent instanceof Item ? true : false;
        const sourceName =
          penAE.parent.parent instanceof Item
            ? penAE.parent.parent
            : penAE.parent instanceof Item
              ? penAE.parent.name + " (" + game.i18n.localize("TYPES.Item." + penAE.parent.type) + ")"
              : game.i18n.localize("PEN.direct");
        const container =
          penAE.parent.parent instanceof Item
            ? penAE.parent.parent
            : penAE.parent instanceof Item
              ? penAE.parent
              : penAE;
        let count = 0;
        for (let change of penAE.changes) {
          effects.push({
            id: container.id,
            sourceName: sourceName,
            effectName: penAE.name,
            sourceItem,
            key: change.key,
            name: game.i18n.localize(effectKeys[change.key] ?? change.key),
            value: change.value,
            type: game.i18n.localize("EFFECT.CHANGES.TYPES." + change.type),
            isActive: penAE.active ?? false,
            effUuid: eff.uuid,
            counter: count,
          });
          count++;
        }
      }
    }
    return effects;
  }

  static async getDirectEffectsFromSheet(document) {
    const effectList = await document.allApplicableEffects();
    const conditionIds = CONFIG.statusEffects.map((c) => c.id);
    const directEffects = [];
    for (const e of document.effects) {
      if (!conditionIds.includes(e.name)) directEffects.push(e);
    }
    return directEffects;
  }

  static activateListeners(document) {
    if (game.user.isGM) {
      document.element
        .querySelectorAll('div[data-action="openActiveEffect"]')
        .forEach((n) => n.addEventListener("click", PENActiveEffectSheet._onOpenActiveEffect.bind(document)));
      document.element
        .querySelectorAll('a[data-action="createEffect"]')
        .forEach((n) => n.addEventListener("click", PENActiveEffectSheet._onAddItemEffect.bind(document)));
    }
  }

  static async _onAddItemEffect(event) {
    this.document.createEmbeddedDocuments("ActiveEffect", [
      { name: ActiveEffect.defaultName({ parent: this.document }) },
    ]);
  }

  static async _onOpenActiveEffect(event) {
    const uuid = event.currentTarget.dataset.uuid;
    if (uuid) {
      const doc = await fromUuid(uuid);
      if (doc) {
        if (event.ctrlKey) {
          const confirmation = await PENDialog.confirm({
            window: {
              title: game.i18n.format("PEN.deleteDoc", {
                type: game.i18n.localize("DOCUMENT.ActiveEffect"),
              }),
            },
            content:
              game.i18n.localize("PEN.deleteConfirm") +
              "<br><strong> " +
              game.i18n.localize("DOCUMENT.ActiveEffect") +
              ": " +
              doc.name +
              "</strong>",
          });
          if (confirmation) {
            await doc.delete();
          }
        } else {
          doc.sheet.render({ force: true });
        }
      }
    }
  }

  static async _deleteChange(effUuid, counter) {
    const doc = await fromUuid(effUuid);
    if (doc) {
      let changes = doc.system.changes;
      changes.splice(counter, 1);
      await doc.update({ "system.changes": changes });
    }
    return;
  }
}
