import ChaosiumCanvasInterfaceShowRegionOnHover from "../apps/chaosium-canvas-interface-show-region-on-hover.mjs";

/**
 * Highlight Objects
 * While the GM holds the highlight key, regions with an active Show Region On Hover behavior are shown to the GM.
 * On release only the regions shown this way are hidden again, not ones the GM made GM only
 * @param {boolean} active
 */
export default function (active) {
  if (!game.user.isGM || !canvas.scene) return;
  const behaviorType = "ChaosiumCanvasInterfaceShowRegionOnHover";
  const regions = canvas.scene.regions
    .filter(
      (doc) =>
        (active
          ? doc.visibility === CONST.REGION_VISIBILITY.LAYER_UNLOCKED
          : ChaosiumCanvasInterfaceShowRegionOnHover.isShown(doc)) &&
        doc.behaviors.some((behavior) => behavior.disabled === false && behavior.type === behaviorType),
    )
    .map((doc) => ({ _id: doc.id, ...ChaosiumCanvasInterfaceShowRegionOnHover.showUpdate(active) }));
  if (regions.length > 0) canvas.scene.updateEmbeddedDocuments("Region", regions);
}
