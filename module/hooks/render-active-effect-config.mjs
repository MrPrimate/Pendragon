export default function (application, element, context, options) {
  // Add predefined keys
  const tab = element.querySelector('section[data-tab="changes"]');
  const div = document.createElement("div");
  div.classList.add("form-group");
  const label = document.createElement("label");
  label.for = application.id + "-predefinedKeys";
  label.innerText = game.i18n.localize("PEN.predefinedActiveEffectKeys");
  div.append(label);
  const div2 = document.createElement("div");
  div2.classList.add("form-fields");
  const select = document.createElement("select");
  select.name = "predefinedKeys";
  select.id = label.for;
  const option = document.createElement("option");
  option.value = "";
  option.text = "";
  select.append(option);
  for (const key in CONFIG.PENDRAGON.keysActiveEffects) {
    const option = document.createElement("option");
    option.value = key;
    option.text = game.i18n.localize(CONFIG.PENDRAGON.keysActiveEffects[key]);
    select.append(option);
  }
  select.addEventListener("change", (event) => {
    event.preventDefault();
    const submitData = application._processFormData(
      null,
      application.form,
      new foundry.applications.ux.FormDataExtended(application.form),
    );
    const changes = Object.values(submitData.system?.changes ?? {});
    const initial = application.document.system.schema.fields.changes.element.getInitialValue();
    initial.key = event.currentTarget.value;
    initial.value = 0;
    event.currentTarget.value = "";
    changes.push(initial);
    return application.submit({
      updateData: {
        system: {
          changes,
        },
      },
    });
  });
  div2.append(select);
  div.append(div2);
  const p = document.createElement("p");
  p.classList.add("hint");
  p.innerText = game.i18n.localize("PEN.predefinedActiveEffectKeyHint");
  div.append(p);
  tab.prepend(div);
  // Tooltip predefined keys
  const inputs = tab.querySelectorAll("div.key input");
  for (const input of inputs) {
    if (typeof CONFIG.PENDRAGON.keysActiveEffects[input.value] !== "undefined") {
      input.dataset.tooltip = CONFIG.PENDRAGON.keysActiveEffects[input.value];
    }
  }
}
