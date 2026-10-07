import { PENUtilities } from "./utilities.mjs";
import { TraitsSelectDialog } from "./trait-selection.mjs";
import { PassionsSelectDialog } from "./passion-selection.mjs";
import { PENSelectLists } from "./select-lists.mjs";
import { PENCheck } from "../apps/checks.mjs";
import { PENCharCreate } from "./charCreate.mjs";
import { SkillTrainingDialog } from "./skill-training-selection.mjs";
import PENDialog from "../setup/pen-dialog.mjs";

export class PENWinter {
  //
  //Only living, player owned characters take part in the Winter Phase
  //
  static isWinterParticipant(actor) {
    return (
      actor.type === "character" &&
      actor.hasPlayerOwner &&
      !(Number(actor.system.died) > 0) &&
      !actor.statuses.has("dead")
    );
  }

  //
  //Should the character sheet show the Winter Phase tab
  //
  static showWinterTab(actor) {
    return (
      actor.system.status.winter ||
      ((game.settings.get("Pendragon", "winter") || game.settings.get("Pendragon", "development")) &&
        PENWinter.isWinterParticipant(actor))
    );
  }

  //
  //GM only sheet header menu entry to start/end an Individual Winter Phase
  //
  static headerControls(actor) {
    //Dead or non player characters can't start one, but one already running can still be ended
    if (!game.user.isGM || (!actor.system.status.winter && !PENWinter.isWinterParticipant(actor))) {
      return [];
    }
    return [
      {
        icon: "fa-solid fa-snowflake",
        label: actor.system.status.winter ? "PEN.individualWinterStop" : "PEN.individualWinter",
        action: "individualWinter",
      },
    ];
  }

  //
  //Winter Phase
  //
  static async winterPhase(toggle) {
    //Before ending the Winter Phase check that player characters have completed it
    if (!toggle && !(await PENWinter.confirmWinterComplete())) {
      //Rebuild the scene controls so the Winter Phase toggle shows as still active
      await ui.controls.render({ reset: true });
      return;
    }
    await game.settings.set("Pendragon", "winter", toggle);

    //If Winter Phase toggled off - toggle Winter status off for all characters and increase game year
    if (!toggle) {
      for (const actr of game.actors.contents) {
        if (actr.type === "character") {
          await actr.update({
            "system.status.train": false,
            "system.status.economic": false,
            "system.status.aging": false,
            "system.status.squireAge": false,
            "system.status.horseSurv": false,
            "system.status.familyRoll": false,
            "system.status.xp": false,
            "system.status.winter": false,
            "system.passglory.inyear": 0,
          });
        }
        if (!PENWinter.isWinterParticipant(actr)) continue;
        let squires = await actr.items
          .filter((itm) => itm.type === "squire")
          .map((itm) => {
            return { _id: itm.id, "system.age": itm.system.age + 1 };
          });
        await Item.updateDocuments(squires, { parent: actr });
      }
      //Update the game year by one
      await PENWinter.changeYear(1);

      ui.notifications.warn(game.i18n.localize("PEN.winterPhaseEnd"));
      return;
    }

    //If Winter Phase toggled on
    //Turn winter phase off and training on for Characters and create history
    for (const a of game.actors.contents) {
      if (PENWinter.isWinterParticipant(a)) {
        await a.update({
          "system.status.train": true,
          "system.status.economic": true,
          "system.status.aging": true,
          "system.status.squireAge": true,
          "system.status.horseSurv": true,
          "system.status.familyRoll": true,
          "system.status.xp": true,
        });

        //Create a history event for each character with this year's passive glory
        const type = "history";
        const name = game.i18n.localize("PEN.winterPhasePassiveGlory");
        const itemData = {
          name: name,
          type: type,
          system: {
            description: game.i18n.localize("PEN.winterPhase"),
            source: "winter",
            year: game.time.components.year,
            glory: a.system.passive,
          },
        };
        let item = await Item.create(itemData, { parent: a });
        let key = await game.system.api.pid.guessId(item);
        await item.update({
          "flags.Pendragon.pidFlag.id": key,
          "flags.Pendragon.pidFlag.lang": game.i18n.lang,
          "flags.Pendragon.pidFlag.priority": 0,
        });
      }
    }
    ui.notifications.warn(game.i18n.localize("PEN.winterPhaseStart"));
  }

  //
  //Warn if any player owned characters have not finished the Winter Phase - returns true to proceed
  //
  static async confirmWinterComplete() {
    const steps = {
      xp: "PEN.xpRoll",
      economic: "PEN.economicCirc",
      aging: "PEN.aging",
      squireAge: "PEN.squireMaidenRoll",
      horseSurv: "PEN.horseSurvival",
      train: "PEN.training",
      familyRoll: "PEN.familyRolls",
    };
    let incomplete = [];
    for (const actr of game.actors.contents) {
      if (!PENWinter.isWinterParticipant(actr)) continue;
      let outstanding = Object.entries(steps)
        .filter(([key]) => actr.system.status[key])
        .map(([, label]) => game.i18n.localize(label));
      if (actr.system.gloryPrestige > 0) {
        outstanding.push(game.i18n.localize("PEN.prestigeAward") + " (" + actr.system.gloryPrestige + ")");
      }
      if (outstanding.length > 0) {
        incomplete.push(
          "<li><b>" + foundry.utils.escapeHTML(actr.name) + "</b>: " + outstanding.join(", ") + "</li>",
        );
      }
    }
    if (incomplete.length < 1) {
      return true;
    }
    return await PENDialog.confirm({
      window: { title: game.i18n.localize("PEN.winterPhase") },
      content:
        '<div class="stat-name left bold">' +
        game.i18n.localize("PEN.winterIncomplete") +
        '</div><ul class="stat-name left">' +
        incomplete.join("") +
        '</ul><div class="stat-name left bold">' +
        game.i18n.localize("PEN.proceed") +
        "</div><br>",
    });
  }

  //
  //Individual Winter Phase (GM only) - for a character who missed the group Winter Phase
  //Passive glory, squire ageing and the year change have already happened so none are repeated here
  //
  static async individualWinter(actor) {
    if (!game.user.isGM || actor.type !== "character") {
      return;
    }
    const toggle = !actor.system.status.winter;
    if (toggle && !PENWinter.isWinterParticipant(actor)) {
      return;
    }
    const message = game.i18n.format(toggle ? "PEN.individualWinterStart" : "PEN.individualWinterEnd", {
      name: actor.name,
    });
    const confirmation = await PENDialog.confirm({
      window: { title: game.i18n.localize("PEN.individualWinter") },
      content: '<div class="stat-name left bold">' + message + "</div><br>",
    });
    if (!confirmation) {
      return;
    }
    await actor.update({
      "system.status.winter": toggle,
      "system.status.train": toggle,
      "system.status.economic": toggle,
      "system.status.aging": toggle,
      "system.status.squireAge": toggle,
      "system.status.horseSurv": toggle,
      "system.status.familyRoll": toggle,
      "system.status.xp": toggle,
    });
    ui.notifications.warn(message);
  }

  //
  //Years to step back when running an individual Winter Phase after the game year has already advanced
  //
  static yearOffset(actor) {
    return actor?.system.status?.winter && !game.settings.get("Pendragon", "winter") ? 1 : 0;
  }

  //
  //The year the actor's Winter Phase belongs to
  //
  static winterYear(actor) {
    return game.time.components.year - PENWinter.yearOffset(actor);
  }

  //
  //Turn on Development without full Winter Phase
  //
  static async developmentPhase(toggle) {
    await game.settings.set("Pendragon", "development", toggle);
    for (const a of game.actors.contents) {
      if (a.type === "character") {
        //Dead or non player characters are not given development steps, but are still switched off
        const active = toggle && PENWinter.isWinterParticipant(a);
        await a.update({
          "system.status.train": active,
          "system.status.economic": active,
          "system.status.aging": active,
          "system.status.squireAge": active,
          "system.status.horseSurv": active,
          "system.status.familyRoll": active,
          "system.status.xp": active,
        });
      }
    }
  }

