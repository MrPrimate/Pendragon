import ChaosiumCanvasInterface from './chaosium-canvas-interface.mjs'

export default class ChaosiumCanvasInterfaceShowRegionOnHover extends ChaosiumCanvasInterface {
  /**
   * Icon to show for behavior
   * @returns {string}
   */
  static get icon () {
    return 'fa-solid fa-arrow-pointer'
  }

  /**
   * Create Schema
   * @returns {DataSchema}
   */
  static defineSchema () {
    return {
    }
  }

  /**
   * Check permissions
   * @returns {boolean}
   */
  async _handleMouseOverEvent () {
    //If shift key not held don't run mouse over
    if (!event.shiftKey) {return false}
    if (game.user.isGM) {
      if (this.parent.parent.visibility === CONST.REGION_VISIBILITY.LAYER_UNLOCKED) {
        this.parent.parent.update({ 'flags.CoC7.ChaosiumCanvasInterfaceShowRegionOnHover': true, visibility: CONST.REGION_VISIBILITY.GAMEMASTER })
      }
      return true
    }
    return false
  }

  /**
   * Check permissions
   * @returns {boolean}
   */
  async _handleMouseOutEvent () {
    if (game.user.isGM) {
      if (this.parent.parent.visibility === CONST.REGION_VISIBILITY.GAMEMASTER) {
        this.parent.parent.update({ 'flags.CoC7.ChaosiumCanvasInterfaceShowRegionOnHover': true, visibility: CONST.REGION_VISIBILITY.LAYER_UNLOCKED })
      }
      return true
    }
    return false
  }
}
