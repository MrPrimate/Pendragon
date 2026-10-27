import { PENUtilities } from "./utilities.mjs";
import { PENRandomName } from "./random-name.mjs";

//TODO: Figure in where to add marriage year testing and insert

export class PENRandomCareer {
  //Career Tables
  static DEFAULT_TABLES = {
    promotions: "rt..table-2-6-family-promotion",
    uncle: "rt..table-2-7-men-profession",
    aunt: "rt..table-2-8-women-profession",
    martial: "rt..table-2-9-sibling-profession-martial",
    nonMartial: "rt..table-2-9-sibling-profession-nonmartial",
    heir: "rt..table-2-9-sibling-heir-profession", //Heir and spare
    prayerPagan: "rt..table-2-9-sibling-prayer-profession-pagan",
    prayerChristian: "rt..table-2-9-sibling-prayer-profession-christian",
  };

  static async randomCareer(doc) {
    let updates = [];
    let members = [];
    let msgString = "<h5>" + game.i18n.localize("PEN.familyCreate.careers") + "</h5>";
    const actor = doc instanceof Actor ? doc : doc?.parent instanceof Actor ? doc.parent : null;
    if (!actor) return;
    // Prepare the roll tables once
    this.careerTables = await this.getCareerTables();
    if (!this.careerTables) return null;

    this.family = await this.resolveFamily(actor); //Family list is used for position of each person tested

    //If handin doc is a character  we are rolling on all the family
    if (doc instanceof Actor && doc.type === "character") {
      console.log("All family");
      //Else if doc is a family item roll on just this member
    } else if (doc instanceof Item && doc.type === "family") {
      members.push(doc);
    } else {
      //Invalid roll target
      ui.notifications.warn("PEN.career.invalidTarget", { format: { source: doc.name } });
      return null;
    }

    //Get the relevant religion from the doc if actor or parent actor
    let religion = await PENRandomName.resolveCulture(doc, "religion");
    if (!religion) {
      ui.notifications.warn("PEN.noReligion", { localize: true });
      return null;
    }

    //Loop through all the members and get career
    for (let member of members) {
      //Resolve gender now as used in a couple of places
      member.gender = this.family.find((itm) => itm.id === member.id).gender; //Resolve position in family now we have gender
      member.position = await this.resolvePosition(member);
      let careerResult = await this.singleCareer(member, religion);
      if (!careerResult) {
        msgString += "<div><strong>" + doc.name + "</strong>: " + game.i18n.localize("PEN.career.mismatch") + "</div>";
      } else {
        updates.push({
          _id: doc.id,
          "system.careerLevel": careerResult.result.level,
          "system.careers": careerResult.careers,
          "system.yearPromoted": careerResult.result.yearPromoted,
          "system.nextPromotion": careerResult.result.nextPromotion,
        });
        msgString +=
          "<div><strong>" +
          doc.name +
          "</strong>: " +
          careerResult.careers[0].name +
          " [" +
          careerResult.result.level +
          "]" +
          "</div>";
      }
    }
    //Create Chat Message for Family Careers
    await ChatMessage.create({
      content: msgString,
      speaker: ChatMessage.getSpeaker({ actor }),
    });
    if (updates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", updates);
    }
    return;
  }

  static async singleCareer(doc, religion) {
    let careers = [];
    let careerLevel = 0;
    let promotion = 0;
    //Roll careers for family member who have come of age
    if (doc.system.age >= 14) {
      let table = null;
      switch (doc.system.relation) {
        case "uncle":
        case "aunt":
        case "pibling":
          table = this.resolvePiblingTable(doc);
          let promotionResults = await PENUtilities.tableDiceRoll(this.careerTables.promotions);
          if (promotionResults) {
            let thisResult = Number(promotionResults.results[0]?.name?.split(" ")[0]);
            promotion = Number.isFinite(thisResult) ? thisResult : 0;
          }
          break;
        default:
          return null;
      }
      if (!table) {
        ui.notifications.warn("PEN.career.missingTable", { format: { source: doc.system.relation } });
        return null;
      }
      //Roll up to five times - in the event of a roll that doesn't match gender/religion
      for (let c = 1; c <= 5; c++) {
        const tableResults = await PENUtilities.tableDiceRoll(table);
        let career = await this.resolveCareer(tableResults, doc.gender, religion);
        if (!career) continue; //Reroll up to 5 times
        if (career) {
          const result = await this.careerHistory(doc, career.careerItem, career.level, promotion);
          careers.push({
            name: result.career.name,
            pid: result.career.flags?.Pendragon?.pidFlag?.id,
            uuid: result.career.uuid,
          });
          return { careers, result };
        }
      }
    }
    return false;
  }

