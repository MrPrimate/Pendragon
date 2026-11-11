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
    prayerPaganMen: "rt..table-2-9-sibling-prayer-profession-pagan-men",
    prayerPaganWomen: "rt..table-2-9-sibling-prayer-profession-pagan-women",
    prayerChristianMen: "rt..table-2-9-sibling-prayer-profession-christian-men",
    prayerChristianWomen: "rt..table-2-9-sibling-prayer-profession-christian-women",
    childSpare: "rt..table-2-15-a-martial-careers-spare",
    childPrayer: "rt..table-2-15-b-martial-careers-prayer",
    childMartial: "rt..table-2-15-martial-careers",
    childNonMartial: "rt..table-2-16-daughters-careers",
  };

  static PIBLINGS = ["pibling", "aunt", "uncle"];
  static SIBLINGS = ["sibling", "brother", "sister"];
  static COUSINS = ["cousin"];
  static CHILDREN = ["child", "son", "daughter"];
  static GRANDCHILDREN = ["grandchild", "grandson", "granddaughter"];

  static async randomCareer(doc, winter = false) {
    let updates = [];
    let members = [];
    let msgString = "<h5>" + game.i18n.localize("PEN.familyCreate.careers") + "</h5>";
    const actor = doc instanceof Actor ? doc : doc?.parent instanceof Actor ? doc.parent : null;
    if (!actor) return null;
    // Prepare the roll tables once
    this.careerTables = await this.getCareerTables();
    if (!this.careerTables) return null;

    //Family list is used for the gender, martial status and position of each person tested
    const family = await this.resolveFamily(actor);
    //If handin doc is a character we are rolling on all the family who don't have a career yet
    if (doc instanceof Actor && doc.type === "character") {
      //This works for Piblings, Siblings & Children.  Can't work out order for Grandchildren - would expect this to be done from parents family tree
      members = family.items.filter(
        (itm) =>
          (this.PIBLINGS.includes(itm.system.relation) ||
            this.SIBLINGS.includes(itm.system.relation) ||
            this.CHILDREN.includes(itm.system.relation)) &&
          itm.system.age >= 14 &&
          !itm.system.careers.length,
      );
      //Else if doc is a family item roll on just this member
    } else if (doc instanceof Item && doc.type === "family") {
      members.push(doc);
    } else {
      //Invalid roll target
      ui.notifications.warn("PEN.career.invalidTarget", { format: { source: doc.name } });
      return null;
    }

    //If Winter Phase and no members to add a career to then stop
    if (winter && members.length === 0) return;

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
        martial: family.martials.get(member.id),
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
          ...this.marriedUpdate(member, careerResult.result.married),
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
        case "brother":
        case "sister":
        case "sibling": {
          table = this.resolveSiblingTable(doc, info);
          break;
        }
        case "son":
        case "daughter":
        case "child":
          table = this.resolveChildTable(doc, info);
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
        if (career?.type != "career") continue;
        const careerGender = career.system.gender;
        const careerReligion = career.system.religions[0]?.pid ?? "";
        if (["male", "female"].includes(careerGender) && gender != careerGender) continue;
        if (careerReligion != "" && careerReligion != religion?.flags?.Pendragon?.pidFlag?.id) continue;
        careerItem = career;
      }
    }
    if (!careerItem) return null;
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
    if (!rank) return false;
    const deadEnd = rank.noPromotion || state.level >= ranks.length - 1;

    //Some ranks give an unmarried member a chance of marriage every year, whether or not a promotion is due
    if (this.canMarry(rank, state) && (await this.marriageChance(rank))) state.married = year;

    //For some ranks marriage is the promotion, including for members who married before reaching the rank
    if (!deadEnd && this.promotedByMarriage(rank, state, year)) {
      return this.applyCareerChange(member, state, { career: state.career, level: state.level + 1 }, year);
    }

    if (deadEnd) return false; //Top rank or dead end
    if (rank.marriagePromotes) return false; //Only promoted by marriage
    if (state.nextPromotion > year) return false; //Too young, or hasn't served long enough yet
    if (!this.isAutoPromotion(rank) && !allowChance) return false;

    //Special ranks decide their own result; null means a normal step up
    let next = null;
    if (rank.special && rank.special !== "none") next = await this.specialOutcome(member, state, rank.special, year);
    next ??= { career: state.career, level: state.level + 1 };
    if (next.married && !state.married) state.married = next.married;

    //No change: keep yearPromoted, just roll a new wait
    if (next.career === state.career && next.level === state.level) {
      const { nextPromotion } = await this.careerTiming(member, state.career, state.level, { from: year });
      state.nextPromotion = nextPromotion;
      return false;
    }
    return this.applyCareerChange(member, state, next, year);
  }

  //Move a family member to a new rank or career. Always returns true
  static async applyCareerChange(member, state, next, year) {
    //Uses up one of their rolled promotions, even if it skips ranks or changes career
    state.promotions++;
    state.career = next.career;
    state.level = next.level;
    Object.assign(state, await this.careerTiming(member, state.career, state.level, { from: year }));
    return true;
  }

  //Update data for the marriage year a career ends up with. A year the career rolled (not one the member
  //already had) is also kept in a flag, so undoing the careers clears only that year
  static marriedUpdate(member, married) {
    if (married === (Number(member.system.married) || 0)) return {};
    return { "system.married": married, "flags.Pendragon.careerMarried": married };
  }

  //A member starting on this rank is married: above a rank where marriage is the promotion (e.g. Knight Consort),
  //or Wife or higher in the Ladies career, whose marriage comes from the maidInWaiting special instead
  static startsMarried(career, startLevel) {
    if (career.flags?.Pendragon?.pidFlag?.id === "i.career.path-of-the-family-ladies") return startLevel > 1;
    return (career.system?.ranks ?? []).slice(0, startLevel).some((rank) => rank.marriagePromotes);
  }

  //An unmarried member on a rank with a marriage chance rolls for it every year
  static canMarry(rank, state) {
    return (rank?.marriage ?? 0) > 0 && !state.married;
  }

  //A married member on a rank where marriage is the promotion moves up
  static promotedByMarriage(rank, state, year) {
    return !!rank?.marriagePromotes && state.married > 0 && state.married <= year;
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
    //A bit of a fudge to deal with careers starting on a married rank
    let married = Number(member.system.married) || 0;
    if (!married && this.startsMarried(career, startLevel)) {
      married = Math.min(born + 15 + (await new Roll("1D5").evaluate()).total, lastYear);
    }
    const state = {
      career,
      level: startLevel,
      promotions: 0,
      position,
      ...(await this.careerTiming(member, career, startLevel)),
      married: married,
    };
    for (let year = born + 15; year <= lastYear; year++) {
      await this.careerYear(member, state, year, state.promotions < rolledPromotions);
    }
    return state; //{ career, level, promotions, position, yearPromoted, nextPromotion, married }
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
        return { career: state.career, level: dueAge === 21 ? 1 : 2, married: dueAge === 21 ? 0 : year };
      }
      case "maidenOfLake": {
        //After 10 years in the rank
        const { total } = await new Roll("1D6").evaluate();
        //1-4 she marries and becomes a wife (Path of the Family)
        if (total < 5) {
          const careers = await game.system.api.pid.fromPIDBest({ pid: "i.career.path-of-the-family-ladies" });
          const newCareer = careers?.[0] ?? null;
          if (newCareer) return { career: newCareer, level: 2, married: year };
        }
        //5-6 she becomes a Lady of the Lake
        return { career: state.career, level: Math.max(2, state.level + 1) };
      }
      default:
        return null;
    }
  }

  //Roll 1D6 against the rank's marriage chance (1 = always, 5 = 5-6). Returns true if they marry
  static async marriageChance(rank) {
    const roll = (await new Roll("1D6").evaluate()).total;
    return roll >= rank.marriage;
  }

  //Resolve Family & establish gender
  //Returns { items, genders, martials } where genders is a Map of item id to "male" / "female"
  //and martials a Map of item id to "martial" / "nonMartial" (rolled fresh on every call)
  static async resolveFamily(actor) {
    const items = actor.items.filter((itm) => itm.type === "family");
    const genders = new Map();
    const martials = new Map();
    for (let member of items) {
      const gender = await PENUtilities.resolveRelationGender(member.system.gender, member.system.relation);
      genders.set(member.id, gender);
      //Sisters and daughters are martial on a 20 on 1D20 (NHB Professions for Siblings)
      //The book gives no odds for brothers, but treats all sons as martial (Pg 57), so assume the same for brothers
      const martial = gender === "female" ? await PENUtilities.decideMartial(20) : "martial";
      martials.set(member.id, martial);
    }
    return { items, genders, martials };
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
        //Add 1 to position for index starting at 0, and one for parent being the heir if on paternal side
        const posIndex = group.findIndex((itm) => itm.id === member.id) + 1;
        return posIndex + (member.system.maternal ? 0 : 1);
      }
      case "brother":
      case "sister":
      case "sibling": {
        //The character is the heir (1).
        //The eldest martial sibling is the spare (2),
        //and the next eldest martial sibling is the prayer (3).
        //The rest follow in birth order (4+)
        group.sort((a, b) => a.system.born - b.system.born);
        const martials = group.filter((itm) => family.martials.get(itm.id) === "martial");
        const spare = martials[0] ?? null;
        const prayer = martials[1] ?? null;
        if (spare?.id === member.id) return 2;
        if (prayer?.id === member.id) return 3;
        const rest = group.filter((itm) => itm.id !== spare?.id && itm.id !== prayer?.id);
        return rest.findIndex((itm) => itm.id === member.id) + 4;
      }
      case "son":
      case "daughter":
      case "child": {
        //The eldest martial child is the heir (1),
        //the next eldest martial child is the spare (2),
        //and the third eldest martial child is the prayer (3).
        //The rest follow in birth order (4+)
        group.sort((a, b) => a.system.born - b.system.born);
        const martials = group.filter((itm) => family.martials.get(itm.id) === "martial");
        const heir = martials[0] ?? null;
        const spare = martials[1] ?? null;
        const prayer = martials[2] ?? null;
        if (heir?.id === member.id) return 1;
        if (spare?.id === member.id) return 2;
        if (prayer?.id === member.id) return 3;
        const rest = group.filter((itm) => itm.id !== heir?.id && itm.id !== spare?.id && itm.id !== prayer?.id);
        return rest.findIndex((itm) => itm.id === member.id) + 4;
      }
      default:
        return null;
    }
  }

  //Setup family groups by relation
  static relationGroups(relation) {
    if (this.PIBLINGS.includes(relation)) return this.PIBLINGS;
    if (this.SIBLINGS.includes(relation)) return this.SIBLINGS;
    if (this.CHILDREN.includes(relation)) return this.CHILDREN;
    if (this.GRANDCHILDREN.includes(relation)) return this.GRANDCHILDREN;
    if (this.COUSINS.includes(relation)) return this.COUSINS;
    return "";
  }

  //Resolve which table to use for Piblings
  static resolvePiblingTable(doc, { gender, position, religion }) {
    const religionPID = religion?.flags?.Pendragon?.pidFlag?.id;
    if (position === 2 && gender === "male") {
      return this.careerTables.heir;
    } else if (position === 3 && gender === "male" && religionPID === "i.religion.pagan") {
      return this.careerTables.prayerPaganMen;
    } else if (position === 3 && gender === "male" && religionPID === "i.religion.christian") {
      return this.careerTables.prayerChristianMen;
    } else if (gender === "male") {
      return this.careerTables.uncle;
    } else {
      return this.careerTables.aunt;
    }
  }

  //Resolve which table to use for Siblings
  static resolveSiblingTable(doc, { gender, martial, position, religion }) {
    const religionPID = religion?.flags?.Pendragon?.pidFlag?.id;
    //Position 2 is the "spare" (Squire on the Path of the Sword), position 3 the "prayer"
    //Female prayers use the women's tables (e.g. Path of the Nun for Christians)
    if (position === 2) {
      return this.careerTables.heir;
    } else if (position === 3 && gender === "male" && religionPID === "i.religion.pagan") {
      return this.careerTables.prayerPaganMen;
    } else if (position === 3 && gender === "male" && religionPID === "i.religion.christian") {
      return this.careerTables.prayerChristianMen;
    } else if (position === 3 && gender === "female" && religionPID === "i.religion.pagan") {
      return this.careerTables.prayerPaganWomen;
    } else if (position === 3 && gender === "female" && religionPID === "i.religion.christian") {
      return this.careerTables.prayerChristianWomen;
    } else if (martial === "martial") {
      return this.careerTables.martial;
    } else {
      return this.careerTables.nonMartial;
    }
  }

  //Resolve which table to use for Children
  static resolveChildTable(doc, { martial, position }) {
    //Position 1 is the "heir", 2 is the "spare" (Squire on the Path of the Sword), position 3 the "prayer"
    if (position === 1) {
      return this.careerTables.heir;
    } else if (position === 2) {
      return this.careerTables.childSpare;
    } else if (position === 3) {
      return this.careerTables.childPrayer;
    } else if (martial === "martial") {
      return this.careerTables.childMartial;
    } else {
      return this.careerTables.childNonMartial;
    }
  }
}
