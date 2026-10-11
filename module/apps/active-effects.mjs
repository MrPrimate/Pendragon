export class PendragonActiveEffect extends ActiveEffect {
  get active() {
    if (this.parent instanceof Item && this.parent.type === "ideal") {
      //If item type is ideal and it isn't promoted then effect is not active
      if (this.parent.actor) {
        if (!this.parent.system.promoted) {
          return false;
        }
      }
    }
    return super.active;
  }

  /**
   * Apply ActiveEffect change to Actor
   * @param {Document} targetDoc
   * @param {ActiveEffectChangeData} change
   * @param {object} options
   * @returns {object}
   */
  static applyChange(targetDoc, change, options) {
    if (change.key === "system.damBonus" && (change.type === "add")) {
      let val = change.value.toString();
      if (!["+","-"].includes(val.charAt(0))) {
        change.value = "+" + val
      }
    }
    const changes = super.applyChange(targetDoc, change, options);
    return changes;
  }

}