  //
  //Experience Checks
  //
  static async xpCheck(actor) {
    let success = [];
    for (let i of actor.items) {
      if (["skill", "trait", "passion"].includes(i.type)) {
        if (i.system.XP) {
          let result = await PENWinter.xpRoll(i.system.total);
          let newRes = {
            type: game.i18n.localize("PEN." + i.type),
            total: i.system.total,
            name: i.name,
            roll: result.dice,
            result: result.level,
          };
          await i.update({
            "system.winter": Number(i.system.winter) + Number(result.level),
            "system.XP": false,
          });
          success.push(newRes);
        }
        if (i.type === "trait" && i.system.oppXP) {
          let result = await PENWinter.xpRoll(i.system.oppvalue);
          let newRes = {
            type: game.i18n.localize("PEN." + i.type),
            total: i.system.oppvalue,
            name: i.system.oppName,
            roll: result.dice,
            result: Number(result.level),
          };
          await i.update({
            "system.winter": Number(i.system.winter) - Number(result.level),
            "system.oppXP": false,
          });
          success.push(newRes);
        }
      }
    }
    //If no stats were checked for improvement then no chat message needed
    if (success.length < 1) {
      await actor.update({ "system.status.xp": false });
      ui.notifications.warn(game.i18n.localize("PEN.noImprovements"));
      return;
    }
    const html = await PENWinter.xpChatCard(success, actor.name);
    let msg = await PENWinter.showXPChat(html, actor);
    await actor.update({ "system.status.xp": false });
  }

  //
  //XP Check Dice Roll - roll exceeds score or roll = 20
  //
  static async xpRoll(target) {
    let resultLevel = 0;
    let roll = new Roll("1D20");
    await roll.evaluate();
    if (Number(roll.total) > target || Number(roll.total) === 20) {
      resultLevel = 1;
    }
    return { level: resultLevel, dice: Number(roll.total) };
  }

  //
  //Prepare XP Roll Chat Card
  //
  static async xpChatCard(success, actorName) {
    let messageData = {
      speaker: ChatMessage.getSpeaker({ actor: actorName }),
      success: success,
    };
    const messageTemplate = "systems/Pendragon/templates/chat/XP-result.hbs";
    let html = await foundry.applications.handlebars.renderTemplate(messageTemplate, messageData);

    return html;
  }

  //
  // Display the XP chat card
  //
  static async showXPChat(html, actor) {
    let chatData = {};
    chatData = {
      user: game.user.id,
      content: html,
      speaker: {
        actor: actor._id,
        alias: actor.name,
      },
    };
    let msg = await ChatMessage.create(chatData);
    return;
  }

