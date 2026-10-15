import { WieldState } from "../models/items/weapon_model.mjs";

/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs.
 * @param {object} [options={}]
 * @param {boolean} [options.bypassVersionCheck=false]  Bypass certain migration restrictions gated behind system
 *                                                      version stored in item stats.
 * @returns {Promise}      A Promise which resolves once the migration is completed
 */
export async function migrateWorld({ bypassVersionCheck = false } = {}) {
  const currentVersion = game.settings.get("Pendragon", "systemMigrationVersion");
  const targetVersion = game.system.version;
  console.log(`Migrate from ${currentVersion} to ${targetVersion}`);

  //Migrate if current system is less that Version 13.1.36
  if (foundry.utils.isNewerVersion("13.1.36", currentVersion ?? "0")) {
    await migrateItems_13136();
  }

  //Migrate if current system is less that Version 13.1.57
  if (foundry.utils.isNewerVersion("13.1.57", currentVersion ?? "0")) {
    await honorUpdate();
  }

  //Migrate if current system is less that Version 13.1.58
  if (foundry.utils.isNewerVersion("13.1.58", currentVersion ?? "0")) {
    await classIdealUpdate();
  }

  //Migrate if current system is less that Version 14.5
  if (foundry.utils.isNewerVersion("14.5", currentVersion ?? "0")) {
    await gameTimeUpdate();
  }

  //Migrate if current system is less that Version 14.17
  if (foundry.utils.isNewerVersion("14.17", currentVersion ?? "0")) {
    //Repeat some checks on each updates
    //Encounter and Battle migrations
    console.log("Migration to 14.17 started");
    const updates = await getUpdatesFor(game.actors);
    if (updates.length) {
      await Actor.updateDocuments(updates);
    }

    for (const pack of game.packs) {
      if (!_shouldMigrateCompendium(pack)) {
        continue;
      }
      if (pack.metadata.type === "Actor") {
        const documents = await pack.getDocuments();
        const updates = await getUpdatesFor(documents);
        if (updates.length) {
          const wasLocked = pack.locked;
          if (wasLocked) {
            await pack.configure({ locked: false });
          }
          await Actor.updateDocuments(updates, { pack: pack.metadata.id });
          if (wasLocked) {
            await pack.configure({ locked: true });
          }
        }
      }
    }
    console.log("Migration to 14.17 completed");
  }

  //Migrate if current system is less than Version 14.21
  if (foundry.utils.isNewerVersion("14.21", currentVersion ?? "0")) {
    await equippedHandsUpdate();
  }

  //Migrate if current system is less than Version 14.23
  if (foundry.utils.isNewerVersion("14.23", currentVersion ?? "0")) {
    console.log("Migration to 14.23 started");
    await squireBornUpdate();
    await familyRelationUpdate();
    console.log("Migration to 14.23 completed");
  }

  await game.settings.set("Pendragon", "systemMigrationVersion", targetVersion);
  return;
}

//Populate equippedHands from existing shield and currentWeapon data
export async function equippedHandsUpdate() {
  console.log("Migration to 14.21 started");
  for (const actor of game.actors) {
    if (actor.type !== "character") continue;
    const updateData = equippedHandsUpdateData(actor);
    if (!foundry.utils.isEmpty(updateData)) {
      await actor.update(updateData);
    }
  }
  // Migrate Items in Scenes [Token] Actors
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink) continue;
      const actor = token.actor;
      if (!actor || actor.type !== "character") continue;
      const updateData = equippedHandsUpdateData(actor);
      if (!foundry.utils.isEmpty(updateData)) {
        await actor.update(updateData);
      }
    }
  }
  console.log("Migration to 14.21 completed");
}

//Save the birth year of squires - their age is now calculated from it rather than increased each Winter Phase
//Squires saved before the birth year existed have it calculated from their stored age on each load, so it
//moves with the game year (and the squire never ages) until it is saved
export async function squireBornUpdate() {
  console.log("Squire update started");
  for (const actor of game.actors) {
    if (actor.type !== "character") continue;
    await squireBornUpdateItems(actor, actor.items);
  }
  // Migrate squires held on unlinked Scene Tokens
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink) continue;
      const actor = token.actor;
      if (!actor || actor.type !== "character") continue;
      //Only squires stored on the token itself - the rest come from the already migrated base actor
      const deltaIds = new Set((token.delta?._source.items ?? []).map((itm) => itm._id));
      await squireBornUpdateItems(
        actor,
        actor.items.filter((itm) => deltaIds.has(itm.id)),
      );
    }
  }
  console.log("Squire update complete");
}

