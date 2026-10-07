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
}
