//PID Priority
// 0 = Base Sytem
// 5 = Adventures
// 10 = Start Set
// 15 = Core Rulebook
// 20 = GM Guide
// 25 = Noble Handbook

/* global Actor, Card, CONFIG, foundry, game, Item, JournalEntry, Macro, Playlist, RollTable, Scene, SceneNavigation, ui */
import { PENUtilities } from "../apps/utilities.mjs";

export class PID {
  static init() {
    CONFIG.Actor.compendiumIndexFields.push("flags.Pendragon.pidFlag");
    // CONFIG.Cards.compendiumIndexFields.push("flags.Pendragon.pidFlag");
    CONFIG.Item.compendiumIndexFields.push("flags.Pendragon.pidFlag");
    CONFIG.JournalEntry.compendiumIndexFields.push("flags.Pendragon.pidFlag");
    // CONFIG.Macro.compendiumIndexFields.push("flags.Pendragon.pidFlag");
    // CONFIG.Playlist.compendiumIndexFields.push("flags.Pendragon.pidFlag");
    CONFIG.RollTable.compendiumIndexFields.push("flags.Pendragon.pidFlag");
    // CONFIG.Scene.compendiumIndexFields.push("flags.Pendragon.pidFlag");
    game.system.api = { pid: PID };
  }

