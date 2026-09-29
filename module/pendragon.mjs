import { PendragonActor } from "./actor/actor.mjs";
import { PendragonItem } from "./item/item.mjs";
import { PendragonCombat } from "./combat/combat.mjs";
import { PendragonCombatant } from "./combat/combatant.mjs";
import { PENDRAGON } from "./setup/config.mjs";
import { handlebarsHelper } from "./setup/handlebar-helper.mjs";
import { PendragonHooks } from "./hooks/index.mjs";
import { registerSettings } from "./settings/register-settings.mjs";
import { PENLayer } from "./setup/layers.mjs";
import { PENSystemSocket } from "./apps/socket.mjs";
import * as Chat from "./apps/chat.mjs";
import { PENRollType } from "./cards/rollType.mjs";
import { migrateWorld } from "./setup/migrations.mjs";
import { PendragonCombatTracker } from "./apps/combat-tracker.mjs";
import { PendragonStatusEffects } from "./apps/status-effects.mjs";
import { PIDEditor } from "./pid/pid-editor.mjs";
import {
  CharacterData,
  NpcData,
  FollowerData,
  PartyData,
  EncounterData,
  BattleData,
  ManorData,
  BaronyData,
} from "./models/actor/index.mjs";
import {
  WoundData,
  GearData,
  SkillData,
  TraitData,
  HistoryData,
  PassionData,
  HorseData,
  SquireData,
  ArmourData,
  WeaponData,
  FamilyData,
  CultureData,
  ReligionData,
  ClassData,
  HomelandData,
  ManorImprovementData,
  IdealData,
  RelationshipData,
  BackgroundData,
  ArchetypeData,
} from "./models/items/index.mjs";
import drawNote from "./hooks/draw-note.mjs";
import RenderNoteConfig from "./hooks/render-note-config.mjs";
import PENClickableEvents from "./apps/clickable-events.mjs";
import RenderRegionBehaviorConfig from "./hooks/render-region-behavior-config.mjs";
import RenderRegionConfig from "./hooks/render-region-config.mjs";
import { PendragonCalendarWidget } from "./apps/pendragon-calendar.mjs";
import RenderJournalEntryPageTextSheet from "./hooks/render-journal-entry-page-text-sheet.mjs";
import RenderJournalEntrySheet from "./hooks/render-journal-entry-sheet.mjs";
import createToken from "./hooks/create-token.mjs";
import RenderRollTableSheet from "./hooks/render-roll-table-sheet.mjs";
import { ActorImport } from "./apps/actor-import.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", async function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.Pendragon = {
    PendragonActor,
    PendragonItem,
    rollItemMacro,
    GMRollMacro,
    NPCImporter,
    ClickRegionLeftUuid: PENClickableEvents.ClickRegionLeftUuid,
    ClickRegionRightUuid: PENClickableEvents.ClickRegionRightUuid,
    hasPermissionDocument: PENClickableEvents.hasPermissionDocument,
    InSceneRelativeTeleport: PENClickableEvents.InSceneRelativeTeleport,
    MapPinToggle: PENClickableEvents.MapPinToggle,
    openDocument: PENClickableEvents.openDocument,
    toggleTileJournalPages: PENClickableEvents.toggleTileJournalPages,
    toScene: PENClickableEvents.toScene,
  };
  //Add skill categories
  game.Pendragon.skillCategories = ["combat", "courtly", "minsterly", "knightly", "nonknightly", "ladies", "woodcraft"];

  // Add custom constants for configuration.
  CONFIG.PENDRAGON = PENDRAGON;

  //Register Handlebar Helpers & settings
  handlebarsHelper();
  registerSettings();

  // define data models
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.npc = NpcData;
  CONFIG.Actor.dataModels.manor = ManorData;
  CONFIG.Actor.dataModels.barony = BaronyData;
  CONFIG.Actor.dataModels.follower = FollowerData;
  CONFIG.Actor.dataModels.party = PartyData;
  CONFIG.Actor.dataModels.encounter = EncounterData;
  CONFIG.Actor.dataModels.battle = BattleData;
  // item data models
  CONFIG.Item.dataModels.wound = WoundData;
  CONFIG.Item.dataModels.gear = GearData;
  CONFIG.Item.dataModels.skill = SkillData;
  CONFIG.Item.dataModels.gear = GearData;
  CONFIG.Item.dataModels.trait = TraitData;
  CONFIG.Item.dataModels.history = HistoryData;
  CONFIG.Item.dataModels.passion = PassionData;
  CONFIG.Item.dataModels.horse = HorseData;
  CONFIG.Item.dataModels.manorImp = ManorImprovementData;
  CONFIG.Item.dataModels.squire = SquireData;
  CONFIG.Item.dataModels.armour = ArmourData;
  CONFIG.Item.dataModels.weapon = WeaponData;
  CONFIG.Item.dataModels.family = FamilyData;
  CONFIG.Item.dataModels.culture = CultureData;
  CONFIG.Item.dataModels.religion = ReligionData;
  CONFIG.Item.dataModels.class = ClassData;
  CONFIG.Item.dataModels.homeland = HomelandData;
  CONFIG.Item.dataModels.ideal = IdealData;
  CONFIG.Item.dataModels.relationship = RelationshipData;
  CONFIG.Item.dataModels.background = BackgroundData;
  CONFIG.Item.dataModels.archetype = ArchetypeData;

  // Define custom Document classes
  CONFIG.Actor.documentClass = PendragonActor;
  CONFIG.Item.documentClass = PendragonItem;
  CONFIG.Combat.documentClass = PendragonCombat;
  CONFIG.Combatant.documentClass = PendragonCombatant;

  CONFIG.statusEffects = PendragonStatusEffects.allStatusEffects;
  CONFIG.ui.combat = PendragonCombatTracker;
  CONFIG.Canvas.layers.pendragonmenu = {
    group: "interface",
    layerClass: PENLayer,
  };
  // hides the dummy menu item
  Hooks.on("renderSceneControls", PENLayer.renderControls);
  game.Pendragon.ui = { calendar: new PendragonCalendarWidget() };
});