//Change family relationship data for more detailed entries
//If female/femme use female version otherwise assume male.
export async function familyRelationUpdate() {
  console.log("Family Relationship update started");
  for (let actor of game.actors) {
    if (actor.type != "character") continue;
    let family = await actor.items.filter((itm) => itm.type === "family");
    if (family.length < 1) continue;
    let updates = [];
    for (let item of family) {
      let gender = item.system.gender.toLowerCase();
      let relation = "";
      switch (item.system.relation) {
        case "parent":
          relation = "father";
          if (["female", "femme"].includes(gender)) relation = "mother";
          break;
        case "grandparent":
          relation = "grandfather";
          if (["female", "femme"].includes(gender)) relation = "grandmother";
          break;
        case "sibling":
          relation = "brother";
          if (["female", "femme"].includes(gender)) relation = "sister";
          break;
        case "pibling":
          relation = "uncle";
          if (["female", "femme"].includes(gender)) relation = "aunt";
          break;
        case "child":
          relation = "son";
          if (["female", "femme"].includes(gender)) relation = "daughter";
          break;
        case "grandchild":
          relation = "grandson";
          if (["female", "femme"].includes(gender)) relation = "granddaughter";
          break;
        default:
          continue;
          break;
      }
      if (relation != "") {
        updates.push({ _id: item.id, "system.relation": relation });
      }
    }
    await Item.updateDocuments(updates, { parent: actor });
  }
  console.log("Family Relationship update complete");
}

async function squireBornUpdateItems(actor, items) {
  const updates = items
    .filter((itm) => itm.type === "squire")
    .map((itm) => ({ _id: itm.id, "system.born": itm.system.born }));
  if (updates.length > 0) {
    //The birth year already holds the calculated value in memory, so without diff: false the update is skipped as unchanged
    await Item.updateDocuments(updates, { parent: actor, diff: false });
  }
}

//populate equippedHands from the equipped shield and currentWeapon flag, then retire the
//flag (the hands are authoritative from now on)
function equippedHandsUpdateData(actor) {
  const hands = { primary: "", secondary: "" };
  const items = [];
  const shield = actor.items.find((i) => i.type === "armour" && i.system.equipped && !i.system.type);
  if (shield) {
    hands.secondary = shield.id;
  }
  //read the legacy flag directly; currentWeapon() is now derived from the hands
  const flaggedId = actor.getFlag("Pendragon", "currentWeapon");
  const weapon = flaggedId ? actor.items.get(flaggedId) : null;
  if (weapon?.type === "weapon") {
    hands.primary = weapon.id;
    if (weapon.system.twoHandedOnly) {
      //lances may be wielded one-handed beside a shield; other two-handers take both hands
      if (!(shield && weapon.system.skill === "charge")) {
        hands.secondary = weapon.id;
        if (shield) items.push({ _id: shield.id, "system.equipped": false });
      }
    }
  }
  const current = actor.system.equippedHands ?? {};
  const updateData = {};
  if (current.primary !== hands.primary || current.secondary !== hands.secondary) {
    updateData["system.equippedHands.primary"] = hands.primary;
    updateData["system.equippedHands.secondary"] = hands.secondary;
  }
  //a weapon left in no hand is carried (sheathed or at the side)
  for (const item of actor.items) {
    if (item.type !== "weapon") continue;
    const inPrimary = hands.primary === item.id;
    const inSecondary = hands.secondary === item.id;
    let wield = WieldState.CARRIED;
    if (inPrimary && inSecondary) wield = WieldState.TWO_HANDED;
    else if (inPrimary || inSecondary) wield = WieldState.PRIMARY_HAND;
    if (wield !== item.system.wield) items.push({ _id: item.id, "system.wield": wield });
  }
  if (items.length) updateData.items = items;
  //clear the retired flag (setting a flag to null removes it)
  if (flaggedId) updateData["flags.Pendragon.currentWeapon"] = null;
  return updateData;
}

