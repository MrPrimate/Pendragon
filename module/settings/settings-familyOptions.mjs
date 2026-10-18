const SETTINGS = {
  randomFamilyNames: {
    name: "PEN.Settings.randomFamilyNames",
    hint: "PEN.Settings.randomFamilyNamesHint",
    scope: "user",
    config: false,
    type: Boolean,
    default: true,
    requiresReload: true,
  },

  createCousins: {
    name: "PEN.Settings.createCousins",
    hint: "PEN.Settings.createCousinsHint",
    scope: "user",
    config: false,
    type: Boolean,
    default: true,
    requiresReload: true,
  },
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class PENFamilySettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pen", "sheet", "settings"],
    id: "family-settings",
    actions: {
      reset: PENFamilySettings.onResetDefaults,
    },
    form: {
      handler: PENFamilySettings.formHandler,
      closeOnSubmit: true,
      submitOnChange: false,
    },
    position: {
      width: 550,
      height: "auto",
    },
    tag: "form",
    window: {
      title: "PEN.Settings.familyOptions",
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
    form: { template: "systems/Pendragon/templates/settings/family-settings.hbs" },
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
