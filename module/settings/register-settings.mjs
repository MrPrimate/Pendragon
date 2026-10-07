import { PENCombatSettings } from "./settings-combatOptions.mjs";
import { PENXPSettings } from "./settings-xpOptions.mjs";
import { PENDiceSettings } from "./settings-diceOptions.mjs";
import { PENDisplaySettings } from "./settings-displayOptions.mjs";
import { PENCharacterSettings } from "./settings-characterOptions.mjs";

export function registerSettings() {
  let tokenDropModeOptions = {
    ask: game.i18n.localize("PEN.Settings.tokenDropModeAsk"),
    roll: game.i18n.localize("PEN.Settings.tokenDropModeRoll"),
    ignore: game.i18n.localize("PEN.Settings.tokenDropModeIgnore"),
  };

  //Combat Settings Button
  game.settings.registerMenu("Pendragon", "combatOptions", {
    name: "PEN.Settings.combatOptionsHint",
    label: "PEN.Settings.combatOptions",
    icon: "fas fa-swords",
    type: PENCombatSettings,
    restricted: true,
  });
  PENCombatSettings.registerSettings();

  //Character Settings Button
  game.settings.registerMenu("Pendragon", "characterOptions", {
    name: "PEN.Settings.characterOptionsHint",
    label: "PEN.Settings.characterOptions",
    icon: "fas fa-person",
    type: PENCharacterSettings,
    restricted: true,
  });
  PENCharacterSettings.registerSettings();

  //XP Settings Button
  game.settings.registerMenu("Pendragon", "xpOptions", {
    name: "PEN.Settings.xpOptionsHint",
    label: "PEN.Settings.xpOptions",
    icon: "fas fa-certificate",
    type: PENXPSettings,
    restricted: true,
  });
  PENXPSettings.registerSettings();

  //Dice Roll Settings Button
  game.settings.registerMenu("Pendragon", "diceOptions", {
    name: "PEN.Settings.diceOptionsHint",
    label: "PEN.Settings.diceOptions",
    icon: "fas fa-dice-d20",
    type: PENDiceSettings,
    restricted: true,
  });
  PENDiceSettings.registerSettings();

  //Display Settings Button
  game.settings.registerMenu("Pendragon", "displayOptions", {
    name: "PEN.Settings.displayOptionsHint",
    label: "PEN.Settings.displayOptions",
    icon: "fas fa-desktop",
    type: PENDisplaySettings,
    restricted: true,
  });
  PENDisplaySettings.registerSettings();

  game.settings.register("Pendragon", "showParty", {
    name: "PEN.Settings.showParty",
    hint: "PEN.Settings.showPartyHint",
    scope: "world",
    requiresReload: true,
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("Pendragon", "tokenDropMode", {
    name: "PEN.Settings.tokenDropMode",
    hint: "PEN.Settings.tokenDropModeHint",
    scope: "world",
    requiresReload: true,
    config: true,
    default: "ask",
    choices: tokenDropModeOptions,
    type: String,
  });

  game.settings.register("Pendragon", "feastDeckUuid", {
    name: "PEN.Settings.feastDeckUuid",
    hint: "PEN.Settings.feastDeckUuidHint",
    scope: "world",
    requiresReload: false,
    config: true,
    type: String,
    default: "",
  });

  //Invisible Game Settings
  game.settings.register("Pendragon", "winter", {
    name: "",
    hint: "",
    scope: "world",
    requiresReload: false,
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register("Pendragon", "development", {
    name: "",
    hint: "",
    scope: "world",
    requiresReload: false,
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register("Pendragon", "creation", {
    name: "",
    hint: "",
    scope: "world",
    requiresReload: false,
    config: false,
    type: Boolean,
    default: false,
  });

  // used by migration script
  game.settings.register("Pendragon", "systemMigrationVersion", {
    config: false,
    scope: "world",
    type: String,
    default: "",
  });

  //Game year stopped in v14.5  - can delete in due course when relevant migration removed
  game.settings.register("Pendragon", "gameYear", {
    name: "PEN.Settings.gameYear",
    hint: "PEN.Settings.gameYearHint",
    scope: "world",
    requiresReload: true,
    config: false,
    type: Number,
    default: 508,
  });
}
