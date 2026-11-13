import ChaosiumCanvasInterface from "./chaosium-canvas-interface.mjs";

export default class ChaosiumCanvasInterfaceShowRegionOnHover extends ChaosiumCanvasInterface {
  /**
   * Icon to show for behavior
   * @returns {string}
   */
  static get icon() {
    return "fa-solid fa-arrow-pointer";
  }

  /**
   * Type name of this behavior
   * @type {string}
   */
  static TYPE = "ChaosiumCanvasInterfaceShowRegionOnHover";

  /**
   * Uuids of the regions the GM is hovering over with shift held. Kept on this client only
   * @type {Set<string>}
   */
  static #hovered = new Set();

  /**
   * Is the GM holding the highlight objects key. Kept on this client only
   * @type {boolean}
   */
  static #highlighting = false;

  /**
   * Can this behavior reveal the region? Only regions that are otherwise hidden outside the region layer
   * @param {RegionDocument} region
   * @returns {boolean}
   */
  static canReveal(region) {
    return (
      region.visibility === CONST.REGION_VISIBILITY.LAYER_UNLOCKED &&
      region.behaviors.some(
        (behavior) => behavior.disabled === false && behavior.type === ChaosiumCanvasInterfaceShowRegionOnHover.TYPE,
      )
    );
  }

  /**
   * Is the region currently revealed to this GM by hover or the highlight key?
   * @param {RegionDocument} region
   * @returns {boolean}
   */
  static isRevealed(region) {
    if (!game.user.isGM) return false;
    if (
      !ChaosiumCanvasInterfaceShowRegionOnHover.#highlighting &&
      !ChaosiumCanvasInterfaceShowRegionOnHover.#hovered.has(region.uuid)
    ) {
      return false;
    }
    return ChaosiumCanvasInterfaceShowRegionOnHover.canReveal(region);
  }

  /**
   * Show or hide the regions on the current scene while the highlight key is held
   * @param {boolean} active
   */
  static setHighlighting(active) {
    ChaosiumCanvasInterfaceShowRegionOnHover.#highlighting = active;
    for (const region of canvas.scene?.regions ?? []) {
      if (ChaosiumCanvasInterfaceShowRegionOnHover.canReveal(region)) {
        region.object?.renderFlags.set({ refreshState: true });
      }
    }
  }

  /**
   * Show or hide a region the GM is hovering over
   * @param {RegionDocument} region
   * @param {boolean} hovered
   */
  static #setHovered(region, hovered) {
    const set = ChaosiumCanvasInterfaceShowRegionOnHover.#hovered;
    if (set.has(region.uuid) === hovered) return;
    if (hovered) set.add(region.uuid);
    else set.delete(region.uuid);
    region.object?.renderFlags.set({ refreshState: true });
  }

  /**
   * Make the Region placeable show revealed regions. This is display only: the Region document is not changed, so
   * nothing is sent to other clients or left behind on a reload
   */
  static registerRegionClass() {
    class PendragonRegion extends CONFIG.Region.objectClass {
      /**
       * @inheritdoc
       * @returns {boolean}
       */
      get isVisible() {
        const visible = super.isVisible;
        if (visible || this.hasPreview || this.isFilteredOut) return visible;
        return ChaosiumCanvasInterfaceShowRegionOnHover.isRevealed(this.document);
      }
    }
    CONFIG.Region.objectClass = PendragonRegion;
  }

  /**
   * Create Schema
   * @returns {DataSchema}
   */
  static defineSchema() {
    return {};
  }

  /**
   * Check permissions
   * @returns {boolean}
   */
  async _handleMouseOverEvent() {
    //If shift key not held don't run mouse over
    if (!event.shiftKey) {
      return false;
    }
    if (game.user.isGM) {
      ChaosiumCanvasInterfaceShowRegionOnHover.#setHovered(this.parent.parent, true);
      return true;
    }
    return false;
  }

  /**
   * Check permissions
   * @returns {boolean}
   */
  async _handleMouseOutEvent() {
    if (game.user.isGM) {
      ChaosiumCanvasInterfaceShowRegionOnHover.#setHovered(this.parent.parent, false);
      return true;
    }
    return false;
  }
}