//------------------------------------------------------------------------------------------
//Update for version 13.1.36
export async function migrateItems_13136() {
  console.log("Migration to 13.1.36");
  const updateData = {};
  // Migrate World Items
  const items = game.items.filter((itm) => itm.type === "skill");
  for (let item of items) {
    await migrateItemData_13136(item);
  }

  //Migrate Actor Items
  for (let actor of game.actors) {
    const actoritems = actor.items.filter((itm) => itm.type === "skill");
    for (let item of actoritems) {
      await migrateItemData_13136(item);
    }
  }

  // Migrate Items in Scenes [Token] Actors
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink) {
        continue;
      }
      let tokenitems = token.delta.items.filter((itm) => itm.type === "skill");
      for (let item of tokenitems) {
        await migrateItemData_13136(item);
      }
    }
  }

  //Migrate Compendium Packs
  for (const pack of game.packs) {
    if (!_shouldMigrateCompendium(pack)) {
      continue;
    }
    // Unlock the pack for editing
    const wasLocked = pack.locked;
    await pack.configure({ locked: false });
    // Begin by requesting server-side data model migration and get the migrated content
    const documents = await pack.getDocuments();
    for (let doc of documents) {
      switch (pack.documentName) {
        case "Actor":
          break;
        case "Item":
          await migrateItemData_13136(doc);
          break;
        case "Scene":
          break;
      }
    }
    await pack.configure({ locked: wasLocked });
  }
}

//------------------------------------------------------------------------------------------
export async function migrateItemData_13136(item) {
  //If categories already set then don't migrate
  if ((item.system.categories ?? []).length > 0) {
    return;
  }
  const updateData = [];
  if (item.system.combat) {
    updateData.push("combat");
  }
  if (item.system.nonknightly) {
    updateData.push("nonknightly");
  }
  await item.update({ "system.categories": updateData });
  return;
}

/**
 * Determine whether a compendium pack should be migrated during `migrateWorld`.
 * @param {Compendium} pack
 * @returns {boolean}
 */
function _shouldMigrateCompendium(pack) {
  // We only care about actor, item or scene migrations
  if (!["Actor", "Item", "Scene"].includes(pack.documentName)) return false;

  // World compendiums should all be migrated, system ones should never by migrated
  if (pack.metadata.packageType === "world") return true;
  if (pack.metadata.packageType === "system") return false;

  // Module compendiums should only be migrated if they don't have a download or manifest URL
  const module = game.modules.get(pack.metadata.packageName);
  return !module.download && !module.manifest;
}

export async function honorUpdate() {
  console.log("Migration to 13.1.57 started");
  //Update World Items
  for (let item of game.items) {
    if (item.type != "passion") {
      continue;
    }
    if (item.flags.Pendragon?.pidFlag?.id === "i.passion.honour") {
      await item.update({ "flags.Pendragon.pidFlag.id": "i.passion.honor" });
    }
  }

  //Update Items in World Actors
  for (let actor of game.actors) {
    for (let item of actor.items) {
      if (item.type != "passion") {
        continue;
      }
      if (item.flags.Pendragon?.pidFlag?.id === "i.passion.honour") {
        await item.update({ "flags.Pendragon.pidFlag.id": "i.passion.honor" });
      }
    }
  }

  // Update Items in  Scenes [Token] Actors
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink) {
        continue;
      }
      for (let item of token.delta.items) {
        if (item.type != "passion") {
          continue;
        }
        if (item.flags.Pendragon?.pidFlag?.id === "i.passion.honour") {
          await item.update({ "flags.Pendragon.pidFlag.id": "i.passion.honor" });
        }
      }
    }
    return;
  }

  //Migrate Compendium Packs
  for (const pack of game.packs) {
    if (!_shouldMigrateCompendium(pack)) {
      continue;
    }
    // Unlock the pack for editing
    const wasLocked = pack.locked;
    await pack.configure({ locked: false });
    // Begin by requesting server-side data model migration and get the migrated content
    const documents = await pack.getDocuments();
    for (let doc of documents) {
      switch (pack.documentName) {
        case "Actor":
          for (let item of doc.items) {
            if (item.type != "passion") {
              continue;
            }
            if (item.flags.Pendragon?.pidFlag?.id === "i.passion.honour") {
              await item.update({ "flags.Pendragon.pidFlag.id": "i.passion.honor" });
            }
          }
        case "Item":
          if (doc.type === "passion") {
            if (doc.flags.Pendragon?.pidFlag?.id === "i.passion.honour") {
              await doc.update({ "flags.Pendragon.pidFlag.id": "i.passion.honor" });
            }
          }
          break;
        case "Scene":
          break;
      }
    }
    await pack.configure({ locked: wasLocked });
  }
  console.log("Migration to 13.1.57 completed");
}

