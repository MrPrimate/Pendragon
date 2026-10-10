const SETTINGS = {
  manualGlory: {
    name: "PEN.Settings.manualGlory",
    hint: "PEN.Settings.manualGloryHint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
    requiresReload: true,
  },

  childMortality: {
    name: "PEN.Settings.childMortality",
    hint: "PEN.Settings.childMortalityHint",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
    requiresReload: true,
  },

  tokenVision: {
    name: "PEN.Settings.tokenVision",
    hint: "PEN.Settings.tokenVisionHint",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
    requiresReload: true,
  },

  useRelation: {
    name: "PEN.Settings.useRelation",
    hint: "PEN.Settings.useRelationHint",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
    requiresReload: true,
  },

  youthAge: {
    name: "PEN.Settings.youthAge",
    hint: "PEN.Settings.youthAgeHint",
    scope: "world",
    config: false,
    type: Number,
    default: 13,
    requiresReload: true,
  },
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class PENCharacterSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pen", "sheet", "settings"],
    id: "character-settings",
    actions: {
      reset: PENCharacterSettings.onResetDefaults,
    },
    form: {
      handler: PENCharacterSettings.formHandler,
      closeOnSubmit: true,
      submitOnChange: false,
    },
    position: {
      width: 550,
      height: "auto",
    },
    tag: "form",
    window: {
      title: "PEN.Settings.characterOptions",
      contentClasses: ["standard-form"],
    },
  };

  /**
   *
   */
  get title() {
    return `${game.i18n.localize(this.options.window.title)}`;
  }

  static PARTS = {
    form: { template: "systems/Pendragon/templates/settings/character-settings.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  /**
   *
   * @param options
   */
  async _prepareContext(options) {
    const optSet = {};
    for (const [k, v] of Object.entries(SETTINGS)) {
      optSet[k] = {
        value: game.settings.get("Pendragon", k),
        setting: v,
      };
    }
    return {
      optSet,
      buttons: [
        { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" },
        { type: "reset", action: "reset", icon: "fa-solid fa-undo", label: "SETTINGS.Reset" },
      ],
    };
  }

  /**
   *
   */
  static registerSettings() {
    for (const [k, v] of Object.entries(SETTINGS)) {
      game.settings.register("Pendragon", k, v);
    }
  }

  /**
   *
   * @param event
   */
  static async onResetDefaults(event) {
    event.preventDefault();
    for await (const [k, v] of Object.entries(SETTINGS)) {
      await game.settings.set("Pendragon", k, v?.default);
    }
    return this.render();
  }

  /**
   *
   * @param event
   * @param form
   * @param formData
   */
  static async formHandler(event, form, formData) {
    const settings = foundry.utils.expandObject(formData.object);
    await Promise.all(Object.entries(settings).map(([key, value]) => game.settings.set("Pendragon", key, value)));
  }
}