  /**
   * Returns RegExp for valid type and format
   * @returns {RegExp}
   */
  static #regExKey() {
    return new RegExp("^(" + Object.keys(PID.#gamePropertyLookup).join("|") + ")-(.*?)-(.+)$");
  }

  /**
   * Get PID type-subtype- based on document
   * @param {Document} document
   * @returns {string}
   */
  static getPrefix(document) {
    for (const type in PID.#documentNameLookup) {
      if (document instanceof PID.#documentNameLookup[type]) {
        return type + "." + (document.type ?? "") + ".";
      }
    }
    return "";
  }

  /**
   * Get PID type-subtype-name based on document
   * @param {Document} document
   * @returns {string}
   */
  static guessId(document) {
    return PID.getPrefix(document) + PENUtilities.toKebabCase(document.name);
  }

  static guessFromClassData(documentClass, document) {
    for (const type in PID.#documentNameLookup) {
      if (documentClass.prototype instanceof PID.#documentNameLookup[type]) {
        return type + "." + (document.type ?? "") + "." + PENUtilities.toKebabCase(document.name);
      }
    }
    return "";
  }

  /**
   * Returns all items with matching PIDs and language
   * ui.notifications.warn for missing keys
   * @param {object} options
   * @param {Array} options.itemList array of PIDs
   * @param {string} options.lang the language to match against ('en', 'es', ...)
   * @param {boolean} options.langFallback should the system fall back to en in case there is no translation
   * @param {boolean} options.showLoading Show loading bar
   * @returns {Array}
   */
  static async expandItemArray({ itemList, lang = game.i18n.lang, langFallback = true, showLoading = false } = {}) {
    const pids = itemList.filter((it) => typeof it === "string");
    let items = itemList.filter((it) => typeof it !== "string");

    if (pids.length) {
      const found = await PID.fromPIDRegexBest({
        pidRegExp: PID.makeGroupRegEx(pids),
        type: "i",
        lang,
        langFallback,
        showLoading,
      });
      const all = [];
      for (const pid of pids) {
        const item = found.find((i) => i.flags.Pendragon.pidFlag.id === pid);
        if (item) {
          all.push(item);
        }
      }
      if (all.length < pids.length) {
        const notMissing = [];
        for (const doc of all) {
          notMissing.push(doc.flags.Pendragon.pidFlag.id);
        }
        ui.notifications.warn("PEN.PIDFlag.error.documents-not-found", {
          format: {
            pids: pids.filter((x) => !notMissing.includes(x)).join(", "),
            lang,
          },
        });
      }
      items = items.concat(all);
    }
    return items;
  }

  /**
   * Returns item with matching PIDs from list
   * Empty array return for missing keys
   * @param {string} pid a single pid
   * @param {Array|object} list array of items
   * @returns {Array}
   */
  static findPIdInList(pid, list) {
    let itemName = "";
    const PIDKeys = Object.assign(
      foundry.utils.flattenObject(game.i18n._fallback.PEN?.PIDFlag?.keys ?? {}),
      foundry.utils.flattenObject(game.i18n.translations.PEN?.PIDFlag?.keys ?? {}),
    );
    if (typeof PIDKeys[pid] !== "undefined") {
      itemName = PIDKeys[pid];
    }
    return (typeof list.filter === "undefined" ? Object.values(list) : list).filter(
      (i) => i.flags?.Pendragon?.pidFlag?.id === pid || (itemName !== "" && itemName === i.name),
    );
  }

  /**
   * Returns RegExp matching all strings in array
   * @param {Array} pids an array of PID strings
   * @returns {RegExp}
   */
  static makeGroupRegEx(pids) {
    if (typeof pids === "string") {
      pids = [pids];
    } else if (typeof pids === "undefined" || typeof pids.filter !== "function") {
      return undefined;
    }
    const splits = {};
    const rgx = PID.#regExKey();
    for (const i of pids) {
      const key = i.match(rgx);
      if (key) {
        if (typeof splits[key[1]] === "undefined") {
          splits[key[1]] = {};
        }
        if (typeof splits[key[1]][key[2]] === "undefined") {
          splits[key[1]][key[2]] = [];
        }
        splits[key[1]][key[2]].push(key[3]);
      } else {
        // Silently error
      }
    }
    const regExParts = [];
    for (const t in splits) {
      const row = [];
      for (const s in splits[t]) {
        if (splits[t][s].length > 1) {
          row.push(s + "." + "(" + splits[t][s].join("|") + ")");
        } else {
          row.push(s + "." + splits[t][s].join(""));
        }
      }
      if (row.length > 1) {
        regExParts.push(t + "." + "(" + row.join("|") + ")");
      } else {
        regExParts.push(t + "." + row.join(""));
      }
    }
    if (regExParts.length > 1) {
      return new RegExp("^(" + regExParts.join("|") + ")$");
    }
    return new RegExp("^" + regExParts.join("") + "$");
  }

  /**
   * Returns all documents with an PID matching the regex and matching the document type and language, from the specified scope.
   * Empty array return for no matches
   * @param {object} options
   * @param {RegExp} options.pidRegExp regex used on the PID
   * @param {string} options.type the first part of the wanted PID, for example 'i', 'a', 'je'
   * @param {string} options.lang the language to match against ('en', 'es', ...)
   * @param {string} options.scope defines where it will look:
   * **all**: find in both world & compendia,
   * **world**: only search in world,
   * **compendiums**: only search in compendiums
   * @param {boolean} options.langFallback should the system fall back to en in case there is no translation
   * @param {boolean} options.showLoading Show loading bar
   * @returns {Array}
   */
  static async fromPIDRegexAll({
    pidRegExp,
    type,
    lang = game.i18n.lang,
    langFallback = true,
    scope = "all",
    showLoading = false,
  } = {}) {
    let candidates = await PID.fromPIDRegexAllMixed({
      pidRegExp,
      type,
      lang,
      scope,
      langFallback,
      showLoading,
    });
    if (langFallback && lang !== "en") {
      candidates = PID.#filterByLanguage(candidates, lang);
    }
    candidates.sort(PID.#comparePIDPriority);
    let progressBar = false;
    if (showLoading && candidates.length > 0) {
      progressBar = {
        bar: ui.notifications.info("PEN.PIDFlag.loading", {
          localize: true,
          progress: true,
          console: false,
        }),
        current: 0,
        max: candidates.length + 1, // Will always call pct = 1 after progress to prevent rounding issues
      };
    }
    return await PID.#onlyDocuments(candidates, progressBar);
  }

  /**
   * Returns all documents with a PID and language from the specified scope.
   * Empty array return for no matches
   * @param {object} options
   * @param {string} options.pid a single pid
   * @param {string} options.lang the language to match against ('en', 'es', ...)
   * @param {string} options.scope defines where it will look:
   * **all**: find in both world & compendia,
   * **world**: only search in world,
   * **compendiums**: only search in compendiums
   * @param {boolean} options.langFallback should the system fall back to en in case there is no translation
   * @param {boolean} options.showLoading Show loading bar
   * @returns {Array}
   */
  static async fromPIDAll({
    pid,
    lang = game.i18n.lang,
    langFallback = true,
    scope = "all",
    showLoading = false,
  } = {}) {
    if (!pid || typeof pid !== "string") {
      return [];
    }
    const parts = pid.match(PID.#regExKey());
    if (!parts) {
      return [];
    }
    if (lang === "") {
      lang = game.i18n.lang;
    }
    return PID.fromPIDRegexAll({
      pidRegExp: new RegExp("^" + PENUtilities.quoteRegExp(pid) + "$"),
      type: parts[1],
      lang,
      langFallback,
      scope,
      showLoading,
    });
  }

  /**
   * Gets only the highest priority documents for each PID that matches the RegExp and language, with the highest priority documents in the World taking precedence over any documents in compendium packs.
   * Empty array return for no matches
   * @param {object} options
   * @param {RegExp} options.pidRegExp regex used on the PID
   * @param {string} options.type the first part of the wanted PID, for example 'i', 'a', 'je'
   * @param {string} options.lang the language to match against ("en", "es", ...)
   * @param {boolean} options.langFallback should the system fall back to en in case there is no translation
   * @param {boolean} options.showLoading Show loading bar
   * @returns {Array}
   */
  static async fromPIDRegexBest({
    pidRegExp,
    type,
    lang = game.i18n.lang,
    langFallback = true,
    showLoading = false,
  } = {}) {
    let candidates = await PID.fromPIDRegexAllMixed({
      pidRegExp,
      type,
      lang,
      scope: "all",
      langFallback,
      showLoading,
    });
    if (langFallback && lang !== "en") {
      candidates = PID.#filterByLanguage(candidates, lang);
    }
    candidates.sort(PID.#comparePIDPriority);
    const ids = {};
    for (const candidate of candidates) {
      if (typeof ids[candidate.flags.Pendragon.pidFlag.id] === "undefined") {
        ids[candidate.flags.Pendragon.pidFlag.id] = candidate;
      }
    }
    let progressBar = false;
    const documentList = Object.values(ids);
    if (showLoading && documentList.length > 0) {
      progressBar = {
        bar: ui.notifications.info("PEN.PIDFlag.loading", {
          localize: true,
          progress: true,
          console: false,
        }),
        current: 0,
        max: documentList.length + 1, // Will always call pct = 1 after progress to prevent rounding issues
      };
    }
    return await PID.#onlyDocuments(documentList, progressBar);
  }

  /**
   * Gets only the highest priority document for PID that matches the language, with the highest priority documents in the World taking precedence over any documents in compendium packs.
   * @param {string} pid PID
   * @param {string} lang the language to match against ("en", "es", ...)
   * @param {boolean} langFallback should the system fall back to en in case there is no translation
   * @param {boolean} showLoading Show loading bar
   * @returns {Array}
   */
  static fromPID(pid, lang = game.i18n.lang, langFallback = true, showLoading = false) {
    return PID.fromPIDBest({ pid, lang, langFallback, showLoading });
  }

  /**
   * Gets only the highest priority document for PID that matches the language, with the highest priority documents in the World taking precedence over any documents in compendium packs.
   * @param {object} options
   * @param {string} options.pid PID
   * @param {string} options.lang the language to match against ("en", "es", ...)
   * @param {boolean} options.langFallback should the system fall back to en in case there is no translation
   * @param {boolean} options.showLoading Show loading bar
   * @returns {Array}
   */
  static fromPIDBest({ pid, lang = game.i18n.lang, langFallback = true, showLoading = false } = {}) {
    if (!pid || typeof pid !== "string") {
      return [];
    }
    const type = pid.split(".")[0];
    const pidRegExp = new RegExp("^" + PENUtilities.quoteRegExp(pid) + "$");
    return PID.fromPIDRegexBest({ pidRegExp, type, lang, langFallback, showLoading });
  }

  /**
   * Returns all documents or indexes with an PID matching the regex and matching the document type and language, from the specified scope.
   * Empty array return for no matches
   * @param {object} options
   * @param {RegExp} options.pidRegExp regex used on the PID
   * @param {string} options.type the first part of the wanted PID, for example 'i', 'a', 'je'
   * @param {string} options.lang the language to match against ('en', 'es', ...)
   * @param {string} options.scope defines where it will look:
   * **all**: find in both world & compendia,
   * **world**: only search in world,
   * **compendiums**: only search in compendiums
   * @param {boolean} options.langFallback should the system fall back to en in case there is no translation
   * @param {boolean} options.showLoading Show loading bar
   * @returns {Array}
   */
  static async fromPIDRegexAllMixed({
    pidRegExp,
    type,
    lang = game.i18n.lang,
    scope = "all",
    langFallback = true,
    showLoading = false,
  } = {}) {
    if (!pidRegExp) {
      return [];
    }

    let results = [];

    let progressBar = false;
    if (showLoading) {
      progressBar = {
        bar: ui.notifications.info("SETUP.PackagesLoading", {
          localize: true,
          progress: true,
          console: false,
        }),
        current: 0,
        max:
          (["all", "world"].includes(scope) ? 1 : 0) +
          (["all", "compendiums"].includes(scope) ? game.packs.size : 0) +
          1, // Will always call pct = 1 after progress to prevent rounding issues
      };
    }
    if (["all", "world"].includes(scope)) {
      results = results.concat(await PID.#docsFromWorld({ pidRegExp, type, lang, langFallback, progressBar }));
    }

    if (["all", "compendiums"].includes(scope)) {
      results = results.concat(await PID.#indexesFromCompendia({ pidRegExp, type, lang, langFallback, progressBar }));
    }

    if (showLoading) {
      // await new Promise(resolve => setTimeout(resolve, 1000))
      progressBar.bar.remove();
    }
    return results;
  }

  /**
   * Get a list of all documents matching the PID regex, language from the world.
   * The document list is sorted with the highest priority first.
   * @param {object} options
   * @param {RegExp} options.pidRegExp regex used on the PID
   * @param {string} options.type the first part of the wanted PID, for example 'i', 'a', 'je'
   * @param {string} options.lang the language to match against ('en', 'es', ...)
   * @param {boolean} options.langFallback should the system fall back to en in case there is no translation
   * @param {object|false} options.progressBar containing progress bar
   * @returns {Array}
   */
  static async #docsFromWorld({
    pidRegExp,
    type,
    lang = game.i18n.lang,
    langFallback = true,
    progressBar = false,
  } = {}) {
    if (!pidRegExp) {
      return [];
    }
    if (lang === "") {
      lang = game.i18n.lang;
    }

    if (progressBar !== false) {
      // await new Promise(resolve => setTimeout(resolve, 1000));
      progressBar.bar.update({ pct: progressBar.current / progressBar.max });
      progressBar.current++;
    }

    const gameProperty = PID.#getGameProperty(`${type}..`);

    const candidateDocuments = game[gameProperty]?.filter((d) => {
      const pidFlag = d.getFlag("Pendragon", "pidFlag");
      if (typeof pidFlag === "undefined") {
        return false;
      }
      return pidRegExp.test(pidFlag.id) && [lang, langFallback ? "en" : "-"].includes(pidFlag.lang);
    });

    if (candidateDocuments === undefined) {
      return [];
    }

    return candidateDocuments;
  }

  /**
   * Get a list of all indexes matching the PID regex, language, and era from the compendiums.
   * @param {object} options
   * @param {RegExp} options.pidRegExp regex used on the PID
   * @param {string} options.type the first part of the wanted PID, for example 'i', 'a', 'je'
   * @param {string|boolean} options.era the eras to match against ('standard', 'modernPulp', ...), true = world default, false = no filter
   * @param {string} options.lang the language to match against ('en', 'es', ...)
   * @param {boolean} options.langFallback should the system fall back to en in case there is no translation
   * @param {object|false} options.progressBar containing progress bar
   * @returns {Array}
   */
  static async #indexesFromCompendia({
    pidRegExp,
    type,
    lang = game.i18n.lang,
    era = false,
    langFallback = true,
    progressBar = false,
  }) {
    if (!pidRegExp) {
      return [];
    }
    if (lang === "") {
      lang = game.i18n.lang;
    }

    const documentType = PID.#getDocumentType(type).name;
    let indexDocuments = [];

    for (const pack of game.packs) {
      if (progressBar !== false) {
        // await new Promise(resolve => setTimeout(resolve, 1000))
        progressBar.bar.update({ pct: progressBar.current / progressBar.max });
        progressBar.current++;
      }
      if (pack.documentName === documentType) {
        if (!pack.indexed) {
          await pack.getIndex();
        }
        indexDocuments = indexDocuments.concat(
          pack.index.filter((i) => {
            if (typeof i.flags?.Pendragon?.pidFlag?.id !== "string") {
              return false;
            }
            return (
              pidRegExp.test(i.flags.Pendragon.pidFlag.id) &&
              [lang, langFallback ? "en" : "-"].includes(i.flags.Pendragon.pidFlag.lang)
            );
          }),
        );
      }
    }
    return indexDocuments;
  }

  /**
   * Sort a list of document on PID priority - the highest first.
   * If priority is the same use world over compendiums
   * @param {Document} a
   * @param {Document} b
   * @returns {int} >0,<0,===0
   * @example
   * aListOfDocuments.sort(PID.#comparePIDPriority)
   */
  static #comparePIDPriority(a, b) {
    const ap = parseInt(a.flags.Pendragon.pidFlag.priority, 10);
    const bp = parseInt(b.flags.Pendragon.pidFlag.priority, 10);
    if (ap === bp) {
      const ao = a instanceof foundry.abstract.DataModel;
      const bo = b instanceof foundry.abstract.DataModel;
      if (ao === bo) {
        return 0;
      } else {
        return ao ? -1 : 1;
      }
    }
    return bp - ap;
  }

  /**
   * Translates the first part of a PID to what those documents are called in the `game` object.
   * @param {string} pid a single pid
   * @returns {string}
   */
  static #getGameProperty(pid) {
    const type = pid.split(".")[0];
    const gameProperty = PID.#gamePropertyLookup[type];
    if (!gameProperty) {
      ui.notifications.warn("PEN.PIDFlag.error.incorrect.type", { localize: true });
      console.log("Pendragon | ", pid);
      throw new Error();
    }
    return gameProperty;
  }

