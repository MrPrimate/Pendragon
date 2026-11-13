import { PENCharCreateV2 } from "./charCreateV2.mjs";
import { PENUtilities } from "./utilities.mjs";
import { PENRandomName } from "./random-name.mjs";
import { FamilyData } from "../models/items/family_model.mjs";

export class PENCreateFamily {
  static FEMALE_RELATIONS = ["mother", "sister", "aunt", "grandmother", "daughter", "granddaughter"];
  //Gender neutral relation that also counts as each gendered relation when checking existing family
  static NEUTRAL_RELATIONS = {
    father: "parent",
    mother: "parent",
    grandfather: "grandparent",
    grandmother: "grandparent",
    uncle: "pibling",
    aunt: "pibling",
    brother: "sibling",
    sister: "sibling",
    son: "child",
    daughter: "child",
    grandson: "grandchild",
    granddaughter: "grandchild",
  };

  //Start the process with an actor
  static async startFamily(actor) {
    const yearBorn = await this.checkStart(actor);
    if (!yearBorn) return false;
    //Get the name tables once rather than for each family member
    this.nameTables = await this.getNameTables(actor);
    const run = this.newRun(actor, yearBorn);

    //Siblings first, as the parents need the youngest one
    const siblings = await this.addSiblings(run);
    if (!siblings) return false;
    const parents = await this.addParents(run, siblings);
    if (!parents) return false;
    for (const side of ["paternal", "maternal"]) {
      if (!(await this.addSide(run, side, parents))) return false;
    }
    await this.saveFamily(run);
    return true;
  }

