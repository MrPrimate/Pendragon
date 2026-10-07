import PENDialog from "../setup/pen-dialog.mjs";

// this dialog is to allocation points to traits
// using the specialized dialog is more intuitive as it shows trait pairs
export class TraitsSelectDialog extends PENDialog {
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
    const form = event.currentTarget.closest(".stats-input");
    const chosen = event.currentTarget.closest(".targetIcon");
    let choice = chosen.dataset.set;
    let newCap = 0;

    //Stats only allowed in range min - max
    if (
      this.options.data.cap &&
      this.options.data.traits[choice].value + change < this.options.data.traits[choice].origVal
    ) {
      change = 0;
    }
    if (
      this.options.data.traits[choice].value + change < this.options.data.traits[choice].minVal ||
      this.options.data.traits[choice].value + change > this.options.data.traits[choice].maxVal
    ) {
      change = 0;
    }

    //Change the stat value & points spent
    if (this.options.data.cap) {
      newCap = this.options.data.added + change;
    } else {
      for (let itm of this.options.data.traits) {
        newCap = newCap + Math.abs(Number(itm.value) - Number(itm.origVal));
      }
      if (this.options.data.traits[choice].value > this.options.data.traits[choice].origVal) {
        newCap = newCap + change;
      } else if (this.options.data.traits[choice].value < this.options.data.traits[choice].origVal) {
        newCap = newCap - change;
      } else {
        newCap = newCap + Math.abs(change);
      }
    }

    //If you don't breach the Max Points then update (otherwise ignore)
    if (newCap <= this.options.data.pointsMax) {
      this.options.data.traits[choice].value = Number(this.options.data.traits[choice].value) + change;
      this.options.data.traits[choice].oppValue = 20 - Number(this.options.data.traits[choice].value);
      this.options.data.added = newCap;

      //Update points spent and the stats value on the form

      const divCount = form.querySelector(".count");
      divCount.innerText = this.options.data.added;
      const statVal = form.querySelector(".item-" + choice);
      statVal.innerText = this.options.data.traits[choice].value;
      const oppVal = form.querySelector(".opp-" + choice);
      oppVal.innerText = this.options.data.traits[choice].oppValue;
      const closecard = form.querySelector(".closecard");
      const upArrow = form.querySelector(".inc-" + choice);
      const downArrow = form.querySelector(".dec-" + choice);
      if (this.options.data.traits[choice].value >= this.options.data.traits[choice].maxVal) {
        upArrow.innerHTML = "&nbsp";
      } else {
        upArrow.innerHTML = "<i class='fas fa-circle-up'></i>";
      }
      if (this.options.data.traits[choice].value <= this.options.data.traits[choice].minVal) {
        downArrow.innerHTML = "&nbsp";
      } else {
        downArrow.innerHTML = "<i class='fas fa-circle-up'></i>";
      }
    }
  }

  static async create(traits, points, cap, name) {
    let destination = "systems/Pendragon/templates/dialog/traitsInput.hbs";
    let winTitle = game.i18n.format("PEN.inputTraits", { name: name });
    let data = {
      traits,
      pointsMax: points,
      added: 0,
      cap: cap,
    };
    const html = await foundry.applications.handlebars.renderTemplate(destination, data);

    return new Promise((resolve) => {
      const dlg = TraitsSelectDialog.wait({
        window: { title: winTitle },
        position: {
          width: 570,
          height: 830,
        },
        window: {
          resizable: true,
        },
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
                return resolve(dialog.options.data.traits);
              }
            },
          },
        ],
      });
    });
  }
}
