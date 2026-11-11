/**
 * Highlight Objects
 * While the GM holds the highlight key, regions with an active Show Region On Hover behavior are shown to the GM
 * @param {boolean} active
 */
export default function (active) {
  if (!game.user.isGM || !canvas.scene) return;
  const [from, to] = active
    ? [CONST.REGION_VISIBILITY.LAYER_UNLOCKED, CONST.REGION_VISIBILITY.GAMEMASTER]
    : [CONST.REGION_VISIBILITY.GAMEMASTER, CONST.REGION_VISIBILITY.LAYER_UNLOCKED];
  const regions = canvas.scene.regions
    .filter(
      (doc) =>
        doc.visibility === from &&
        doc.behaviors.some(
          (behavior) => behavior.disabled === false && behavior.type === "ChaosiumCanvasInterfaceShowRegionOnHover",
        ),
    )
    .map((doc) => ({ _id: doc.id, visibility: to }));
  if (regions.length > 0) canvas.scene.updateEmbeddedDocuments("Region", regions);
}
