import ChaosiumCanvasInterfaceShowRegionOnHover from "../apps/chaosium-canvas-interface-show-region-on-hover.mjs";

/**
 * Highlight Objects
 * While the GM holds the highlight key, regions with an active Show Region On Hover behavior are shown to that GM.
 * This is only a display state on this client, the regions themselves are not updated
 * @param {boolean} active
 */
export default function (active) {
  if (!game.user.isGM) return;
  ChaosiumCanvasInterfaceShowRegionOnHover.setHighlighting(active);
}