//------------------------------------------------------------------------------------------
export async function classIdealUpdate() {
  console.log("Migration to 13.1.58 started");
  //Update World Items
  for (let item of game.items) {
    if (item.type === "class") {
      let newPassions = [];
      const coll = item.system.passions ?? [];
      for (let passion of coll) {
        if (passion.pid === "i.passion.honour") {
          passion.pid = "i.passion.honor";
        }
        newPassions.push(passion);
      }
      await item.update({ "system.passions": newPassions });
    } else if (item.type === "ideal") {
      let newPassions = [];
      const coll = item.system.require ?? [];
      for (let passion of coll) {
        if (passion.pid === "i.passion.honour") {
          passion.pid = "i.passion.honor";
        }
        newPassions.push(passion);
      }
      await item.update({ "system.require": newPassions });
    }
  }

  //Migrate Compendium Packs
  for (const pack of game.packs) {
    if (!_shouldMigrateCompendium(pack)) {
      continue;
    }
    // Unlock the pack for editing
    const wasLocked = pack.locked;
    await pack.configure({ locked: false });
    // Begin by requesting server-side data model migration and get the migrated content
    const documents = await pack.getDocuments();
    for (let doc of documents) {
      switch (pack.documentName) {
        case "Actor":
          break;
        case "Item":
          if (doc.type === "class") {
            let newPassions = [];
            const coll = doc.system.passions ?? [];
            for (let passion of coll) {
              if (passion.pid === "i.passion.honour") {
                passion.pid = "i.passion.honor";
              }
              newPassions.push(passion);
            }
            await doc.update({ "system.passions": newPassions });
          } else if (doc.type === "ideal") {
            let newPassions = [];
            const coll = doc.system.require ?? [];
            for (let passion of coll) {
              if (passion.pid === "i.passion.honour") {
                passion.pid = "i.passion.honor";
              }
              newPassions.push(passion);
            }
            await doc.update({ "system.require": newPassions });
          }
          break;
        case "Scene":
          break;
      }
      await pack.configure({ locked: wasLocked });
    }
  }
  console.log("Migration to 13.1.58 completed");
}

//------------------------------------------------------------------------------------------
export async function gameTimeUpdate() {
  console.log("Migration to 14.5 started");

  let year = game.settings.get("Pendragon", "gameYear");
  await game.time.set({ year: year });
  await game.Pendragon.ui?.calendar.render({ force: true });
  return;
}

//------------------------------------------------------------------------------------------
//Update Encounters for 14.17
export async function getUpdatesFor(source) {
  const updates = [];
  for (const actor of source) {
    if (actor.type === "encounter") {
      let changed = false;
      const npcs = [];
      for (const npc of actor.system.npcs) {
        if (npc.migrateRequired) {
          let tempActor = await fromUuid(npc.uuid);
          if (tempActor) {
            let newName = npc.name ?? "";
            let newPid = npc.pid;
            if (newName === "") newName = tempActor.name;
            if (newPid === "") newPid = tempActor.flags?.Pendragon?.pidFlag?.id ?? "";
            npcs.push({
              name: newName,
              pid: newPid,
              uuid: npc.uuid,
            });
            changed = true;
          } else {
            npcs.push(npc);
          }
        } else {
          npcs.push(npc);
        }
      }
      if (changed) {
        updates.push({
          _id: actor.id,
          "system.npcs": npcs,
        });
      }
    }
    if (actor.type === "battle") {
      let changed = false;
      const encounters = [];
      for (const encounter of actor.system.encounters) {
        if (encounter.migrateRequired) {
          let tempActor = await fromUuid(encounter.uuid);
          if (tempActor) {
            let newName = encounter.name ?? "";
            let newPid = encounter.pid;
            if (newName === "") newName = tempActor.name;
            if (newPid === "") newPid = tempActor.flags?.Pendragon?.pidFlag?.id ?? "";
            encounters.push({
              name: newName,
              pid: newPid,
              uuid: encounter.uuid,
            });
            changed = true;
          } else {
            encounters.push(encounter);
          }
        } else {
          encounters.push(encounter);
        }
      }
      if (changed) {
        updates.push({
          _id: actor.id,
          "system.encounters": encounters,
        });
      }
    }
  }
  return updates;
}