  // Used just for characteristics (everything else has been split off)
  static async winterImprov(actor, route) {
    if (route === "prestige" && actor.system.gloryPrestige < 1) {
      return;
    }
    if (route != "prestige" && !actor.system.status.train) {
      return;
    }
    const options = [];
    for (const [key, stat] of Object.entries(actor.system.stats)) {
      // for prestige choice add all characteristics
      // for single training add all except for Size and only if value <20
      if (
        route === "prestige" ||
        (route === "single" && key != "siz" && stat.total < 20) ||
        (route === "single" && key === "siz" && stat.total < 20 && stat.growth < 3)
      ) {
        const option = {
          type: "stat",
          label: game.i18n.localize("PEN.characteristic"),
          itemID: key,
          name: stat.label + " (" + stat.total + ")",
          value: stat.total,
          choice: 0,
          max: stat.max,
          min: stat.total,
        };
        if (route === "prestige") {
          option.max = 999;
        }
        options.push(option);
      }
    }

    // Sort Options
    options.sort(function (a, b) {
      let x = a.name.toLowerCase();
      let y = b.name.toLowerCase();
      let p = a.label;
      let q = b.label;
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

    const amount = 1;
    let title = game.i18n.localize("PEN.prestigeAward");
    if (route != "prestige") {
      title = game.i18n.localize("PEN.training");
    }

    let destination = "systems/Pendragon/templates/dialog/winterOptions.hbs";
    let data = {
      headTitle: title,
      options,
    };
    const html = await foundry.applications.handlebars.renderTemplate(destination, data);
    const selected = await PENDialog.input({
      window: { title: title },
      content: html,
      ok: {
        label: game.i18n.localize("PEN.confirm"),
      },
    });
    if (!selected) {
      ui.notifications.warn(game.i18n.localize("PEN.noSelection"));
      return;
    }
    //Picked is the selected item
    let pickedName = "";
    //If a stat then increase by 1
    let target = "system.stats." + selected.selectItem + ".winter";
    pickedName = pickedName + actor.system.stats[selected.selectItem].label + "(1)";
    await actor.update({ [target]: actor.system.stats[selected.selectItem].winter + 1 });
    if (selected.selectItem === "siz" && route != "prestige") {
      let conLoss = Math.max(actor.system.stats.siz.growth - 1, 0);
      await actor.update({
        "system.stats.siz.growth": actor.system.stats.siz.growth + 1,
        "system.stats.dex.winter": actor.system.stats.dex.winter - 1,
        "system.stats.con.winter": actor.system.stats.con.winter - conLoss,
      });
    }

    //Increase the number of presitge points spent by 1
    if (route === "prestige") {
      pickedName = game.i18n.localize("PEN.prestigeAward") + ": " + pickedName;
      await actor.update({ "system.prestige": actor.system.prestige + 1 });
    } else {
      pickedName = game.i18n.localize("PEN.training") + ": " + pickedName;
      await actor.update({ "system.status.train": false });
    }

    //Add a History Item to show the spend
    const type = "history";
    const name = pickedName;
    const itemData = {
      name: name,
      type: type,
      system: {
        libra: 0,
        denarii: 0,
        description: pickedName,
        year: PENWinter.winterYear(actor),
        glory: 0,
      },
    };
    let newHist = await Item.create(itemData, { parent: actor });
    let key = await game.system.api.pid.guessId(newHist);
    await newHist.update({
      "flags.Pendragon.pidFlag.id": key,
      "flags.Pendragon.pidFlag.lang": game.i18n.lang,
      "flags.Pendragon.pidFlag.priority": 0,
    });
  }

  static async winterImproveSkill(actor, route) {
    if (route === "prestige" && actor.system.gloryPrestige < 1) {
      return;
    }
    if (route != "prestige" && !actor.system.status.train) {
      return;
    }
    const skills = [];

    for (let i of actor.items) {
      if (i.type === "skill") {
        const option = {
          type: i.type,
          itemID: i._id,
          name: i.name,
          value: i.system.total,
          orig: i.system.total,
          choice: "",
          cost: 1,
          max: 20,
          min: i.system.total,
        };

        //If prestige award no maximum.
        if (route === "prestige") {
          option.max = 999;
        } else {
          // standard training:
          //   skills under 15 cost one point to raise
          //   if you're reaching 15 by spending points,
          //   there's not enough points left to keep raising
          if (i.system.total < 15) {
            option.max = 15;
          } else {
            // skills already at 15+ cost all six training points
            option.cost = 6;
          }
        }
        skills.push(option);
      }
    }

    // Sort Options
    // in theory we could group combat skills together
    // in practice not worth it unless we redesign the dialog
    skills.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    //If prestige then amount = 1, else 6 training points
    let amount = route === "prestige" ? 1 : 6;

    let title = "PEN.prestigeAward";
    if (route != "prestige") {
      title = "PEN.training";
    }

    const dlg = new SkillTrainingDialog(actor, skills, route, amount, { window: { title: title } });
    dlg.render(true);
  }

  static async winterImprovePassion(actor, route) {
    if (route === "prestige" && actor.system.gloryPrestige < 1) {
      return;
    }
    if (route != "prestige" && !actor.system.status.train) {
      return;
    }
    const options = [];
    for (let i of actor.items) {
      if (i.type === "passion" && i.system.value > 0) {
        const option = {
          type: i.type,
          label: game.i18n.localize("PEN." + i.type),
          itemID: i._id,
          name: i.name,
          value: i.system.value,
          origValue: i.system.value,
          court: i.system.court,
          level: i.system.level,
          choice: "",
          max: 20,
          min: 0,
        };

        // For passions range is 0-20 except for Prestige reward when there is no max
        if (route === "prestige") {
          option.max = 999;
          option.min = 0;
        }

        options.push(option);
      }
    }

    // Sort Options
    options.sort(function (a, b) {
      return a.court.localeCompare(b.court) || a.label.localeCompare(b.label) || a.name.localeCompare(b.name);
    });

    const amount = 1;
    let title = game.i18n.localize("PEN.prestigeAward");
    if (route != "prestige") {
      title = game.i18n.localize("PEN.training");
    }

    const selected = await PassionsSelectDialog.create(title, options, amount, 1);
    if (selected.length < 1 || !selected) {
      ui.notifications.warn(game.i18n.localize("PEN.noSelection"));
      return;
    }
    //Picked is the selected item
    let pickedName = "";
    for (let picked of selected) {
      if (pickedName != "") {
        pickedName = pickedName + ", ";
      }

      let item = actor.items.get(picked.itemID);
      pickedName = pickedName + item.name + "(" + picked.choice + ")";
      await item.update({ "system.value": Number(item.system.value) + Number(picked.choice) });
    }

    //Increase the number of presitge points spent by 1
    if (route === "prestige") {
      pickedName = game.i18n.localize("PEN.prestigeAward") + ": " + pickedName;
      await actor.update({ "system.prestige": actor.system.prestige + 1 });
    } else {
      pickedName = game.i18n.localize("PEN.training") + ": " + pickedName;
      await actor.update({ "system.status.train": false });
    }

    //Add a History Item to show the spend
    const type = "history";
    const name = game.i18n.localize("PEN.winterPhaseTrainPassion");
    const itemData = {
      name: name,
      type: type,
      system: {
        libra: 0,
        denarii: 0,
        description: pickedName,
        year: PENWinter.winterYear(actor),
        glory: 0,
      },
    };
    let newHist = await Item.create(itemData, { parent: actor });
    let key = await game.system.api.pid.guessId(newHist);
    await newHist.update({
      "flags.Pendragon.pidFlag.id": key,
      "flags.Pendragon.pidFlag.lang": game.i18n.lang,
      "flags.Pendragon.pidFlag.priority": 0,
    });
  }

  // Training may bring a trait up to 19
  // A prestige reward can bring a trait to 20 or above
  static async winterImproveTrait(actor, route) {
    // shouldn't have been able to select prestige
    if (route === "prestige" && actor.system.gloryPrestige < 1) {
      return;
    }

    // training should be done first
    if (route != "prestige" && !actor.system.status.train) {
      return;
    }
    const minVal = route != "prestige" ? 1 : -999;
    const maxVal = route != "prestige" ? 19 : 999;
    const traits = await actor.items
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
          minVal: minVal,
          maxVal: maxVal,
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
    let traitVal = await TraitsSelectDialog.create(traits, 1, false, game.i18n.localize("PEN.Entities.Trait"));
    if (!traitVal) {
      ui.notifications.warn(game.i18n.localize("PEN.noSelection"));
      return false;
    }
    // increase the value
    const picks = [];
    const changes = await traitVal
      .filter((itm) => itm.value != itm.origVal)
      .map((itm) => {
        picks.push(`${itm.name}(${Number(itm.value) - Number(itm.origVal)})`);
        return { _id: itm.id, "system.winter": Number(itm.winter) + Number(itm.value) - Number(itm.origVal) };
      });
    await Item.updateDocuments(changes, { parent: actor });
    let pickedName = picks.join(", ");

    //Increase the number of presitge points spent by 1
    if (route === "prestige") {
      pickedName = game.i18n.localize("PEN.prestigeAward") + ": " + pickedName;
      await actor.update({ "system.prestige": actor.system.prestige + 1 });
    } else {
      pickedName = game.i18n.localize("PEN.training") + ": " + pickedName;
      await actor.update({ "system.status.train": false });
    }

    //Add a History Item to show the spend
    const type = "history";
    const name = game.i18n.localize("PEN.winterPhaseTrainTrait");
    const itemData = {
      name: name,
      type: type,
      system: {
        libra: 0,
        denarii: 0,
        description: pickedName,
        year: PENWinter.winterYear(actor),
        glory: 0,
      },
    };
    let newHist = await Item.create(itemData, { parent: actor });
    let key = await game.system.api.pid.guessId(newHist);
    await newHist.update({
      "flags.Pendragon.pidFlag.id": key,
      "flags.Pendragon.pidFlag.lang": game.i18n.lang,
      "flags.Pendragon.pidFlag.priority": 0,
    });
  }

  //Economic Circumstances
  //
  static async economic(actor) {
    if (!actor.system.status.economic) {
      return;
    }
    let standardList = PENSelectLists.getSOLType();

    let messageData = {
      solType: standardList,
      selectType: actor.system.sol,
    };
    let html = await foundry.applications.handlebars.renderTemplate(
      "systems/Pendragon/templates/dialog/economicOptions.hbs",
      messageData,
    );

    const usage = await PENDialog.input({
      window: { title: game.i18n.localize("PEN.chooseSOL") },
      content: html,
      ok: {
        label: game.i18n.localize("PEN.confirm"),
      },
      default: "button1",
    });

    let newSOL = usage.decisionChoice;
    if (["poor", "impoverished"].includes(newSOL)) {
      let confirmation = await PENUtilities.confirmation(game.i18n.localize("PEN.economicConfirm"));
      if (!confirmation) {
        return;
      }
    }

    let impoverished = actor.system.impoverished;
    let conPoor = actor.system.stats.con.sol;
    let conImp = actor.system.stats.con.major;
    //If the last year was Ordinary SOL or better then impoverished reset to 0
    if (["ordinary", "rich", "superlative"].includes(actor.system.sol)) {
      impoverished = 0;
      conPoor = 0;
    }

    //Make Adjustments for the selection
    let armour = [];
    let horses = [];
    let companions = [];
    let conRoll = 0;
    let clothing = "";
    switch (newSOL) {
      case "ordinary":
      case "rich":
      case "superlative":
        break;

      case "poor":
        //Make CON roll
        conRoll = await PENWinter.statRoll(actor, "con");
        if (conRoll < 2) {
          conPoor = -1;
        }
        //Degrade armour by 1 point if not already degraded
        armour = await actor.items
          .filter((aitm) => aitm.type === "armour")
          .filter((itm) => itm.system.type && !itm.system.poor)
          .map((itm) => {
            return { _id: itm.id, "system.ap": Math.max(Number(itm.system.ap - 1), 0), "system.poor": true };
          });
        await Item.updateDocuments(armour, { parent: actor });
        //Degrade horses if not already degraded
        horses = await actor.items
          .filter((aitm) => aitm.type === "horse")
          .filter((itm) => !itm.system.poor)
          .map((itm) => {
            return {
              _id: itm.id,
              "system.move": Math.max(Number(itm.system.move - 10), 0),
              "system.con": Math.max(Number(itm.system.con - 3), 0),
              "system.chargeDmg": Math.max(Number(itm.system.chargeDmg.toUpperCase().split("D")[0]) - 1, 0) + "D6",
              "system.maxHP": Number(itm.system.maxHP - 3),
              "system.hp": Math.min(itm.system.hp, Number(itm.system.maxHP - 3)),
              "system.poor": true,
            };
          });
        await Item.updateDocuments(horses, { parent: actor });
        //If no "poor or impoverished years then set to -1"
        if (impoverished === 0) {
          impoverished = -1;
        }
        //Reduce Clothing value
        clothing = await actor.items
          .filter((itm) => itm.type === "gear")
          .filter((itm) => itm.flags?.Pendragon?.pidFlag?.id === "i.gear.clothing")[0];
        if (clothing) {
          await PENWinter.priceReduction(clothing);
        }
        break;

      case "impoverished":
        //Make CON roll for permanent loss
        conRoll = await PENWinter.statRoll(actor, "con");
        if (conRoll < 2) {
          conImp = conImp - 1;
        }
        //Degrade armour by 1 point
        armour = await actor.items
          .filter((aitm) => aitm.type === "armour")
          .filter((itm) => itm.system.type)
          .map((itm) => {
            return { _id: itm.id, "system.ap": Math.max(Number(itm.system.ap - 1), 0), "system.poor": true };
          });
        await Item.updateDocuments(armour, { parent: actor });
        impoverished = impoverished - 1;
        //Delete all squires and horses
        companions = await actor.items
          .filter((itm) => itm.type === "horse" || (itm.type === "squire" && itm.system.category === "squire"))
          .map((itm) => {
            return itm.id;
          });
        if (companions.length > 0) {
          let confirmation = await PENUtilities.confirmation(game.i18n.localize("PEN.deleteHorsesSquires"));
          if (confirmation) {
            await Item.deleteDocuments(companions, { parent: actor });
          } else {
            ui.notifications.warn(
              game.i18n.format("PEN.deleteManual", { group: game.i18n.localize("PEN.horsesSquires") }),
            );
          }
        }
        //Reduce Honour by 2 point
        let honour = actor.items
          .filter((itm) => itm.type === "passion")
          .filter((itm) => itm.flags?.Pendragon?.pidFlag?.id === "i.passion.honor")
          .map((itm) => {
            return { _id: itm.id, "system.sol": itm.system.sol - 2 };
          });
        await Item.updateDocuments(honour, { parent: actor });
        //Reduce Clothing value
        clothing = await actor.items
          .filter((itm) => itm.type === "gear")
          .filter((itm) => itm.flags?.Pendragon?.pidFlag?.id === "i.gear.clothing")[0];
        if (clothing) {
          await PENWinter.priceReduction(clothing);
        }
        break;
      default:
        ui.notifications.warn(game.i18n.localize("PEN.noSOL"));
        return;
    }

    await actor.update({
      "system.stats.siz.sol": impoverished,
      "system.stats.str.sol": impoverished,
      "system.stats.app.sol": impoverished,
      "system.stats.con.sol": conPoor,
      "system.stats.con.major": conImp,
      "system.sol": newSOL,
      "system.impoverished": impoverished,
      "system.status.economic": false,
    });

    return;
  }

  //Reduce clothing value
  static async priceReduction(clothing) {
    let libra = 0;
    let denarii = 0;
    let price = Math.floor((Number(clothing.system.libra) * 240 + Number(clothing.system.denarii)) / 2);
    if (price >= 60) {
      libra = Math.floor(libra / 240);
      denarii = price - libra * 240;
    }
    await clothing.update({
      "system.libra": libra,
      "system.denarii": denarii,
    });
    return;
  }

  //Aging
  static async aging(actor) {
    if (!actor.system.status.aging) {
      return;
    }
    //Age is increased at end of winter phase so current age check is 34 or more gor agin
    if (actor.system.age - PENWinter.yearOffset(actor) < 34) {
      await actor.update({ "system.status.aging": false });
      return;
    }

    let senRes = {
      1: { label: game.i18n.localize("PENDRAGON.StatSizAbbr"), value: 0, base: actor.system.stats.siz.total },
      2: { label: game.i18n.localize("PENDRAGON.StatDexAbbr"), value: 0, base: actor.system.stats.dex.total },
      3: { label: game.i18n.localize("PENDRAGON.StatStrAbbr"), value: 0, base: actor.system.stats.str.total },
      4: { label: game.i18n.localize("PENDRAGON.StatConAbbr"), value: 0, base: actor.system.stats.con.total },
      5: { label: game.i18n.localize("PENDRAGON.StatAppAbbr"), value: 0, base: actor.system.stats.app.total },
      6: { label: game.i18n.localize("PEN.none"), value: 0, base: 0 },
    };
    let results = [];
    let result = await PENUtilities.simpleDiceRoll("2D6");
    let senes = Math.max(Math.abs(Number(result) - 7) - 1, 0);
    if (senes > 0) {
      for (let sCount = 1; sCount <= senes; sCount++) {
        let senResult = await PENUtilities.simpleDiceRoll("1D6");
        switch (senResult) {
          case 1:
          case 2:
          case 3:
          case 5:
            if (senRes[senResult].base > 5) {
              senRes[senResult].value++;
              senRes[senResult].base--;
              results.push({
                label: senRes[senResult].label,
                number: senResult,
              });
            } else {
              senRes[4].value++;
              results.push({
                label: senRes[4].label,
                number: senResult,
              });
            }
            break;
          case 4:
          case 6:
            senRes[senResult].value++;
            results.push({
              label: senRes[senResult].label,
              number: senResult,
            });
            break;
        }
      }
    }

    //Make decrepitude roll
    let decRes = 0;
    let decLabel = game.i18n.localize("PEN.decrepitudeLive");
    if (actor.system.stats.con.total - senRes[4].value < 6) {
      decRes = await PENUtilities.simpleDiceRoll("1D6");
      if (decRes > actor.system.stats.con.total - senRes[4].value) {
        decLabel = game.i18n.localize("PEN.decrepitudeDeath");
      }
    }
    let html = await PENWinter.agingRollChatCard(result, senes, results, actor.name, decRes, decLabel);
    await PENWinter.showAgingRollChat(html, actor);
    await actor.update({
      "system.stats.siz.age": actor.system.stats.siz.age - senRes[1].value,
      "system.stats.dex.age": actor.system.stats.dex.age - senRes[2].value,
      "system.stats.str.age": actor.system.stats.str.age - senRes[3].value,
      "system.stats.con.age": actor.system.stats.con.age - senRes[4].value,
      "system.stats.app.age": actor.system.stats.app.age - senRes[5].value,
      "system.status.aging": false,
    });
  }

  //Aging Roll Chat Card
  static async agingRollChatCard(mainRoll, senes, results, actorName, decRes, decLabel) {
    let mainLabel = game.i18n.format("PEN.senesence", { senes: senes });
    if (senes === 0) {
      mainLabel = game.i18n.localize("PEN.noAging");
    }
    let messageData = {
      speaker: ChatMessage.getSpeaker({ actor: actorName }),
      results: results,
      mainRoll: mainRoll,
      mainLabel: mainLabel,
      decRes: decRes,
      decLabel: decLabel,
    };
    const messageTemplate = "systems/Pendragon/templates/chat/aging.hbs";
    let html = await foundry.applications.handlebars.renderTemplate(messageTemplate, messageData);
    return html;
  }

  // Display the aging roll chat card
  static async showAgingRollChat(html, actor) {
    let chatData = {};
    chatData = {
      user: game.user.id,
      content: html,
      speaker: {
        actor: actor._id,
        alias: actor.name,
      },
    };
    let msg = await ChatMessage.create(chatData);
    return;
  }

  //Annual Squire roll
  //
  static async squireWinter(actor) {
    if (!actor.system.status.squireAge) {
      return;
    }
    let squires = await actor.items.filter((itm) => itm.type === "squire");
    let leavers = [];
    //Check each retainer (squire, maiden, other) for leaving
    const offset = PENWinter.yearOffset(actor);
    for (const sqr of squires) {
      const sqrAge = sqr.system.age - offset;
      if (
        (sqr.system.category === "squire" && sqrAge > 20) ||
        (sqr.system.category === "maiden" && sqrAge > 16) ||
        sqr.system.category === "other"
      ) {
        let result = await PENUtilities.simpleDiceRoll("1D20");
        sqr.system.leave = false;
        sqr.system.label = game.i18n.localize("PEN.remains");
        sqr.system.result = result;
        switch (sqr.system.category) {
          case "squire":
            if (sqr.system.result <= 5 + sqrAge - 19) {
              sqr.system.leave = true;
              sqr.system.label = game.i18n.localize("PEN.leaves");
            }
            break;
          case "maiden":
            sqr.system.result = sqr.system.result + (sqrAge - 16) * 2 + Math.max((sqrAge - 20) * 3, 0);
            if (sqr.system.result >= 20) {
              sqr.system.leave = true;
              sqr.system.label = game.i18n.localize("PEN.marries");
            }
          case "other":
            if (sqr.system.result <= 3) {
              sqr.system.leave = true;
              if (sqr.system.result === 1) {
                sqr.system.label = game.i18n.localize("PEN.died");
              } else {
                sqr.system.label = game.i18n.localize("PEN.leaves");
              }
            }
            break;
        }
        leavers.push({
          id: sqr._id,
          name: sqr.name,
          result: sqr.system.result,
          leave: sqr.system.leave,
          label: sqr.system.label,
        });
      }
    }
    //If there are retainer that needed testing them create the chat message and delete leavers
    if (leavers.length > 0) {
      let html = await PENWinter.houseLeaveChatCard(leavers, actor.name);
      await PENWinter.showAgingRollChat(html, actor);
      let remove = await leavers
        .filter((itm) => itm.leave)
        .map((itm) => {
          return itm.id;
        });
      //If there are retainers to be removed then check you want this done automatically
      if (remove.length > 0) {
        let confirmation = await PENUtilities.confirmation(game.i18n.localize("PEN.deleteRetainers"));
        if (confirmation) {
          await Item.deleteDocuments(remove, { parent: actor });
        } else {
          ui.notifications.warn(game.i18n.format("PEN.deleteManual", { group: game.i18n.localize("PEN.retainers") }));
        }
      }
    }

    //Check remaining squires (not maidens or others) for Squire skill improvement
    squires = await actor.items.filter((itm) => itm.type === "squire" && itm.system.category === "squire");
    let sqrUpdate = [];
    for (const sqr of squires) {
      let imp = 0;
      let result = 20;
      if (sqr.system.skill < 15) {
        imp = 1;
      } else {
        result = await PENUtilities.simpleDiceRoll("1D20");
        if (sqr.system.skill === 20 && result === 20) {
          imp = 1;
        } else if (sqr.system.skill < 20 && result > 16) {
          imp = 1;
        }
      }
      sqrUpdate.push({ _id: sqr._id, name: sqr.name, result: result, skill: sqr.system.skill + imp, improve: imp });
    }
    if (sqrUpdate.length > 0) {
      let html = await PENWinter.squireImprove(sqrUpdate, actor.name);
      await PENWinter.showAgingRollChat(html, actor);
      let change = await sqrUpdate.map((itm) => {
        return { _id: itm._id, "system.skill": itm.skill };
      });
      await Item.updateDocuments(change, { parent: actor });
    }
    await actor.update({ "system.status.squireAge": false });
  }

  //Household Departure Roll Chat Card
  static async houseLeaveChatCard(leavers, actorName) {
    let messageData = {
      speaker: ChatMessage.getSpeaker({ actor: actorName }),
      leavers: leavers,
    };
    const messageTemplate = "systems/Pendragon/templates/chat/houseLeave.hbs";
    let html = await foundry.applications.handlebars.renderTemplate(messageTemplate, messageData);
    return html;
  }

  //Squire Improvement Chat Card
  static async squireImprove(squires, actorName) {
    let messageData = {
      speaker: ChatMessage.getSpeaker({ actor: actorName }),
      squires: squires,
    };
    const messageTemplate = "systems/Pendragon/templates/chat/squireImprove.hbs";
    let html = await foundry.applications.handlebars.renderTemplate(messageTemplate, messageData);
    return html;
  }

  //Horse Survival Rolls
  static async horseSurvival(actor) {
    if (!actor.system.status.horseSurv) {
      return;
    }
    //Get all combat and special horses
    let horses = actor.items
      .filter((itm) => itm.type === "horse")
      .filter((itm) => itm.system.combat || itm.system.special);
    let dead = [];
    let updHorse = [];
    let change = [];
    if (horses.length > 0) {
      for (const horse of horses) {
        let adj = -Number(horse.system.horseCare) - Number(horse.system.horseHealth);
        if (actor.system.sol === "poor") {
          adj = adj - 1;
        }
        if (actor.system.sol === "impoverished") {
          adj = adj + actor.system.impoverished;
        }
        //Roll 1D20 for the horse
        let result = await PENUtilities.simpleDiceRoll("1D20");
        //If results is <=1 Horse Dies
        if (result + adj <= 1) {
          change.push({
            _id: horse._id,
            name: horse.name,
            result: result,
            adj: adj,
            survive: false,
            currHealth: horse.system.horseHealth,
            health: 0,
            label: game.i18n.localize("PEN.died"),
          });
          dead.push(horse._id);
          //If result =3+ horse surivives
        } else if (result + adj > 2) {
          change.push({
            _id: horse._id,
            name: horse.name,
            result: result,
            adj: adj,
            survive: true,
            currHealth: horse.system.horseHealth,
            health: 0,
            label: game.i18n.localize("PEN.survived"),
          });
          updHorse.push({ _id: horse._id, "system.horseCare": 0, "system.horseHealth": horse.system.horseHealth });
          //Otherwise make a horsemanship roll
        } else {
          let level = await PENWinter.horsemanshipRoll(actor);
          //Horsemanship result determines outcome
          if (level === 3) {
            change.push({
              _id: horse._id,
              name: horse.name,
              result: result,
              adj: adj,
              survive: true,
              currHealth: horse.system.horseHealth,
              health: 0,
              label: game.i18n.localize("PEN.survived"),
            });
            updHorse.push({ _id: horse._id, "system.horseCare": 0, "system.horseHealth": horse.system.horseHealth });
          } else if (level === 2) {
            change.push({
              _id: horse._id,
              name: horse.name,
              result: result,
              adj: adj,
              survive: true,
              currHealth: horse.system.horseHealth,
              health: 1,
              label: game.i18n.localize("PEN.weak"),
            });
            let chng = await PENWinter.horseUpdate(horse, horse.system.horseHealth, 1);
            updHorse.push({
              _id: horse._id,
              "system.horseCare": 0,
              "system.horseHealth": Math.max(horse.system.horseHealth, 1),
              "system.move": chng.move,
              "system.maxHP": chng.maxHP,
              "system.hp": chng.currHP,
              "system.chargeDmg": chng.chargeDmg,
            });
          } else if (level === 1) {
            change.push({
              _id: horse._id,
              name: horse.name,
              result: result,
              adj: adj,
              survive: true,
              currHealth: horse.system.horseHealth,
              health: 2,
              label: game.i18n.localize("PEN.vweak"),
            });
            let chng = await PENWinter.horseUpdate(horse, horse.system.horseHealth, 2);
            updHorse.push({
              _id: horse._id,
              "system.horseCare": 0,
              "system.horseHealth": Math.max(horse.system.horseHealth, 2),
              "system.move": chng.move,
              "system.maxHP": chng.maxHP,
              "system.hp": chng.currHP,
              "system.chargeDmg": chng.chargeDmg,
            });
          } else if (level === 0) {
            change.push({
              _id: horse._id,
              name: horse.name,
              result: result,
              adj: adj,
              survive: false,
              currHealth: horse.system.horseHealth,
              health: 0,
              label: game.i18n.localize("PEN.died"),
            });
            dead.push(horse._id);
          }
        }
      }
      //If there were horses to test then produce a chat card
      if (change.length > 0) {
        let html = await PENWinter.houseSurvivalChatCard(change, actor.name);
        await PENWinter.showAgingRollChat(html, actor);

        //If horses dies then confirm deletion
        if (dead.length > 0) {
          let confirmation = await PENUtilities.confirmation(game.i18n.localize("PEN.deleteHorses"));
          if (confirmation) {
            await Item.deleteDocuments(dead, { parent: actor });
          } else {
            ui.notifications.warn(game.i18n.format("PEN.deleteManual", { group: game.i18n.localize("PEN.horses") }));
          }
        }
        await Item.updateDocuments(updHorse, { parent: actor });
      }
    }
    await actor.update({ "system.status.horseSurv": false });
  }

  //Horse Health Update
  static async horseUpdate(horse, currHealth, newHealth) {
    let move = horse.system.move;
    let maxHP = horse.system.maxHP;
    let currHP = horse.system.hp;
    let chargeDmg = horse.system.chargeDmg;
    let change = newHealth - currHealth;

    if (change > 0) {
      move = move - change * 2;
      let form = change + "D6";
      let result = await PENUtilities.simpleDiceRoll(form);
      maxHP = maxHP - result;
      currHP = currHP - result;
      if (newHealth === 2) {
        chargeDmg = Math.max(Number(chargeDmg.toUpperCase().split("D")[0]) - 1, 0) + "D6";
      }
    }
    return {
      move,
      maxHP,
      currHP,
      chargeDmg,
    };
  }

  //Horsemanship roll
  static async horsemanshipRoll(actor) {
    let skillId = await actor.items
      .filter((itm) => itm.type === "skill")
      .filter((itm) => itm.flags?.Pendragon?.pidFlag?.id === "i.skill.horsemanship")
      .map((itm) => {
        return itm.id;
      })[0];
    if (!skillId) {
      return 1;
    }
    let msgID = await PENCheck._trigger({
      rollType: "SK",
      cardType: "NO",
      skillId,
      shiftKey: true,
      actor: actor,
      token: "",
    });
    let level = await game.messages.get(msgID).flags.Pendragon.chatCard[0].resultLevel;
    return level;
  }

  //Characteristic Roll
  static async statRoll(actor, stat) {
    if (game.settings.get("Pendragon", "switchShift")) {
      event.shiftKey = !event.shiftKey;
    }
    let msgID = await PENCheck._trigger({
      rollType: "CH",
      cardType: "NO",
      characteristic: stat,
      shiftKey: true,
      actor: actor,
      token: "",
    });
    let level = await game.messages.get(msgID).flags.Pendragon.chatCard[0].resultLevel;
    return level;
  }

  //Horse Survival Chat Card
  static async houseSurvivalChatCard(horses, actorName) {
    let messageData = {
      speaker: ChatMessage.getSpeaker({ actor: actorName }),
      horses: horses,
    };
    const messageTemplate = "systems/Pendragon/templates/chat/horseSurvival.hbs";
    let html = await foundry.applications.handlebars.renderTemplate(messageTemplate, messageData);
    return html;
  }

  //Family Rolls
  static async familyRoll(actor) {
    if (!actor.system.status.familyRoll) {
      return;
    }
    //Child Survival Roll
    let children = actor.items
      .filter((itm) => itm.type === "family")
      .filter(
        (itm) =>
          Number(itm.system.died) < 1 &&
          itm.system.relation === "child" &&
          PENWinter.winterYear(actor) - itm.system.born < 5 &&
          !itm.system.blessed,
      );
    if (children.length > 0 && game.settings.get("Pendragon", "childMortality")) {
      let cldChng = [];
      for (const child of children) {
        let result = await PENUtilities.simpleDiceRoll("1D20");
        let adjRes = result + actor.system.impoverished;
        if (actor.system.sol === "poor") {
          adjRes = adjRes - 1;
        }
        let died = "";
        let label = game.i18n.localize("PEN.survived");

        if (PENWinter.winterYear(actor) - child.system.born === 1) {
          if (adjRes < 5) {
            died = PENWinter.winterYear(actor);
            label = game.i18n.localize("PEN.died");
          }
        } else {
          if (adjRes < 2) {
            died = PENWinter.winterYear(actor);
            label = game.i18n.localize("PEN.died");
          }
        }
        cldChng.push({
          _id: child._id,
          name: child.name,
          result: result,
          adj: adjRes - result,
          died: died,
          label: label,
        });
      }
      let html = await PENWinter.childSurvivalChatCard(cldChng, actor.name);
      await PENWinter.showAgingRollChat(html, actor);
      let cldUpd = cldChng.map((itm) => {
        return { _id: itm._id, "system.died": itm.died };
      });
      await Item.updateDocuments(cldUpd, { parent: actor });
    }

    //Childbirth
    //Produce list of options and get the option
    let list = [
      { name: game.i18n.localize("PEN.self"), pid: "self" },
      { name: game.i18n.localize("PEN.other"), pid: "other" },
    ];
    let spouse = await actor.items
      .filter((itm) => itm.type === "family")
      .filter((itm) => itm.system.relation === "spouse").length;
    if (spouse > 0) {
      list.unshift({ name: game.i18n.localize("PEN.spouse"), pid: "spouse" });
    }
    let decision = await PENCharCreate.selectFromRadio("list", true, list, game.i18n.localize("PEN.childBirth"));
    let prestige = "none";
    //Unless 'none' has been chosen
    if (decision != "none") {
      //If prestige points are available ask if you want to spend one
      if (actor.system.gloryPrestige > 0) {
        let prestList = [
          { name: game.i18n.localize("PEN.conception"), pid: "conception" },
          { name: game.i18n.localize("PEN.health"), pid: "health" },
          { name: game.i18n.localize("PEN.gender"), pid: "gender" },
        ];
        let heir = await actor.items
          .filter((itm) => itm.type === "family")
          .filter((itm) => itm.system.relation === "child" && Number(itm.system.died) < 1).length;
        if (heir < 1) {
          prestList.unshift({ name: game.i18n.localize("PEN.heir"), pid: "heir" });
        }
        prestige = await PENCharCreate.selectFromRadio(
          "list",
          true,
          prestList,
          game.i18n.localize("PEN.spendPrestige"),
        );
      }
      //Now selected person giving birth (decision) and it prestige spent
      let con = 13;
      let prevBirth = 0;
      let ageAdj = 0;
      let solAdj = 0;
      let impAdj = 0;
      let birthRes = 0;
      let newborn = [];
      let result = 0;
      let firstConcept = 0;
      let childDies = false;
      let motherDies = false;
      let motherBarren = false;
      let noChild = false;
      let conLoss = 0;
      let strLoss = 0;
      let sizLoss = 0;
      let tragedyRes = 0;
      let tragedyGen = 0;
      let midResult = 0;
      let critRes = 0;
      let multiRes = 0;
      let trip = 0;
      //Else if a PC making the roll
      if (decision === "self") {
        con = actor.system.stats.con.total;
        impAdj = actor.system.impoverished;
        if (actor.system.sol === "poor") {
          solAdj = -1;
        }
      }
      //Get dialog box for relevant inputs
      let usage = await PENWinter.conceptionDialog(decision);
      if (usage) {
        if (decision != "self") {
          con = Number(usage.conStat);
          impAdj = -usage.impoverishedYears;
          if (usage.sol === "poor") {
            solAdj = -1;
          }
          ageAdj = Math.min(35 - usage.age, 0);
        }
        if (usage.childLastYear === "yes") {
          prevBirth = -10;
        }
        if (usage.firstConception === "yes") {
          firstConcept = 1;
        }
      } else {
        return;
      }
      let target = con + impAdj + solAdj + ageAdj + prevBirth;

      //If no chance of conception or if barren/barren marriage
      let barren = false;
      if (
        decision === "spouse" &&
        (await actor.items.filter((itm) => itm.type === "family").filter((itm) => itm.system.relation === "spouse"))[0]
          .system.barrenMarriage
      ) {
        barren = true;
      } else if (decision === "self") {
        barren = actor.system.status.barren;
      }
      if ((target <= 0 || barren) && !["heir", "conception"].includes(prestige)) {
        birthRes = -1;
      } else {
        //Otherwise make a roll but if prestige spent then minimum level of 2 (success)
        result = await PENUtilities.simpleDiceRoll("1D20");
        if (result === target) {
          birthRes = 3;
        } else if (result <= target || ["heir", "conception"].includes(prestige)) {
          birthRes = 2;
        } else if (result === 20 && game.settings.get("Pendragon", "childMortality")) {
          birthRes = 0;
        } else {
          birthRes = 1;
        }
      }

      let birthLabel = "";
      let gender = "";
      //Resolve the outcome of the Birth Result
      switch (birthRes) {
        case -1: //Auto Fail - chance <= 0
          birthLabel = game.i18n.localize("PEN.noConceptionChance");
          break;
        case 0: //Tragedy
          birthLabel = game.i18n.localize("PEN.tragedyStrikes");
          tragedyRes = (await PENUtilities.simpleDiceRoll("1D6")) + firstConcept;
          if (["heir", "gender"].includes(prestige)) {
            gender = await PENWinter.chooseGender();
          } else {
            tragedyGen = await PENUtilities.simpleDiceRoll("1D6");
            if (tragedyGen % 2 == 0) {
              gender = "female";
            } else {
              gender = "male";
            }
          }
          //Outcome of tragedy Roll
          if (tragedyRes < 3) {
            motherDies = true;
            childDies = true;
          } else if (tragedyRes < 5) {
            motherDies = true;
          } else if (tragedyRes < 6) {
            motherBarren = true;
          } else if (tragedyRes < 7) {
            motherBarren = true;
            childDies = true;
          } else {
            motherBarren = true;
            noChild = true;
          }
          //If Prestige spent on health then child doesnt die
          if (prestige === "health") {
            childDies = false;
            noChild = false;
          }
          //If there is a death then check for a Midwife roll
          if (childDies || motherDies) {
            //Get midwife score
            let midwifScore = Number(await PENCharCreate.inpValue(game.i18n.localize("PEN.midwifeScore")).age);
            if (midwifScore > 0) {
              //If score entered then make check roll
              midResult = await PENUtilities.simpleDiceRoll("1D20");
              if (midResult <= midwifScore) {
                //If succesful and both child & mother dies then select one to save
                if (childDies && motherDies) {
                  let midwifeList = [
                    { name: game.i18n.localize("PEN.child"), pid: "child" },
                    { name: game.i18n.localize("PEN.mother"), pid: "mother" },
                  ];
                  let midDecision = await PENCharCreate.selectFromRadio(
                    "list",
                    false,
                    midwifeList,
                    game.i18n.localize("PEN.midwifeSave"),
                  );
                  if (midDecision === "child") {
                    childDies = false;
                  } else {
                    motherDies = false;
                  }
                } else {
                  //Otherwise they'll they both survive
                  childDies = false;
                  motherDies = false;
                }
              }
            }
          }
          //If Mother Dies and is a PC
          if (motherDies && decision === "self") {
            let conCheck = await PENWinter.statRoll(actor, "con");
            if (conCheck > 1) {
              conLoss = 1;
              motherDies = false;
            } else {
              conLoss = 2;
              let strCheck = await PENWinter.statRoll(actor, "str");
              if (strCheck > 1) {
                strLoss = 1;
                motherDies = false;
              } else {
                strLoss = 2;
                let sizCheck = await PENWinter.statRoll(actor, "siz");
                if (sizCheck > 1) {
                  sizLoss = 1;
                  motherDies = false;
                }
              }
            }
          }
          //Add any children to the newborn list
          if (!childDies && !noChild) {
            newborn.push({
              name: game.i18n.localize("PEN.child"),
              gender: gender,
              genderLabel: game.i18n.localize("PEN." + gender),
              status: "lives",
              notes: "",
              blessed: false,
            });
          } else if (childDies && !noChild) {
            newborn.push({
              name: game.i18n.localize("PEN.child"),
              gender: gender,
              genderLabel: game.i18n.localize("PEN." + gender),
              status: "dies",
              notes: game.i18n.localize("PEN.died"),
              blessed: false,
            });
          }
          break;
        case 1: //Fail - no birth
          birthLabel = game.i18n.localize("PEN.noConception");
          break;
        case 2: //Success - single birth
          if (["heir", "gender"].includes(prestige)) {
            gender = await PENWinter.chooseGender();
          } else {
            if (result % 2 == 0) {
              gender = "female";
            } else {
              gender = "male";
            }
          }
          newborn.push({
            name: game.i18n.localize("PEN.child"),
            gender: gender,
            genderLabel: game.i18n.localize("PEN." + gender),
            status: "lives",
            notes: "",
            blessed: false,
          });
          birthLabel = game.i18n.localize("PEN.conceived");
          break;
        case 3: //Multiple Birth - Critical Success
          if (["heir", "gender"].includes(prestige)) {
            gender = await PENWinter.chooseGender();
          }
          critRes = await PENUtilities.simpleDiceRoll("1D6");
          if (critRes < 5) {
            multiRes = await PENUtilities.simpleDiceRoll("1D20");
            if (multiRes < 8) {
              birthLabel = game.i18n.localize("PEN.twins");
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: "male",
                genderLabel: game.i18n.localize("PEN.male"),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: "female",
                genderLabel: game.i18n.localize("PEN.female"),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
            } else if (multiRes < 11) {
              birthLabel = game.i18n.localize("PEN.twins");
              if (gender === "") {
                gender = "female";
              }
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: gender,
                genderLabel: game.i18n.localize("PEN." + gender),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: gender,
                genderLabel: game.i18n.localize("PEN." + gender),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
            } else if (multiRes < 14) {
              birthLabel = game.i18n.localize("PEN.twins");
              if (gender === "") {
                gender = "male";
              }
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: gender,
                genderLabel: game.i18n.localize("PEN." + gender),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: gender,
                genderLabel: game.i18n.localize("PEN." + gender),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
            } else if (multiRes < 17) {
              birthLabel = game.i18n.localize("PEN.twinsIdentical");
              if (gender === "") {
                gender = "female";
              }
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: gender,
                genderLabel: game.i18n.localize("PEN." + gender),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: gender,
                genderLabel: game.i18n.localize("PEN." + gender),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
            } else if (multiRes < 20) {
              birthLabel = game.i18n.localize("PEN.twinsIdentical");
              if (gender === "") {
                gender = "male";
              }
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: gender,
                genderLabel: game.i18n.localize("PEN." + gender),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: gender,
                genderLabel: game.i18n.localize("PEN." + gender),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
            } else {
              let triplets = [];
              let identical = true;
              let identRoll = 0;
              for (let tCount = 0; tCount < 3; tCount++) {
                trip = await PENUtilities.simpleDiceRoll("1D6");
                if (trip % 2 == 0) {
                  triplets.push({ gender: "female", trip });
                } else {
                  triplets.push({ gender: "male", trip });
                }
                //Check for identical triplets
                if (tCount === 0) {
                  identRoll = trip;
                } else {
                  if (identRoll != trip) {
                    identical = false;
                  }
                }
              }
              //If gender has been selected
              if (["heir", "gender"].includes(prestige)) {
                //For indetical triplets set all to be chosen gender
                if (identical) {
                  triplets[0].gender = gender;
                  triplets[1].gender = gender;
                  triplets[2].gender = gender;
                } else if (triplets.filter((itm) => itm.gender === gender).length === 0) {
                  //For non-identical set first one to matched gender if non currently match
                  triplets[0].gender = gender;
                }
              }
              birthLabel = game.i18n.localize("PEN.triplets");
              if (identical) birthLabel = game.i18n.localize("PEN.tripletsIdentical");
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: triplets[0].gender,
                genderLabel: game.i18n.localize("PEN." + triplets[0].gender),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: triplets[1].gender,
                genderLabel: game.i18n.localize("PEN." + triplets[1].gender),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
              newborn.push({
                name: game.i18n.localize("PEN.child"),
                gender: triplets[2].gender,
                genderLabel: game.i18n.localize("PEN." + triplets[2].gender),
                status: "lives",
                notes: birthLabel,
                blessed: false,
              });
            }
          } else {
            //Roll on Blessed table
            let table = (await game.system.api.pid.fromPIDBest({ pid: "rt..blessed-birth" }))[0];
            birthLabel = game.i18n.localize("PEN.blessedBirth");
            let notes = "";
            if (!table) {
              ui.notifications.error(game.i18n.localize("PEN.addBBmanually"));
            } else {
              const blessedResult = await PENUtilities.tableDiceRoll(table);
              notes = blessedResult.results[0].text;
            }

            if (["heir", "gender"].includes(prestige)) {
              gender = await PENWinter.chooseGender();
            } else {
              if (critRes === 6) {
                gender = "female";
              } else {
                gender = "male";
              }
            }
            newborn.push({
              name: game.i18n.localize("PEN.child"),
              gender: gender,
              genderLabel: game.i18n.localize("PEN." + gender),
              status: "lives",
              notes: notes,
              blessed: true,
            });
          }
          break;
        default:
          birthLabel = game.i18n.localize("PEN.noConception");
          break;
      }

      //Send chat message
      let html = await PENWinter.childbirthChatCard(
        birthRes,
        birthLabel,
        newborn,
        motherDies,
        motherBarren,
        result,
        tragedyRes,
        tragedyGen,
        midResult,
        critRes,
        multiRes,
        trip,
        conLoss,
        strLoss,
        sizLoss,
        actor.name,
        actor._id,
      );
      await PENWinter.showAgingRollChat(html, actor);

      //Create family members for each newborn
      let newAdditions = [];
      for (let newFamily of newborn) {
        let died = "";
        if (newFamily.status === "dies") {
          died = PENWinter.winterYear(actor);
        }
        const itemData = {
          name: newFamily.name,
          type: "family",
          system: {
            relation: "child",
            gender: newFamily.genderLabel,
            born: PENWinter.winterYear(actor),
            died: died,
            description: newFamily.notes,
            blessed: newFamily.blessed,
          },
          flags: {
            Pendragon: {
              pidFlag: {
                id: "i.family.newborn",
                lang: game.i18n.lang,
                priority: 0,
              },
            },
          },
        };
        newAdditions.push(itemData);
      }
      await Item.createDocuments(newAdditions, { parent: actor });

      //If mother dies then make updates to either spouse or actor
      if (motherDies) {
        if (decision === "spouse") {
          let spouse = await actor.items
            .filter((itm) => itm.type === "family")
            .filter((itm) => itm.system.relation === "spouse")[0];
          await spouse.update({ "system.died": PENWinter.winterYear(actor) });
        } else if (decision === "self") {
          await actor.addStatus("dead");
          const itemData = {
            name: game.i18n.localize("PEN.died"),
            type: "history",
            system: {
              year: PENWinter.winterYear(actor),
              description: game.i18n.localize("PEN.died"),
            },
            flags: {
              Pendragon: {
                pidFlag: {
                  id: "i.history.died",
                  lang: game.i18n.lang,
                  priority: 0,
                },
              },
            },
          };
          await Item.create(itemData, { parent: actor });
        }
      }
      //If mother Barren then make updates to either spouse or actor
      if (motherBarren) {
        if (decision === "spouse") {
          let spouse = await actor.items
            .filter((itm) => itm.type === "family")
            .filter((itm) => itm.system.relation === "spouse")[0];
          await spouse.update({ "system.barrenMarriage": true });
        } else if (decision === "self") {
          await actor.update({ "system.status.barren": true });
        }
      }

      //If there are stats losses for the actor on birth
      if (conLoss > 0 || strLoss > 0 || sizLoss > 0)
        await actor.update({
          "system.stats.con.age": actor.system.stats.con.age - conLoss,
          "system.stats.str.age": actor.system.stats.str.age - strLoss,
          "system.stats.siz.age": actor.system.stats.siz.age - sizLoss,
        });

      //If any prestige was spent
      if (prestige != "none") {
        await actor.update({ "system.prestige": actor.system.prestige + 1 });
        //Add a History Item to show the spend
        const type = "history";
        const name = `${game.i18n.localize("PEN.spendPrestige")}: ${game.i18n.localize("PEN.childBirth")}`;
        const itemData = {
          name: name,
          type: type,
          system: {
            description: `${game.i18n.localize("PEN.spendPrestige")}: ${game.i18n.localize("PEN.childBirth")}`,
            year: PENWinter.winterYear(actor),
            glory: 0,
          },
          flags: {
            Pendragon: {
              pidFlag: {
                id: "i.history.prestige",
                lang: game.i18n.lang,
                priority: 0,
              },
            },
          },
        };
        await Item.create(itemData, { parent: actor });
      }
    }

    await actor.update({ "system.status.familyRoll": false });
  }

  //Childbirth Card
  static async childbirthChatCard(
    birthRes,
    birthLabel,
    newborn,
    motherDies,
    motherBarren,
    result,
    tragedyRes,
    tragedyGen,
    midResult,
    critRes,
    multiRes,
    trip,
    conLoss,
    strLoss,
    sizLoss,
    actorName,
    actorID,
  ) {
    let statLoss = false;
    if (conLoss + strLoss + sizLoss > 0) {
      statLoss = true;
    }
    let messageData = {
      speaker: ChatMessage.getSpeaker({ actor: actorName }),
      actorID,
      birthRes,
      birthLabel,
      newborn,
      motherDies,
      motherBarren,
      result,
      tragedyRes,
      tragedyGen,
      midResult,
      critRes,
      multiRes,
      trip,
      conLoss,
      strLoss,
      sizLoss,
      statLoss,
    };
    const messageTemplate = "systems/Pendragon/templates/chat/childBirth.hbs";
    let html = await foundry.applications.handlebars.renderTemplate(messageTemplate, messageData);
    return html;
  }

  //Child Survival Card
  static async childSurvivalChatCard(children, actorName) {
    let messageData = {
      speaker: ChatMessage.getSpeaker({ actor: actorName }),
      children: children,
    };
    const messageTemplate = "systems/Pendragon/templates/chat/childSurvival.hbs";
    let html = await foundry.applications.handlebars.renderTemplate(messageTemplate, messageData);
    return html;
  }

  //Conception Dialog Box
  static async conceptionDialog(decision) {
    let destination = "systems/Pendragon/templates/dialog/conception.hbs";
    let solType = PENSelectLists.getSOLType();
    let winTitle = game.i18n.localize("PEN.conception");
    let data = {
      decision,
      solType,
    };
    const html = await foundry.applications.handlebars.renderTemplate(destination, data);
    const usage = await PENDialog.input({
      window: { title: winTitle },
      content: html,
      ok: {
        label: game.i18n.localize("PEN.confirm"),
      },
    });
    return usage;
  }

  //Select Gender of baby
  static async chooseGender() {
    let aspect = [
      { name: game.i18n.localize("PEN.male"), pid: "male" },
      { name: game.i18n.localize("PEN.female"), pid: "female" },
    ];
    let gender = await PENCharCreate.selectFromRadio("list", false, aspect, game.i18n.localize("PEN.childGender"));
    return gender;
  }

  //Change the game year
  static async changeYear(value) {
    //Update the game year by one
    if (!value) {
      return;
    }
    const year = game.time.components.year + Number(value);
    await game.time.set({ year: year });
    await game.Pendragon.ui?.calendar.updateDate();
    return;
  }
}