  //Get the Career tables
  static async getCareerTables() {
    let careerTables = {};
    for (let key in this.DEFAULT_TABLES) {
      let table = await PENRandomName.tableFromSource({ pid: this.DEFAULT_TABLES[key] });
      if (!table) {
        ui.notifications.warn("PEN.career.missingTable", { format: { source: this.DEFAULT_TABLES[key] } });
        return null;
      }
      careerTables[key] = table;
    }
    return careerTables;
  }

  //Turn Career Roll results in to career info
  static async resolveCareer(tableResults, gender, religion) {
    let level = 0;
    let careerPID = "";
    let careerName = "";
    let careerUuid = "";
    let careerMax = 0;
    let careerGender = "";
    let careerReligion = "";
    let careerItem = {};
    for (let result of tableResults.results) {
      if (result.type === "text") {
        const match = result.name?.match(/\[(\d+)\]/);
        level = match ? Number(match[1]) : 0;
      } else if (result.type === "document") {
        let career = await fromUuid(result.documentUuid);
        if (career) {
          careerPID = career.flags?.Pendragon?.pidFlag?.id;
          careerName = career.name;
          careerUuid = result.documentUuid;
          careerMax = career.system.ranks.length - 1;
          careerGender = career.system.gender;
          careerReligion = career.system.religions[0]?.pid ?? "";
          careerItem = career;
        }
      }
    }
    //Check that the career requirements match the family member (e.g. Religion and Gender)
    if (["male", "female"].includes(careerGender) && gender != careerGender) {
      return null;
    }
    if (careerReligion != "" && careerReligion != religion.flags?.Pendragon?.pidFlag?.id) {
      return null;
    }
    return { level, careerPID, careerName, careerUuid, careerMax, careerItem };
  }

  //Is leaving this rank automatic or a yearly chance roll?
  static isAutoPromotion(rank) {
    if (!rank || rank.noPromotion) return false;
    return rank.ageTest !== "" || ["swordProspects", "maidInWaiting"].includes(rank.special);
  }

  //Work out yearPromoted / nextPromotion for a family member
  //If from is not given they are treated as starting the career at 14
  static async careerTiming(member, career, level, { from = null } = {}) {
    const born = Number(member.system.born) || 0;
    const start = born + 14;
    const yearPromoted = from !== null ? Math.max(start, from) : start;
    const rank = career.system.ranks[level];
    let nextPromotion = 0; //0 = no wait, can be promoted at the next opportunity
    if (!rank || rank.noPromotion) return { yearPromoted, nextPromotion };

    if (rank.ageTest !== "") {
      nextPromotion = born + (await new Roll(rank.ageTest).evaluate()).total;
    } else if (rank.minYears !== "") {
      nextPromotion = yearPromoted + (await new Roll(rank.minYears).evaluate()).total;
    } else if (rank.special === "swordProspects") {
      nextPromotion = born + 21;
    } else if (rank.special === "maidInWaiting") {
      nextPromotion = born + (await new Roll("1D6+15").evaluate()).total;
    }
    //Can't be promoted again in the same year they reached this rank
    if (nextPromotion > 0) nextPromotion = Math.max(nextPromotion, yearPromoted + 1);
    return { yearPromoted, nextPromotion };
  }

  //One year of career progress for a family member.
  //allowChance: does a chance-based promotion succeed this year?
  //  - history: true while they still have rolled promotions left
  //  - Winter Phase: true if they won the 1D20 draw and passed the promotion roll
  static async careerYear(member, career, state, year, allowChance) {
    const ranks = career.system.ranks;
    const rank = ranks[state.level];
    if (!rank || rank.noPromotion || state.level >= ranks.length - 1) return false; //Top rank or dead end
    if (state.nextPromotion > year) return false; //Too young, or hasn't served long enough yet
    if (!this.isAutoPromotion(rank) && !allowChance) return false;
    if (rank.special === "maidenOfLake" && year < state.yearPromoted + 10) return false;
    if (rank.special != "" && rank.special != "none") {
      const specialResult = await this.specialOutcome(
        member,
        career,
        state.level,
        rank.special,
        year,
        state.yearPromoted,
      );
      if (specialResult) {
        state.career = specialResult.career;
        state.promotions += Math.max(specialResult.level - state.level, 0);
        state.level = specialResult.level;
      }
    } else {
      state.level++;
      state.promotions++;
    }
    Object.assign(state, await this.careerTiming(member, career, state.level, { from: year }));
    return true;
  }

