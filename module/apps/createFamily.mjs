import PENDialog from "../setup/pen-dialog.mjs";
import { PENCharCreateV2 } from "./charCreateV2.mjs";
import { PENUtilities } from "./utilities.mjs";

export class PENCreateFamily {
  //Start the process with an actor
  static async startFamily(actor) {
    let addCousins = game.settings.get("Pendragon", "createCousins");
    //For characters only
    if (actor.type != "character") {
      ui.notifications.warn("PEN.familyCreate.charOnly", { localize: true });
      return false;
    }
    //Capture Year Actor was born, if blank/zero then request it
    let yearBorn = actor.system.born;
    if (!yearBorn || yearBorn === 0) {
      yearBorn = Number(
        (await PENCharCreateV2.inpValue(game.i18n.format("PEN.familyCreate.bornYear", { name: actor.name })))?.age ?? 0,
      );
      if (!yearBorn || yearBorn < 1) {
        ui.notifications.warn("PEN.familyCreate.bornNeeded", { localize: true });
        return false;
      }
      await actor.update({ "system.born": yearBorn });
    }

    //New family members to be added
    let familyAdd = [];
    let msgString = "<h5>" + game.i18n.localize("PEN.familyCreate.title") + "</h5>";

    //Siblings - calculate first to generate youngest age
    msgString += "<div><strong>" + game.i18n.localize("PEN.familyCreate.siblings") + "</strong>: ";
    let lastSibling = yearBorn;
    let siblings = await this.checkFamily(actor, "brother", "sister");
    if (siblings.length > 0) {
      let youngest = await this.checkAges(actor, siblings, "1D6", yearBorn);
      if (!youngest) return false;
      lastSibling = youngest;
      msgString += game.i18n.localize("PEN.familyCreate.alreadyExist") + "</div>";
    } else {
      let results = await this.addFamily("2D3", yearBorn, "1D6", "brother", "sister", true, 0, 0);
      familyAdd = results.members;
      msgString += "</div>" + results.resultString;
      lastSibling = results.lastBorn;
    }

    //Parents - need youngest sibling age
    msgString += "<div><strong>" + game.i18n.localize("PEN.familyCreate.parents") + "</strong>:</div> ";
    let father = await this.checkFamily(actor, "father");
    let mother = await this.checkFamily(actor, "mother");
    let fatherBorn = yearBorn - 24; //fallback year
    let motherBorn = yearBorn - 22; //fallback year
    if (father.length > 0) {
      let youngest = await this.checkAges(actor, father, "-1D6-21", yearBorn);
      if (!youngest) return false;
      fatherBorn = youngest;
      msgString +=
        "<div>&nbsp&nbsp" +
        game.i18n.localize("PEN.familyRelationship.father") +
        ":" +
        game.i18n.localize("PEN.familyCreate.alreadyExists") +
        "</div>";
    } else {
      let results = await this.addFamily("1", yearBorn, "-1D6-21", "father", "", false, 4, lastSibling);
      familyAdd.push(...results.members);
      msgString += "</div>" + results.resultString;
      fatherBorn = results.lastBorn;
    }
    if (mother.length > 0) {
      let youngest = await this.checkAges(actor, mother, "+1D3-1", fatherBorn);
      if (!youngest) return false;
      motherBorn = youngest;
      msgString +=
        "<div>&nbsp&nbsp" +
        game.i18n.localize("PEN.familyRelationship.mother") +
        ":" +
        game.i18n.localize("PEN.familyCreate.alreadyExists") +
        "</div>";
    } else {
      let results = await this.addFamily("1", fatherBorn, "1D3-1", "mother", "", false, 4, lastSibling);
      familyAdd.push(...results.members);
      msgString += "</div>" + results.resultString;
      motherBorn = results.lastBorn;
    }

    for (let pCount = 1; pCount <= 2; pCount++) {
      let cousinCount = 0;
      let maternal = "paternal";
      let parentBorn = fatherBorn;
      if (pCount === 2) {
        maternal = "maternal";
        parentBorn = motherBorn;
      }

      //Aunts/Uncles - needs parent ages to generate youngest
      //2D3 of them in total (1D3 for each of maternal & paternal). 1D6 odd = uncle, even = aunt
      //Age = father - 1D6, less 1D6 for each next one
      msgString +=
        "<div><strong>" +
        game.i18n.localize("PEN.familyCreate.piblings") +
        " (" +
        game.i18n.localize("PEN.familyCreate." + maternal) +
        ")" +
        "</strong>:</div> ";
      let lastPibling = yearBorn;
      let piblings = await this.checkFamily(actor, "uncle", "aunt", maternal);
      if (piblings.length > 0) {
        let youngest = await this.checkAges(actor, piblings, "1D6", parentBorn);
        if (!youngest) return false;
        lastPibling = youngest;
        msgString += game.i18n.localize("PEN.familyCreate.alreadyExist") + "</div>";
      } else {
        let results = await this.addFamily("1D3", parentBorn, "1D6", "uncle", "aunt", true, 0, 0, maternal);
        familyAdd.push(...results.members);
        msgString += "</div>" + results.resultString;
        lastPibling = results.lastBorn;
        piblings = results.members;
      }

      //Grandparents - need youngest aunt/uncle
      msgString +=
        "<div><strong>" +
        game.i18n.localize("PEN.familyCreate.grandparents") +
        " (" +
        game.i18n.localize("PEN.familyCreate." + maternal) +
        ")" +
        "</strong>:</div> ";
      let grandfather = await this.checkFamily(actor, "grandfather", "", maternal);
      let grandmother = await this.checkFamily(actor, "grandmother", "", maternal);
      let grandfatherBorn = fatherBorn - 24; //fallback year
      if (pCount === 2) {
        grandfatherBorn = motherBorn - 24; //fallback year
      }
      if (grandfather.length > 0) {
        let youngest = await this.checkAges(actor, grandfather, "-1D6-21", parentBorn);
        if (!youngest) return false;
        grandfatherBorn = youngest;
        msgString +=
          "<div>&nbsp&nbsp" +
          game.i18n.localize("PEN.familyRelationship.grandfather") +
          ":" +
          game.i18n.localize("PEN.familyCreate.alreadyExists") +
          "</div>";
      } else {
        let results = await this.addFamily(
          "1",
          fatherBorn,
          "-1D6-21",
          "grandfather",
          "",
          false,
          7,
          lastPibling,
          maternal,
        );
        familyAdd.push(...results.members);
        msgString += "</div>" + results.resultString;
        grandfatherBorn = results.lastBorn;
      }
      if (grandmother.length > 0) {
        let youngest = await this.checkAges(actor, grandmother, "+1D3-1", grandfatherBorn);
        if (!youngest) return false;
        msgString +=
          "<div>&nbsp&nbsp" +
          game.i18n.localize("PEN.familyRelationship.grandmother") +
          ":" +
          game.i18n.localize("PEN.familyCreate.alreadyExists") +
          "</div>";
      } else {
        let results = await this.addFamily(
          "1",
          grandfatherBorn,
          "1D3-1",
          "grandmother",
          "",
          false,
          4,
          lastPibling,
          maternal,
        );
        familyAdd.push(...results.members);
        msgString += "</div>" + results.resultString;
      }

      //Now add any cousins needed
      msgString +=
        "<div><strong>" +
        game.i18n.localize("PEN.familyCreate.cousins") +
        " (" +
        game.i18n.localize("PEN.familyCreate." + maternal) +
        ")" +
        "</strong>:</div> ";
      let cousins = await this.checkFamily(actor, "cousin", "", maternal);
      if (cousins.length > 0) {
        msgString += game.i18n.localize("PEN.familyCreate.alreadyExist") + "</div>";
      } else {
        for (let pibling of piblings) {
          let results = await this.addFamily(
            "1D3-1",
            pibling.system.born + 21,
            "1D6",
            "cousin",
            "",
            false,
            0,
            0,
            maternal,
          );
          if (addCousins) {
            familyAdd.push(...results.members);
            msgString += "</div>" + results.resultString;
          } else {
            msgString +=
              "</div><div>" + results.members.length + " " + game.i18n.localize("PEN.familyCreate.cousins") + "</div>";
            cousinCount += results.members.length;
          }
        }

        let maternalFlag = maternal === "maternal";
        let memberName = cousinCount + " " + game.i18n.localize("PEN.familyCreate.cousins");
        if (cousinCount > 0) {
          familyAdd.push({
            type: "family",
            name: memberName,
            system: {
              born: game.time.components.year,
              relation: "cousin",
              died: "",
              source: "createFamily",
              maternal: maternalFlag,
            },
          });
        }
      }
    }

    //Create Chat Message for Family
    ChatMessage.create({
      content: msgString,
      speaker: ChatMessage.getSpeaker(),
    });
    let newFamily = await actor.createEmbeddedDocuments("Item", familyAdd);

    //Assign PIDs
    let updates = [];
    for (let family of newFamily) {
      let key = await game.system.api.pid.guessId(family);
      updates.push({
        _id: family.id,
        "flags.Pendragon.pidFlag.id": key,
        "flags.Pendragon.pidFlag.lang": game.i18n.lang,
        "flags.Pendragon.pidFlag.priority": 0,
      });
    }
    await actor.updateEmbeddedDocuments("Item", updates);
    return true;
  }

