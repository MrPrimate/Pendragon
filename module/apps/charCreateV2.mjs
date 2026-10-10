import PENDialog from "../setup/pen-dialog.mjs";
import { PENUtilities } from "./utilities.mjs";
import { StatsSelectDialog } from "./stat-selection.mjs";
import { TraitsSelectDialog } from "./trait-selection.mjs";
import { ItemsSelectDialog } from "./item-selection.mjs";
import { PassionsSelectDialog } from "./passion-selection.mjs";
import { PENCheck } from "./checks.mjs";

export class PENCharCreateV2 {
  //Toggle Creation Phase On/Off
  static async creationPhase(toggle) {
    if (toggle) {
      ui.notifications.warn(game.i18n.localize("PEN.creationPhaseStart"));
    } else {
      ui.notifications.warn(game.i18n.localize("PEN.creationPhaseEnd"));
    }

    await game.settings.set("Pendragon", "creation", toggle);

    for (const a of game.actors) {
      if (a.type === "character") {
        await a.update({ "system.create.toggle": !a.system.create.toggle });
      }
    }
  }

  //Creation Phase Step Activated
  static async startCreate(actor, step, undo) {
    //If Undo = true Undo a single step

    switch (step) {
      case "createMethod":
        await this.stepCreateMethod(actor, step, undo);
        break;
      case "addArchetype":
        await this.stepArchetype(actor, step, undo);
        break;
      case "addCulture":
        await this.stepCulture(actor, step, undo);
        break;
      case "addHomeland":
        await this.stepHomeland(actor, step, undo);
        break;
      case "addName":
        await this.addName(actor, step, undo);
        break;
      case "addGender":
        await this.addGender(actor, step, undo);
        break;
      case "addReligion":
        await this.stepReligion(actor, step, undo);
        break;
      case "addLord":
        await this.addLord(actor, step, undo);
        break;
      case "addHome":
        await this.addHome(actor, step, undo);
        break;
      case "addStats":
        await this.stepStats(actor, step, undo);
        break;
      case "addTraits":
        await this.stepTraits(actor, step, undo);
        break;
      case "addPassions":
        await this.stepPassions(actor, step, undo);
        break;
      case "parentPassion":
        await this.stepParentPassion(actor, step, undo);
        break;
      case "addFamilyChar":
        await this.stepAddFamilyChar(actor, step, undo);
        break;
      case "personalSkillPoints":
        await this.stepPersonalSkillPoints(actor, step, undo);
        break;
      case "addPractice":
        await this.stepAddPractice(actor, step, undo);
        break;
      case "meetIdeal":
        await this.stepMeetIdeal(actor, step, undo);
        break;
      case "addParents":
        await this.stepAddParents(actor, step, undo);
        break;
      case "addHeir":
        await this.stepAddHeir(actor, step, undo);
        break;
      case "addEquip":
        await this.stepAddEquip(actor, step, undo);
        break;
      case "addLuckBenefit":
        await this.stepLuckBenefit(actor, step, undo);
        break;
    }
    return;
  }

