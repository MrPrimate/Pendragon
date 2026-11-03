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

  static PIBLINGS = ["pibling", "aunt", "uncle"];

  static async randomCareer(doc) {
    let updates = [];
    let members = [];
    let msgString = "<h5>" + game.i18n.localize("PEN.familyCreate.careers") + "</h5>";
    const actor = doc instanceof Actor ? doc : doc?.parent instanceof Actor ? doc.parent : null;
    if (!actor) return null;
    // Prepare the roll tables once
    this.careerTables = await this.getCareerTables();
    if (!this.careerTables) return null;

    //Family list is used for the gender and position of each person tested
    const family = await this.resolveFamily(actor);

    //If handin doc is a character we are rolling on all the family who don't have a career yet
    if (doc instanceof Actor && doc.type === "character") {
      //TODO: Only works for Piblings, need to extend to Siblings, children, grandchildren
      members = family.items.filter(
        (itm) => this.PIBLINGS.includes(itm.system.relation) && itm.system.age >= 14 && !itm.system.careers.length,
      );
      //Else if doc is a family item roll on just this member
    } else if (doc instanceof Item && doc.type === "family") {
      members.push(doc);
    } else {
      //Invalid roll target
      ui.notifications.warn("PEN.career.invalidTarget", { format: { source: doc.name } });
      return null;
    }

    //Get the relevant religion from the doc if actor or parent actor
    let religion = PENRandomName.resolveCulture(doc, "religion");
    if (!religion) {
      ui.notifications.warn("PEN.noReligion", { localize: true });
      return null;
    }

    //Loop through all the members and get career
    for (let member of members) {
      const info = {
        gender: family.genders.get(member.id),
        position: this.resolvePosition(member, family),
        religion,
      };
      let careerResult = await this.singleCareer(member, info);
      if (!careerResult) {
        msgString +=
          "<div><strong>" + member.name + "</strong>: " + game.i18n.localize("PEN.career.mismatch") + "</div>";
      } else {
        updates.push({
          _id: member.id,
          "system.careerLevel": careerResult.result.level,
          "system.careers": careerResult.careers,
          "system.yearPromoted": careerResult.result.yearPromoted,
          "system.nextPromotion": careerResult.result.nextPromotion,
        });
        msgString +=
          "<div><strong>" +
          member.name +
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
    return updates;
  }

  //info = { gender, position, religion }
  static async singleCareer(doc, info) {
    let careers = [];
    let promotion = 0;
    //Roll careers for family member who have come of age
    if (doc.system.age >= 14) {
      let table = null;
      switch (doc.system.relation) {
        case "uncle":
        case "aunt":
        case "pibling": {
          table = this.resolvePiblingTable(doc, info);
          const promotionResults = this.careerTables.promotions
            ? await PENUtilities.tableDiceRoll(this.careerTables.promotions)
            : null;
          if (promotionResults) {
            let thisResult = Number(promotionResults.results[0]?.name?.split(" ")[0]);
            promotion = Number.isFinite(thisResult) ? thisResult : 0;
          }
          break;
        }
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
        let career = await this.resolveCareer(tableResults, info.gender, info.religion);
        if (!career) continue; //Reroll up to 5 times
        const result = await this.careerHistory(doc, career.careerItem, career.level, promotion, info.position);
        careers.push({
          name: result.career.name,
          pid: result.career.flags?.Pendragon?.pidFlag?.id,
          uuid: result.career.uuid,
        });
        return { careers, result };
      }
    }
    return false;
  }

  //Get the Career tables. A missing table is only a problem when it is needed, so it is left as null
  static async getCareerTables() {
    let careerTables = {};
    for (let key in this.DEFAULT_TABLES) {
      careerTables[key] = await PENRandomName.tableFromSource({ pid: this.DEFAULT_TABLES[key] });
    }
    return careerTables;
  }

  //Turn Career Roll results in to career info
  static async resolveCareer(tableResults, gender, religion) {
    let level = 0;
    let careerItem = null;
    for (let result of tableResults.results) {
      if (result.type === "text") {
        const match = result.name?.match(/\[(\d+)\]/);
        level = match ? Number(match[1]) : 0;
      } else if (result.type === "document") {
        const career = await fromUuid(result.documentUuid);
        if (career?.type === "career") careerItem = career;
      }
    }
    if (!careerItem) return null;
    //Check that the career requirements match the family member (e.g. Religion and Gender)
    const careerGender = careerItem.system.gender;
    const careerReligion = careerItem.system.religions[0]?.pid ?? "";
    if (["male", "female"].includes(careerGender) && gender != careerGender) {
      return null;
    }
    if (careerReligion != "" && careerReligion != religion?.flags?.Pendragon?.pidFlag?.id) {
      return null;
    }
    return { level, careerItem };
  }

  //Is leaving this rank automatic (happens at a known year) rather than a yearly chance roll?
  static isAutoPromotion(rank) {
    if (!rank || rank.noPromotion) return false;
    return rank.ageTest !== "" || ["swordProspects", "maidInWaiting", "maidenOfLake"].includes(rank.special);
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
    } else if (rank.special === "maidenOfLake") {
      nextPromotion = yearPromoted + 10;
    }
    //Can't be promoted again in the same year they reached this rank
    if (nextPromotion > 0) nextPromotion = Math.max(nextPromotion, yearPromoted + 1);
    return { yearPromoted, nextPromotion };
  }

  //One year of career progress for a family member. Returns true if they changed rank or career.
  //allowChance: does a chance-based promotion succeed this year?
  //  - history: true while they still have rolled promotions left
  //  - Winter Phase: true if they won the 1D20 draw and passed the promotion roll
  static async careerYear(member, state, year, allowChance) {
    const ranks = state.career.system.ranks;
    const rank = ranks[state.level];
    if (!rank || rank.noPromotion || state.level >= ranks.length - 1) return false; //Top rank or dead end
    if (state.nextPromotion > year) return false; //Too young, or hasn't served long enough yet
    if (!this.isAutoPromotion(rank) && !allowChance) return false;

    //Special ranks decide their own result; null means a normal step up
    let next = null;
    if (rank.special && rank.special !== "none") next = await this.specialOutcome(member, state, rank.special, year);
    next ??= { career: state.career, level: state.level + 1 };

    //No change: keep yearPromoted, just roll a new wait
    if (next.career === state.career && next.level === state.level) {
      const { nextPromotion } = await this.careerTiming(member, state.career, state.level, { from: year });
      state.nextPromotion = nextPromotion;
      return false;
    }

    //Uses up one of their rolled promotions, even if it skips ranks or changes career
    state.promotions++;
    state.career = next.career;
    state.level = next.level;
    Object.assign(state, await this.careerTiming(member, state.career, state.level, { from: year }));
    return true;
  }

  //Replay a family member's career year by year from their 14th birthday to now (or their death)
  //Automatic promotions always happen and count towards the rolled promotions
  //Chance promotions happen at the first opportunity while any rolled promotions are left
  //No promotion in the year they turn 14, as that is the year they start
  static async careerHistory(member, career, startLevel = 0, rolledPromotions = 0, position = null) {
    const born = Number(member.system.born) || 0;
    const died = Number(member.system.died) || 0;
    const currentYear = game.time.components.year;
    const lastYear = died > 0 ? Math.min(died, currentYear) : currentYear;
    const state = {
      career,
      level: startLevel,
      promotions: 0,
      position,
      ...(await this.careerTiming(member, career, startLevel)),
    };
    for (let year = born + 15; year <= lastYear; year++) {
      await this.careerYear(member, state, year, state.promotions < rolledPromotions);
    }
    return state; //{ career, level, promotions, position, yearPromoted, nextPromotion }
  }

  //Return { career, level }, or null to just go up one rank
  //Called before state changes, so state.yearPromoted/nextPromotion are still for the rank being left
  static async specialOutcome(member, state, special, year) {
    switch (special) {
      case "swordProspects": {
        //Not strictly the rules on this.  Have assumed not vassal knight.  If heir rank 4, if spare 1D2+1, otherwise 1D3
        const formula = state.position === 1 ? "4" : state.position === 2 ? "1D2+1" : "1D3";
        const level = (await new Roll(formula).evaluate()).total;
        return { career: state.career, level: Math.max(level, state.level + 1) };
      }
      case "maidInWaiting": {
        //1D6+15: due at 21 means a 6 was rolled, therefore rank 1, otherwise rank 2
        const dueAge = state.nextPromotion - (Number(member.system.born) || 0);
        return { career: state.career, level: dueAge === 21 ? 1 : 2 };
      }
      case "maidenOfLake": {
        //After 10 years in the rank
        const { total } = await new Roll("1D6").evaluate();
        //1-4 she marries and becomes a wife (Path of the Family)
        if (total < 5) {
          const careers = await game.system.api.pid.fromPIDBest({ pid: "i.career.path-of-the-family-ladies" });
          const newCareer = careers?.[0] ?? null;
          if (newCareer) return { career: newCareer, level: 2 };
        }
        //5-6 she becomes a Lady of the Lake
        return { career: state.career, level: Math.max(2, state.level + 1) };
      }
      default:
        return null;
    }
  }

  //Resolve Family & establish gender
  //Returns { items, genders } where genders is a Map of item id to "male" / "female"
  static async resolveFamily(actor) {
    const items = actor.items.filter((itm) => itm.type === "family");
    const genders = new Map();
    for (let member of items) {
      genders.set(member.id, await PENUtilities.resolveRelationGender(member.system.gender, member.system.relation));
    }
    return { items, genders };
  }

  //Gender and family position for one member, for use outside randomCareer (e.g. dropping a career)
  static async memberInfo(member) {
    const actor = member.parent instanceof Actor ? member.parent : null;
    if (!actor) return { gender: null, position: null };
    const family = await this.resolveFamily(actor);
    return { gender: family.genders.get(member.id), position: this.resolvePosition(member, family) };
  }

  //Resolve position in family
  static resolvePosition(member, family) {
    let relation = member.system.relation;
    if (!relation) return null;
    let relationGroup = this.relationGroups(relation);
    if (!relationGroup) return null;
    //Family members (alive or dead) in this relationGroup on the same side of the family
    let group = family.items.filter(
      (itm) => relationGroup.includes(itm.system.relation) && itm.system.maternal === member.system.maternal,
    );

    switch (member.system.relation) {
      case "uncle":
      case "aunt":
      case "pibling": {
        //Order family group by gender (male first) then birth year (oldest first)
        //Age is not used as it stops increasing for the dead
        const male = (itm) => (family.genders.get(itm.id) === "male" ? 0 : 1);
        group.sort((a, b) => male(a) - male(b) || a.system.born - b.system.born);
        //Add 2 to position, one for index starting at 0, one for parent being the heir and not in list
        //TODO: Check the rule for the maternal side, where the mother is not the heir
        return group.findIndex((itm) => itm.id === member.id) + 2;
      }
      default:
        return null;
    }
  }

  //Setup family groups by relation
  static relationGroups(relation) {
    const siblings = ["sibling", "brother", "sister"];
    const children = ["child", "son", "daughter"];
    const grandchildren = ["grandchild", "grandson", "granddaughter"];
    if (this.PIBLINGS.includes(relation)) return this.PIBLINGS;
    if (siblings.includes(relation)) return siblings;
    if (children.includes(relation)) return children;
    if (grandchildren.includes(relation)) return grandchildren;
    return "";
  }

  //Resolve which table to use for Piblings
  static resolvePiblingTable(doc, { gender, position, religion }) {
    const religionPID = religion?.flags?.Pendragon?.pidFlag?.id;
    if (position === 2 && gender === "male") {
      return this.careerTables.heir;
    } else if (position === 3 && gender === "male" && religionPID === "i.religion.pagan") {
      return this.careerTables.prayerPagan;
    } else if (position === 3 && gender === "male" && religionPID === "i.religion.christian") {
      return this.careerTables.prayerChristian;
    } else if (gender === "male") {
      return this.careerTables.uncle;
    } else {
      return this.careerTables.aunt;
    }
  }
}
