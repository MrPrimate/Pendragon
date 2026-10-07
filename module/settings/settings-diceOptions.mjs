const SETTINGS = {
  switchShift: {
    name: "PEN.Settings.switchShift",
    hint: "PEN.Settings.switchShiftHint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  },

  critAdj: {
    name: "PEN.Settings.critAdj",
    hint: "PEN.Settings.critAdjHint",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  },

  delayDice: {
    name: "PEN.Settings.delayDice",
    hint: "PEN.Settings.delayDiceHint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  },
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class PENDiceSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pen", "sheet", "settings"],
    id: "dice-settings",
    actions: {
      reset: PENDiceSettings.onResetDefaults,
    },
    form: {
      handler: PENDiceSettings.formHandler,
      closeOnSubmit: true,
      submitOnChange: false,
    },
    position: {
      width: 550,
      height: "auto",
    },
    tag: "form",
    window: {
      title: "PEN.Settings.diceOptions",
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
    form: { template: "systems/Pendragon/templates/settings/dice-settings.hbs" },
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
