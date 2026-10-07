import { PENCharCreate } from "../apps/charCreate.mjs";
import { PENCharCreateV2 } from "../apps/charCreateV2.mjs";
import { PENUtilities } from "../apps/utilities.mjs";
import PENDialog from "../setup/pen-dialog.mjs";

export class PENactorItemDrop {
  // Change default on Drop Item Create routine for requirements (single items and folder drop)-----------------------------------------------------------------
  static async _PENonDropItemCreate(actor, itemData) {
    const newItemData = [];
    itemData = itemData instanceof Array ? itemData : [itemData];
    //TODO: Consider adding a bypass to just create the items with no checks
    //      return actor.createEmbeddedDocuments("Item", itemData);
    for (let thisItem of itemData) {
      let dropItm = thisItem.toObject();
      //Don't allow items to be added to a party Actor
      if (actor.type === "party") {
        continue;
      }

      //Barony & Manors are only allowed to have Skills, Traits, Manorial Improvements or Background NPCs
      if (
        !["manorImp", "background", "skill", "trait"].includes(dropItm.type) &&
        ["manor", "barony"].includes(actor.type)
      ) {
        ui.notifications.warn(
          game.i18n.format("PEN.itemActormismatch", {
            itemType: game.i18n.localize("TYPES.Item." + dropItm.type),
            actorType: game.i18n.localize("TYPES.Actor." + actor.type),
          }),
        );
        continue;
      }

      //Only allow Manorial Improvements or Background NPCs on Manors and Baronies
      if (["manorImp", "background"].includes(dropItm.type) && !["manor", "barony"].includes(actor.type)) {
        ui.notifications.warn(
          game.i18n.format("PEN.itemActormismatch", {
            itemType: game.i18n.localize("TYPES.Item." + dropItm.type),
            actorType: game.i18n.localize("TYPES.Actor." + actor.type),
          }),
        );
        continue;
      }

      //Don't allow Baronial Improvements on a Manor
      if (dropItm.type === "manorImp" && ["manor"].includes(actor.type)) {
        if (["barInv"].includes(dropItm.system.subtype)) {
          ui.notifications.warn(
            game.i18n.format("PEN.itemActormismatch", {
              itemType: game.i18n.localize("PEN.manor." + dropItm.system.subtype),
              actorType: game.i18n.localize("TYPES.Actor.manor"),
            }),
          );
          continue;
        }
      }

      //Only allow Baronial Improvements or Defenses on a barony
      if (dropItm.type === "manorImp" && ["barony"].includes(actor.type)) {
        if (!["barInv", "def"].includes(dropItm.system.subtype)) {
          ui.notifications.warn(
            game.i18n.format("PEN.itemActormismatch", {
              itemType: game.i18n.localize("PEN.manor." + dropItm.system.subtype),
              actorType: game.i18n.localize("TYPES.Actor.barony"),
            }),
          );
          continue;
        }
      }

      //Don't drop complex items on Followers.  SHould just use the data entry
      if ((actor.type === "follower") & ["homeland", "culture", "class", "religion"].includes(dropItm.type)) {
        ui.notifications.warn(
          game.i18n.format("PEN.itemActormismatch", {
            itemType: game.i18n.localize("TYPES.Item." + dropItm.type),
            actorType: game.i18n.localize("TYPES.Actor." + actor.type),
          }),
        );
        continue;
      }

      //Only allow Archetypes on Characters
      if ((actor.type != "character") & ["archetype"].includes(dropItm.type)) {
        ui.notifications.warn(
          game.i18n.format("PEN.itemActormismatch", {
            itemType: game.i18n.localize("TYPES.Item." + dropItm.type),
            actorType: game.i18n.localize("TYPES.Actor." + actor.type),
          }),
        );
        continue;
      }

      let dropItmPID = dropItm.flags?.Pendragon?.pidFlag?.id;
      let reqResult = 1;
      let errMsg = "";

      //Automatically allow items in this list to be added
      if (!["gear", "armour", "weapon"].includes(dropItm.type)) {
        //Test for a duplicate item for certain types
        if (["culture", "homeland", "class", "religion", "archetype"].includes(dropItm.type)) {
          if (actor.items.filter((aItm) => aItm.type === dropItm.type).length > 0) {
            if (game.user.isGM && dropItm.type === "class") {
              let knighted = await PENactorItemDrop._getKnighted(actor, dropItm);
              reqResult = 0;
              if (!knighted) {
                errMsg = game.i18n.format("PEN.dupItemType", {
                  name: game.i18n.localize("PEN.Entities." + `${dropItm.type.capitalize()}`),
                });
              }
            } else {
              reqResult = 0;
              errMsg = game.i18n.format("PEN.dupItemType", {
                name: game.i18n.localize("PEN.Entities." + `${dropItm.type.capitalize()}`),
              });
            }
          }
        }

        //Check Dropped item has a PID, if not then don't add it
        if (!dropItmPID) {
          ui.notifications.warn(game.i18n.format("PEN.PIDFlag.noPIDFlag", { itemName: dropItm.name }));
          continue;
        }

        //Test for a duplicate named item for certain types
        if (["skill", "trait", "passion", "ideal"].includes(dropItm.type)) {
          if (["manor", "barony"].includes(actor.type) && dropItm.type === "skill") {
            if (
              actor.items
                .filter((aItm) => aItm.type === dropItm.type && aItm.name === dropItm.name)
                .filter((aItm) => aItm.system.npcSource === "").length > 0
            ) {
              reqResult = 0;
              errMsg = game.i18n.format("PEN.dupItemName", {
                name: dropItm.name,
                type: game.i18n.localize("PEN.Entities." + `${dropItm.type.capitalize()}`),
              });
            }
          } else {
            if (actor.items.filter((aItm) => aItm.type === dropItm.type && aItm.name === dropItm.name).length > 0) {
              reqResult = 0;
              errMsg = game.i18n.format("PEN.dupItemName", {
                name: dropItm.name,
                type: game.i18n.localize("PEN.Entities." + `${dropItm.type.capitalize()}`),
              });
            }
          }
        }
      }
      //Check to see if we can drop the Item
      if (reqResult != 1) {
        if (errMsg != "") {
          ui.notifications.warn(errMsg);
        }
      } else {
        //If a skill calculate the base score
        let score = 0;
        if (dropItm.type === "skill" && !["manor", "barony"].includes(actor.type)) {
          score = dropItm.system.base.mod;
          if (dropItm.system.base.stat != "none" && dropItm.system.base.stat != "") {
            score =
              Number(score) +
              Number(
                Math.round(
                  (actor.system.stats[dropItm.system.base.stat].value +
                    actor.system.stats[dropItm.system.base.stat].culture) *
                    dropItm.system.base.multi,
                ),
              );
          }
          score = Math.max(score, 0);
          dropItm.system.value = score;
        }

        //If a specialised skill or passion with no specName or the default, then ask for name.
        if (["skill", "passion"].includes(dropItm.type)) {
          let specify = game.i18n.localize("PEN.specify");
          if (
            dropItm.system.specialisation &&
            (dropItm.system.specName === "" || dropItm.system.specName === specify)
          ) {
            dropItm = await this._getSpecialism(foundry.utils.duplicate(dropItm), actor);
          }
        }

        //If Baronial Improvement, add any associated staff
        if (["manorImp"].includes(dropItm.type)) {
          if (dropItm.system.subtype === "barInv") {
            for (let newBack of dropItm.system.npcs) {
              let nItm = await game.system.api.pid.fromPIDBest({ pid: newBack.pid });
              if (nItm.legnth < 1) {
                continue;
              }
              let cloneData = nItm[0].toObject();
              newItemData.push(cloneData);
            }
          }
        }

        newItemData.push(dropItm);
        //If successfully pushed are there any special rules needed to be applied
        if (dropItm.type === "culture") {
          await PENCharCreateV2.addCulture(actor, dropItm);
        } else if (dropItm.type === "homeland") {
          await PENCharCreateV2.addHomeland(actor, dropItm);
        } else if (dropItm.type === "class") {
          await PENCharCreateV2.addClass(actor, dropItm, true, true, true);
        } else if (dropItm.type === "religion") {
          await PENCharCreateV2.addReligion(actor, dropItm);
        } else if (dropItm.type === "archetype") {
          await PENCharCreateV2.addArchetype(actor, dropItm, true);
        }
      }
    }
    return newItemData;
  }