  //----------------------------------------------CREATE METHOD----------------------------------------------
  //
  //
  static async stepCreateMethod(actor, step, undo) {
    //Reset Creation Method
    if (undo) {
      await this.resetCreateMethod(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Choose Creation Method
      let result = await PENCharCreateV2.addCreateMethod(actor);
      if (!result) {
        return;
      }
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
      return;
    }
    return;
  }

  //Choose Creation Method
  //
  static async addCreateMethod(actor) {
    let data = {
      msg: game.i18n.localize("PEN.rollWrite"),
      title: game.i18n.localize("PEN.creationMethod"),
      button1: { label: game.i18n.localize("PEN.random"), icon: "fas fa-dice" },
      button2: { label: game.i18n.localize("PEN.constructed"), icon: "fas fa-book-open-cover" },
    };
    let usage = await this.twoOptions(data);
    if (!usage) return false;
    let option = true;
    if (usage === "opt2") {
      option = false;
    }
    await actor.update({ "system.create.random": option, "system.create.step": 2 });
    return true;
  }

  static async resetCreateMethod(actor) {
    await actor.update({ "system.create.random": false, "system.create.step": 1 });
    await this.undoReligion(actor);
    await this.resetStats(actor);
    await this.resetTraits(actor);
    await this.resetClass(actor, false);
    await this.removeFamilyChar(actor);
    await this.removeArchetype(actor);
    return;
  }

  //----------------------------------------------ARCHETYPE----------------------------------------------
  //
  //
  static async stepArchetype(actor, step, undo) {
    //Remove Archetype
    if (undo) {
      await this.removeArchetype(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Add Archetype
      //If actor has an Archetype then stop
      if (actor.system.archetypeID != "") {
        return;
      } else {
        // Call addArchetype
        let result = await this.addArchetype(actor, false, false);
        if (!result) {
          return;
        }
        ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
      }
    }
    return;
  }

  //Add an Archetype
  //archetype = archetype item if handed in
  //ask - ask for constructed or random method
  static async addArchetype(actor, archetype, ask) {
    if (!archetype) {
      const itemData = await this.selectItem("archetype", false);
      if (!itemData || itemData === "xxx") {
        ui.notifications.error(game.i18n.localize("PEN.noArchetypes"));
        return false;
      }
      let newItems = await actor.createEmbeddedDocuments("Item", itemData);
      archetype = newItems[0];
    }
    //If there a bonus Trait or a start at 16 then we need a construction method
    if ((archetype.system.bonusTraits.length > 0 || archetype.system.startertrait) && ask) {
      let data = {
        msg: game.i18n.localize("PEN.rollWrite"),
        title: game.i18n.localize("PEN.creationMethod"),
        button1: { label: game.i18n.localize("PEN.roll"), icon: "fas fa-dice" },
        button2: { label: game.i18n.localize("PEN.construct"), icon: "fas fa-book-open-cover" },
      };
      let usage = await this.twoOptions(data);
      if (usage === "opt1") {
        await actor.update({ "system.create.random": true });
      } else {
        await actor.update({ "system.create.random": false });
      }
    }
    //Adjust stat formulae & min/max
    await actor.update({
      "system.stats.str.min": archetype.system.stats.str.min,
      "system.stats.dex.min": archetype.system.stats.dex.min,
      "system.stats.con.min": archetype.system.stats.con.min,
      "system.stats.app.min": archetype.system.stats.app.min,
      "system.stats.siz.min": archetype.system.stats.siz.min,
      "system.stats.str.max": archetype.system.stats.str.max,
      "system.stats.dex.max": archetype.system.stats.dex.max,
      "system.stats.con.max": archetype.system.stats.con.max,
      "system.stats.app.max": archetype.system.stats.app.max,
      "system.stats.siz.max": archetype.system.stats.siz.max,
      "system.stats.str.cMax": archetype.system.stats.str.culturalMax,
      "system.stats.dex.cMax": archetype.system.stats.dex.culturalMax,
      "system.stats.con.cMax": archetype.system.stats.con.culturalMax,
      "system.stats.app.cMax": archetype.system.stats.app.culturalMax,
      "system.stats.siz.cMax": archetype.system.stats.siz.culturalMax,
      "system.stats.str.formula": archetype.system.stats.str.formula,
      "system.stats.dex.formula": archetype.system.stats.dex.formula,
      "system.stats.con.formula": archetype.system.stats.con.formula,
      "system.stats.app.formula": archetype.system.stats.app.formula,
      "system.stats.siz.formula": archetype.system.stats.siz.formula,
    });

    //Add anew skills on the Archetype not on the character
    let newSkills = [];
    for (let skill of archetype.system.skills) {
      let thisSkill = actor.items.find((itm) => itm.flags?.Pendragon?.pidFlag?.id === skill.pid);
      if (!thisSkill) {
        let nItm = await game.system.api.pid.fromPIDBest({ pid: skill.pid });
        if (nItm.length > 0) {
          newSkills.push(nItm[0]);
        }
      }
    }

    //Apply Archetype Bonus Traits
    //If Random Method
    if (actor.system.create.random) {
      if (archetype.system.bonusTraits.length > 0) {
        let changes = [];
        let results = [];
        let rTraits = actor.items.filter((item) => item.type === "trait");
        for (let rTrait of archetype.system.bonusTraits) {
          //Set dice formula
          let thisTrait = actor.items.find((itm) => itm.flags?.Pendragon?.pidFlag?.id === rTrait.pid);
          if (!thisTrait) continue;
          let formula = rTrait.formula;
          let roll = await PENUtilities.complexDiceRoll(formula);
          thisTrait.system.archetype = Number(roll.total) - thisTrait.system.value;
          changes.push({
            _id: thisTrait.id,
            "system.archetype": thisTrait.system.archetype,
          });
          let rollStr = "";
          //If a fixed value that doesn't roll a dice
          if (roll.dice.length<1) {

            results.push({
              name: thisTrait.name,
              rollVal: Number(formula),
              form: formula,
              dice: formula,
            });
          } else {
            for (let dCount = 0; dCount < roll.dice[0].results.length; dCount++) {
              if (dCount === 0) {
                rollStr = roll.dice[0].results[dCount].result;
              } else {
                rollStr = rollStr + "+" + roll.dice[0].results[dCount].result;
              }
              results.push({
                name: thisTrait.name,
                rollVal: roll.total,
                form: roll.formula,
                dice: rollStr,
              });
            }
          }
        }
        //Call Chat Card
        const html = await this.charGenRollChatCard(results, game.i18n.localize("PEN.traits"), actor.name);
        let msg = await this.showCharGenRollChat(html, actor);
        await Item.updateDocuments(changes, { parent: actor });
      }
    } else {
      //If Constructed Method
      for (let trt of archetype.system.bonusTraits) {
        let thisTrait = await actor.items.find((itm) => itm.flags?.Pendragon?.pidFlag?.id === trt.pid);
        if (!thisTrait) continue;
        await thisTrait.update({ "system.archetype": trt.constructed - thisTrait.system.value });
      }
      //Increase one trait to 16 if allowed
      if (archetype.system.startertrait) {
        let [sTrait, opposed] = await this.selectActorTrait(actor, game.i18n.localize("PEN.selectTrait"));
        // if no trait selected, error out
        if (sTrait) {
          const option = opposed ? 4 : 16;
          // subtract the religious & archetype bonus so base value+religious = selected option
          await sTrait.update({ "system.archetype": Number(option) - sTrait.system.value - sTrait.system.religious });
        }
      }
    }

    //Add Ideal if not already on character sheet
    if (archetype.system.ideals.length > 0) {
      let idealPID = archetype.system.ideals[0].pid;
      let currentIdeal = await actor.items.find((itm) => itm.flags?.Pendragon?.pidFlag?.id === idealPID);
      if (!currentIdeal) {
        let nIdeal = await game.system.api.pid.fromPIDBest({ pid: idealPID });
        if (nIdeal.length > 0) {
          let newIdeal = nIdeal[0].toObject();
          newIdeal.system.source = "archetype";
          newSkills.push(newIdeal);
        }
      }
    }
    if (newSkills.length > 0) {
      await Item.createDocuments(newSkills, { parent: actor });
    }

    //Adjust base score formula on all skills
    let updateSkills = [];
    for (let itm of actor.items) {
      if (itm.type != "skill") continue;
      let sPID = archetype.system.skills.find((sItm) => sItm.pid === itm.flags?.Pendragon?.pidFlag?.id);
      if (sPID) {
        let results = await this.skillParse(sPID.formula);
        updateSkills.push({ _id: itm.id,
          "system.base.mod": results.modifier,
          "system.base.multi": results.multiplier,
          "system.base.stat": results.stat
        });
      } else {
        updateSkills.push({ _id: itm.id,
          "system.base.mod": 0,
          "system.base.multi": 0,
          "system.base.stat": "none"
        });
      }
    }
    await Item.updateDocuments(updateSkills, { parent: actor });
    await this.baseSkillScore(actor);
    return true;
  }

  //Remove an Archetype
  static async removeArchetype(actor) {
    //Reset stat formulae & min/max t default
    let archetypes = actor.items
      .filter((itm) => itm.type === "archetype")
      .map((itm) => {
        return itm.id;
      });
    let ideals = actor.items
      .filter((itm) => itm.type === "ideal")
      .filter((itm) => itm.system.source === "archetype")
      .map((itm) => {
        return itm.id;
      });
    archetypes.push(...ideals);
    await Item.deleteDocuments(archetypes, { parent: actor });
    await actor.update({
      "system.stats.str.min": 8,
      "system.stats.dex.min": 8,
      "system.stats.con.min": 8,
      "system.stats.app.min": 8,
      "system.stats.siz.min": 8,
      "system.stats.str.max": 15,
      "system.stats.dex.max": 15,
      "system.stats.con.max": 15,
      "system.stats.app.max": 15,
      "system.stats.siz.max": 15,
      "system.stats.str.cMax": 18,
      "system.stats.dex.cMax": 18,
      "system.stats.con.cMax": 18,
      "system.stats.app.cMax": 18,
      "system.stats.siz.cMax": 18,
      "system.stats.str.formula": "2D6+5",
      "system.stats.dex.formula": "2D6+5",
      "system.stats.con.formula": "2D6+5",
      "system.stats.app.formula": "2D6+5",
      "system.stats.siz.formula": "2D6+5",
    });

    //Update Skill Base Stats to defaults
    let updateSkills = [];
    for (let itm of actor.items) {
      if (itm.type === "skill") {
        let baseSkill = await game.system.api.pid.fromPIDBest({ pid: itm.flags?.Pendragon?.pidFlag?.id });
        if (baseSkill.length > 0) {
          updateSkills.push({ _id: itm.id, "system.base.mod": baseSkill[0].system.base.mod });
          updateSkills.push({ _id: itm.id, "system.base.multi": baseSkill[0].system.base.multi });
          updateSkills.push({ _id: itm.id, "system.base.stat": baseSkill[0].system.base.stat });
        } else {
          updateSkills.push({ _id: itm.id, "system.base.mod": 0 });
          updateSkills.push({ _id: itm.id, "system.base.multi": 0 });
          updateSkills.push({ _id: itm.id, "system.base.stat": "none" });
        }
      } else if (itm.type === "trait") {
        updateSkills.push({ _id: itm.id, "system.archetype": 0 });
      }
    }
    await Item.updateDocuments(updateSkills, { parent: actor });
    await this.baseSkillScore(actor);
  }

  //----------------------------------------------CULTURE----------------------------------------------
  //
  //
  static async stepCulture(actor, step, undo) {
    //Remove Culture
    if (undo) {
      await this.undoCulture(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //If actor has a culture then stop
      if (actor.system.cultureID != "") {
        return;
      } else {
        // Call Step 3
        let result = await this.addCulture(actor);
        if (!result) {
          return;
        }
        ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
      }
    }
    return;
  }

  //Add a Culture
  static async addCulture(actor, culture) {
    if (!culture) {
      const itemData = await this.selectItem("culture", false);
      if (!itemData) {
        ui.notifications.error(game.i18n.localize("PEN.noCultures"));
        return false;
      }
      let newItems = await actor.createEmbeddedDocuments("Item", itemData);
      culture = newItems[0];
    }

    //List of PIDS for this culture
    let cPIDs = culture.system.skills
      .filter((itm) => itm)
      .map((itm) => {
        return itm.pid;
      });

    let changes = [];
    let newSkills = [];
    //Check each skill from Culture against actor
    for (let pid of cPIDs) {
      let currentSkill = actor.items.find((itm) => itm.flags?.Pendragon?.pidFlag?.id === pid);
      //If skill exists then update it
      if (currentSkill) {
        const change = {
          _id: currentSkill.id,
          "system.culture": 3,
        };
        changes.push(change);
      } else {
        //Skill doesn't exist so add it
        let bestSkills = await game.system.api.pid.fromPIDBest({ pid: pid });
        if (bestSkills) {
          let newSkill = bestSkills[0].toObject();
          newSkill.system.culture = 3;
          newSkills.push(newSkill);
        }
      }
    }
    await Item.createDocuments(newSkills, { parent: actor });
    await Item.updateDocuments(changes, { parent: actor });
    await actor.update({
      "system.stats.siz.culture": culture.system.stats.siz.bonus,
      "system.stats.dex.culture": culture.system.stats.dex.bonus,
      "system.stats.str.culture": culture.system.stats.str.bonus,
      "system.stats.con.culture": culture.system.stats.con.bonus,
      "system.stats.app.culture": culture.system.stats.app.bonus,
    });
    return true;
  }

  //Remove culture
  static async undoCulture(actor) {
    let cultures = actor.items
      .filter((itm) => itm.type === "culture")
      .map((itm) => {
        return itm.id;
      });
    await Item.deleteDocuments(cultures, { parent: actor });
    await actor.update({
      "system.stats.siz.culture": 0,
      "system.stats.dex.culture": 0,
      "system.stats.str.culture": 0,
      "system.stats.con.culture": 0,
      "system.stats.app.culture": 0,
    });
    let skills = actor.items
      .filter((itm) => itm.type === "skill")
      .map((itm) => {
        return { _id: itm.id, "system.culture": 0 };
      });
    await Item.updateDocuments(skills, { parent: actor });
    return;
  }

  //----------------------------------------------HOMELAND----------------------------------------------
  //
  //
  static async stepHomeland(actor, step, undo) {
    //Remove Homeland
    if (undo) {
      await this.undoHomeland(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Add Homeland
      //If actor has an Homeland then stop
      if (actor.system.homelandID != "") {
        return;
      } else {
        // Call addHomeland
        let result = await this.addHomeland(actor, false);
        if (!result) {
          return;
        }
        ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
      }
    }
    return;
  }

  //Add a homeland
  static async addHomeland(actor, homeland) {
    if (!homeland) {
      const itemData = await this.selectItem("homeland", false);
      if (!itemData) {
        ui.notifications.error(game.i18n.localize("PEN.noHomelands"));
        return false;
      }
      let newItems = await actor.createEmbeddedDocuments("Item", itemData);
      homeland = newItems[0];
    }
    let hPIDs = homeland.system.passions
      .filter((itm) => itm)
      .map((itm) => {
        return itm.pid;
      });
    let changes = [];
    let newPassions = [];
    //Check each passion from Homeland against actor
    for (let pid of hPIDs) {
      let currentPassion = actor.items.find((itm) => itm.flags?.Pendragon?.pidFlag?.id === pid);
      //If passion exists then update it
      if (currentPassion) {
        const change = {
          _id: currentPassion.id,
          "system.homeland": 5,
        };
        changes.push(change);
      } else {
        //Passion doesn't exist so add it
        let bestPassions = await game.system.api.pid.fromPIDBest({ pid: pid });
        if (bestPassions) {
          let newPassion = bestPassions[0].toObject();
          newPassion.system.homeland = 5;
          newPassions.push(newPassion);
        }
      }
    }
    await Item.createDocuments(newPassions, { parent: actor });
    await Item.updateDocuments(changes, { parent: actor });
    return;
  }

  //Undo add homeland- step 8
  static async undoHomeland(actor) {
    let homelands = actor.items
      .filter((itm) => itm.type === "homeland")
      .map((itm) => {
        return itm.id;
      });
    await Item.deleteDocuments(homelands, { parent: actor });
    let passions = actor.items
      .filter((itm) => itm.type === "passion")
      .map((itm) => {
        return { _id: itm.id, "system.homeland": 0 };
      });
    await Item.updateDocuments(passions, { parent: actor });
    return;
  }

  //----------------------------------------------CHARACTER NAME----------------------------------------------
  //
  //
  static async addName(actor) {
    let newName = await this.inpValue(game.i18n.localize("PEN.charName"));
    if (!newName || newName.age === "") return false;
    let key = (await game.system.api.pid.getPrefix(actor)) + PENUtilities.toKebabCase(newName.age);
    await actor.update({
      name: newName.age,
      "flags.Pendragon.pidFlag.id": key,
      "flags.Pendragon.pidFlag.lang": game.i18n.lang,
      "flags.Pendragon.pidFlag.priority": 0,
    });
    //Update PID icon
    const html = $(actor.sheet.element).find(
      "header.window-header .edit-pid-warning,header.window-header .edit-pid-exisiting",
    );
    if (html.length) {
      html.css({
        color: key ? "white" : "red",
      });
    }
    return true;
  }

  //----------------------------------------------CHARACTER GENDER----------------------------------------------
  //
  //
  static async addGender(actor) {
    let newName = await this.inpValue(game.i18n.localize("PEN.charGender"));
    if (!newName) return false;
    await actor.update({
      "system.gender": newName.age,
    });
    return true;
  }

  //----------------------------------------------RELIGION----------------------------------------------
  //
  //
  static async stepReligion(actor, step, undo) {
    //Remove Religion
    if (undo) {
      await this.undoReligion(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Add Religion
      //If actor has a Religion then stop
      if (actor.system.religionID != "") {
        return;
      } else {
        // Call addReligion
        let result = await this.addReligion(actor, false);
        if (!result) {
          return;
        }
        ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
      }
    }
    return;
  }

  static async addReligion(actor, religion) {
    if (!religion) {
      let itemData = "";
      //If creation method is random then roll for religion
      if (actor.system.create.random) {
        let results = [];

        //TO DO: Consider adding religion random table to Homeland and accessing that
        let table = (await game.system.api.pid.fromPIDBest({ pid: "rt..religion" }))[0];
        const religResults = await PENUtilities.tableDiceRoll(table);
        const doc = await this.documentFromResult(religResults.results[0]);
        if (!doc) {
          return;
        }
        itemData = await game.system.api.pid.fromPIDBest({ pid: doc.flags.Pendragon.pidFlag.id });
        results.push({
          name: doc.name,
          rollVal: religResults.roll.total,
          form: religResults.roll.formula,
          dice: religResults.roll.dice[0].results[0].result,
        });
        //Call Chat Card
        const html = await this.charGenRollChatCard(results, game.i18n.localize("PEN.religion"), actor.name);
        let msg = await this.showCharGenRollChat(html, actor);
      } else {
        //The creation method is constructed so pick the religion
        itemData = await this.selectItem("religion", false);
      }
      //In either case if itemData not present then error out
      if (!itemData) {
        return false;
      } else if (itemData === "xxx") {
        ui.notifications.error(game.i18n.localize("PEN.noReligions"));
        return false;
      }
      let newItem = await actor.createEmbeddedDocuments("Item", itemData);
      religion = newItem[0];
    }
    //Set trait religious modifier to +3/-3
    let theseTraits = [];
    let addSkills = [];
    let adj = 3;
    for (let tCount = 0; tCount < 2; tCount++) {
      if (tCount === 0) {
        theseTraits = religion.system.positive;
      } else {
        theseTraits = religion.system.negative;
        adj = -3;
      }
      let list = [];
      for (let thisTrait of theseTraits) {
        list.push(thisTrait.pid);
      }
      let traits = actor.items.filter((itm) => itm.type === "trait");
      let changes = traits
        .filter((rTrait) => list.includes(rTrait.flags.Pendragon.pidFlag.id))
        .map((rTrait) => {
          return { _id: rTrait.id, "system.religious": adj };
        });
      await Item.updateDocuments(changes, { parent: actor });
    }
    //Add relevant religious skill from the Religion item if one is there
    if (religion.system.deity.length > 0) {
      //Check to see if actor has the religion skill already
      let existSkill = await actor.items.filter(
        (itm) => itm.flags?.Pendragon?.pidFlag?.id === religion.system.deity[0].pid,
      );
      if (existSkill.length < 1) {
        //If not then add it
        let newSkills = await game.system.api.pid.fromPIDBest({ pid: religion.system.deity[0].pid });
        if (newSkills.length < 1) {
          ui.notifications.warn(religion.system.deity[0] + " : " + game.i18n.localize("PEN.invalidPID"));
          return true;
        }
        addSkills.push(newSkills[0]);
        await Item.createDocuments(addSkills, { parent: actor });
      }
    }
    return true;
  }

  //Undo religion creation step 5
  static async undoReligion(actor) {
    let religions = actor.items
      .filter((itm) => itm.type === "religion")
      .map((itm) => {
        return itm.id;
      });
    await Item.deleteDocuments(religions, { parent: actor });
    let traits = actor.items
      .filter((itm) => itm.type === "trait")
      .map((itm) => {
        return { _id: itm.id, "system.religious": 0 };
      });
    await Item.updateDocuments(traits, { parent: actor });
    return;
  }

  //----------------------------------------------CHARACTER LIEGE LORD----------------------------------------------
  //
  //
  static async addLord(actor) {
    let newName = await this.inpValue(game.i18n.localize("PEN.charLord"));
    if (!newName) return false;
    await actor.update({
      "system.lord": newName.age,
    });
    return true;
  }

  //----------------------------------------------CHARACTER RESIDENCE (NOT HOMELAND)----------------------------------
  //
  //
  static async addHome(actor) {
    let newName = await this.inpValue(game.i18n.localize("PEN.charHome"));
    if (!newName) return false;
    await actor.update({
      "system.home": newName.age,
    });
    return true;
  }

  //----------------------------------------------ROLL CHARACTERISTICS---------------------------------------------------
  //
  //
  static async stepStats(actor, step, undo) {
    //Reset Stats
    if (undo) {
      await this.resetStats(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Add Stats
      let result = await this.addStats(actor);
      if (!result) {
        return;
      }
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
    }
    return;
  }

  static async addStats(actor) {
    //If random construction method
    let stats = [];
    if (actor.system.create.random) {
      await this.rollStats(actor);
      //If creation method is constructed then choose stats
    } else {
      stats = await StatsSelectDialog.create(actor);
      if (!stats) {
        return false;
      }
      await actor.update({
        "system.stats.siz.value": Number(stats.siz.value),
        "system.stats.dex.value": Number(stats.dex.value),
        "system.stats.str.value": Number(stats.str.value),
        "system.stats.con.value": Number(stats.con.value),
        "system.stats.app.value": Number(stats.app.value),
      });
    }

    //Calculate distinctive features
    let disFeat = "4pos";
    let app = Number(actor.system.stats.app.value);
    if (app <= 5) {
      disFeat = "deathdoor";
    } else if (app <= 7) {
      disFeat = "3neg";
    } else if (app <= 9) {
      disFeat = "2neg";
    } else if (app <= 12) {
      disFeat = "negpos";
    } else if (app <= 15) {
      disFeat = "2pos";
    } else if (app <= 18) {
      disFeat = "3pos";
    }

    //Update Stats and features
    await actor.update({
      "system.features": game.i18n.localize("PEN.app." + disFeat),
      "system.create.charSet": true,
    });
    await this.baseSkillScore(actor);
    return true;
  }

  //Roll Characteristics
  static async rollStats(actor) {
    let results = [];
    let changes = {};
    for (let [key, stat] of Object.entries(actor.system.stats)) {
      //Set default formula and adjust if there is a culture
      let formula = stat.formula;
      let roll = await PENUtilities.complexDiceRoll(formula);
      let target = "system.stats." + key + ".value";
      let rollStr = "";
      for (let dCount = 0; dCount < roll.dice[0].results.length; dCount++)
        if (dCount === 0) {
          rollStr = roll.dice[0].results[dCount].result;
        } else {
          rollStr = rollStr + "+" + roll.dice[0].results[dCount].result;
        }
      results.push({
        name: stat.label,
        rollVal: roll.total,
        form: formula,
        dice: rollStr,
      });
      changes = Object.assign(changes, {
        [`system.stats.${key}.value`]: roll.total,
      });
    }
    await actor.update(changes);
    const html = await this.charGenRollChatCard(results, game.i18n.localize("PEN.characteristic"), actor.name);
    let msg = await this.showCharGenRollChat(html, actor);
    return;
  }

  static async resetStats(actor) {
    await actor.update({
      "system.stats.siz.value": 10,
      "system.stats.dex.value": 10,
      "system.stats.str.value": 10,
      "system.stats.con.value": 10,
      "system.stats.app.value": 10,
      "system.features": "",
      "system.create.charSet": false,
    });
    await this.baseSkillScore(actor);
    return;
  }

  //----------------------------------------------TRAITS----------------------------------------------
  //
  //

  static async stepTraits(actor, step, undo) {
    //Reset Stats
    if (undo) {
      await this.resetTraits(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Add Stats
      let result = await this.addTraits(actor);
      if (!result) {
        return;
      }
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
    }
    return;
  }

  static async addTraits(actor) {
    let title = game.i18n.localize("PEN.selectTrait");
    let changes = [];
    //If creation method is random
    if (actor.system.create.random) {
      await this.rollTraits(actor);
    } else {
      //If creation method is constructed
      let traits = actor.items.filter((item) => item.type === "trait").sort((a, b) => a.name.localeCompare(b.name));

      let optTraits = traits.map((uTrait) => {
        return {
          id: uTrait.id,
          name: uTrait.name,
          value: uTrait.system.total,
          origVal: uTrait.system.total,
          base: uTrait.system.value,
          minVal: 5,
          maxVal: 15,
          religious: uTrait.system.religious,
          oppName: uTrait.system.oppName,
          oppValue: uTrait.system.oppvalue,
          disabled: uTrait.system.total > 15,
        };
      });
      //Get the points spend
      let traitVal = await TraitsSelectDialog.create(optTraits, 6, false, game.i18n.localize("PEN.Entities.Trait"));
      if (!traitVal) {
        return false;
      }

      for (let uTrait of traitVal) {
        let delta = Number(uTrait.value) - Number(uTrait.origVal);
        changes.push({
          _id: uTrait.id,
          "system.value": Number(uTrait.base) + delta,
        });
      }
      await Item.updateDocuments(changes, { parent: actor });
    }
    return true;
  }

  //Roll Traits
  static async rollTraits(actor) {
    let changes = [];
    let results = [];
    let rTraits = actor.items.filter((item) => item.type === "trait");
    //Apply Archetype Bonus Traits
    let archetype = actor.items.find((itm) => itm.type === "archetype");

    for (let rTrait of rTraits) {
      //Skip any traits set at Archetype step
      if (rTrait.system.archetype != 0) continue;
      //Set dice formula
      let formula = "2D6+3";
      //Roll and display dice
      let roll = await PENUtilities.complexDiceRoll(formula);
      rTrait.system.value = Number(roll.total);
      changes.push({
        _id: rTrait.id,
        "system.value": rTrait.system.value,
      });
      let rollStr = "";
      for (let dCount = 0; dCount < roll.dice[0].results.length; dCount++)
        if (dCount === 0) {
          rollStr = roll.dice[0].results[dCount].result;
        } else {
          rollStr = rollStr + "+" + roll.dice[0].results[dCount].result;
        }
      results.push({
        name: rTrait.name,
        rollVal: roll.total,
        form: roll.formula,
        dice: rollStr,
      });
    }
    //Call Chat Card
    const html = await this.charGenRollChatCard(results, game.i18n.localize("PEN.traits"), actor.name);
    let msg = await this.showCharGenRollChat(html, actor);
    await Item.updateDocuments(changes, { parent: actor });
    return;
  }

  static async selectActorTrait(actor, title) {
    //Get list of items
    let newList = await actor.items.filter((itm) => itm.type === "trait").sort((a, b) => a.name.localeCompare(b.name));

    let destination = "systems/Pendragon/templates/dialog/selectTrait.hbs";
    let winTitle = title;
    let data = {
      newList,
    };
    const html = await foundry.applications.handlebars.renderTemplate(destination, data);
    const usage = await PENDialog.input({
      window: { title: winTitle },
      position: {
        width: 500,
      },
      content: html,
      ok: {
        label: game.i18n.localize("PEN.confirm"),
      },
    });

    //Get the UUID from the form
    let itemPID = "";
    let opposed = false;
    if (usage) {
      itemPID = usage.selectItem;
    }
    if (itemPID === "") {
      return [false, false];
    }
    if (itemPID.startsWith("OPPOSED")) {
      itemPID = itemPID.substring(7);
      opposed = true;
    }
    //Get the item details and return them
    const item = await actor.items.filter((itm) => itm.flags.Pendragon.pidFlag.id === itemPID);
    return [item[0], opposed];
  }

  static async resetTraits(actor) {
    let traits = actor.items
      .filter((itm) => itm.type === "trait")
      .map((itm) => {
        return { _id: itm.id, "system.value": 10 };
      });
    await Item.updateDocuments(traits, { parent: actor });
    return;
  }

  //----------------------------------------------STARTING CLASS & PASSIONS-------------------------------------------
  //
  //
  static async stepPassions(actor, step, undo) {
    //Remove Class & Passions
    if (undo) {
      await this.resetClass(actor, false);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Add Class
      let result = await this.chooseClass(actor);
      if (!result) {
        return;
        ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
      }
    }
    return;
  }

  static async chooseClass(actor) {
    //Open dialog and select the class  (not optional)
    let newList = await this.getClassList(actor, "only", true, true);
    let itemData = await this.selectItem("list", false, newList, game.i18n.localize("TYPES.Item.class"));
    if (!itemData) {
      return false;
    }
    if (itemData === "xxx") {
      ui.notifications.error(game.i18n.localize("PEN.noClasses"));
      return false;
    }
    await this.addClass(actor, itemData[0], false, false, true);
    return true;
  }

  //Add a class - once the class has been selected
  //actor = actor to add class to
  //actClass = class item to be added
  //ask = boolean - true = ask if random or constructed
  //addEquip = boolean - true = add equio as items
  //addPass = booelan - true = add passions
  static async addClass(actor, actClass, ask, addEquip, addPass = true) {
    let newItems = [];
    //Add Class Item to newItems array
    newItems.push(actClass);

    //If Adding Equipment add Class Gear to newItems array
    if (addEquip) {
      for (let newItm of actClass.system.gear) {
        let nItm = await game.system.api.pid.fromPIDBest({ pid: newItm.pid });
        if (nItm.length > 0) {
          newItems.push(nItm[0]);
        }
      }
    }

    //If addPass and ask = true then ask if Roll/Choose and update the actor
    if (addPass && ask) {
      let data = {
        msg: game.i18n.localize("PEN.rollWrite"),
        title: game.i18n.localize("PEN.creationMethod"),
        button1: { label: game.i18n.localize("PEN.roll"), icon: "fas fa-dice" },
        button2: { label: game.i18n.localize("PEN.construct"), icon: "fas fa-book-open-cover" },
      };
      let usage = await this.twoOptions(data);
      if (usage === "opt1") {
        await actor.update({ "system.create.random": true });
      } else {
        await actor.update({ "system.create.random": false });
      }
    }

    //If you want to add Passions
    if (addPass) {
      //Get points available to spend on passions
      let available = 15;
      let rollStr = "";
      let results = [];
      //If creation method is random roll for available points
      if (actor.system.create.random) {
        let roll = await PENUtilities.complexDiceRoll("4D6+1");
        available = roll.total;
        for (let dCount = 0; dCount < roll.dice[0].results.length; dCount++)
          if (dCount === 0) {
            rollStr = roll.dice[0].results[dCount].result;
          } else {
            rollStr = rollStr + "+" + roll.dice[0].results[dCount].result;
          }
        results.push({
          name: game.i18n.localize("PEN.devPoints"),
          rollVal: roll.total,
          form: roll.formula,
          dice: rollStr,
        });
      }

      //Get the list of passions off the actor
      let optPassions = await actor.items
        .filter((itm) => itm.type === "passion")
        .map((itm) => {
          return {
            id: itm.id,
            name: itm.name,
            value: itm.system.total,
            origVal: itm.system.total,
            pid: itm.flags.Pendragon.pidFlag.id,
            homeland: itm.system.homeland,
            source: "",
            minVal: itm.system.total,
            maxVal: 15,
          };
        });

      //Loop through the new Class passions & update source from optPassions
      let pPIDs = await actClass.system.passions.map((itm) => {
        return itm.pid;
      });
      for (let optPassion of optPassions) {
        if (pPIDs.includes(optPassion.pid)) {
          optPassion.source = actClass.system.passions.filter((itm) => itm.pid === optPassion.pid)[0].subType;
        }
      }

      //For each passion
      for (let aPass of optPassions) {
        if (actor.system.create.random) {
          //If random creation then roll the dice based on the class modifier (primary, secondary or tertiary) or homeland
          if (aPass.source != "") {
            //Set the dice if source is populated
            let formula = "1D6+2";
            if (aPass.source === "primary") {
              formula = "2D6+8";
            } else if (aPass.source === "secondary") {
              formula = "2D6+3";
            }
            //Roll and display dice
            let roll = await PENUtilities.complexDiceRoll(formula);
            aPass.value = Number(roll.total);
            aPass.origVal = Number(roll.total);
            aPass.minVal = Number(roll.total);

            for (let dCount = 0; dCount < roll.dice[0].results.length; dCount++)
              if (dCount === 0) {
                rollStr = roll.dice[0].results[dCount].result;
              } else {
                rollStr = rollStr + "+" + roll.dice[0].results[dCount].result;
              }
            results.push({
              name: aPass.name,
              rollVal: roll.total,
              form: roll.formula,
              dice: rollStr,
            });
          }
        } else {
          //If constructed method then set the values using the class/homeland modifiers
          if (aPass.source != "") {
            let val = 5;
            if (aPass.source === "primary") {
              val = 15;
            } else if (aPass.source === "secondary") {
              val = 10;
            }
            aPass.value = val;
            aPass.origVal = val;
            aPass.minVal = val;
          }
        }
      }
      if (results.length > 0) {
        //Call Chat Card
        const html = await this.charGenRollChatCard(results, game.i18n.localize("PEN.passions"), actor.name);
        let msg = await this.showCharGenRollChat(html, actor);
      }

      //Pass the data to trait select
      let passionVal = await ItemsSelectDialog.create(
        optPassions,
        available,
        true,
        game.i18n.localize("PEN.Entities.Passion"),
      );
      if (!passionVal) {
        return false;
      }

      //Update starting values
      for (let pItm of passionVal) {
        let item = actor.items.get(pItm.id);
        await item.update({ "system.value": Number(pItm.value) - Number(pItm.homeland) });
      }
    }

    //Create Item classes & Update Source
    let classItems = await Item.createDocuments(newItems, { parent: actor });
    let updateItems = classItems.map((itm) => {
      return { _id: itm.id, "system.source": "class" };
    });
    await Item.updateDocuments(updateItems, { parent: actor });
    return true;
  }

  static async resetClass(actor, knightly) {
    //Knightly is true where replacing a class after achieving the ideal (e.g. Squire to Knight)
    //Delete equipment and class
    let classes = await actor.items
      .filter((itm) => ["class", "horse", "armour", "weapon", "gear"].includes(itm.type))
      .filter((itm) => itm.system.source === "class" || itm.type === "class")
      .map((itm) => {
        return itm.id;
      });
    await Item.deleteDocuments(classes, { parent: actor });

    if (!knightly) {
      let passions = actor.items
        .filter((itm) => itm.type === "passion")
        .map((itm) => {
          return { _id: itm.id, "system.source": "", "system.value": 0 };
        });
      await Item.updateDocuments(passions, { parent: actor });
    }
    return;
  }

  //----------------------------------------------PARENT PASSION----------------------------------------------
  //
  //
  static async stepParentPassion(actor, step, undo) {
    //Remove Parent Passion
    if (undo) {
      await this.resetParentPassion(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Add Parent Passion
      let result = await this.addParentPassion(actor);
      if (!result) {
        return;
      }
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
    }
    return;
  }

  //Add Parent Passion
  static async addParentPassion(actor) {
    const parentPass = await this.selectItem("passion", true, "", game.i18n.localize("PEN.parentPass"));
    let passionPID = "";
    let bonus = 0;
    if (parentPass != false) {
      bonus = Number((await this.inpValue(game.i18n.localize("PEN.parentPassion"))).age);
      if (bonus > 15) {
        passionPID = parentPass[0].flags.Pendragon.pidFlag.id;
        bonus = Math.min(bonus - 15, 5);
        //Update the passion values
        let pPas = actor.items.find((itm) => itm.flags.Pendragon.pidFlag.id === passionPID);
        await pPas.update({ "system.inherit": bonus });
      }
    }
    return true;
  }

  //Reset parent passion
  static async resetParentPassion(actor) {
    let passions = actor.items
      .filter((itm) => itm.type === "passion")
      .map((itm) => {
        return { _id: itm.id, "system.inherit": 0 };
      });
    await Item.updateDocuments(passions, { parent: actor });
    return;
  }

  //----------------------------------------------FAMILY CHARACTERISTIC----------------------------------------------
  //
  //
  static async stepAddFamilyChar(actor, step, undo) {
    //Remove Family Characteristic
    if (undo) {
      await this.removeFamilyChar(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Add Family Characteristic
      let result = await this.addFamilyChar(actor);
      if (!result) {
        return;
      }
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
    }
    return;
  }

  //Get Family Characteristic
  static async addFamilyChar(actor) {
    let results = [];
    let table = (await game.system.api.pid.fromPIDBest({ pid: "rt..family-characteristic" }))[0];
    let selected = "";
    let fUUID = [];
    let rUUID = "";
    let beauty = 0;
    //If random rolls
    if (actor.system.create.random) {
      //Make first roll
      let tableOut = await this.makeTableRoll(table);
      let fRoll = tableOut.res;
      let dRoll = tableOut.tableResults;
      let resName = dRoll.results[0].name;
      if (fRoll.substring(0, 6).toLowerCase() === "gifted") {
        resName = fRoll;
      }
      results.push({
        name: resName,
        rollVal: dRoll.roll.total,
        form: dRoll.roll.formula,
        dice: dRoll.roll.dice[0].results[0].result,
      });

      if (fRoll.substring(0, 6).toLowerCase() === "gifted") {
        //If roll is gifted make two more rolls
        for (let rCount = 1; rCount < 3; rCount++) {
          let stableOut = await this.makeTableRoll(table);
          let sRoll = stableOut.res;
          let d2Roll = stableOut.tableResults;
          resName = d2Roll.results[0].name;
          if (sRoll.substring(0, 6).toLowerCase() === "gifted") {
            resName = game.i18n.localize("PEN.beauty");
          }
          results.push({
            name: resName,
            rollVal: d2Roll.roll.total,
            form: d2Roll.roll.formula,
            dice: d2Roll.roll.dice[0].results[0].result,
          });
          if (sRoll.substring(0, 6).toLowerCase() != "gifted") {
            fUUID.push(sRoll);
          } else {
            //If second or third rolls are gifted then become Transcendent Beauty
            beauty = beauty + 5;
          }
        }
      } else {
        fUUID.push(fRoll);
      }
      //Call Chat Card
      const html = await this.charGenRollChatCard(results, game.i18n.localize("PEN.familyChar"), actor.name);
      let msg = await this.showCharGenRollChat(html, actor);

      //Else if constructed
    } else {
      let results = await Promise.all(
        table.results
          .toObject(false)
          .filter((itm) => itm.type != "text")
          .map(async (itm) => {
            const doclookup = await this.documentFromResult(itm);
            let tempDoc = await fromUuid(doclookup.uuid);
            return { name: `${tempDoc.system.familyChar} (${tempDoc.system.mainName})`, pid: itm._id };
          }),
      );
      selected = await this.selectFromRadio("list", false, results);
      let res = table.results.toObject(false).filter((itm) => itm._id === selected)[0];
      switch (res.type) {
        case CONST.TABLE_RESULT_TYPES.DOCUMENT:
          rUUID = res.documentUuid;
          fUUID.push(rUUID);
          break;
        case CONST.TABLE_RESULT_TYPES.COMPENDIUM:
          rUUID = res.documentUuid;
          fUUID.push(rUUID);
          break;
        default:
          ui.notifications.error(game.i18n.localize("PEN.religDocGone"));
          return false;
      }
    }
    for (let fRes of fUUID) {
      const doc = await fromUuid(fRes);
      if (!doc) {
        ui.notifications.error(game.i18n.localize("PEN.religDocGone"));
        return false;
      }
      let item = await actor.items.find((itm) => itm.flags.Pendragon.pidFlag.id === doc.flags.Pendragon.pidFlag.id);
      if (!item) {
        //Special Case for Religion
        if (doc.flags.Pendragon.pidFlag.id === "i.skill.religion") {
          item = await actor.items.find(
            (itm) => itm.flags.Pendragon.pidFlag.id.substring(0, 16) === "i.skill.religion",
          );
        }
        if (!item) {
          let nItm = doc.toObject();
          let score = nItm.system.base.mod;
          if (nItm.system.base.stat != "none" && nItm.system.base.stat != "") {
            score =
              Number(score) +
              Number(
                Math.round(
                  (actor.system.stats[nItm.system.base.stat].value +
                    actor.system.stats[nItm.system.base.stat].culture) *
                    nItm.system.base.multi,
                ),
              );
          }
          score = Math.max(score, 0);
          nItm.system.value = score;
          await actor.createEmbeddedDocuments("Item", [nItm]);
          item = await actor.items.find((itm) => itm.flags.Pendragon.pidFlag.id === doc.flags.Pendragon.pidFlag.id);
        }
      }
      await item.update({ "system.family": Number(item.system.family) + 3 });
      if (actor.system.family === "") {
        await actor.update({ "system.family": item.system.familyChar });
      } else {
        await actor.update({ "system.family": actor.system.family + ", " + item.system.familyChar });
      }
    }
    if (beauty > 0) {
      if (actor.system.family === "") {
        await actor.update({ "system.family": game.i18n.localize("PEN.transcendent") + " (+" + beauty + ")" });
      } else {
        await actor.update({
          "system.family": game.i18n.localize("PEN.transcendent") + " (+" + beauty + "), " + actor.system.family,
        });
      }
    }
    await actor.update({ "system.beauty": beauty });
    return true;
  }

  //Remove Family Characteristic
  static async removeFamilyChar(actor) {
    let skills = actor.items
      .filter((itm) => itm.type === "skill")
      .map((itm) => {
        return { _id: itm.id, "system.family": 0 };
      });
    await Item.updateDocuments(skills, { parent: actor });
    await actor.update({ "system.family": "", "system.beauty": 0 });
    return;
  }

  //----------------------------------------------PERSONAL SKILL POINTS----------------------------------------------
  //
  //
  static async stepPersonalSkillPoints(actor, step, undo) {
    //Reset Personal Skill Points
    if (undo) {
      await this.resetPSP(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Add Family Characteristic
      let result = await this.addPSP(actor, 10);
      if (!result) {
        return;
      }
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
    }
    return;
  }

  //Spend Skill Points
  static async addPSP(actor, points) {
    let skills = await actor.items
      .filter((itm) => itm.type === "skill")
      .filter((itm) => itm.system.total > 0 || itm.system.weaponType != "")
      .filter((itm) => itm.system.total < 15)
      .map((itm) => {
        return {
          id: itm.id,
          name: itm.name,
          value: itm.system.total,
          origVal: itm.system.total,
          minVal: 0,
          maxVal: 15,
          stat: itm.system.base.stat,
          bonus: Number(itm.system.family) + Number(itm.system.culture),
        };
      });

    skills.sort(function (a, b) {
      let x = a.name;
      let y = b.name;
      if (x < y) {
        return -1;
      }
      if (x > y) {
        return 1;
      }
      return 0;
    });

    //Adjust min score for APP skills
    for (let sItm of skills) {
      if (sItm.stat === "app") {
        sItm.maxVal = actor.system.stats.app.total + sItm.bonus;
      }
    }
    let skillVal = await ItemsSelectDialog.create(skills, points, true, game.i18n.localize("PEN.Entities.Skill"));
    if (!skillVal) {
      return false;
    }
    let changes = [];
    for (let uSkill of skillVal) {
      changes.push({
        _id: uSkill.id,
        "system.create": Number(uSkill.value) - Number(uSkill.origVal),
      });
    }
    await Item.updateDocuments(changes, { parent: actor });
    return true;
  }

  //Reset Personal Skill Points
  static async resetPSP(actor) {
    let skills = actor.items
      .filter((itm) => itm.type === "skill")
      .map((itm) => {
        return { _id: itm.id, "system.create": 0 };
      });
    await Item.updateDocuments(skills, { parent: actor });
    return;
  }

  //----------------------------------------------TRAINING AND PRACTICE----------------------------------------------
  //
  //
  static async stepAddPractice(actor, step, undo) {
    //Reset Training & Practice
    if (undo) {
      await this.undoTraining(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Add Training and Practice
      let result = await this.addTraining(actor);
      if (!result) {
        return;
      }
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
    }
    return;
  }

  static async addTraining(actor) {
    //Get age
    let dlg = await this.inpValue(game.i18n.localize("PEN.ageInput"));
    if (!dlg) {
      return false;
    }
    let trained = false;
    let age = Number(dlg.age);
    if (age >= 14) {
      let expYears = age - 14;
      let changes = [];
      //Reset any winter training (for previous partially failed)
      await this.undoTraining(actor);

      if (expYears > 0) {
        for (let ageCount = 1; ageCount <= expYears; ageCount++) {
          let title = game.i18n.format("PEN.trainPrac", { curr: ageCount, max: expYears });
          let trainOpt = [
            { name: game.i18n.localize("PEN.skills"), pid: "1" },
            { name: game.i18n.localize("PEN.traits"), pid: "2" },
            { name: game.i18n.localize("PEN.passions"), pid: "3" },
            { name: game.i18n.localize("PEN.characteristic"), pid: "4" },
          ];
          let option = await this.selectItem("list", false, trainOpt, title);
          changes = [];
          switch (option) {
            //Option 1: Improve skills by 5 points
            case "1":
              let skills = await actor.items
                .filter((itm) => itm.type === "skill")
                .filter((itm) => itm.system.total > 0 && itm.system.total < 15)
                .map((itm) => {
                  return {
                    id: itm.id,
                    name: itm.name,
                    value: itm.system.total,
                    origVal: itm.system.total,
                    minVal: itm.system.total,
                    maxVal: 15,
                    winter: itm.system.winter,
                    stat: itm.system.base.stat,
                    bonus: Number(itm.system.family) + Number(itm.system.culture),
                  };
                });
              skills.sort(function (a, b) {
                let x = a.name;
                let y = b.name;
                if (x < y) {
                  return -1;
                }
                if (x > y) {
                  return 1;
                }
                return 0;
              });
              //Adjust min score for APP skills
              for (let sItm of skills) {
                if (sItm.stat === "app") {
                  sItm.maxVal = Math.max(Number(actor.system.stats.app.total) + Number(sItm.bonus), 15);
                }
              }
              let skillVal = await ItemsSelectDialog.create(skills, 5, true, game.i18n.localize("PEN.Entities.Skill"));
              if (!skillVal) {
                return false;
              }
              changes = await skillVal
                .filter((itm) => itm.value > itm.origVal)
                .map((itm) => {
                  return { _id: itm.id, "system.winter": Number(itm.winter) + Number(itm.value) - Number(itm.origVal) };
                });
              await Item.updateDocuments(changes, { parent: actor });
              break;

            //Option 2: Improve Traits
            case "2":
              let traits = await actor.items
                .filter((itm) => itm.type === "trait")
                .map((itm) => {
                  return {
                    id: itm.id,
                    name: itm.name,
                    value: itm.system.total,
                    origVal: itm.system.total,
                    religious: itm.system.religious,
                    oppName: itm.system.oppName,
                    oppValue: itm.system.oppvalue,
                    minVal: 1,
                    maxVal: 19,
                    winter: itm.system.winter,
                  };
                });
              traits.sort(function (a, b) {
                let x = a.name;
                let y = b.name;
                if (x < y) {
                  return -1;
                }
                if (x > y) {
                  return 1;
                }
                return 0;
              });
              let traitVal = await TraitsSelectDialog.create(
                traits,
                1,
                false,
                game.i18n.localize("PEN.Entities.Trait"),
              );
              if (!traitVal) {
                return false;
              }
              changes = await traitVal
                .filter((itm) => itm.value != itm.origVal)
                .map((itm) => {
                  return { _id: itm.id, "system.winter": Number(itm.winter) + Number(itm.value) - Number(itm.origVal) };
                });
              await Item.updateDocuments(changes, { parent: actor });
              break;

            //Option 3: Improve Passions
            case "3":
              let passions = await actor.items
                .filter((itm) => itm.type === "passion")
                .filter((itm) => itm.system.total > 0 && itm.system.total < 20)
                .map((itm) => {
                  return {
                    type: itm.type,
                    label: game.i18n.localize("PEN." + itm.type),
                    itemID: itm._id,
                    name: itm.name,
                    value: itm.system.total,
                    origValue: itm.system.total,
                    court: itm.system.court,
                    level: itm.system.level,
                    choice: "",
                    max: 20,
                    min: itm.system.total,
                    winter: itm.system.winter,
                  };
                });
              // Sort Options
              passions.sort(function (a, b) {
                return a.court.localeCompare(b.court) || a.label.localeCompare(b.label) || a.name.localeCompare(b.name);
              });
              const passVal = await PassionsSelectDialog.create(title, passions, 1, 1);
              if (!passVal || passVal.length < 1) {
                return false;
              }
              changes = await passVal
                .filter((itm) => itm.value != itm.origValue)
                .map((itm) => {
                  return {
                    _id: itm.itemID,
                    "system.winter": Number(itm.winter) + Number(itm.value) - Number(itm.origValue),
                  };
                });
              await Item.updateDocuments(changes, { parent: actor });
              break;

            //Option 3: Improve a stat
            case "4":
              let stats = [];
              for (let [key, stat] of Object.entries(actor.system.stats)) {
                if (stat.value < stat.max) {
                  stats.push({
                    id: key,
                    name: stat.label,
                    value: stat.total,
                    origVal: stat.total,
                    minVal: stat.total,
                    maxVal: stat.max,
                  });
                }
              }
              const chosen = await ItemsSelectDialog.create(stats, 1, true, game.i18n.localize("PEN.characteristic"));
              if (!chosen) {
                await this.undoTraining(actor);
                return false;
              }
              for (let selected of chosen) {
                if (selected.value > selected.origVal) {
                  let target = "system.stats." + selected.id + ".winter";
                  await actor.update({ [target]: actor.system.stats[selected.id].winter + 1 });
                }
              }
              break;
          }
        }
      }
      trained = true;
    }
    //Calc birth year and create history event
    let birth = game.time.components.year - Number(age);
    await this.createHistory(actor, game.i18n.localize("PEN.born"), birth, 0, "born", "");
    await actor.update({
      "system.born": birth,
      "system.create.train": trained,
    });
    return true;
  }

  //Undo training and development
  static async undoTraining(actor) {
    let skills = actor.items
      .filter((itm) => ["skill", "passion", "trait"].includes(itm.type))
      .map((itm) => {
        return { _id: itm.id, "system.winter": 0 };
      });
    await Item.updateDocuments(skills, { parent: actor });
    await actor.update({
      "system.stats.siz.winter": 0,
      "system.stats.dex.winter": 0,
      "system.stats.str.winter": 0,
      "system.stats.con.winter": 0,
      "system.stats.app.winter": 0,
      "system.features": "",
    });
    let history = await actor.items
      .filter((itm) => itm.type === "history")
      .filter((itm) => ["born"].includes(itm.system.source))
      .map((itm) => {
        return itm.id;
      });
    await Item.deleteDocuments(history, { parent: actor });
    await actor.update({
      "system.born": 487,
      "system.create.train": false,
    });

    return;
  }

  //----------------------------------------------MEET IDEAL----------------------------------------------
  //
  //
  static async stepMeetIdeal(actor, step, undo) {
    //Reset Ideal promotion
    if (undo) {
      await this.undoMeetIdeal(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Make Ideal Promotion
      let result = await this.meetIdeal(actor);
      if (!result) {
        return;
      }
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
    }
    return;
  }

  //Meet the ideal requirements?
  static async meetIdeal(actor) {
    let archetype = await actor.items.find((itm) => itm.type === "archetype");
    if (!archetype) {
      ui.notifications.warn(actor.name + ": " + game.i18n.format("PEN.noItem", {child: game.i18n.localize('TYPES.Item.archetype'), parent: game.i18n.localize('TYPES.Actor.character')}));
      return false;
    }
    let idealPID = archetype.system.ideals[0].pid;
    if (!idealPID) {
      ui.notifications.warn(actor.name + ": " + game.i18n.format("PEN.noItem", {child: game.i18n.localize('TYPES.Item.ideal'), parent: game.i18n.localize('TYPES.Item.archetype')}));
      return false;
    }
    let ideal = await actor.items.find((itm) => itm.flags?.Pendragon?.pidFlag?.id === idealPID);
    if (!ideal) {
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.idealMissing"));
      return false;
    }
    if (!ideal.system.activeIdeal) {
      ui.notifications.warn(actor.name + ": " + game.i18n.format("PEN.notEnoughReq", {name: ideal.name}));
      return false;

    }

    let data = {
      msg: game.i18n.format("PEN.beKnighted", { type: ideal.name }),
      title: game.i18n.format("PEN.beKnighted", { type: ideal.name }),
      button1: { label: game.i18n.localize("PEN.yes"), icon: "fas fa-swords" },
      button2: { label: game.i18n.localize("PEN.no"), icon: "fas fa-shield" },
    };
    let usage = await this.twoOptions(data);
    if (!usage) {
      return true;
    }

    //Knight Specific Action
    if (idealPID === "i.ideal.knight") {
      let lord = await this.inpValue(game.i18n.localize("PEN.lordsGlory"));
      if (!lord) return false;
      lord = Number(lord.age);
      let glory = 1000 + Math.min(Math.round(lord / 100), 1000);

      //Make the Leap
      let msgID = await PENCheck._trigger({
        rollType: "CH",
        cardType: "NO",
        characteristic: "dex",
        shiftKey: true,
        actor: actor,
        token: "",
      });

      //Make the leap
      let level = await game.messages.get(msgID).flags.Pendragon.chatCard[0].resultLevel;
      if (level === 3) {
        glory = glory + 50;
      } else if (level === 2) {
        glory = glory + 25;
      }
      let msg = game.i18n.localize("PEN.leap." + level);

      await this.createHistory(
        actor,
        game.i18n.localize("PEN.knighted") + " (" + msg + ")",
        game.time.components.year,
        glory,
        "knighted",
        "",
      );
    } else {
      await this.createHistory(
        actor,
        game.i18n.format("PEN.becameA", { type: ideal.name }),
        game.time.components.year,
        0,
        "knighted",
        "",
      );
    }
    //Change Class to Archetype non-starter class
    let newList = await this.getClassList(actor, "exclude", true, false);
    let itemData = await this.selectItem("list", false, newList, game.i18n.localize("TYPES.Item.class"));
    if (!itemData) {
      return false;
    }
    if (itemData === "xxx") {
      ui.notifications.error(game.i18n.localize("PEN.noClasses"));
      return false;
    }
    //Delete current class without removing passions
    await this.resetClass(actor, true);
    //Add new class
    await this.addClass(actor, itemData[0], false, false, false);

    await actor.update({ "system.create.knighted": true });
    return true;
  }

  //Undo Meet Ideal (e.g. knighted)
  static async undoMeetIdeal(actor) {
    let history = actor.items
      .filter((itm) => ["history"].includes(itm.type))
      .filter((itm) => itm.system.source === "knighted")
      .map((itm) => {
        return itm.id;
      });
    await Item.deleteDocuments(history, { parent: actor });
    await actor.update({ "system.create.knighted": false });
    return;
  }

  //----------------------------------------------ADD PARENTS----------------------------------------------
  //
  //
  static async stepAddParents(actor, step, undo) {
    //Remove Parents
    if (undo) {
      await this.removeParents(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Make Ideal Promotion
      let result = await this.addParents(actor);
      if (!result) {
        return;
      }
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
    }
    return;
  }

  static async addParents(actor) {
    let glory = 0;
    let heroic = 0;
    let result = "";
    let maxGlory = 0;
    let maxHeroic = 0;
    let options = {
      dialogTemplate: "systems/Pendragon/templates/dialog/familyInput.hbs",
    };
    let usage = await this.familyDialog(options);
    if (!usage) {
      return false;
    }
    let familyName = [usage.familyName1, usage.familyName2];
    let gender = [usage.gender1, usage.gender2];
    let born = [Number(usage.born1), Number(usage.born2)];
    let died = [Number(usage.died1), Number(usage.died2)];
    let knight = [usage.knight1, usage.knight2];
    //Loop through each potential parent
    for (let pCount = 0; pCount < 2; pCount++) {
      //If the parent has a name then create the family member
      if (familyName[pCount] != "") {
        //If Knight then make two Glory rolls
        if (knight[pCount]) {
          result = await this.gloryRoll(familyName[pCount], actor);
          glory = result.glory;
          heroic = result.heroic;
        } else {
          glory = 0;
          heroic = 0;
        }

        const itemData = {
          name: familyName[pCount],
          type: "family",
          system: {
            relation: "parent",
            gender: gender[pCount],
            born: born[pCount],
            died: died[pCount],
            glory,
            heroic,
          },
        };
        // Finally, create the item and add the PID details.
        let family = await Item.create(itemData, { parent: actor });
        let key = await game.system.api.pid.guessId(family);
        await family.update({
          "flags.Pendragon.pidFlag.id": key,
          "flags.Pendragon.pidFlag.lang": game.i18n.lang,
          "flags.Pendragon.pidFlag.priority": 0,
        });
        if (glory > maxGlory) {
          maxGlory = glory;
          maxHeroic = heroic;
        }
      }
    }
    //Create History Item for the actor for Inheritance
    maxGlory = Math.min(Math.round(maxGlory / 4), 4000);

    await this.createHistory(actor, game.i18n.localize("PEN.squired"), actor.system.born + 14, maxGlory, "squired", "");

    //Create the heroic event histories and add the PID details
    for (let cCount = 1; cCount <= maxHeroic; cCount++) {
      let description = "";
      let title = game.i18n.localize("PEN.parentHeroicEvent");
      let year = game.time.components.year;
      let results = [];
      let table = await game.system.api.pid.fromPIDBest({ pid: "rt..table-3-1-heroic-event" });
      if (table.length > 0) {
        const heroicResults = await PENUtilities.tableDiceRoll(table[0]);
        if (heroicResults) {
          description = heroicResults.results[0].description;
          let name = heroicResults.results[0].name;
          let tempYear = name;
          if (tempYear.search("Year:") >= 0) {
            title = title + ": " + tempYear.split("(Year:")[0];
            tempYear = tempYear.split("Year:")[1];
            tempYear = tempYear.split(")")[0];
            let roll = new Roll(tempYear);
            await roll.evaluate();
            year = Number(roll.total);
          } else {
            title = title + ": " + name;
            year = actor.system.born - 1;
          }
        }
      }
      await this.createHistory(actor, title, year, 0, "inherited", description);
    }
    await actor.update({ "system.create.parents": true });
    return true;
  }

  //Remove Parents and History
  static async removeParents(actor) {
    let parents = await actor.items
      .filter((itm) => itm.type === "family")
      .filter((itm) => itm.system.relation === "parent")
      .map((itm) => {
        return itm.id;
      });
    let history = await actor.items
      .filter((itm) => itm.type === "history")
      .filter((itm) => ["inherited", "squired"].includes(itm.system.source))
      .map((itm) => {
        return itm.id;
      });
    await Item.deleteDocuments(parents, { parent: actor });
    await Item.deleteDocuments(history, { parent: actor });
    await actor.update({ "system.create.parents": false });
    return;
  }

  //----------------------------------------------ADD HEIR----------------------------------------------
  //
  //
  static async stepAddHeir(actor, step, undo) {
    //Remove Parents
    if (undo) {
      await this.undoHeir(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Make Ideal Promotion
      let result = await this.addHeir(actor);
      if (!result) {
        return;
      }
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
    }
    return;
  }

  //Add Heir Status
  static async addHeir(actor) {
    let data = {
      msg: game.i18n.localize("PEN.heirStatus"),
      title: game.i18n.localize("PEN.heir"),
      button1: { label: game.i18n.localize("PEN.yes"), icon: "fas fa-shield-quartered" },
      button2: { label: game.i18n.localize("PEN.no"), icon: "fas fa-shield-cross" },
    };
    let usage = await this.twoOptions(data);
    if (!usage) {
      return false;
    }
    let status = false;
    if (usage === "opt1") {
      status = true;
    }
    await actor.update({
      "system.heir": status,
      "system.create.heirStat": true,
    });
    return true;
  }

  //Reset Heir Status
  static async undoHeir(actor) {
    await actor.update({
      "system.heir": false,
      "system.create.heirStat": false,
    });
    return true;
  }

  //----------------------------------------------ADD EQUIPMENT----------------------------------------------
  //
  //
  static async stepAddEquip(actor, step, undo) {
    //Remove Parents
    if (undo) {
      await this.undoEquip(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Make Ideal Promotion
      let result = await this.addEquip(actor);
      if (!result) {
        return;
      }
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
    }
    return;
  }

  //Add Starting Equipment
  static async addEquip(actor) {
    await this.undoEquip(actor);
    let actClass = await actor.items.filter((i) => i.type === "class");
    if (actClass.length < 1) {
      return false;
    }
    let newItems = [];
    //Add Class Gear to newItems array
    for (let newItm of actClass[0].system.gear) {
      let nItm = await game.system.api.pid.fromPIDBest({ pid: newItm.pid });
      if (nItm.length > 0) {
        newItems.push(nItm[0]);
      }
    }
    let classItems = await Item.createDocuments(newItems, { parent: actor });
    let updateItems = classItems.map((itm) => {
      return { _id: itm.id, "system.source": "class" };
    });
    await Item.updateDocuments(updateItems, { parent: actor });
    return true;
  }

  //Undo Starting Equipment
  static async undoEquip(actor) {
    let equip = await actor.items
      .filter((itm) => itm.type != "class")
      .filter((itm) => itm.system.source === "class")
      .map((itm) => {
        return itm.id;
      });
    await Item.deleteDocuments(equip, { parent: actor });
    return;
  }

  //----------------------------------------------ADD HEIR----------------------------------------------
  //
  //
  static async stepLuckBenefit(actor, step, undo) {
    //Remove Parents
    if (undo) {
      await this.removeLuckBenefit(actor);
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.undo." + step));
    } else {
      //Make Ideal Promotion
      let result = await this.addLuckBenefit(actor);
      if (!result) {
        return;
      }
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.create." + step));
    }
    return;
  }


  //----------------------------------------------ADD LUCK BENEFIT----------------------------------------------
  //
  //
  static async addLuckBenefit(actor) {
    let results = [];
    let archetype = await actor.items.find((itm) => itm.type === "archetype");
    if (!archetype) {
      ui.notifications.warn(actor.name + ": " + game.i18n.format("PEN.noItem", {child: game.i18n.localize('TYPES.Item.archetype'), parent: game.i18n.localize('TYPES.Actor.character')}));
      return false;
    }
    let idealPID = archetype.system.ideals?.[0]?.pid;
    if (!idealPID) {
      ui.notifications.warn(actor.name + ": " + game.i18n.format("PEN.noItem", {child: game.i18n.localize('TYPES.Item.ideal'), parent: game.i18n.localize('TYPES.Item.archetype')}));
      return false;
    }
    let ideal = await actor.items.find((itm) => itm.flags?.Pendragon?.pidFlag?.id === idealPID);
    if (!ideal) {
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.idealMissing"));
      return false;
    }
    if (!ideal.system.activeIdeal) {
      ui.notifications.warn(actor.name + ": " + game.i18n.format("PEN.notEnoughReq", {name: ideal.name}));
      return false;

    }
    let tablePID = ideal.system.luck?.[0]?.pid;
    if (!tablePID) {
      ui.notifications.warn(actor.name + ": " + game.i18n.localize("PEN.noLuckBenefit"));
      return false;
    }
    let table = (await game.system.api.pid.fromPIDBest({ pid: tablePID }))[0];
    if (!table) {
      ui.notifications.warn(actor.name + ": " + game.i18n.format("PEN.noNamedTable", {name: tablePID}));
      return false;
    }
    const luckResults = await PENUtilities.tableDiceRoll(table);
    const res = luckResults.results[0];
    let rUUID = "";
    switch (res.type) {
      case CONST.TABLE_RESULT_TYPES.DOCUMENT:
        rUUID = res.documentUuid;
        break;
      case CONST.TABLE_RESULT_TYPES.COMPENDIUM:
        rUUID = res.documentUuid;
        break;
      default:
        ui.notifications.error(
          actor.name + ": " + game.i18n.format("PEN.notTableDoc", { name: game.i18n.localize("PEN.luckBen") }),
        );
        return false;
    }
    const doc = await fromUuid(rUUID);
    let itemData = await game.system.api.pid.fromPIDBest({ pid: doc.flags?.Pendragon?.pidFlag?.id });

    results.push({
      name: doc.name,
      rollVal: luckResults.roll.total,
      form: luckResults.roll.formula,
      dice: luckResults.roll.dice[0].results[0].result,
    });
    //Call Chat Card
    const html = await this.charGenRollChatCard(results, game.i18n.localize("PEN.luckBen"), actor.name);
    let msg = await this.showCharGenRollChat(html, actor);
    let luck = await actor.createEmbeddedDocuments("Item", itemData);
    await luck[0].update({ "system.source": "luck" });
    return true;
  }

  static async removeLuckBenefit(actor) {
    //Get ready to delete items
    let startItems = actor.items
      .filter((itm) => ["gear"].includes(itm.type))
      .filter((itm) => itm.system.source === "luck")
      .map((itm) => {
        return itm.id;
      });
    await Item.deleteDocuments(startItems, { parent: actor });
    return;
  }

  //----------------------------------------------UTILITIES----------------------------------------------
  //
  //
  static async baseSkillScore(actor) {
    //Go through actors skills and calculate the base score
    let changes = [];
    for (let item of actor.items) {
      if (item.type === "skill") {
        let score = item.system.base.mod;
        if (item.system.base.stat != "none") {
          score =
            Number(score) +
            Number(
              Math.round(
                (actor.system.stats[item.system.base.stat].value + actor.system.stats[item.system.base.stat].culture) *
                  item.system.base.multi,
              ),
            );
        }
        score = Math.max(score, 0);
        const change = {
          _id: item.id,
          "system.value": score,
        };
        changes.push(change);
      }
    }
    await Item.updateDocuments(changes, { parent: actor });
    return true;
  }

  //Parse Archetype Formaule in to skill base components
  static async skillParse(formula) {
    formula = String(formula ?? "0").toLowerCase().replace(/\s+/g, "");
    let stat = "none";
    let multiplier = 0;
    let modifier = 0;
    if (!isNaN(formula) && !isNaN(parseFloat(formula))) {
      modifier = Number(formula);
    } else {
      stat = formula.match(/str|dex|con|siz|app/)?.[0] ?? "none";
      if (stat !== "none") multiplier = 1;
      const lead = formula.match(/^(\d+(?:\.\d+)?)\s*\*?\s*(?=str|dex|con|siz|app)/);
      if (lead) multiplier = Number(lead[1]);
      let operators = formula.replace(/^\d+(?:\.\d+)?\*/, "").match(/[+\-*/]\d+/g);
      if (operators) {
        for (let operator of operators) {
          let op = operator.charAt(0);
          let value = Number(operator.slice(1));
          switch (op) {
            case "+":
              modifier = value;
              break;
            case "-":
              modifier = -value;
              break;
            case "*":
              multiplier = value;
              break;
            case "/":
              if (value != 0) {
                multiplier = 1 / value;
              }
              break;
          }
        }
      }
    }
    return { stat, multiplier, modifier };
  }

  //Choose Item Dialog
  //source = item type or "list"
  //optional - if true add a "none" option
  //list - prepopulated list (name,pid) only used where source = "list"
  //winTitle - title of the selection box
  static async selectItem(source, optional, list, winTitle) {
    //Get list of items
    let newList = [];
    if (source === "list") {
      newList = list;
    } else {
      let mainList = await game.system.api.pid.fromPIDRegexBest({
        pidRegExp: new RegExp("^i." + PENUtilities.quoteRegExp(source) + ".+$"),
        type: "i",
      });
      newList = mainList.map((itm) => {
        return { name: itm.name, pid: itm.flags.Pendragon.pidFlag.id };
      });
      if (!winTitle) {
        winTitle = game.i18n.format("PEN.selectItem", {
          type: game.i18n.localize("PEN.Entities." + `${source.capitalize()}`),
        });
      }
    }
    if (optional) {
      newList.push({
        name: game.i18n.localize("PEN.none"),
        pid: "none",
      });
    }
    let itemPID = "";
    if (newList.length < 1) {
      return "xxx";
    }
    if (newList.length === 1) {
      itemPID = newList[0].pid;
    } else {
      let destination = "systems/Pendragon/templates/dialog/selectItem.hbs";
      let data = {
        newList,
      };
      const html = await foundry.applications.handlebars.renderTemplate(destination, data);

      const usage = await PENDialog.input({
        window: { title: winTitle },
        content: html,
        ok: {
          label: game.i18n.localize("PEN.confirm"),
        },
      });

      //Get the PID from the form
      if (usage) {
        itemPID = usage.selectItem;
      }
    }
    if (itemPID === "" || itemPID === "none") {
      return false;
    }
    if (["1", "2", "3", "4", "16"].includes(itemPID)) {
      return itemPID;
    }
    //Get the item details and return them

    const itemData = await game.system.api.pid.fromPIDBest({ pid: itemPID });
    return itemData;
  }

  //Display two button chat window
  //Data should contain
  //msg = message to appear on the form
  //title = to appear on the dialog box
  //button1 (label & icon)
  //button2 (label & icon)
  static async twoOptions(data) {
    const html = await foundry.applications.handlebars.renderTemplate(
      "systems/Pendragon/templates/dialog/2buttons.hbs",
      data,
    );
    const usage = await PENDialog.wait({
      window: { title: data.title },
      content: html,
      buttons: [
        {
          label: data.button1.label,
          action: "opt1",
          icon: data.button1.icon,
        },
        {
          label: data.button2.label,
          action: "opt2",
          icon: data.button2.icon,
        },
      ],
    });
    return usage;
  }

  //Get value input
  static async inpValue(title) {
    let inpVal = await PENDialog.input({
      window: { title: title },
      content: `<input class="stat-name centre" type="text" name="age">`,
    });
    return inpVal;
  }

  //Return a Document from a Roll Table result
  static async documentFromResult(res) {
    let uuid = "";
    switch (res.type) {
      case CONST.TABLE_RESULT_TYPES.DOCUMENT:
        uuid = res.documentUuid;
        break;
      case CONST.TABLE_RESULT_TYPES.COMPENDIUM:
        uuid = res.documentUuid;
        break;
      default:
        ui.notifications.error(game.i18n.localize("PEN.notReligDoc"));
        return false;
    }
    return await fromUuid(uuid);
  }

  //Family table roll
  static async makeTableRoll(table) {
    let uuid = "";
    const tableResults = await PENUtilities.tableDiceRoll(table);
    const res = tableResults.results[0];
    switch (res.type) {
      case CONST.TABLE_RESULT_TYPES.DOCUMENT:
        uuid = res.documentUuid;
        return { res: uuid, tableResults: tableResults };
      case CONST.TABLE_RESULT_TYPES.COMPENDIUM:
        uuid = res.documentUuid;
        return { res: uuid, tableResults: tableResults };
      default:
        return { res: res.text, tableResults: tableResults };
    }
  }

  //Prepare Random Roll Chat Card
  static async charGenRollChatCard(list, type, actorName) {
    let messageData = {
      speaker: ChatMessage.getSpeaker({ actor: actorName }),
      list: list,
      type: type,
    };
    const messageTemplate = "systems/Pendragon/templates/chat/charGenRoll.hbs";
    let html = await foundry.applications.handlebars.renderTemplate(messageTemplate, messageData);

    return html;
  }

  // Display the random roll chat card
  static async showCharGenRollChat(html, actor) {
    let chatData = {};
    chatData = {
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: html,
      speaker: {
        actor: actor._id,
        alias: actor.name,
      },
    };
    let msg = await ChatMessage.create(chatData);
    return;
  }

  //Get class list
  //startClassFilter: only = only include Starter Classes
  //                   exclude = exclude starter classes
  //                   all = no filter
  //archetypeFilter: true then filter classes in ator archetype
  //emptyList: true = return full list if nothing after filters
  static async getClassList(actor, starterClassFilter, archetypeFilter, emptyList) {
    let mainList = await game.system.api.pid.fromPIDRegexBest({
      pidRegExp: new RegExp("^i." + PENUtilities.quoteRegExp("class") + ".+$"),
      type: "i",
    });
    let tempList = mainList.map((itm) => {
      return { name: itm.name, pid: itm.flags.Pendragon.pidFlag.id };
    });
    if (starterClassFilter === "only") {
      mainList = mainList.filter((i) => i.system.starter);
    } else if (starterClassFilter === "exclude") {
      mainList = mainList.filter((i) => !i.system.starter);
    }
    mainList = mainList.map((itm) => {
      return { name: itm.name, pid: itm.flags.Pendragon.pidFlag.id };
    });
    if (archetypeFilter) {
      const archetype = actor.items.find((itm) => itm.type === "archetype");
      if (archetype) {
        let archetypeList = archetype.system.classes.map((c) => c.pid);
        mainList = mainList
          .filter((i) => archetypeList.includes(i.pid))
          .map((itm) => {
            return { name: itm.name, pid: itm.pid };
          });
      }
    }
    if (mainList.length > 0 || !emptyList) {
      return mainList;
    } else {
      return tempList;
    }
  }

  //Choose Item Dialog
  static async selectFromRadio(source, optional, list, title) {
    //Get list of items
    let newList = [];
    if (source != "list") {
      newList = await game.system.api.pid.fromPIDRegexBest({
        pidRegExp: new RegExp("^i." + PENUtilities.quoteRegExp(source) + ".+$"),
        type: "i",
      });
    } else {
      newList = list;
    }

    //If optional = true add "none" as an option
    if (optional) {
      newList.unshift({
        name: game.i18n.localize("PEN.none"),
        pid: "none",
      });
    }

    //If there's only one item on the list then return it
    let itemPID = "";
    if (newList.length < 1) {
      return false;
    }
    if (newList.length === 1) {
      itemPID = newList[0].flags?.Pendragon?.pidFlag?.id ?? newList[0].pid;

      //Otherwise call the dialog selection
    } else {
      let destination = "systems/Pendragon/templates/dialog/selectItem.hbs";
      let winTitle = game.i18n.format("PEN.selectItem", {
        type: game.i18n.localize("PEN.Entities." + `${source.capitalize()}`),
      });
      let data = {
        headTitle: title,
        newList,
      };
      const html = await foundry.applications.handlebars.renderTemplate(destination, data);
      const usage = await PENDialog.input({
        window: { title: winTitle },
        content: html,
        ok: {
          label: game.i18n.localize("PEN.confirm"),
        },
      });

      //Get the PID from the form
      if (usage) {
        itemPID = usage.selectItem;
      }
    }
    if (itemPID === "") {
      return false;
    }
    return itemPID;
  }

  //Create history item
  static async createHistory(actor, name, year, glory, source, description) {
    const itemData = {
      name: name,
      type: "history",
      system: {
        year: year,
        description: description,
        glory: glory,
        source: source,
      },
    };
    let histItem = await Item.create(itemData, { parent: actor });
    let key = await game.system.api.pid.guessId(histItem);
    await histItem.update({
      "flags.Pendragon.pidFlag.id": key,
      "flags.Pendragon.pidFlag.lang": game.i18n.lang,
      "flags.Pendragon.pidFlag.priority": 0,
    });
    return;
  }

  //Parents Dialog Box
  static async familyDialog(options) {
    const data = {};
    const html = await foundry.applications.handlebars.renderTemplate(options.dialogTemplate, data);
    const usage = await PENDialog.input({
      window: { title: game.i18n.localize("PEN.parents") },
      content: html,
      ok: {
        label: game.i18n.localize("PEN.addParents"),
      },
    });
    return usage;
  }

  //Glory Roll
  static async gloryRoll(parentName, actor) {
    let results = [];
    let roll1 = await PENUtilities.complexDiceRoll("2D6");
    let roll2 = await PENUtilities.complexDiceRoll("3D6");
    let glory = Number(roll1.total) * 100 + 2000 + Number(roll2.total) * 100 + 500;
    let heroic = Math.floor((Number(roll2.total) * 100 + 500) / 500);
    let result = { glory, heroic };

    let rollStr = "";
    for (let dCount = 0; dCount < roll1.dice[0].results.length; dCount++)
      if (dCount === 0) {
        rollStr = roll1.dice[0].results[dCount].result;
      } else {
        rollStr = rollStr + "+" + roll1.dice[0].results[dCount].result;
      }
    for (let dCount = 0; dCount < roll2.dice[0].results.length; dCount++) {
      rollStr = rollStr + "+" + roll2.dice[0].results[dCount].result;
    }

    results.push({
      name: parentName,
      rollVal: Number(roll1.total) + Number(roll2.total),
      form: "2d6 + 3d6",
      dice: rollStr,
    });

    //Call Chat Card
    const html = await this.charGenRollChatCard(results, game.i18n.localize("PEN.gloryRoll"), parentName);
    let msg = await this.showCharGenRollChat(html, actor);
    return result;
  }
}