  //Add Family
  //formula = number of members
  //born = year born off which the members birth is based
  //ageGap = formula for the gap between members
  //first = title from PENDRAGON.familyRelationships (e.g. uncle)
  //second  = alternative equivalent (e.g. aunt).
  //genderCheck - if false uses the first (male) option
  //diedChance - roll under this score on 1D6 to die
  //diedBase - if died then year = 1D6 + diedBase
  //maternalCheck - if 'maternal' then set maternal to true
  static async addFamily(
    formula,
    born,
    ageGap,
    first,
    second,
    genderCheck = true,
    diedChance = 0,
    diedBase = 0,
    maternalCheck = "",
  ) {
    let resultString = "";
    let died = null;
    let maternal = false;
    if (maternalCheck === "maternal") maternal = true;
    let members = [];
    let rollResults = await PENUtilities.complexDiceRoll(formula);
    for (let i = 1; i <= rollResults.total; i++) {
      let type = first;
      if (genderCheck) {
        let genderResults = await PENUtilities.complexDiceRoll("1D6");
        if (genderResults.total % 2 != 0) type = second;
      }
      let bornResults = await PENUtilities.complexDiceRoll(ageGap);
      let birth = Math.min(bornResults.total + born, game.time.components.year);
      born = birth;
      if (diedChance > 0) {
        let diedResults = await PENUtilities.complexDiceRoll("1D6");
        if (diedResults.total <= diedChance) {
          let deceasedRoll = await PENUtilities.complexDiceRoll("1D6");
          died = Math.min(diedBase + deceasedRoll.total, game.time.components.year);
        }
      }

      let memberName = game.i18n.localize("PEN.familyRelationship." + type);
      //If game setting to roll random names
      if (game.settings.get("Pendragon", "randomFamilyNames")) {
        let maleTable = (await game.system.api.pid.fromPIDBest({ pid: "rt..male-names" }))[0];
        let femaleTable = (await game.system.api.pid.fromPIDBest({ pid: "rt..female-names" }))[0];
        if (maleTable && femaleTable) {
          let table = maleTable;
          switch (type) {
            case "mother":
            case "sister":
            case "aunt":
            case "grandmother":
            case "daughter":
              table = femaleTable;
              break;
            case "cousin":
              let tableRoll = new Roll("1D2");
              let genderTable = tableRoll.evaluate();
              if (genderTable.total === 2) table = femaleTable;
              break;
          }
          let nameTableOut = await PENCharCreateV2.makeTableRoll(table);
          if (nameTableOut) {
            let n2Roll = nameTableOut?.tableResults?.results[0]?.name;
            if (n2Roll) {
              memberName = n2Roll;
            }
          }
        }
      }
      members.push({
        type: "family",
        name: memberName,
        system: {
          born: birth,
          relation: type,
          died: died,
          source: "createFamily",
          maternal: maternal,
        },
      });
      resultString +=
        "<div>&nbsp&nbsp" +
        game.i18n.localize("PEN.familyRelationship." + type) +
        ": " +
        game.i18n.localize("PEN.born") +
        " " +
        birth;
      if (died != null) {
        resultString += ", " + game.i18n.localize("PEN.died") + " " + died;
      }
      resultString += "</div>";
    }
    return { members, lastBorn: born, resultString };
  }

