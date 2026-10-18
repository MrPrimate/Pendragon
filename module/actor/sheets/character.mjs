import { PENRollType } from "../../cards/rollType.mjs";
import { PENCombat } from "../../apps/combat.mjs";
import { PENWinter } from "../../apps/winterPhase.mjs";
import { PENCharCreateV2 } from "../../apps/charCreateV2.mjs";
import { PENactorItemDrop } from "../actor-itemDrop.mjs";
import { PENUtilities } from "../../apps/utilities.mjs";
import { PENSelectLists } from "../../apps/select-lists.mjs";
import { PENActiveEffectSheet } from "../../sheets/pen-active-effect-sheet.mjs";
import { PendragonActorSheet } from "./actor-sheet.mjs";
const { api, sheets } = foundry.applications;

export class PendragonCharacterSheet extends PendragonActorSheet {
  constructor(options = {}) {
    super(options);
    this._dragDrop = this._createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    classes: ["Pendragon", "sheet", "characterV1"],
    position: {
      width: 900,
      height: 685,
    },
    tag: "form",
    dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }],
    form: {
      submitOnChange: true,
    },
    actions: {
      editPid: this._onEditPid,
      individualWinter: this._individualWinter,
      toggleActor: this._onActorToggle,
      createDoc: this._createDoc,
      viewDoc: this._viewDoc,
      deleteDoc: this._deleteDoc,
      resetArchetype: this._onUndoArchetype,
      resetCulture: this._onUndoCulture,
      resetReligion: this._onUndoReligion,
      resetHomeland: this._onUndoHomeland,
      resetClass: this._onUndoClass,
      openActor: this._openActor,
      charCreate: this._charCreate,
      charDelete: this._charCreateReset,
      statRoll: this._statRoll,
      traitRoll: this._traitRoll,
      genSkills: this._genSkills,
      xpChecks: this._xpChecks,
      economic: this._economic,
      aging: this._aging,
      squireAge: this._squireAge,
      horseSurvival: this._horseSurvival,
      trainTrait: this._trainTrait,
      trainPassion: this._trainPassion,
      trainSingle: this._trainSingle,
      trainMultiple: this._trainMultiple,
      prestigeTrait: this._prestigeTrait,
      prestigeCheck: this._prestigeCheck,
      prestigeSkill: this._prestigeSkill,
      prestigePassion: this._prestigePassion,
      familyRoll: this._familyRoll,
      passiveGlory: this._passiveGlory,
      switchSheet: this._onSwitchSheet,
      toggleHorse: this._toggleHorse,
      viewEstate: this._viewEstate,
      deleteEstate: this._deleteEstate,
      createEffect: this._createEffect,
      viewActiveEffect: this._viewActiveEffect,
      toggleEffect: this._toggleEffect,
      clearEffects: this._clearEffects,
      deleteActiveEffect: this._deleteActiveEffect,
      openWiki: this._openWiki,
    },
    window: {
      resizable: true,
    },
  };

  static PARTS = {
    header: {
      template: "systems/Pendragon/templates/actor/characterV1/character.header.hbs",
      scrollable: [""],
    },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    combat: {
      template: "systems/Pendragon/templates/actor/characterV1/character.combat.hbs",
      scrollable: [""],
    },
    skills: {
      template: "systems/Pendragon/templates/actor/characterV1/character.skills.hbs",
      scrollable: [""],
    },
    traits: {
      template: "systems/Pendragon/templates/actor/characterV1/character.traits.hbs",
      scrollable: [""],
    },
    passions: {
      template: "systems/Pendragon/templates/actor/characterV1/character.passions.hbs",
      scrollable: [""],
    },
    gear: {
      template: "systems/Pendragon/templates/actor/characterV1/character.gear.hbs",
      scrollable: [""],
    },
    history: {
      template: "systems/Pendragon/templates/actor/characterV1/character.history.hbs",
      scrollable: [""],
    },
    ideals: {
      template: "systems/Pendragon/templates/actor/characterV1/character.ideals.hbs",
      scrollable: [""],
    },
    house: {
      template: "systems/Pendragon/templates/actor/characterV1/character.house.hbs",
      scrollable: [""],
    },
    biography: {
      template: "systems/Pendragon/templates/actor/characterV1/character.biography.hbs",
      scrollable: [""],
    },
    stats: {
      template: "systems/Pendragon/templates/actor/characterV1/character.stats.hbs",
      scrollable: [""],
    },
    effects: {
      template: "systems/Pendragon/templates/actor/characterV1/character.effects.hbs",
      scrollable: [""],
    },
    charcreate: {
      template: "systems/Pendragon/templates/actor/characterV1/character.charcreate.hbs",
      scrollable: [""],
    },
    winter: {
      template: "systems/Pendragon/templates/actor/characterV1/character.winter.hbs",
      scrollable: [""],
    },
  };

  // adds the GM only Individual Winter Phase option to the header controls menu
  _getHeaderControls() {
    return [...super._getHeaderControls(), ...PENWinter.headerControls(this.actor)];
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    //Common parts to the character - this is the order they are show on the sheet
    options.parts = ["header", "tabs"];
    //First tab is at the left of the list on the character sheet
    options.parts.push("combat", "traits", "passions", "skills", "gear", "house", "ideals", "history");
    options.parts.push("biography", "effects", "stats");
    if (PENWinter.showWinterTab(this.actor)) {
      options.parts.push("winter");
    } else if (this.tabGroups.primary === "winter") {
      //Winter tab has been removed (e.g. Individual Winter Phase ended) so move off it
      this.tabGroups.primary = "combat";
    }
    if (game.settings.get("Pendragon", "creation")) {
      options.parts.push("charcreate");
    } else if (this.tabGroups.primary === "charcreate") {
      //Character Creation tab has been removed (creation setting turned off) so move off it
      this.tabGroups.primary = "combat";
    }
  }

  _replaceHTML(result, content, options) {
    super._replaceHTML(result, content, options);
    //Parts dropped from options.parts are left in the DOM by Foundry, so remove stale optional tabs
    for (const partId of ["winter", "charcreate"]) {
      if (!options.parts.includes(partId)) {
        content.querySelector(`[data-application-part="${partId}"]`)?.remove();
      }
    }
  }

  _getTabs(parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = "primary";
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) {
      let createState = game.settings.get("Pendragon", "creation");
      if (createState) {
        this.tabGroups[tabGroup] = "charcreate";
      } else {
        this.tabGroups[tabGroup] = "combat";
      }
    }
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: "",
        group: tabGroup,
        id: "",
        icon: "",
        label: "PEN.Tabs.",
      };
      switch (partId) {
        case "header":
        case "tabs":
          return tabs;
        case "combat":
        case "skills":
        case "traits":
        case "passions":
        case "gear":
        case "history":
        case "ideals":
        case "house":
        case "biography":
        case "stats":
        case "effects":
        case "charcreate":
        case "winter":
          tab.id = partId;
          tab.label += partId;
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = "active";
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  async _preparePartContext(partId, context) {
    switch (partId) {
      case "combat":
      case "skills":
      case "traits":
      case "passions":
      case "gear":
      case "house":
      case "history":
      case "ideals":
      case "follower":
      case "biography":
      case "stats":
      case "charcreate":
      case "winter":
        context.tab = context.tabs[partId];
        break;
      case "effects":
        context.tab = context.tabs[partId];
        context.effects = await PENActiveEffectSheet.getActorEffectsFromSheet(this.document);
        context.directEffects = await PENActiveEffectSheet.getDirectEffectsFromSheet(this.document);
        break;
    }
    return context;
  }

  // --------------------------------------------

  //@override
  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    context.tabs = this._getTabs(options.parts);
    context.trackWnd = game.settings.get("Pendragon", "trackWnd");
    context.editable = this.isEditable;
    context.owner = this.document.isOwner;
    context.limited = this.document.limited;
    context.actor = this.actor;
    context.flags = this.actor.flags;
    context.isGM = game.user.isGM;
    context.system = this.actor.system;
    context.isLocked = this.actor.system.lock;
    context.hasCulture = false;
    context.hasHomeland = false;
    context.hasClass = false;
    context.hasKnightClass = false;
    context.hasReligion = false;
    context.hasArchetype = false;
    context.hasFamily = false;
    context.hasTraits = false;
    context.hasParentPassion = false;
    context.hasFamilyMembers = this._hasFamilyMembers(this.actor);
    context.hasPSP = false;
    context.hasEquip = false;
    context.hasLuck = false;
    context.showHelp = game.settings.get("Pendragon", "showHelp");
    let archetype = this.actor.items.find((itm) => itm.type === "archetype");
    if (archetype) {
      context.archetypeName = archetype.name;
    } else {
      context.archetypeName = "";
    }
    let equip = await this.actor.items.filter((i) => i.type != "class").filter((i) => i.system.source === "class");
    if (equip.length > 0) {
      context.hasEquip = true;
    }
    equip = await this.actor.items.filter((i) => i.system.source === "luck");
    if (equip.length > 0) {
      context.hasLuck = true;
    }
    context.isWinter = game.settings.get("Pendragon", "winter");
    context.isDevelopment = game.settings.get("Pendragon", "development");
    context.isIndividualWinter = PENWinter.isIndividualWinter(this.actor);
    context.winterYear = PENWinter.winterYear(this.actor);
    context.isCreation = game.settings.get("Pendragon", "creation");
    context.useRelation = game.settings.get("Pendragon", "useRelation");
    context.manualGlory = game.settings.get("Pendragon", "manualGlory");
    context.hasName = true;
    if (this.actor.name.toUpperCase() === game.i18n.localize("TYPES.Actor.character").toUpperCase()) {
      context.hasName = false;
    }
    //No longer strictly knightly - it's the archetype ideal npw
    let knightly = await PendragonCharacterSheet.testKnightly(this.actor);
    context.knightly = knightly.pass;
    context.knightlyLabel = knightly.label;
    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);
    if (this.actor.system.cultureID != "") {
      context.hasCulture = true;
    }

    if (this.actor.system.homelandID != "") {
      context.hasHomeland = true;
    }
    if (this.actor.system.archetypeID != "") {
      context.hasArchetype = true;
    }
    if (this.actor.system.classID != "") {
      context.hasClass = true;
      context.hasKnightClass = true;
    }
    if (this.actor.system.religionID != "") {
      context.hasReligion = true;
    }
    if (this.actor.items.filter((itm) => itm.type === "skill" && itm.system.family > 0).length > 0) {
      context.hasFamily = true;
    }
    let horsemanshipSkill = await this.actor.items.find(
      (itm) => itm.flags.Pendragon?.pidFlag?.id === "i.skill.horsemanship",
    );
    context.horsemanship = 0;
    if (horsemanshipSkill) {
      context.horsemanship = horsemanshipSkill.system.total;
      context.horseSkillId = horsemanshipSkill._id;
    }
    if (this.actor.system.beauty > 0) {
      context.hasFamily = true;
    }
    context.statTotal = this.actor.system.statTotal;
    context.battlePosType = await PENSelectLists.getBattlePos();
    context.fieldPosType = await PENSelectLists.getFieldPos();
    context.sizLabel = game.i18n.localize("PEN.sizInc." + actorData.system.stats.siz.growth);
    context.solLabel = game.i18n.localize("PEN." + this.actor.system.sol);
    context.enrichedBackgroundValue = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      context.system.background,
      {
        async: true,
        secrets: context.editable,
      },
    );
    // Used wherever we need to show a particular status
    context.statuses = CONFIG.statusEffects
      .map((c) => {
        const hasCondition = this.actor.statuses.has(c.id);
        return {
          id: c.id,
          name: game.i18n.localize(`PEN.${c.name}`),
          img: c.img,
          active: hasCondition,
        };
      })
      .reduce((acc, o, index) => {
        acc[o.id] = o;
        return acc;
      }, {});

    const estates = [];
    for (let a of this.document.system.estates) {
      let tempActor = await fromUuid(a);
      if (tempActor) {
        estates.push({
          uuid: a,
          name: tempActor.name,
          typeLabel: game.i18n.localize("TYPES.Actor." + tempActor.type),
          dvLabel: tempActor.dvLabel,
          dvLabelHint: tempActor.dvLabelHint,
          armyTotal: tempActor.system.armyTotal,
          privyInc: tempActor.system.privyInc.libra + "/" + tempActor.system.privyInc.denarii,
        });
      } else {
        estates.push({
          uuid: a,
          name: game.i18n.localize("PEN.invalid"),
          typeLabel: "",
          dvLabel: "",
          dvLabelHint: "",
          armyTotal: 0,
          privyInc: 0,
        });
      }
    }
    context.estates = estates.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    await this._prepareItems(context);

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // add the current horse
    const horse = context.actor.currentHorse();
    const mountedHorse = context.actor.isMounted() ? horse : undefined;
    context.currentHorse = { _id: mountedHorse?._id };

    return context;
  }

  async _prepareItems(context) {
    // Initialize containers.
    const gears = [];
    const traits = [];
    const skills = [];
    const wounds = [];
    const history = [];
    const ideals = [];
    const passions = [];
    const horses = [];
    const squires = [];
    const armours = [];
    const weapons = [];
    const families = [];
    const household = [];
    const followers = [];

    // Iterate through items, allocating to containers
    for (let i of this.document.items) {
      i.img = i.img || DEFAULT_TOKEN;
      if (i.type === "gear") {
        i.system.cleanDesc = i.system.description.replace(/<[^>]+>/g, "");
        gears.push(i);
      } else if (i.type === "trait") {
        //Don't show Chaste/Lustful if age is under 13
        if (
          ["i.trait.chaste", "i.trait.lustful"].includes(i.flags?.Pendragon?.pidFlag?.id) &&
          this.actor.system.age < game.settings.get("Pendragon", "youthAge")
        )
          continue;
        traits.push(i);
        if (i.system.value != 10) {
          context.hasTraits = true;
        }
      } else if (i.type === "skill") {
        if (i.system.categories.includes("combat")) {
          i.combat = true;
        } else {
          i.combat = false;
        }
        skills.push(i);
        if (i.system.create > 0) {
          context.hasPSP = true;
        }
      } else if (i.type === "wound" && i.system.value > 0) {
        wounds.push(i);
      } else if (i.type === "history") {
        if (i.system.favour) {
          i.system.label = game.i18n.localize("PEN.favourShort") + i.system.favourLevel + " " + i.system.description;
        } else {
          i.system.label = i.system.description;
        }
        i.system.label = i.system.label.replace(/(<([^>]+)>)/gi, "");
        history.push(i);
      } else if (i.type === "passion") {
        if (i.flags.Pendragon?.pidFlag.id === "i.passion.honor") {
          i.system.isHonour = true;
        } else {
          i.system.isHonour = false;
        }
        i.system.level = 1;
        passions.push(i);
        if (i.system.inherit > 0) {
          context.hasParentPassion = true;
        }
      } else if (i.type === "horse") {
        i.system.careName = game.i18n.localize("PEN.horseHealth." + i.system.horseCare);
        i.system.healthName = game.i18n.localize("PEN.horseHealth." + i.system.horseHealth);
        i.system.totalAR = i.system.armour + i.system.horseArmour;
        i.system.label = i.name;
        if (i.system.horseName != "") {
          i.system.label = i.system.horseName;
        }
        i.system.moveLabel =
          game.i18n.localize("PEN.walk") +
          ":" +
          i.system.move +
          ", " +
          game.i18n.localize("PEN.trot") +
          ":" +
          i.system.move * 2 +
          ", " +
          game.i18n.localize("PEN.canter") +
          ":" +
          i.system.move * 3 +
          ", " +
          game.i18n.localize("PEN.gallop") +
          ":" +
          i.system.move * 6;
        horses.push(i);
      } else if (i.type === "squire") {
        i.system.squireType = game.i18n.localize("PEN." + i.system.category);
        if (i.system.category === "squire") {
          squires.push(i);
        } else {
          household.push(i);
        }
      } else if (i.type === "armour") {
        armours.push(i);
      } else if (i.type === "weapon") {
        weapons.push(i);
      } else if (i.type === "family") {
        i.system.typeName = game.i18n.localize("PEN.familyRelationship." + i.system.relation);
        families.push(i);
      } else if (i.type === "ideal") {
        ideals.push(i);
      } else if (i.type === "relationship") {
        i.system.typeName = game.i18n.localize("PEN." + i.system.typeLabel);
        if (i.system.born > 0) {
          i.system.age = game.time.components.year - i.system.born;
        } else {
          i.system.age = "";
        }
        followers.push(i);
      }
    }

    passions.push(
      {
        name: game.i18n.localize("PEN.adoratio"),
        system: {
          total: this.actor.system.adoratio,
          court: "adoratio",
          level: 0,
        },
      },
      {
        name: game.i18n.localize("PEN.civilitas"),
        system: {
          total: this.actor.system.civilitas,
          court: "civilitas",
          level: 0,
        },
      },
      {
        name: game.i18n.localize("PEN.fervor"),
        system: {
          total: this.actor.system.fervor,
          court: "fervor",
          level: 0,
        },
      },
      {
        name: game.i18n.localize("PEN.fidelitas"),
        system: {
          total: this.actor.system.fidelitas,
          court: "fidelitas",
          level: 0,
        },
      },
      {
        name: game.i18n.localize("PEN.honor"),
        system: {
          total: this.actor.system.honor,
          court: "honor",
          level: 0,
        },
      },
    );

    // Sort Skills
    skills.sort(function (a, b) {
      let x = a.name.toLowerCase();
      let y = b.name.toLowerCase();
      let p = a.combat;
      let q = b.combat;
      if (p < q) {
        return -1;
      }
      if (p > q) {
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

    // Sort History
    history.sort(function (a, b) {
      let x = a.system.year;
      let y = b.system.year;
      let p = a._stats.createdTime;
      let q = b._stats.createdTime;
      if (x < y) {
        return 1;
      }
      if (x > y) {
        return -1;
      }
      if (p < q) {
        return 1;
      }
      if (p > q) {
        return -1;
      }
      return 0;
    });

    // Sort Passions by Court, level and name
    passions.sort(function (a, b) {
      let x = a.name;
      let y = b.name;
      let p = a.system.court;
      let q = b.system.court;
      let r = a.system.level;
      let s = b.system.level;
      if (p < q) {
        return -1;
      }
      if (p > q) {
        return 1;
      }
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

    // Sort Horses with Warhorse at top
    horses.sort(function (a, b) {
      let x = a.system.chargeDmg;
      let y = b.system.chargeDmg;
      if (x < y) {
        return 1;
      }
      if (x > y) {
        return -1;
      }
      return 0;
    });

    // Sort Squires by age
    squires.sort(function (a, b) {
      let x = a.system.newAge;
      let y = b.system.newAge;
      if (x < y) {
        return 1;
      }
      if (x > y) {
        return -1;
      }
      return 0;
    });

    // Sort Wounds by damage, low first
    wounds.sort(function (a, b) {
      let x = a.system.value;
      let y = b.system.value;
      if (x < y) {
        return -1;
      }
      if (x > y) {
        return 1;
      }
      return 0;
    });

    // Sort Families by alive then year born, lowest first
    families.sort(function (a, b) {
      let x = a.system.born;
      let y = b.system.born;
      let p = Number(a.system.died) > 0 ? 1 : 0;
      let q = Number(b.system.died) > 0 ? 1 : 0;
      if (p < q) {
        return -1;
      }
      if (p > q) {
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

    // Sort Weapons by melee/missile and name
    weapons.sort(function (a, b) {
      let x = a.name.toLowerCase();
      let y = b.name.toLowerCase();
      let p = a.system.melee;
      let q = b.system.melee;
      if (p < q) {
        return 1;
      }
      if (p > q) {
        return -1;
      }
      if (x < y) {
        return -1;
      }
      if (x > y) {
        return 1;
      }
      return 0;
    });

    // Assign and return
    context.gears = gears.sort((a, b) => a.name.localeCompare(b.name));
    context.traits = traits.sort((a, b) => a.name.localeCompare(b.name));
    context.skills = skills;
    context.wounds = wounds;
    context.history = history;
    context.passions = passions;
    context.horses = horses;
    context.squires = squires;
    context.armours = armours;
    context.weapons = weapons;
    context.families = families;
    context.ideals = ideals.sort((a, b) => a.name.localeCompare(b.name));
    context.household = household;
    context.followers = followers;
  }

  _hasFamilyMembers(actor) {
    // Returns true if actor has a family item with source of "createFamily"
    return actor.items.some((itm) => itm.type === "family" && itm.system.source === "createFamily");
  }

  /* --------------------------------ACTIONS--------------------- */

  static async _onActorToggle(event, target) {
    const prop = target.dataset.property;
    let checkProp = {};
    if (["lock", "heir"].includes(prop)) {
      checkProp = { [`system.${prop}`]: !this.actor.system[prop] };
    } else if (["chirurgery", "barren"].includes(prop)) {
      checkProp = {
        [`system.status.${prop}`]: !this.actor.system.status[prop],
      };
    } else if (["unconscious", "dying", "maddened", "melancholic", "miserable"].includes(prop)) {
      this.toggleStatus(prop);
      return;
    } else if (prop === "debilitated") {
      this.toggleStatus(prop);
      checkProp = { "system.status.chirurgery": false };
    } else {
      return;
    }
    await this.actor.update(checkProp);
    return;
  }

  async toggleStatus(statusId) {
    const existing = this.actor.effects.getName(statusId);
    if (existing) return existing.delete();
    const effect = await ActiveEffect.implementation.fromStatusEffect(statusId);
    return ActiveEffect.implementation.create(effect, { parent: this.actor });
  }

  //Create an Embedded Document
  static async _createDoc(event, target) {
    let type = target.dataset.type;
    if (type === "talent") {
      type = "skill";
    }
    const docCls = getDocumentClass(target.dataset.documentClass);
    const docData = {
      name: docCls.defaultName({
        type: type,
        parent: this.actor,
      }),
    };
    foundry.utils.setProperty(docData, "type", type);
    // Loop through the dataset and add it to our docData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // Ignore data attributes that are reserved for action handling
      if (["action", "documentClass", "type"].includes(dataKey)) continue;
      foundry.utils.setProperty(docData, dataKey, value);
    }
    if (target.dataset.type === "talent") {
      foundry.utils.setProperty(docData, "system.magical", true);
      foundry.utils.setProperty(docData, "name", game.i18n.localize("PEN.magicalTalent"));
    }

    if (target.dataset.type === "skill" || target.dataset.type === "passion") {
      foundry.utils.setProperty(docData, "system.mainName", target.dataset.name);
    }

    if (target.dataset.type === "passion") {
      if (target.dataset.court) {
        foundry.utils.setProperty(docData, "system.court", target.dataset.court);
      }
    }

    if (target.dataset.type === "history") {
      foundry.utils.setProperty(docData, "system.year", game.time.components.year);
    }

    // Create the embedded document
    const newItem = await docCls.create(docData, { parent: this.actor });

    //And in certain circumstances render the new item sheet
    if (["history", "wound", "horse", "squire", "gear", "passion", "armour", "family"].includes(newItem.type)) {
      newItem.sheet.render(true);
    }
  }

  //View an Embedded Document
  static async _viewDoc(event, target) {
    const li = target.closest(".item");
    const item = this.actor.items.get(li.dataset.itemid);
    if (!item) return;
    if (item.type === "relationship") {
      this._updateRelationship(li.dataset.itemid, item.system.person1Name);
      return;
    }
    item.sheet.render(true);
  }

  //Delete an Embedded Document
  static async _deleteDoc(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      const li = target.closest(".item");
      const item = this.actor.items.get(li.dataset.itemid);
      if (!item) return;
      item.delete();
    }
  }

  //Trigger Culture Deletion
  static async _onUndoArchetype(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      await PENCharCreateV2.removeArchetype(this.actor);
    }
  }

  //Trigger Culture Deletion
  static async _onUndoCulture(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      await PENCharCreateV2.undoCulture(this.actor);
    }
  }

  //Trigger Homeland Deletion
  static async _onUndoHomeland(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      await PENCharCreateV2.undoHomeland(this.actor);
    }
  }

  //Trigger Class Deletion
  static async _onUndoClass(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      await PENCharCreateV2.resetClass(this.actor, false);
    }
  }

  //Trigger Religion Deletion
  static async _onUndoReligion(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      await PENCharCreateV2.undoReligion(this.actor);
    }
  }

  //Open Relationship Actor Sheet
  static async _openActor(event, target) {
    const sourceUuid = target.dataset.actoruuid;
    if (sourceUuid) {
      let tempActor = await fromUuid(sourceUuid);
      tempActor.sheet.render(true);
    }
  }

  //Character Creation Step
  static async _charCreate(event, target) {
    const step = target.closest("li").dataset.step;
    await PENCharCreateV2.startCreate(this.actor, step, false);
  }

  //Character Creation Step Reset
  static async _charCreateReset(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      const step = target.closest("li").dataset.step;
      await PENCharCreateV2.startCreate(this.actor, step, true);
    }
  }

  //Trigger a Stat Creation Roll
  static async _statRoll(event, target) {
    if (this.actor.system.create.stats) {
      await PENCharCreateV2.rollStats(this.actor);
      await this.actor.update({ "system.create.stats": false });
    } else if (game.user.isGM) {
      await this.actor.update({ "system.create.stats": true });
    }
  }

  //Trigger Trait Rolls
  static async _traitRoll(event, target) {
    if (this.actor.system.create.traits) {
      await PENCharCreateV2.rollTraits(this.actor);
      await this.actor.update({ "system.create.traits": false });
    } else if (game.user.isGM) {
      await this.actor.update({ "system.create.traits": true });
    }
  }

  //Trigger Skills Base Score Calculation
  static async _genSkills(event) {
    await PENCharCreateV2.baseSkillScore(this.actor);
  }

  //Individual Winter Phase (GM only)
  static async _individualWinter(event, target) {
    await PENWinter.individualWinter(this.actor);
  }

  //XP Checks
  static async _xpChecks(event, target) {
    await PENWinter.xpCheck(this.actor);
  }

  //Economic Check
  static async _economic(event, target) {
    await PENWinter.economic(this.actor);
  }

  //Aging Roll
  static async _aging(event, target) {
    await PENWinter.aging(this.actor);
  }

  //Squire Aging Roll
  static async _squireAge(event, target) {
    await PENWinter.squireWinter(this.actor);
  }

  //Horse Survival Roll
  static async _horseSurvival(event, target) {
    await PENWinter.horseSurvival(this.actor);
  }

  //Train Trait
  static async _trainTrait(event, target) {
    await PENWinter.winterImproveTrait(this.actor, "single");
  }

  //Train Passion
  static async _trainPassion(event, target) {
    await PENWinter.winterImprovePassion(this.actor, "single");
  }

  //Train Stat  Roll
  static async _trainSingle(event, target) {
    await PENWinter.winterImprov(this.actor, "single");
  }

  //Train Skills
  static async _trainMultiple(event, target) {
    await PENWinter.winterImproveSkill(this.actor, "multiple");
  }

  //Prestige Trait
  static async _prestigeTrait(event, target) {
    await PENWinter.winterImproveTrait(this.actor, "prestige");
  }

  //Prestige Passion
  static async _prestigePassion(event, target) {
    await PENWinter.winterImprovePassion(this.actor, "prestige");
  }

  //Prestige Stat
  static async _prestigeCheck(event, target) {
    await PENWinter.winterImprov(this.actor, "prestige");
  }

  //Prestige Skill
  static async _prestigeSkill(event, target) {
    await PENWinter.winterImproveSkill(this.actor, "prestige");
  }

  //Family Roll
  static async _familyRoll(event, target) {
    await PENWinter.familyRoll(this.actor);
  }

  static async _passiveGlory(event, target) {
    await PENWinter.awardPassiveGlory(this.actor);
  }

  //Mount/dismount horse
  static async _toggleHorse(event, target) {
    const li = target.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    const currentHorse = this.actor.currentHorse();
    if (this.actor.isMounted() && currentHorse?.id == item.id) {
      await this.actor.dismountCurrentHorse();
    } else {
      if (item.id != currentHorse?.id) await this.actor.setFlag("Pendragon", "currentHorse", item.id);
      await this.actor.mountCurrentHorse();
    }
  }

  static async _onSwitchSheet(event, target) {
    const sheetClass = this.actor.getFlag("core", "sheetClass") ?? "";
    this.actor.setFlag("core", "sheetClass", "Pendragon.PendragonCharacterSheetv2");
  }
  // -----------------------------------LISTENERS-----------------------------------------
  //Activate event listeners using the prepared sheet HTML
  _onRender(context, _options) {
    this._dragDrop.forEach((d) => d.bind(this.element));
    this.element
      .querySelectorAll(".rollable.stat")
      .forEach((n) => n.addEventListener("click", PENRollType._onStatCheck.bind(this)));
    this.element
      .querySelectorAll(".rollable.glory")
      .forEach((n) => n.addEventListener("click", PENRollType._onGloryCheck.bind(this)));
    this.element
      .querySelectorAll(".rollable.move")
      .forEach((n) => n.addEventListener("click", PENRollType._onMoveCheck.bind(this)));
    this.element
      .querySelectorAll(".addWound")
      .forEach((n) => n.addEventListener("click", PENCombat.addWound.bind(this)));
    this.element
      .querySelectorAll(".natural-heal")
      .forEach((n) => n.addEventListener("click", PENCombat.naturalHealing.bind(this)));
    this.element
      .querySelectorAll(".treat-wound")
      .forEach((n) => n.addEventListener("click", PENCombat.treatWound.bind(this)));
    this.element
      .querySelectorAll(".rollable.decision")
      .forEach((n) => n.addEventListener("click", PENRollType._onDecisionCheck.bind(this)));
    this.element
      .querySelectorAll(".rollable.trait")
      .forEach((n) => n.addEventListener("click", PENRollType._onTraitCheck.bind(this)));
    this.element
      .querySelectorAll(".rollable.damage")
      .forEach((n) => n.addEventListener("click", PENRollType._onDamageRoll.bind(this)));
    this.element
      .querySelectorAll(".rollable.combat")
      .forEach((n) => n.addEventListener("click", PENRollType._onCombatCheck.bind(this)));
    this.element
      .querySelectorAll(".rollable.passion-name")
      .forEach((n) => n.addEventListener("click", PENRollType._onPassionCheck.bind(this)));
    this.element
      .querySelectorAll(".rollable.skill-name")
      .forEach((n) => n.addEventListener("click", PENRollType._onSkillCheck.bind(this)));
    this.element
      .querySelectorAll(".rollable.squire")
      .forEach((n) => n.addEventListener("click", PENRollType._onSquireCheck.bind(this)));
    this.element
      .querySelectorAll(".inline-edit")
      .forEach((n) => n.addEventListener("change", this._onInlineEdit.bind(this)));
    this.element
      .querySelectorAll(".item-toggle")
      .forEach((n) => n.addEventListener("click", this._onItemToggle.bind(this)));
  }

  async _onItemDelete(event) {
    const li = $(event.currentTarget).closest(".item");
    const item = this.actor.items.get(li.data("itemid"));
    if (!item) return;
    item.delete();
    li.slideUp(200, () => this.render(false));
  }

  //Update Relationship
  async _updateRelationship(itemid, person1Name) {
    let item = await this.actor.items.get(itemid);
    let tempActr = await fromUuid(item.system.sourceUuid);
    if (!tempActr) {
      ui.notifications.warn(game.i18n.format("PEN.noActor", { actr: person1Name }));
      return;
    }
    let name1 = tempActr.name;
    let born = 0;
    let squire = 0;
    let typeLabel = tempActr.type;
    if (["follower", "character"].includes(tempActr.type)) {
      born = tempActr.system.born;
    }
    if (tempActr.type === "follower") {
      typeLabel = tempActr.system.subtype;
      if (tempActr.system.subtype === "squire") {
        squire = tempActr.system.squire;
      }
    }
    await item.update({
      "system.person1Name": name1,
      "system.born": born,
      "system.squire": squire,
      "system.typeLabel": typeLabel,
    });
    item.sheet.render(true);
  }

  //Toggle Items
  async _onItemToggle(event) {
    const prop = event.currentTarget.dataset.property;
    const itemID = event.currentTarget.dataset.itemid;
    const item = this.actor.items.get(itemID);
    let checkProp = {};
    if (prop === "XP") {
      checkProp = { "system.XP": !item.system.XP };
    } else if (prop === "oppXP") {
      checkProp = { "system.oppXP": !item.system.oppXP };
    } else if (prop === "wound") {
      checkProp = { "system.treated": !item.system.treated };
    } else if (prop === "equipped") {
      checkProp = { "system.equipped": !item.system.equipped };
    } else {
      return;
    }
    await item.update(checkProp);
    //If toggle was to equip a horse then uneqip all other horses
    if (item.type === "horse" && item.system.equipped) {
      for (let i of this.actor.items) {
        if (i.type === "horse" && i._id != itemID) {
          await i.update({ "system.equipped": false });
        }
      }
    }
    return;
  }

  // Update traits, skills etc without opening the item sheet
  async _onInlineEdit(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const li = $(event.currentTarget).closest(".item");
    const item = this.actor.items.get(li.data("itemid"));
    const field = li.data("field");
    let newScore = Number(element.value);
    let target = "";
    if (["skill", "passion", "trait"].includes(field)) {
      const att = li.data("att");
      target = "system." + att;
    } else if (field === "wound") {
      target = "system.value";
    } else if (field === "horse") {
      target = "system.hp";
    } else if (field === "armour") {
      target = "system.ap";
    }

    await item.update({ [target]: newScore });
    this.actor.render(false);
    return;
  }

  //Does the Character qualify for Knighthood
  static async testKnightly(actor) {
    let archetype = await actor.items.get(actor.system.archetypeID);
    if (!archetype) {
      return { pass: false, label: game.i18n.localize("PEN.archetypeMissing") };
    }
    let idealPID = archetype.system?.ideals?.[0]?.pid;
    let ideal = await actor.items.find((itm) => itm.flags?.Pendragon?.pidFlag?.id === idealPID);
    if (!ideal) {
      return { pass: false, label: game.i18n.localize("PEN.idealMissing") };
    }
    return { pass: ideal.system.activeIdeal, label: ideal.system.reqMsg };
  }

  //Get Embedded Document
  //TO DO  - repeat of getEmbeddedDocument below.  Get rid of it???
  Document(target) {
    const docRow = target.closest("li[data-document-class]");
    if (docRow.dataset.documentClass === "Item") {
      return this.actor.items.get(docRow.dataset.itemId);
    } else if (docRow.dataset.documentClass === "ActiveEffect") {
      const parent =
        docRow.dataset.parentId === this.actor.id ? this.actor : this.actor.items.get(docRow?.dataset.parentId);
      return parent.effects.get(docRow?.dataset.effectId);
    } else return console.warn("Could not find document class");
  }

  //View Estate Actor
  static async _viewEstate(event, target) {
    const { itemid } = target.closest("[data-itemid]")?.dataset ?? {};
    const estateActor = await fromUuid(itemid);
    if (!estateActor) return;
    estateActor.sheet.render(true);
  }

  //Delete an Actor from the collection
  static async _deleteEstate(event, target) {
    if (event.detail === 2) {
      const { itemid } = target.closest("[data-itemid]")?.dataset ?? {};
      const coll = this.actor.system.estates ?? [];
      await this.actor.update({ "system.estates": coll.filter((itm) => itm != itemid) });
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
    const aeCls = getDocumentClass("ActiveEffect");
    const effect = await aeCls.fromDropData(data);
    if (!this.actor.isOwner || !effect) return false;
    return aeCls.create(effect, { parent: this.actor });
  }

  //Dropping an actor on to character
  async _onDropActor(event, data) {
    event.preventDefault();
    let collectionName = event.target.closest("[data-collection]")?.dataset.collection ?? "";

    //If adding a relationship
    if (collectionName === "relationship") {
      if (!game.settings.get("Pendragon", "useRelation")) {
        ui.notifications.warn(game.i18n.localize("PEN.noRelation"));
        return;
      }
      const dataList = await PENUtilities.getDataFromDropEvent(event, "Actor");
      for (const companion of dataList) {
        //Only allow certain actor types to be added
        if (!["character", "follower"].includes(companion.type)) {
          continue;
        }
        let present = this.actor.items
          .filter((itm) => itm.type === "relationship")
          .filter((nitm) => nitm.system.sourceUuid === companion.uuid).length;
        if (present > 0) {
          ui.notifications.warn(game.i18n.format("PEN.relationPresent", { name: companion.name }));
          continue;
        }

        let actr1 = companion.uuid;
        let actr2 = this.actor.uuid;
        if (actr1 === actr2) {
          continue;
        }
        let name = companion.name + "-" + this.actor.name;
        let typeLabel = companion.type;
        let born = 0;
        let squire = 0;
        if (companion.type == "follower") {
          typeLabel = companion.system.subtype;
          born = companion.system.born;
          if (companion.system.subtype === "squire") {
            squire = companion.system.squire;
          }
        } else if (companion.type === "character") {
          born = companion.system.born;
        }

        const itemData = {
          name: name,
          type: "relationship",
          system: {
            sourceUuid: actr1,
            targetUuid: actr2,
            person1Name: companion.name,
            person2Name: this.actor.name,
            typeLabel: typeLabel,
            born: born,
            squire: squire,
          },
        };

        // Finally, create the item!
        let item = await Item.create(itemData, { parent: this.actor });
        let key = await game.system.api.pid.guessId(item);
        await item.update({
          "flags.Pendragon.pidFlag.id": key,
          "flags.Pendragon.pidFlag.lang": game.i18n.lang,
          "flags.Pendragon.pidFlag.priority": 0,
        });
        item.sheet.render(true);
      }
      return false;

      //If adding an Estate
    } else if (collectionName === "estates") {
      const dataList = await PENUtilities.getDataFromDropEvent(event, "Actor");
      const collection = this.actor.system[collectionName]
        ? foundry.utils.duplicate(this.actor.system[collectionName])
        : [];
      if (!dataList) {
        return;
      }
      for (let estate of dataList) {
        if (!["manor", "barony"].includes(estate.type)) {
          continue;
        }
        if (this.actor.system.estates.includes(estate.uuid)) {
          continue;
        }
        collection.push(estate.uuid);
      }
      await this.actor.update({ [`system.${collectionName}`]: collection });
      return;
    }
  }

  //Handle dropping of an item reference or item data onto an Actor Sheet
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);
    // Handle item sorting within the same Actor
    if (this.actor.uuid === item.parent?.uuid) return this._onSortItem(event, item);
    // Create the owned item
    return this._onDropItemCreate(item, event);
  }

  //Handle dropping of a Folder on an Actor Sheet.
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
    const folder = await Folder.implementation.fromDropData(data);
    if (folder.type !== "Item") return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(document instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      }),
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  //Handle the final creation of dropped Item data on the Actor.
  async _onDropItemCreate(itemData, event) {
    itemData = await PENactorItemDrop._PENonDropItemCreate(this.actor, itemData);
    const list = await this.actor.createEmbeddedDocuments("Item", itemData);
    return list;
  }

  //Returns an array of DragDrop instances
  get dragDrop() {
    return this._dragDrop;
  }

  _dragDrop;

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

  //Get Embedded Document
  _getEmbeddedDocument(target) {
    const docRow = target.closest("li[data-document-class]");
    if (docRow.dataset.documentClass === "Item") {
      return this.actor.items.get(docRow.dataset.itemId);
    } else if (docRow.dataset.documentClass === "ActiveEffect") {
      const parent =
        docRow.dataset.parentId === this.actor.id ? this.actor : this.actor.items.get(docRow?.dataset.parentId);
      return parent.effects.get(docRow?.dataset.effectId);
    } else return console.warn("Could not find document class");
  }
}