  //Check the family can be created, and get the year the character was born (asking for it if it isn't set)
  //Returns the year, or false if the family can't be created
  static async checkStart(actor) {
    //For characters only
    if (actor.type != "character") {
      ui.notifications.warn("PEN.familyCreate.charOnly", { localize: true });
      return false;
    }
    //The Parents step handles inherited Glory so must be done first (unless parents already exist)
    if (!actor.system.create.parents && this.checkFamily(actor, "father", "mother").length < 1) {
      ui.notifications.warn("PEN.familyCreate.parentsFirst", { localize: true });
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
    return yearBorn;
  }

  //A family creation run
  //add = new family members to create. Their ids are set up front so children can link to their parents
  //links = updates for existing members that get parent or spouse links, by id
  //msg = the chat card
  static newRun(actor, yearBorn) {
    return {
      actor,
      yearBorn,
      add: [],
      links: new Map(),
      msg: "<h5>" + game.i18n.localize("PEN.familyCreate.title") + "</h5>",
    };
  }

  //One step of the family: members who already exist get any missing years of birth, otherwise new ones are rolled
  //existing = the existing members, ageGap and base = for their missing years of birth
  //existsLine = chat line when they already exist, generate = rolls new members (returns addFamily's results)
  //Returns { members, youngest, oldest } (years of birth), or null if the run has to stop
  static async fillRelation(run, existing, ageGap, base, existsLine, generate) {
    if (existing.length > 0) {
      const ages = await this.checkAges(run.actor, existing, ageGap, base);
      if (!ages.youngest) return null;
      run.msg += existsLine;
      return { members: existing, youngest: ages.youngest, oldest: ages.oldest };
    }
    const results = await generate();
    run.add.push(...results.members);
    run.msg += results.resultString;
    const oldest = Math.min(...results.members.map((member) => member.system.born));
    return { members: results.members, youngest: results.lastBorn, oldest };
  }

  //Siblings: 2D3 of them, each 1D6 years younger than the last
  static async addSiblings(run) {
    run.msg += this.headingString("PEN.familyCreate.siblings");
    return this.fillRelation(
      run,
      this.checkFamily(run.actor, "brother", "sister"),
      "1D6",
      run.yearBorn,
      this.lineString(game.i18n.localize("PEN.familyCreate.alreadyExist")),
      () =>
        this.addFamily({
          formula: "2D3",
          born: run.yearBorn,
          ageGap: "1D6",
          first: "brother",
          second: "sister",
          //The Player-knight is their brother or sister too
          taken: new Set([run.actor.name]),
        }),
    );
  }

  //Parents: need the youngest sibling, and married at their oldest child's birth less 1D2-1
  //(unless an existing parent already has a year). Both get the year, unless they already have one
  //Returns { father, mother, fatherBorn, motherBorn } (father and mother hold the couple to link, at most one
  //each), or null if the run has to stop
  static async addParents(run, siblings) {
    run.msg += this.headingString("PEN.familyCreate.parents");
    const father = this.checkFamily(run.actor, "father");
    const mother = this.checkFamily(run.actor, "mother");
    const oldestChild = Math.min(run.yearBorn, siblings.oldest);
    const married = await this.coupleMarried([...father, ...mother], oldestChild);
    const fatherStep = await this.fillRelation(run, father, "-1D6-21", run.yearBorn, this.existsString("father"), () =>
      this.addFamily({
        formula: "1",
        born: run.yearBorn,
        ageGap: "-1D6-21",
        first: "father",
        genderCheck: false,
        diedChance: 4,
        diedBase: siblings.youngest,
      }),
    );
    if (!fatherStep) return null;
    const motherStep = await this.fillRelation(
      run,
      mother,
      "+1D3-1",
      fatherStep.youngest,
      this.existsString("mother"),
      () =>
        this.addFamily({
          formula: "1",
          born: fatherStep.youngest,
          ageGap: "1D3-1",
          first: "mother",
          genderCheck: false,
          diedChance: 4,
          diedBase: siblings.youngest,
        }),
    );
    if (!motherStep) return null;
    this.setMarried(run, [...fatherStep.members, ...motherStep.members], married);
    const [fatherMember, motherMember] = this.pickCouple(fatherStep.members, motherStep.members);
    this.linkParents(run, siblings.members, [motherMember, fatherMember]);
    this.linkSpouses(run, fatherMember, motherMember);
    return {
      father: [fatherMember].filter(Boolean),
      mother: [motherMember].filter(Boolean),
      fatherBorn: fatherStep.youngest,
      motherBorn: motherStep.youngest,
    };
  }

  //One side of the family ("paternal" or "maternal"): aunts and uncles, grandparents and cousins
  //Returns false if the run has to stop
  static async addSide(run, side, parents) {
    const maternal = side === "maternal";
    const parent = maternal ? parents.mother : parents.father;
    const parentBorn = maternal ? parents.motherBorn : parents.fatherBorn;
    const suffix = " (" + game.i18n.localize("PEN.familyCreate." + side) + ")";
    const piblings = await this.addPiblings(run, side, suffix, parent, parentBorn);
    if (!piblings) return false;
    const grandparents = await this.addGrandparents(run, side, suffix, parentBorn, piblings);
    if (!grandparents) return false;
    //This side's aunts, uncles and parent are the grandparents' children
    this.linkParents(
      run,
      [...piblings.members, ...parent.slice(0, 1)],
      [grandparents.grandmother, grandparents.grandfather],
    );
    this.linkSpouses(run, grandparents.grandfather, grandparents.grandmother);
    await this.addCousins(run, side, suffix, piblings.members);
    return true;
  }

  //Aunts/Uncles: need the parent's age. 1D3 of them on each side, 1D6 odd = uncle, even = aunt
  //Age = parent - 1D6, less 1D6 for each next one
  static async addPiblings(run, side, suffix, parent, parentBorn) {
    run.msg += this.headingString("PEN.familyCreate.piblings", suffix);
    return this.fillRelation(
      run,
      this.checkFamily(run.actor, "uncle", "aunt", side),
      "1D6",
      parentBorn,
      this.lineString(game.i18n.localize("PEN.familyCreate.alreadyExist")),
      () =>
        this.addFamily({
          formula: "1D3",
          born: parentBorn,
          ageGap: "1D6",
          first: "uncle",
          second: "aunt",
          maternal: side === "maternal",
          //This side's parent is their brother or sister too
          taken: new Set([parent[0]?.name].filter(Boolean)),
        }),
    );
  }

  //Grandparents: need the youngest aunt/uncle, and married at their oldest child's birth less 1D2-1
  //(unless an existing grandparent already has a year). Both get the year, unless they already have one
  //Returns { grandfather, grandmother } (the couple to link, either can be undefined), or null if the run has to stop
  static async addGrandparents(run, side, suffix, parentBorn, piblings) {
    const grandfathers = this.checkFamily(run.actor, "grandfather", "", side);
    const grandmothers = this.checkFamily(run.actor, "grandmother", "", side);
    const married = await this.coupleMarried([...grandfathers, ...grandmothers], Math.min(parentBorn, piblings.oldest));
    const maternal = side === "maternal";
    run.msg += this.headingString("PEN.familyCreate.grandparents", suffix);
    const grandfather = await this.fillRelation(
      run,
      grandfathers,
      "-1D6-21",
      parentBorn,
      this.existsString("grandfather"),
      () =>
        this.addFamily({
          formula: "1",
          born: parentBorn,
          ageGap: "-1D6-21",
          first: "grandfather",
          genderCheck: false,
          diedChance: 7,
          diedBase: piblings.youngest,
          maternal,
        }),
    );
    if (!grandfather) return null;
    const grandmother = await this.fillRelation(
      run,
      grandmothers,
      "+1D3-1",
      grandfather.youngest,
      this.existsString("grandmother"),
      () =>
        this.addFamily({
          formula: "1",
          born: grandfather.youngest,
          ageGap: "1D3-1",
          first: "grandmother",
          genderCheck: false,
          diedChance: 4,
          diedBase: piblings.youngest,
          maternal,
        }),
    );
    if (!grandmother) return null;
    this.setMarried(run, [...grandfather.members, ...grandmother.members], married);
    const [grandfatherMember, grandmotherMember] = this.pickCouple(grandfather.members, grandmother.members);
    return { grandfather: grandfatherMember, grandmother: grandmotherMember };
  }

  //Cousins: 1D3-1 for each aunt/uncle, only those who have come of age (14+) and no older than the Player-knight
  //With the Create Cousins setting off, a single entry counts all the cousins on this side
  static async addCousins(run, side, suffix, piblings) {
    run.msg += this.headingString("PEN.familyCreate.cousins", suffix);
    if (this.checkFamily(run.actor, "cousin", "", side).length > 0) {
      run.msg += this.lineString(game.i18n.localize("PEN.familyCreate.alreadyExist"));
      return;
    }
    const addCousins = game.settings.get("Pendragon", "createCousins");
    const maternal = side === "maternal";
    let cousinCount = 0;
    for (const pibling of piblings) {
      const results = await this.addFamily({
        formula: "1D3-1",
        born: Math.max(pibling.system.born + 20, run.yearBorn - 1),
        ageGap: "1D6",
        first: "cousin",
        genderCheck: false,
        maternal,
        latestBorn: game.time.components.year - 14,
      });
      cousinCount += results.members.length;
      if (!addCousins) continue;
      this.linkParents(run, results.members, [pibling]);
      run.add.push(...results.members);
      run.msg += results.resultString;
    }
    if (addCousins) return;
    const memberName = game.i18n.format("PEN.familyCreate.cousinCount", { count: cousinCount });
    run.msg += this.lineString(memberName);
    if (cousinCount > 0) {
      run.add.push({
        type: "family",
        name: memberName,
        system: {
          born: run.yearBorn,
          relation: "cousin",
          died: "",
          source: "createFamily",
          maternal,
        },
      });
    }
  }

  //Post the chat card, create the new family members, then set their PIDs and the links on existing members
  static async saveFamily(run) {
    const { actor } = run;
    await ChatMessage.create({
      content: run.msg,
      speaker: ChatMessage.getSpeaker({ actor }),
    });
    const newFamily = await actor.createEmbeddedDocuments("Item", run.add, { keepId: true });
    const updates = game.system.api.pid.guessIdUpdates(newFamily);
    await actor.updateEmbeddedDocuments("Item", [...updates, ...run.links.values()]);
  }

  //The year a couple married: an existing member's year if they have one, otherwise their oldest child's year
  //of birth less 1D2-1
  static async coupleMarried(existing, oldestChild) {
    return (
      existing.map((itm) => Number(itm.system.married) || 0).find((year) => year > 0) ??
      oldestChild - (await new Roll("1D2-1").evaluate()).total
    );
  }

  //Give a couple (new member data or existing items) the year they married. An existing year is kept
  static setMarried(run, members, married) {
    for (const member of members) {
      if (Number(member.system.married) > 0) continue;
      if (member instanceof Item) {
        run.links.set(member.id, { ...run.links.get(member.id), _id: member.id, "system.married": married });
      } else {
        member.system.married = married;
      }
    }
  }

  //Id of an existing family item or of new member data
  static memberId(member) {
    return member.id ?? member._id;
  }

  //Set a link on new member data, or on an existing item that doesn't have one yet. Existing links are kept
  static setLink(run, member, key, value) {
    if (member instanceof Item) {
      if (member.system[key].length > 0) return;
      run.links.set(member.id, { ...run.links.get(member.id), _id: member.id, ["system." + key]: value });
    } else {
      member.system[key] = value;
    }
  }

  //The couple to link from the members found for each partner (e.g. the fathers and the mothers). A neutral
  //relation (e.g. parent) is found for both, so it goes to the partner its gender fits and is never both
  //Members who fit are placed first, so a lone woman is the second partner (e.g. the mother), not the first
  //Returns [first, second], either of which can be undefined
  static pickCouple(firsts, seconds) {
    const gender = (member) =>
      this.relationGender(member.system.relation) || PENUtilities.genderType(member.system.gender);
    let first = firsts.find((member) => gender(member) !== "female");
    let second = seconds.find((member) => member !== first && gender(member) !== "male");
    first ??= firsts.find((member) => member !== second);
    second ??= seconds.find((member) => member !== first);
    return [first, second];
  }

  //Link children to their parents
  static linkParents(run, children, parents) {
    const parentIds = parents.filter(Boolean).map((parent) => this.memberId(parent));
    if (parentIds.length === 0) return;
    for (const child of children) this.setLink(run, child, "parentIds", parentIds);
  }

  //Link a couple to each other
  static linkSpouses(run, first, second) {
    if (!first || !second) return;
    this.setLink(run, first, "spouseId", this.memberId(second));
    this.setLink(run, second, "spouseId", this.memberId(first));
  }

  //Add Family, taking an object of:
  //formula = number of members
  //born = year born off which the members birth is based
  //ageGap = formula for the gap between members
  //first = title from PENDRAGON.familyRelationships (e.g. uncle)
  //second  = alternative equivalent (e.g. aunt).
  //genderCheck - if false uses the first (male) option
  //diedChance - roll under this score on 1D6 to die
  //diedBase - if died then year = 1D6 + diedBase
  //maternal - true for the mother's side of the family
  //latestBorn - members who would be born after this year are not added
  //taken - names already used by their brothers and sisters, so none of them is reused
  static async addFamily({
    formula,
    born,
    ageGap,
    first,
    second = "",
    genderCheck = true,
    diedChance = 0,
    diedBase = 0,
    maternal = false,
    latestBorn = game.time.components.year,
    taken = new Set(),
  }) {
    let resultString = "";
    let members = [];
    let rollResults = await PENUtilities.complexDiceRoll(formula);
    for (let i = 1; i <= rollResults.total; i++) {
      let type = first;
      if (genderCheck) {
        let genderResults = await PENUtilities.complexDiceRoll("1D6");
        if (genderResults.total % 2 === 0) type = second;
      }
      let bornResults = await PENUtilities.complexDiceRoll(ageGap);
      let birth = bornResults.total + born;
      //Anyone else would be younger still so stop here
      if (birth > latestBorn) break;
      born = birth;
      let died = null;
      if (diedChance > 0) {
        let diedResults = await PENUtilities.complexDiceRoll("1D6");
        if (diedResults.total <= diedChance) {
          let deceasedRoll = await PENUtilities.complexDiceRoll("1D6");
          died = Math.min(diedBase + deceasedRoll.total, game.time.components.year);
        }
      }

      //Cousins can be either
      let female = this.FEMALE_RELATIONS.includes(type);
      if (type === "cousin") {
        let genderRoll = await new Roll("1D2").evaluate();
        female = genderRoll.total === 2;
      }

      let memberName = game.i18n.localize("PEN.familyRelationship." + type);
      //If game setting to roll random names. Brothers and sisters don't share a name
      if (this.nameTables) {
        let table = female ? this.nameTables.female : this.nameTables.male;
        let n2Roll = await PENRandomName.uniqueName(async () => {
          let nameTableOut = await PENCharCreateV2.makeTableRoll(table);
          return nameTableOut?.tableResults?.results[0]?.name || null;
        }, taken);
        if (n2Roll) {
          memberName = n2Roll;
          taken.add(memberName);
        }
      }

      members.push({
        _id: foundry.utils.randomID(),
        type: "family",
        name: memberName,
        system: {
          born: birth,
          relation: type,
          gender: game.i18n.localize(female ? "PEN.female" : "PEN.male"),
          died: died,
          source: "createFamily",
          maternal: maternal,
        },
      });
      let line =
        game.i18n.localize("PEN.familyRelationship." + type) +
        ": " +
        memberName +
        ", " +
        game.i18n.localize("PEN.born") +
        " " +
        birth;
      if (died != null) {
        line += ", " + game.i18n.localize("PEN.died") + " " + died;
      }
      resultString += this.lineString(line);
    }
    return { members, lastBorn: born, resultString };
  }

  //Returns "male", "female" or "" for a family relation (e.g. mother -> female, sibling -> "")
  static relationGender(relation) {
    if (this.FEMALE_RELATIONS.includes(relation)) return "female";
    if (relation in this.NEUTRAL_RELATIONS) return "male";
    return "";
  }

  //Get the male and female name tables, false if random names are off or either table is missing
  static async getNameTables(actor) {
    if (!game.settings.get("Pendragon", "randomFamilyNames")) return false;
    const culture = PENRandomName.resolveCulture(actor, "culture");
    let male = await PENRandomName.getNameTable("male", culture);
    let female = await PENRandomName.getNameTable("female", culture);
    if (!male || !female) return false;
    return { male, female };
  }

  //Chat card helpers
  static headingString(key, suffix = "") {
    return "<div><strong>" + game.i18n.localize(key) + suffix + "</strong>:</div>";
  }

  static lineString(text) {
    return "<div>&nbsp;&nbsp;" + text + "</div>";
  }

  static existsString(type) {
    return this.lineString(
      game.i18n.localize("PEN.familyRelationship." + type) +
        ": " +
        game.i18n.localize("PEN.familyCreate.alreadyExists"),
    );
  }

  //Check Family Members exist
  //type1 = first relation type
  //type2 = second relation type
  //maternalCheck = filter for maternal/paternal.  Blank = no check, 'maternal' or 'paternal' include only those
  static checkFamily(actor, type1 = "", type2 = "", maternalCheck = "") {
    let validOptions = Object.keys(CONFIG.PENDRAGON.familyRelationships);
    if (type1 != "" && !validOptions.includes(type1)) {
      ui.notifications.warn("PEN.familyCreate.invalidFamilyType", {
        format: { type: type1 },
      });
      type1 = ""; //ignore invalid type
    }
    if (type2 != "" && !validOptions.includes(type2)) {
      ui.notifications.warn("PEN.familyCreate.invalidFamilyType", {
        format: { type: type2 },
      });
      type2 = ""; //ignore invalid type
    }
    //Neutral relations (e.g. parent) match their gendered versions (e.g. father/mother)
    let types = [type1, type2, this.NEUTRAL_RELATIONS[type1], this.NEUTRAL_RELATIONS[type2]].filter(Boolean);
    let members = actor.items
      .filter((itm) => itm.type === "family")
      .filter((itm) => types.includes(itm.system.relation));
    if (maternalCheck === "maternal") {
      members = members.filter((itm) => itm.system.maternal);
    } else if (maternalCheck === "paternal") {
      members = members.filter((itm) => !itm.system.maternal);
    }
    return members;
  }

  //Check ages of existing family members
  //members: array of family members in this selection
  //ageGap: roll formula to increase the age by
  //base: base year of birth used if none of the members have a year of birth
  static async checkAges(actor, members, ageGap, base) {
    if (!Roll.validate(ageGap)) {
      ui.notifications.warn("PEN.familyCreate.invalidFormula", {
        format: { formula: ageGap },
      });
      return false;
    }
    let updates = [];
    let youngest = Math.max(...members.map((item) => item.system.born));
    //Oldest known year of birth, ignoring members who don't have one yet
    let oldest = Math.min(...members.map((item) => item.system.born).filter((born) => born > 0));
    if (youngest === 0) youngest = base;
    for (let member of members) {
      if (member.system.born > 0) continue;
      let ageRoll = new Roll(ageGap);
      let ageResult = await ageRoll.evaluate();
      let born = Math.min(youngest + ageResult.total, game.time.components.year);
      updates.push({ _id: member.id, "system.born": born });
      youngest = born;
      if (born < oldest) oldest = born;
    }
    await actor.updateEmbeddedDocuments("Item", updates);
    return { youngest, oldest };
  }

  //Delete Family members created this way
  static async deleteFamily(actor) {
    let members = actor.items
      .filter((itm) => itm.type === "family")
      .filter((itm) => itm.system.source === "createFamily");
    const deleted = new Set(members.map((i) => i.id));
    //Members that stay (e.g. parents from the Parents step) lose any link to a deleted parent or spouse
    const unlink = FamilyData.unlinkUpdates(actor, deleted);
    //Unlinked here and awaited (not by the actor's delete handler) so a family created straight after sees the result
    await actor.deleteEmbeddedDocuments("Item", [...deleted], { pendragonFamilyUnlinked: true });
    if (unlink.length > 0) await actor.updateEmbeddedDocuments("Item", unlink);
  }
}