  //Check Family Members exist
  //type1 = first relation type
  //type2 = second relation type
  //maternalCheck = filter for maternal/paternal.  Blank = no check, 'maternal' or 'paternal' include only those
  static async checkFamily(actor, type1 = "", type2 = "", maternalCheck = "") {
    let validOptions = Object.keys(CONFIG.PENDRAGON.familyRelationships);
    if (type1 != "" && ![...validOptions].includes(type1)) {
      ui.notifications.warn("PEN.familyCreate.invalidFamilyType", {
        format: { type: type1 },
      });
      type1 = ""; //ignore invalid type
    }
    if (type2 != "" && ![...validOptions].includes(type2)) {
      ui.notifications.warn("PEN.familyCreate.invalidFamilyType", {
        format: { type: type2 },
      });
      type2 = ""; //ignore invalid type
    }
    let members = await actor.items
      .filter((itm) => itm.type === "family")
      .filter((itm) => [type1, type2].includes(itm.system.relation));
    if (maternalCheck === "maternal") {
      members = await members.filter((itm) => itm.system.maternal);
    } else if (maternalCheck === "paternal") {
      members = await members.filter((itm) => !itm.system.maternal);
    }
    return members;
  }

  //Check ages of existing family members
  //members: array of family members in this selection
  //ageGap: roll formula to increase the age by
  //base: base year of birth used if none of the members have a year of birth
  static async checkAges(actor, members, ageGap, base) {
    try {
      const result = await Roll.validate(ageGap);
    } catch (err) {
      ui.notifications.warn("PEN.familyCreate.invalidFormula", {
        format: { formula: ageGap },
      });
      return false;
    }
    let updates = [];
    let youngest = Math.max(...members.map((item) => item.system.born));
    if (youngest === 0) youngest = base;
    for (let member of members) {
      if (member.system.born > 0) continue;
      let ageRoll = new Roll(ageGap);
      let ageResult = await ageRoll.evaluate();
      let born = Math.min(youngest + ageResult.total, game.time.components.year);
      updates.push({ _id: member.id, "system.born": born });
      youngest = born;
    }
    await actor.updateEmbeddedDocuments("Item", updates);
    return youngest;
  }

  //Delete Family members created this way
  static async deleteFamily(actor) {
    let members = await actor.items
      .filter((itm) => itm.type === "family")
      .filter((itm) => itm.system.source === "createFamily");
    await actor.deleteEmbeddedDocuments(
      "Item",
      members.map((i) => i.id),
    );
  }
}