Hooks.on("ready", async () => {
  game.socket.on("system.Pendragon", async (data) => {
    PENSystemSocket.callSocket(data);
  });
});

Hooks.on("ready", async function () {
  Scene.prototype._onClickDocumentLink = function (event) {
    this.view();
  };
});

if (foundry.utils.isNewerVersion(game.version, "13")) {
  Hooks.on("drawNote", drawNote);
  Hooks.on("renderNoteConfig", RenderNoteConfig);
}

//Add sub-titles in Config Settings for Pendragon Game Settings
Hooks.on("renderSettingsConfig", (app, html, options) => {
  const systemTab = $(app.form).find(".tab[data-tab=system]");

  systemTab
    .find("button[data-key=Pendragon\\.combatOptions]")
    .closest("div.form-group")
    .before(
      "<div style='font-size: 20px; text-align: right'><a href='https://github.com/cragstone/Pendragon/wiki/Game-Settings'><i class='fas fa-circle-question'></i></a></div>",
    );

  systemTab
    .find("input[name=Pendragon\\.manualGlory]")
    .closest("div.form-group")
    .before('<h3 class="setting-header">' + game.i18n.localize("PEN.Settings.other") + "</h3>");
});

Hooks.on("renderRegionConfig", RenderRegionConfig);
Hooks.on("renderJournalEntryPageTextSheet", RenderJournalEntryPageTextSheet);
Hooks.on("renderJournalEntrySheet", RenderJournalEntrySheet);
Hooks.on("renderRollTableSheet", RenderRollTableSheet);
Hooks.on("createToken", createToken);
Hooks.on("updateWorldTime", (worldTime, dt, options, userId) => {
  for (const doc of game.actors) {
    doc._initialize();
  }
  foundry.applications.instances.forEach((sheet) => {
    if (
      sheet instanceof CONFIG.Actor.sheetClasses.character["Pendragon.PendragonCharacterSheet"].cls ||
      sheet instanceof CONFIG.Actor.sheetClasses.character["Pendragon.PendragonCharacterSheetv2"].cls ||
      sheet instanceof CONFIG.Actor.sheetClasses.follower["Pendragon.PendragonFollowerSheet"].cls
    ) {
      sheet.render({ force: true });
    }
  });
});

