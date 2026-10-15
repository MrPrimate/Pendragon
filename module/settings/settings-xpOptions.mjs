const SETTINGS = {
  autoXP: {
    name: "PEN.Settings.autoXP",
    hint: "PEN.Settings.autoXPHint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  },

  fumbleXP: {
    name: "PEN.Settings.fumbleXP",
    hint: "PEN.Settings.fumbleXPHint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  },
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class PENXPSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pen", "sheet", "settings"],
    id: "xp-settings",
    actions: {
      reset: PENXPSettings.onResetDefaults,
    },
    form: {
      handler: PENXPSettings.formHandler,
      closeOnSubmit: true,
      submitOnChange: false,
    },
    position: {
      width: 550,
      height: "auto",
    },
    tag: "form",
    window: {
      title: "PEN.Settings.xpOptions",
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
    form: { template: "systems/Pendragon/templates/settings/xp-settings.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  /**
   *
   * @param options
   */
  async _prepareContext(options) {
    const isGM = game.user.isGM;
    const optSet = {};
    for (const [k, v] of Object.entries(SETTINGS)) {
      optSet[k] = {
        value: game.settings.get("Pendragon", k),
        setting: v,
      };
    }
    return {
      isGM,
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
