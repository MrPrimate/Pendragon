import { PENUtilities } from "./utilities.mjs";
import { PENRandomName } from "./random-name.mjs";


export class PENRandomCareer {


  //Career Tables
  static DEFAULT_TABLES = {
    promotions:"rt..table-2-6-family-promotion",
    uncle: "rt..table-2-7-men-profession",
    aunt: "rt..table-2-8-women-profession",
    martial: "rt..table-2-9-sibling-profession-martial",
    nonMartial: "rt..table-2-9-sibling-profession-nonmartial",
    heir: "rt..table-2-9-sibling-heir-profession",
    prayerPagan :"rt..table-2-9-sibling-prayer-profession-pagan",
    prayerChristian :"rt..table-2-9-sibling-prayer-profession-christian",
  };

  static async randomCareer(doc) {
    let updates = []
    let members = []
    let msgString = "<h5>" + game.i18n.localize("PEN.familyCreate.careers") + "</h5>";
    const actor = doc instanceof Actor ? doc : doc?.parent instanceof Actor ? doc.parent : null;
    if (!actor) return
    // Prepare the roll tables once
    this.careerTables = await this.getCareerTables();
    if (!this.careerTables) return null


    //If handin doc is a character  we are rolling on all the family
    if (doc instanceof Actor && doc.type === 'character') {
      console.log("All family")
    //Else if doc is a family item roll on just this member
    } else if (doc instanceof Item && doc.type === 'family') {
      console.log("Single Family Member")
      members.push(doc)
    } else {
      //Invalid roll target
      ui.notifications.warn("PEN.career.invalidTarget", {format: {source: doc.name}})
      return null
    }

    //Get the relevant religion from the doc if actor or parent actor
    let religion = await PENRandomName.resolveCulture(doc, "religion")
    if (!religion) {
      ui.notifications.warn("PEN.noReligion", { localize: true });
      return null;
    }

    //Loop through all the members and get career
    for (let member of members) {
      let careerResult = await this.singleCareer(member, religion)
      if (!careerResult) {
        msgString += "<div><strong>" + doc.name +"</strong>: " + game.i18n.localize('PEN.career.mismatch') + "</div>"
      } else {
        updates.push({
          _id: doc.id,
          'system.careerLevel': careerResult.careerLevel,
          'system.careers': careerResult.careers
        })
        msgString += "<div><strong>" + doc.name +"</strong>: " + careerResult.careers[0].name + " [" + careerResult.careerLevel + "]" + "</div>"
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
    return
  }

  static async singleCareer(doc, religion) {
    let careers = []
    let careerLevel = 0
    let promotion = 0
    let gender = await PENUtilities.resolveGender(doc.system.gender);
    //Roll careers for family member who have come of age
    if ((doc.system.age)>=14) {
      let table = null
      switch (doc.system.relation) {
        case "uncle":
        case "aunt":
          table = this.careerTables[doc.system.relation]
          let promotionResults = await PENUtilities.tableDiceRoll(this.careerTables.promotions)
          if (promotionResults) {
            promotion = Number((promotionResults?.results[0]?.name).split(" ")[0]) ?? 0
          }
          break;
        default:
          return null;
      }
      if (!table) {
        ui.notifications.warn("PEN.career.missingTable", {format: {source: doc.system.relation}})
        return null
      }
      //Roll up to five times - in the event of a roll that doesn't match gender/religion
      for (let c=1; c<=5; c++) {
        const tableResults = await PENUtilities.tableDiceRoll(table);
        let career = await this.resolveCareer(tableResults, gender, religion)
        if (!career) continue //Reroll up to 5 times
        if (career) {
          careerLevel = Math.min(career.level + promotion, career.careerMax)
          careers.push({
            name: career.careerName,
            pid: career.careerPID,
            uuid: career.careerUuid
          })
          return ({careers, careerLevel, promotion})
        }
      }
    }
    return false
  }

      //Get the Career tables
  static async getCareerTables() {
    let careerTables={}
    for (let key in this.DEFAULT_TABLES) {

      let table = await PENRandomName.tableFromSource({ pid: this.DEFAULT_TABLES[key]})
      if (!table) {
        ui.notifications.warn("PEN.career.missingTable", {format: {source: this.DEFAULT_TABLES[key]}})
        return null;
      }
      careerTables[key] = table
    }
    return careerTables;
  }

  //Turn Career Roll results in to career info
  static async resolveCareer(tableResults, gender, religion) {
    let level = 0
    let careerPID = ""
    let careerName = ""
    let careerUuid = ""
    let careerMax = 0
    let careerGender = ""
    let careerReligion = ""
    for (let result of tableResults.results) {
      if (result.type === "text") {
        level = Number((result.name.split("[")[1]).split("]")[0] ?? 0) ?? 0
      } else if (result.type === "document") {
        let career = await fromUuid(result.documentUuid)
        if (career) {
          careerPID = career.flags?.Pendragon?.pidFlag?.id
          careerName = career.name
          careerUuid = result.documentUuid
          careerMax = career.system.ranks.length - 1
          careerGender = career.system.gender
          careerReligion = career.system.religions[0]?.pid ?? ""
        }
      }
    }
    //Check that the career requirements match the family member (e.g. Religion and Gender)
    if (["male","female"].includes(careerGender) && gender != careerGender) return null
    if (careerReligion != "" && careerReligion != religion.flags?.Pendragon?.pidFlag?.id) return null

    return ({level, careerPID, careerName, careerUuid, careerMax})
  }

}