PendragonHooks.listen();

// Add PID to roll tables (for v13)
Hooks.on("renderRollTableSheet", (application, element) => PIDEditor.addPIDSheetHeaderButton(application, element));

// Customize combat tracker
Hooks.on("renderCombatTracker", async (combatTracker, html, combatData) =>
  combatTracker.renderTracker(html instanceof HTMLElement ? html : html[0]),
);

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
  // Always reset GM Tool toggles to False and ensure actors training is false
  //Ensure Development and Create Phases are turned off when game session started
  if (game.user.isGM) {
    game.settings.set("Pendragon", "winter", false);
    game.settings.set("Pendragon", "development", false);
    game.settings.set("Pendragon", "creation", false);
    ui.controls.controls.pendragonmenu.tools.winter.active = false;
    ui.controls.controls.pendragonmenu.tools.development.active = false;
    ui.controls.controls.pendragonmenu.tools.creation.active = false;
    ui.controls.render();
    for (const a of game.actors.contents) {
      if (a.type === "character") {
        await a.update({ "system.status.train": false });
      }
    }
    if (game.time.components.year === 0) {
      await game.time.set({ year: 510 });
    }
  }

  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (game.user) {
      createItemMacro(data, slot);
      return false;
    }
  });
  console.log(game.Pendragon.ui);
  game.Pendragon.ui?.calendar.render({ force: true });

  if (!game.user.isGM) return;
  // Determine if a system update has occured
  const currentVersion = game.settings.get("Pendragon", "systemMigrationVersion");
  const needsMigration = !currentVersion || foundry.utils.isNewerVersion(game.system.version, currentVersion);
  if (needsMigration) {
    migrateWorld();
  }
});

//  Hotbar Macros
async function createItemMacro(data, slot) {
  let command = "";
  let macro = "";
  switch (data.type) {
    case "Item":
      // First, determine if this is a valid owned item.
      if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
        return ui.notifications.warn(game.i18n.localize("PEN.noMacroItemOwner"));
      }
      // If it is, retrieve it based on the uuid.
      const item = await Item.fromDropData(data);

      // Create the macro command using the uuid.
      command = `game.Pendragon.rollItemMacro("${data.uuid}");`;
      macro = game.macros.find((m) => m.name === item.name && m.command === command);
      if (!macro) {
        macro = await Macro.create({
          name: item.name,
          type: "script",
          img: item.img,
          command: command,
          flags: { "Pendragon.itemMacro": true },
        });
      }
      game.user.assignHotbarMacro(macro, slot);
      return false;

    case "JournalEntry":
    case "JournalEntryPage":
      command = `await Hotbar.toggleDocumentSheet("${data.uuid}");`;
      const journal = await fromUuid(data.uuid);
      macro = game.macros.find((m) => m.name === journal.name && m.command === command);
      if (!macro) {
        macro = await Macro.create({
          name: journal.name,
          type: "script",
          img: "systems/Pendragon/assets/Icons/bookmarklet.svg",
          command: command,
        });
      }
      game.user.assignHotbarMacro(macro, slot);
      return false;

    case "Macro":
      let tempMacro = await fromUuid(data.uuid);
      macro = game.macros.find((m) => m.name === tempMacro.name && m.command === command);
      if (!macro) {
        macro = await Macro.create({
          name: tempMacro.name,
          type: "script",
          img: "icons/svg/d20.svg",
          command: tempMacro.command,
        });
      }
      game.user.assignHotbarMacro(macro, slot);
      return false;

    default:
      return;
  }
}

//Create a Macro from an Item drop.
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: "Item",
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(game.i18n.format("PEN.noMacroItemFound", { itemName }));
    }

    // Trigger the item roll
    item.roll();
  });
}

//Allow GM Roll functionality
function GMRollMacro() {
  PENRollType._onGMRoll();
}

//Test functionality - NPC Importer (a work in progress)
function NPCImporter() {
  ActorImport.getImportText();
}