  static async _getSpecialism(newSkill) {
    let title = game.i18n.format("PEN.getSpecialism", { entity: newSkill.name });
    let specName = await new Promise((resolve) => {
      const dlg = new Dialog(
        {
          title: title,
          content: `<input class="centre" type="text" name="entry">`,
          buttons: {
            roll: {
              label: game.i18n.localize("PEN.confirm"),
              callback: (html) => {
                let inpB = html.find('[name="entry"]').val();
                resolve(inpB);
              },
            },
          },
          default: "roll",
          close: () => {},
        },
        { classes: ["Pendragon", "sheet"] },
      );
      dlg.render(true);
    });

    if (specName === "") {
      specName = game.i18n.localize("PEN.specify");
    }

    newSkill.system.specName = specName;
    newSkill.name = newSkill.system.mainName + " (" + specName + ")";
    newSkill.flags.Pendragon.pidFlag.id = "i.skill." + (await PENUtilities.toKebabCase(newSkill.name));
    return newSkill;
  }

  static async _getKnighted(actor, newClass) {
    let choice = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("PEN.changeClass") },
      content: game.i18n.localize("PEN.changeClassHint"),
    });
    if (choice) {
      let classes = await actor.items
        .filter((itm) => ["class"].includes(itm.type))
        .map((itm) => {
          return itm.id;
        });
      await Item.deleteDocuments(classes, { parent: actor });
      let newItems = [];
      //Add Class Item to newItems array
      newItems.push(newClass);
      //Add Class Gear to newItems array
      for (let newItm of newClass.system.gear) {
        let nItm = await game.system.api.pid.fromPIDBest({ pid: newItm.pid });
        if (nItm.length > 0) {
          newItems.push(nItm[0]);
        }
      }
      //Create Item classes & Update Source
      let classItems = await Item.createDocuments(newItems, { parent: actor });
      //let classItems = await actor.createEmbeddedDocuments("Item", newItems)
      let updateItems = classItems.map((itm) => {
        return { _id: itm.id, "system.source": "class" };
      });
      await Item.updateDocuments(updateItems, { parent: actor });
    }

    return choice;
  }

  static async _addBackgroundSkill(actor, background) {
    let newSkills = [];
    let maxScore = 0;
    for (let newSkill of background.system.skills) {
      let nItm = await game.system.api.pid.fromPIDBest({ pid: newSkill.pid });
      if (nItm.legnth < 1) {
        continue;
      }
      let cloneData = nItm[0].toObject();
      cloneData.system.npcSource = background.uuid;
      let formula = newSkill.score;
      if (formula[0] === "-") {
        formula = formula.slice(1);
        if (cloneData.type === "trait") {
          let tempName = cloneData.system.oppName;
          cloneData.system.oppName = cloneData.name;
          cloneData.name = tempName;
        }
      }

      let roll = new Roll(formula);
      await roll.evaluate();
      cloneData.system.value = roll.total;
      newSkills.push(cloneData);
      if (roll.total > maxScore) {
        maxScore = roll.total;
      }
    }
    //Add the new skills with the random rolled scores
    if (newSkills.length > 0) {
      const list = await actor.createEmbeddedDocuments("Item", newSkills);
    }
    return;
  }

  static async _addAcquiredYear(improvement) {
    //If a ManorImp where there is income ask for the year of creation
    let inpVal = await PENDialog.input({
      window: { title: game.i18n.localize("PEN.manor.enterYear") },
      content: `<input class="centre" type="number" name="inpvalue">`,
    });
    if (inpVal) {
      await improvement.update({ "system.yearAcquired": inpVal.inpvalue });
    }
    return;
  }
}
