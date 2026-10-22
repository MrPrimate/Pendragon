import { PENUtilities } from "./utilities.mjs";

export class PENRandomName {
  //Returns "male" or "female" from the gender, then the fallback, otherwise at random
  static async resolveGender(gender = "", fallback = "") {
    const type = PENUtilities.genderType(gender) || fallback;
    if (["male", "female"].includes(type)) return type;
    const roll = await new Roll("1D2").evaluate();
    return roll.total === 2 ? "female" : "male";
  }

  //Wire up a random gender button in a dialog, filling the named input with Male or Female
  static activateGenderButton(element, inputName) {
    const button = element.querySelector(".random-gender");
    const genderInput = element.querySelector(`[name="${inputName}"]`);
    if (!button || !genderInput) return;
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const gender = await PENRandomName.resolveGender();
      genderInput.value = game.i18n.localize("PEN." + gender);
    });
  }
}
