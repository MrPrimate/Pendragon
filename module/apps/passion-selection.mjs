import PENDialog from "../setup/pen-dialog.mjs";
// this dialog is used to allocate points to passions
// both raising and lowering passions costs points
export class PassionsSelectDialog extends PENDialog {
  _onRender(context, _options) {
    this.element.querySelectorAll(".up.rollable").forEach((n) => n.addEventListener("click", this._upArrow.bind(this)));
    this.element
      .querySelectorAll(".down.rollable")
      .forEach((n) => n.addEventListener("click", this._downArrow.bind(this)));
  }

  async _upArrow(event) {
    await this._onSelectArrowClicked(event, 1);
  }

  async _downArrow(event) {
    await this._onSelectArrowClicked(event, -1);
  }

  async _onSelectArrowClicked(event, change) {
    const chosen = event.currentTarget.closest(".targetIcon");
    let choice = chosen.dataset.set;
    let newCap = 0;
    const chosenPassion = this.options.data.passions[choice];

    //Normally stats only allowed in range min - max
    // you can lower a passion that is already over the max
    if (
      chosenPassion.value + change < chosenPassion.min ||
      (chosenPassion.value + change > chosenPassion.max && chosenPassion.value > chosenPassion.origValue)
    ) {
      change = 0;
      return;
    }

    //Change the stat value & points spent
    if (chosenPassion.value + change == chosenPassion.origValue) {
      newCap = this.options.data.added - Math.abs(change);
    } else {
      newCap = this.options.data.added + Math.abs(change);
    }

    //If you don't breach the Max Points then update (otherwise ignore)
    if (newCap <= this.options.data.pointsMax) {
      chosenPassion.value = Number(chosenPassion.value) + change;
      this.options.data.added = newCap;

      //Update points spent and the stats value on the form
      const form = event.currentTarget.closest(".stats-input");
      const divCount = form.querySelector(".count");
      divCount.innerText = this.options.data.added;
      const statVal = form.querySelector(".item-" + choice);
      statVal.innerText = chosenPassion.value;
      const closecard = form.querySelector(".closecard");
      const upArrow = form.querySelector(".inc-" + choice);
      const downArrow = form.querySelector(".dec-" + choice);
      if (chosenPassion.value >= chosenPassion.max && chosenPassion.value >= chosenPassion.origValue) {
        upArrow.innerHTML = "&nbsp";
      } else {
        upArrow.innerHTML = "<i class='fas fa-circle-up'></i>";
      }
      if (chosenPassion.value <= chosenPassion.min && chosenPassion.value <= chosenPassion.origValue) {
        downArrow.innerHTML = "&nbsp";
      } else {
        downArrow.innerHTML = "<i class='fas fa-circle-down'></i>";
      }
    }
  }

  static async create(title, passions, points, cap) {
    let destination = "systems/Pendragon/templates/dialog/passionsInput.hbs";
    let winTitle = title;
    let data = {
      courts: [
        { name: "adoratio", label: game.i18n.localize("PEN.adoratio") },
        { name: "civilitas", label: game.i18n.localize("PEN.civilitas") },
        { name: "fervor", label: game.i18n.localize("PEN.fervor") },
        { name: "fidelitas", label: game.i18n.localize("PEN.fidelitas") },
        { name: "honor", label: game.i18n.localize("PEN.honor") },
      ],
      passions,
      pointsMax: points,
      added: 0,
      cap: cap,
    };
    const html = await foundry.applications.handlebars.renderTemplate(destination, data);

    return new Promise((resolve) => {
      const dlg = PassionsSelectDialog.wait({
        window: { title: winTitle },
        form: { closeOnSubmit: false },
        content: html,
        data,
        buttons: [
          {
            label: game.i18n.localize("PEN.confirm"),
            callback: (event, button, dialog) => {
              if (dialog.options.data.added < dialog.options.data.pointsMax) {
                button.disabled = true;
              } else {
                dialog.options.form.closeOnSubmit = true;
                return resolve(dialog.options.data.passions);
              }
            },
          },
        ],
      });
    });
  }
}
