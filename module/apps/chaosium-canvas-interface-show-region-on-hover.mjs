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
   * Flag marking a region this behavior (or the highlight key) has shown to the GM, so only those are hidden again
   * @type {string}
   */
  static SHOWN_FLAG = "regionShownOnHover";

  /**
   * Was the region shown by this behavior (and is it still shown)?
   * @param {RegionDocument} region
   * @returns {boolean}
   */
  static isShown(region) {
    return (
      region.visibility === CONST.REGION_VISIBILITY.GAMEMASTER &&
      region.getFlag("Pendragon", ChaosiumCanvasInterfaceShowRegionOnHover.SHOWN_FLAG) === true
    );
  }

  /**
   * Update data to show (to the GM) or hide a region, marking it as shown by this behavior
   * @param {boolean} show
   * @returns {object}
   */
  static showUpdate(show) {
    return {
      visibility: show ? CONST.REGION_VISIBILITY.GAMEMASTER : CONST.REGION_VISIBILITY.LAYER_UNLOCKED,
      [`flags.Pendragon.${ChaosiumCanvasInterfaceShowRegionOnHover.SHOWN_FLAG}`]: show,
    };
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
      const region = this.parent.parent;
      if (region.visibility === CONST.REGION_VISIBILITY.LAYER_UNLOCKED) {
        region.update(ChaosiumCanvasInterfaceShowRegionOnHover.showUpdate(true));
      }
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
      //Only hide regions this behavior showed, not ones the GM made GM only
      const region = this.parent.parent;
      if (ChaosiumCanvasInterfaceShowRegionOnHover.isShown(region)) {
        region.update(ChaosiumCanvasInterfaceShowRegionOnHover.showUpdate(false));
      }
      return true;
    }
    return false;
  }
}