  /**
   * First part of Pendragon ID to game[...]
   * @returns {object}
   */
  static get #gamePropertyLookup() {
    return {
      a: "actors",
      c: "cards",
      i: "items",
      je: "journal",
      m: "macros",
      p: "playlists",
      rt: "tables",
      s: "scenes",
    };
  }

  /**
   * Translates the first part of a PID to what those documents are called in the `game` object.
   * @param {string} pid a single pid
   * @returns {Document}
   */
  static #getDocumentType(pid) {
    const type = pid.split(".")[0];
    const documentType = PID.#documentNameLookup[type];
    if (!documentType) {
      ui.notifications.warn("PEN.PIDFlag.error.incorrect.type", { localize: true });
      console.log("Pendragon | ", pid);
      throw new Error();
    }
    return documentType;
  }

  /**
   * First part of Pendragon ID to Type
   * @returns {object}
   */
  static get #documentNameLookup() {
    return {
      a: Actor,
      c: Card,
      i: Item,
      je: JournalEntry,
      m: Macro,
      p: Playlist,
      rt: RollTable,
      s: Scene,
    };
  }

  /**
   * Replace indexes with their documents
   * @param {Array} candidates
   * @param {object|false} progressBar containing progress bar
   * @returns {Array}
   */
  static async #onlyDocuments(candidates, progressBar) {
    const packs = {};
    for (const offset in candidates) {
      if (candidates[offset] instanceof foundry.abstract.DataModel) {
        if (progressBar !== false) {
          // await new Promise(resolve => setTimeout(resolve, 1000));
          progressBar.bar.update({ pct: progressBar.current / progressBar.max });
          progressBar.current++;
        }
      } else {
        const parts = foundry.utils.parseUuid(candidates[offset].uuid);
        if (typeof parts.collection?.collection === "string" && typeof parts.id === "string") {
          if (typeof packs[parts.collection.collection] === "undefined") {
            packs[parts.collection.collection] = {};
          }
          packs[parts.collection.collection][parts.id] = offset;
        }
      }
    }
    const all = [];
    for (const packId in packs) {
      const pack = game.packs.get(packId);
      all.push(
        pack.getDocuments({ _id__in: Object.keys(packs[packId]) }).then((documents) => {
          for (const document of documents) {
            if (progressBar !== false) {
              // await new Promise(resolve => setTimeout(resolve, 1000));
              progressBar.bar.update({ pct: progressBar.current / progressBar.max });
              progressBar.current++;
            }
            const offset = packs[packId][document._id];
            candidates[offset] = document;
          }
        }),
      );
    }
    await Promise.all(all);
    if (progressBar !== false) {
      // await new Promise(resolve => setTimeout(resolve, 1000));
      progressBar.bar.remove();
    }
    return candidates;
  }

  /**
   * Filter an array of index or documents.
   * If a PID has a version lang then remove the en versions
   * @param {Array} indexes
   * @param {string} lang
   * @returns {Array}
   */
  static #filterByLanguage(indexes, lang) {
    const ids = indexes.reduce((c, i) => {
      c[i.flags.Pendragon.pidFlag.id] = c[i.flags.Pendragon.pidFlag.id] || i.flags.Pendragon.pidFlag.lang === lang;
      return c;
    }, {});
    return indexes.filter((i) => i.flags.Pendragon.pidFlag.lang !== "en" || !ids[i.flags.Pendragon.pidFlag.id]);
  }
}
