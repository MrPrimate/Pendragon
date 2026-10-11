export default class PENDialog extends foundry.applications.api.DialogV2 {
  static DEFAULT_OPTIONS = {
    classes: ["Pendragon", "dialogV2"],
    position: {
      width: 500,
      height: "auto",
      top: 200,
      left: 1200,
      zIndex: 500,
    },
  };
}
