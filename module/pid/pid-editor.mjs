import { PENDRAGON } from "../setup/config.mjs";
import { PENUtilities } from "../apps/utilities.mjs";

// CHAOSIUM ID EDITOR
const { DocumentSheetV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class PIDEditor extends HandlebarsApplicationMixin(DocumentSheetV2) {
  #showLoading;

  /**
   * @inheritdoc
   * @param {...any} args
   */
  constructor(...args) {
    super(...args);
    this.#showLoading = true;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    name: "pidEditor",
    classes: ["Pendragon", "dialogV2", "pid-editor"],
    form: {
      handler: PIDEditor.#onSubmit,
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
    },
    position: {
      width: 900,
      height: "auto",
    },
    actions: {
      copyToClip: PIDEditor.copyToClip,
      guess: PIDEditor.guessID,
    },

    window: {
      contentClasses: ["standard-form"],
    },
  };

  static PARTS = {
    form: { template: "systems/Pendragon/templates/pid/pid-editor.hbs" },
  };

  /**
   * Add Pendragon ID Button to sheet header
   * @param {ApplicationV2} application
   * @param {HTMLElement} element
   */
  static addPIDSheetHeaderButton(application, element) {
    if (game.user.isGM) {
      if (!element.querySelector("button.header-control.fa-solid.fa-fingerprint")) {
        application.options.actions.pid = {
          handler: (event, element) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.detail > 1) return; // Ignore repeated clicks
            if (event.button === 2 && (application.document.flags.Pendragon?.pidFlag?.id ?? false)) {
              game.clipboard.copyPlainText(application.document.flags.Pendragon.pidFlag.id).then(() => {
                ui.notifications.info("PEN.whatCopiedClipboard", {
                  format: { what: game.i18n.localize("PEN.PIDFlag.key") },
                  console: false,
                });
              });
            } else {
              new PIDEditor({ document: application.document }, {}).render({
                force: true,
                focus: true,
              });
            }
          },
          buttons: [0, 2],
        };
        const copyUuidButton = element.querySelector(
          "button.header-control.fa-solid.fa-ellipsis-vertical",
        );
        if (copyUuidButton) {
          const button = document.createElement("button");
          button.type = "button";
          button.classList = "header-control fa-solid fa-fingerprint icon";
          if (!(application.document.flags.Pendragon?.pidFlag?.id ?? false)) {
            button.classList.add("invalid-pid");
          }
          button.dataset.action = "pid";
          button.dataset.tooltip = "PEN.PIDFlag.key";
          copyUuidButton.before(button);
        }
      }
    }
  }

  /**
   * @inheritdoc
   * @param {RenderOptions} options
   * @returns {Promise<ApplicationRenderContext>}
   */
  async _prepareContext(options) {
    const sheetData = await super._prepareContext(options);

    sheetData.supportedLanguages = CONFIG.supportedLanguages;

    sheetData.guessCode = game.system.api.pid.guessId(sheetData.document);
    sheetData.idPrefix = game.system.api.pid.getPrefix(sheetData.document);

    const pidFlag = sheetData.document.flags?.Pendragon?.pidFlag ?? {};

    sheetData.id = pidFlag.id || "";
    sheetData.lang = pidFlag.lang || game.i18n.lang;
    sheetData.priority = pidFlag.priority || 0;

    const PIDKeys = Object.assign(
      foundry.utils.flattenObject(game.i18n._fallback.PEN?.PIDFlag?.keys ?? {}),
      foundry.utils.flattenObject(game.i18n.translations.PEN?.PIDFlag?.keys ?? {}),
    );
    const prefix = new RegExp("^" + PENUtilities.quoteRegExp(sheetData.idPrefix));
    sheetData.existingKeys = Object.keys(PIDKeys)
      .reduce((obj, value) => {
        if (value.match(prefix)) {
          obj.push({ value, label: PIDKeys[value] });
        }
        return obj;
      }, [])
      .sort(PENUtilities.sortByLabelKey);

    sheetData.isSystemID = typeof PIDKeys[sheetData.id] !== "undefined";
    const match = sheetData.id.match(/^([^\\.]+)\.([^\\.]*)\.(.+)/);
    sheetData._existing = match && typeof match[3] !== "undefined" ? match[3] : "";

    if (sheetData.id && sheetData.lang) {
      // Find out if there exists a duplicate PID
      let response = await this.getDocumentsInScope(sheetData.id, sheetData.lang, "world");
      sheetData.worldDocumentInfo = response.documentInfo;
      sheetData.worldDuplicates = response.duplicates;
      sheetData.warnDuplicateWorldPriority = response.warnDuplicatePriority;

      response = await this.getDocumentsInScope(sheetData.id, sheetData.lang, "compendiums");
      sheetData.compendiumDocumentInfo = response.documentInfo;
      sheetData.compendiumDuplicates = response.duplicates;
      sheetData.warnDuplicateCompendiumPriority = response.warnDuplicatePriority;
      this.#showLoading = false;

      sheetData.compendiumDocumentInfo = sheetData.compendiumDocumentInfo.sort((a, b) => {
        return b.priority - a.priority;
      });
    } else {
      sheetData.compendiumDocumentInfo = [];
      sheetData.worldDocumentInfo = [];
      sheetData.worldDuplicates = 0;
      sheetData.compendiumDuplicates = 0;
      sheetData.warnDuplicateWorldPriority = false;
      sheetData.warnDuplicateCompendiumPriority = false;
    }

    return sheetData;
  }

  /**
   * @inheritdoc
   * @param {ApplicationRenderContext} context
   * @param {RenderOptions} options
   * @returns {Promise<void>}
   */
  async _onRender(context, options) {
    await super._onRender(context, options);

    this.element.querySelector("input[name=_existing")?.addEventListener("change", (event) => {
      let value = event.target.value;
      const prefix = event.target.dataset.prefix;
      if (value !== "") {
        value = prefix + PENUtilities.toKebabCase(value);
      }
      const element = this.element.querySelector("input[name=id]");
      element.value = value;
      const newEvent = new Event("change", { bubbles: true });
      element.dispatchEvent(newEvent);
    });

    this.element.querySelector("select[name=known]")?.addEventListener("change", (event) => {
      const value = event.target.value;
      const element = this.element.querySelector("input[name=id]");
      element.value = value;
      const newEvent = new Event("change", { bubbles: true });
      element.dispatchEvent(newEvent);
    });
  }

  static async copyToClip(event, target) {
    const text = target.closest(".form-value").querySelector("input").value;
    if (text) {
      game.clipboard.copyPlainText(text).then(() => {
        ui.notifications.info("PEN.whatCopiedClipboard", {
          console: false,
          format: { what: text },
        });
      });
    }
  }

  static async guessID(event, target) {
    event.preventDefault();
    const value = target.dataset.guess;
    console.log(value)
    if (value) {
      const element = this.element.querySelector("input[name=id]");
      element.value = value;
      const newEvent = new Event("change", { bubbles: true });
      element.dispatchEvent(newEvent);
    }
  }

  /**
   * Get documents with matching Pendragon ID in World/Compendiums
   * @param {string} pid
   * @param {string} lang
   * @param {string} scope
   * @returns {object}
   */
  async getDocumentsInScope(pid, lang, scope) {
    const documents = await game.system.api.pid.fromPIDAll({
      pid,
      lang,
      scope,
      showLoading: this.#showLoading,
    });
    let warnDuplicatePriority = false;
    const duplicates = documents.length ?? 0;
    const uniquePriority = {};
    const documentInfo = await Promise.all(
      documents.map(async (d) => {
        if (typeof uniquePriority[d.flags.Pendragon.pidFlag.priority] === "undefined") {
          uniquePriority[d.flags.Pendragon.pidFlag.priority] = true;
        } else {
          warnDuplicatePriority = true;
        }
        const folders = [];
        let e = d?.folder;
        while (e?.name) {
          folders.unshift(e?.name);
          e = e.folder;
        }
        if (d.collection.inCompendium === true) {
          folders.unshift(d.collection.metadata.label);
          e = d?.collection.folder;
          while (e?.name) {
            folders.unshift(e?.name);
            e = e.folder;
          }
        }
        return {
          priority: parseInt(d.flags.Pendragon.pidFlag.priority, 10),
          lang: d.flags.Pendragon.pidFlag.lang ?? "en",
          link: await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link, {
            async: true,
          }),
          folder: folders.map((n) => (n.indexOf(" ") > -1 ? '"' + n + '"' : n)).join(" > "),
        };
      }),
    );
    return { duplicates, uniquePriority, documentInfo, warnDuplicatePriority };
  }

  /**
   * Handle form submission
   * @param {SubmitEvent|null} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onSubmit(event, form, formData) {
    console.log(formData)
    if (!this.isEditable) return;
    const submitData = this._processFormData(event, form, formData);
    const changes = {
      "flags.Pendragon.pidFlag.id": submitData.id || "",
      "flags.Pendragon.pidFlag.lang": submitData.lang || game.i18n.lang,
      "flags.Pendragon.pidFlag.priority": submitData.priority || 0,
    };
    const html = this.document.sheet.element.querySelector(
      "header.window-header [data-action='pid']",
    );
    if (html) {
      if (changes["flags.Pendragon.pidFlag.id"].length) {
        html.classList.remove("invalid-pid");
      } else {
        html.classList.add("invalid-pid");
      }
    }
    this.document.update(changes);
  }
}
