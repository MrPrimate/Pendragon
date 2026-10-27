import PENDialog from "../setup/pen-dialog.mjs";

export class PENUtilities {
  //Generic Confirmation Dialogue Box
  static async confirmation(title) {
    let confirmation = await PENDialog.confirm({
      window: { title: title },
      content: '<div class="stat-name left bold">' + game.i18n.localize("PEN.proceed") + "</div><div></div><br>",
    });
    return confirmation;
  }

  static async getDataFromDropEvent(event, entityType = "Item") {
    if (event.originalEvent) return [];
    try {
      const dataList = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (dataList.type === "Folder" && dataList.documentName === entityType) {
        const folder = await fromUuid(dataList.uuid);
        if (!folder) return [];
        return folder.contents;
      } else if (dataList.type === entityType) {
        const item = await fromUuid(dataList.uuid);
        if (!item) return [];
        return [item];
      } else {
        return [];
      }
    } catch (err) {
      return [];
    }
  }

  static toKebabCase(s) {
    if (!s) {
      return "";
    }
    const match = s.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g);

    if (!match) {
      return "";
    }

    return match.join("-").toLowerCase();
  }

  static async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999px";
        textArea.style.top = "-999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise((resolve, reject) => {
          document.execCommand("copy")
            ? resolve()
            : reject(new Error(game.i18n.localize("PEN.UnableToCopyToClipboard")));
          textArea.remove();
        }).catch((err) => ui.notifications.error(err));
      }
    } catch (err) {
      ui.notifications.error(game.i18n.localize("PEN.UnableToCopyToClipboard"));
    }
  }

  static quoteRegExp(string) {
    // https://bitbucket.org/cggaertner/js-hacks/raw/master/quote.js
    const len = string.length;
    let qString = "";

    for (let current, i = 0; i < len; ++i) {
      current = string.charAt(i);

      if (current >= " " && current <= "~") {
        if (current === "\\" || current === "'") {
          qString += "\\";
        }

        qString += current.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
      } else {
        switch (current) {
          case "\b":
            qString += "\\b";
            break;

          case "\f":
            qString += "\\f";
            break;

          case "\n":
            qString += "\\n";
            break;

          case "\r":
            qString += "\\r";
            break;

          case "\t":
            qString += "\\t";
            break;

          case "\v":
            qString += "\\v";
            break;

          default:
            qString += "\\u";
            current = current.charCodeAt(0).toString(16);
            for (let j = 4; --j >= current.length; qString += "0");
            qString += current;
        }
      }
    }
    return qString;
  }

  static sortByNameKey(a, b) {
    return a.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .localeCompare(
        b.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase(),
      );
  }

  //Make a dice roll, display it if Dice So Nice active and return the result
  static async simpleDiceRoll(formula) {
    let roll = new Roll(formula);
    await roll.evaluate();
    let result = roll.total;
    if (game.modules.get("dice-so-nice")?.active) {
      game.dice3d.showForRoll(roll, game.user, true, null, false);
    }
    return result;
  }

  //Make a dice roll, display it if Dice So Nice active and return the whole roll
  static async complexDiceRoll(formula) {
    let roll = new Roll(formula);
    await roll.evaluate();
    if (game.modules.get("dice-so-nice")?.active) {
      game.dice3d.showForRoll(roll, game.user, true, null, false);
    }
    return roll;
  }

  //Make a table roll display if Dice so Nice active and return the roll
  static async tableDiceRoll(table) {
    const tableResults = await table.roll();
    if (game.modules.get("dice-so-nice")?.active) {
      game.dice3d.showForRoll(tableResults.roll, game.user, true, null, false);
    }
    return tableResults;
  }

  //GM triggered Glory award dialog
  static async gloryAward(event) {
    //Get all in world characters
    let chars = await game.actors
      .filter((c) => c.type === "character")
      .map((c) => {
        return {
          id: c.id,
          name: c.name,
          glory: c.system.glory,
        };
      });

    //Get awards in Dialog
    let data = { chars };
    const html = await foundry.applications.handlebars.renderTemplate(
      "systems/Pendragon/templates/dialog/gloryAward.hbs",
      data,
    );
    const awards = await PENDialog.input({
      window: {
        title: game.i18n.localize("PEN.gloryAward"),
      },
      position: {
        width: 500,
      },
      content: html,
    });
    if (!awards) {
      return;
    }

    let newAwards = [];
    if (Array.isArray(awards.gloryAward)) {
      newAwards.push(...awards.gloryAward);
    } else {
      newAwards.push(awards.gloryAward);
    }

    let count = 0;
    for (let award of newAwards) {
      if (award != 0) {
        let actor = await game.actors.get(chars[count].id);
        //Create the event
        const itemData = {
          name: awards.awardTitle,
          type: "history",
          system: {
            year: game.time.components.year,
            description: awards.awardTitle,
            glory: award,
          },
          flags: {
            Pendragon: {
              pidFlag: {
                id: "i.history.gmAward",
                lang: game.i18n.lang,
                priority: 0,
              },
            },
          },
        };
        await Item.create(itemData, { parent: actor });
      }
      count++;
    }
    //Trigger updates to players
    game.socket.emit("system.Pendragon", {
      type: "updatechar",
    });
    //Update if GM
    this.updateCharSheets();
  }

  //Update character sheet for all players---------------------------------------------------------------------------
  static updateCharSheets() {
    if (game.user.isGM) {
      for (const a of game.actors) {
        if (a?.type === "character" && a?.sheet && a?.sheet?.rendered) {
          a.render(false);
        }
      }
    } else {
      for (const a of game.actors) {
        if (a.isOwner) {
          a.render(false);
        }
      }
    }
  }

  //Returns "male", "female" or "" from a free text gender
  static genderType(text) {
    const gender = (text ?? "").trim().toLowerCase();
    if (!gender) return "";
    const female = ["female", "femme", "f", "woman", "w", "lady", "dame", "girl", "mother", "feminine"];
    const male = ["male", "mâle", "homme", "m", "man", "lord", "sir", "boy", "father", "masculine"];
    for (const lang of ["PEN.female", "PEN.male"]) {
      const label = game.i18n.localize(lang).toLowerCase();
      if (gender === label) return lang === "PEN.female" ? "female" : "male";
    }
    if (female.includes(gender)) return "female";
    if (male.includes(gender)) return "male";
    return "";
  }

  //Returns "male" or "female" from the gender, then the fallback, otherwise at random
  static async resolveGender(gender = "", fallback = "") {
    const type = this.genderType(gender) || fallback;
    if (["male", "female"].includes(type)) return type;
    const roll = await new Roll("1D2").evaluate();
    return roll.total === 2 ? "female" : "male";
  }

  //Returns "male" or "female" from the relation, then from gender, then the fallback, then roll random
  static async resolveRelationGender(gender = "", relation = "", fallback = "") {
    const female = ["aunt", "mother", "sister", "grandmother", "daughter", "granddaughter"];
    const male = ["uncle", "father", "brother", "grandfather", "son", "grandson"];
    if (female.includes(relation)) return "female";
    if (male.includes(relation)) return "male";
    const type = this.genderType(gender) || fallback;
    if (["male", "female"].includes(type)) return type;
    const roll = await new Roll("1D2").evaluate();
    return roll.total === 2 ? "female" : "male";
    return null;
  }

  //Recognised genders use the standard label (e.g. "male" -> "Male"), anything else is kept as entered
  static genderLabel(text) {
    const type = this.genderType(text);
    if (!type) return (text ?? "").trim();
    return game.i18n.localize(type === "female" ? "PEN.female" : "PEN.male");
  }
}