  //Replay a family member's career year by year from their 14th birthday to now (or their death)
  //Automatic promotions always happen and count towards the rolled promotions
  //Chance promotions happen at the first opportunity while any rolled promotions are left
  static async careerHistory(member, career, startLevel = 0, rolledPromotions = 0) {
    const born = Number(member.system.born) || 0;
    const died = Number(member.system.died) || 0;
    const currentYear = game.time.components.year;
    const lastYear = died > 0 ? Math.min(died, currentYear) : currentYear;
    const state = {
      career: career,
      level: startLevel,
      promotions: 0,
      ...(await this.careerTiming(member, career, startLevel)),
    };
    for (let year = born + 15; year <= lastYear; year++) {
      await this.careerYear(member, state.career, state, year, state.promotions < rolledPromotions);
    }
    return state; //{ career, level, promotions, yearPromoted, nextPromotion }
  }

  //Return { career, level }, or null to just go up one rank
  static async specialOutcome(member, career, level, special, year, yearPromoted) {
    switch (special) {
      case "swordProspects":
        //Not strictly the rules on this.  Have assumed not vassal knight.  If heir rank 4, if spare 1D2+1, otherwise 1D3
        const formula = member.position === 1 ? "4" : member.position === 2 ? "1D2+1" : "1D3";
        return { career, level: (await new Roll(formula).evaluate()).total };
      case "maidInWaiting":
        //If promotion is at age 21 we rolled 6, therefore rank 1, otherwise rank 2
        return {
          career,
          level: year - member.system.born === 21 ? 1 : 2,
        };
      case "maidenOfLake":
        const { total } = await new Roll("1D6").evaluate();
        //Change career to family
        if (total < 5) {
          const careers = await game.system.api.pid.fromPIDBest({ pid: "i.career.path-of-the-family-ladies" });
          const newCareer = careers?.[0] || null;
          return newCareer ? { career: newCareer, level: 2 } : null;
        }
        //Otherwise promote current career
        return { career, level: 2 };
      default:
        return null;
    }
  }

  //Resolve Family & establish gender
  static async resolveFamily(actor) {
    let family = await actor.items.filter((itm) => itm.type === "family");
    for (let member of family) {
      member.gender = await PENUtilities.resolveRelationGender(member.system.gender, member.system.relation);
    }
    return family;
  }

  //Resolve position in family
  static async resolvePosition(member) {
    let relation = member.system.relation;
    if (!relation) return null;
    let relationGroup = await this.relationGroups(relation);
    if (!relationGroup) return null;
    //Get family members (alive or dead) who are aged 14+ in this relationGroup
    let group = this.family.filter((itm) => relationGroup.includes(itm.system.relation));
    group = group.sort((a, b) => b.system.age - a.system.age);

    switch (member.system.relation) {
      case "uncle":
      case "aunt":
      case "pibling":
        //Order family group by gender (male > female) then age (oldest first)
        group.sort(function (a, b) {
          let x = a.system.age;
          let y = b.system.age;
          let p = a.gender;
          let q = b.gender;
          if (p < q) {
            return 1;
          }
          if (p > q) {
            return -1;
          }
          if (x < y) {
            return 1;
          }
          if (x > y) {
            return -1;
          }
          return 0;
        });
        //Add 2 to position, one for index starting at 0, one for parent being the heir and not in list
        return group.findIndex((itm) => itm.id === member.id) + 2;
      default:
        return null;
    }
  }

  //Setup family groups by relation
  static relationGroups(relation) {
    const piblings = ["pibling", "aunt", "uncle"];
    const siblings = ["sibling", "brother", "sister"];
    const children = ["child", "son", "daughter"];
    const grandchildren = ["grandchild", "grandson", "granddaughter"];
    if (piblings.includes(relation)) return piblings;
    if (siblings.includes(relation)) return siblings;
    if (children.includes(relation)) return children;
    if (grandchildren.includes(relation)) return grandchildren;
    return "";
  }

  //Resovle which table to use for Piblings
  static resolvePiblingTable(doc) {
    if (doc.position === 2 && doc.gender === "male") {
      return this.careerTables.heir;
    } else if (
      doc.position === 3 &&
      doc.gender === "male" &&
      religion?.flags.Pendragon?.pidFlag?.id === "i.religion.pagan"
    ) {
      return this.careerTables.prayerPagan;
    } else if (
      doc.position === 3 &&
      doc.gender === "male" &&
      religion?.flags.Pendragon?.pidFlag?.id === "i.religion.christian"
    ) {
      return this.careerTables.prayerChristian;
    } else if (doc.system.relation === "pibling" && doc.gender === "male") {
      return this.careerTables.uncle;
    } else if (doc.system.relation === "pibling" && doc.gender === "female") {
      return this.careerTables.aunt;
    } else {
      return this.careerTables[doc.system.relation];
    }
    return null;
  }
}
