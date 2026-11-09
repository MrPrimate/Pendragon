/**
 * Highlight Objects
 * @param {ApplicationV2} active
 */
export default function (active) {
  if (game.user.isGM) {
    if (active) {
      const regions = canvas.scene.regions
        .filter(
          (doc) =>
            doc.visibility === CONST.REGION_VISIBILITY.LAYER_UNLOCKED &&
            doc.behaviors.find(
              (doc) => doc.disabled === false && doc.type === "ChaosiumCanvasInterfaceShowRegionOnHover",
            ),
        )
        .map((doc) => {
          return {
            _id: doc.id,
            visibility: CONST.REGION_VISIBILITY.GAMEMASTER,
          };
        });
      canvas.scene.updateEmbeddedDocuments("Region", regions);
    } else {
      const regions = canvas.scene.regions
        .filter(
          (doc) =>
            doc.visibility === CONST.REGION_VISIBILITY.GAMEMASTER &&
            doc.behaviors.find(
              (doc) => doc.disabled === false && doc.type === "ChaosiumCanvasInterfaceShowRegionOnHover",
            ),
        )
        .map((doc) => {
          return {
            _id: doc.id,
            visibility: CONST.REGION_VISIBILITY.LAYER_UNLOCKED,
          };
        });
      canvas.scene.updateEmbeddedDocuments("Region", regions);
    }
  }
}
