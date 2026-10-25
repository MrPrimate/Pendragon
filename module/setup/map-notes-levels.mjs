class MapNotePopup extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["themed", "theme-light", "Pendragon"],
    id: "note-preview-view",
  };

  /**
   * @inheritdoc
   * @param {object} options
   */
  constructor(options = {}) {
    super(options);
    this.noteEntryLocked = false;
  }

  /**
   * @inheritdoc
   * @param {ApplicationRenderContext} _context
   * @param {object} _options
   * @returns {Promise<any>}
   */
  async _renderHTML(_context, _options) {
    const form = document.createElement("form");
    form.classList.add("Pendragon-formatted-text");
    return form;
  }

  /**
   * @inheritdoc
   * @param {any} result
   * @param {any} content
   * @param {object} _options
   */
  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
  }

  /**
   * Create or edit MapNotePopup instance then populate
   * @param {JournalEntryPage} doc
   * @param {Array} pages
   */
  static async createEntryPreview(doc, pages) {
    let noteEntryElement = foundry.applications.instances.get("note-preview-view");
    if (!noteEntryElement || noteEntryElement.state !== MapNotePopup.RENDER_STATES.RENDERED) {
      noteEntryElement = await new MapNotePopup({}, {}).render({ force: true });
      noteEntryElement.element.addEventListener("pointerenter", noteEntryElement.preventClose.bind(noteEntryElement));
      noteEntryElement.element.addEventListener("pointerleave", noteEntryElement.queueClose.bind(noteEntryElement));
    }
    noteEntryElement.preventClose();
    const div = noteEntryElement.element.querySelector(".Pendragon-formatted-text");
    div.replaceChildren();
    noteEntryElement.element.querySelector("h1.window-title").innerText = doc.name;
    for (const page of pages) {
      switch (page.type) {
        case "text":
          {
            const text = document.createElement("div");
            text.innerHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
              page.text?.content ?? "",
              { async: true, relativeTo: page },
            );
            text.querySelectorAll("img").forEach((element) =>
              element.addEventListener("click", async (event) => {
                if (!event.target.matches("img:not(.nopopout)")) {
                  return;
                }
                const target = event.target;
                const title = page?.name ?? target.title;
                const ip = new foundry.applications.apps.ImagePopout({
                  src: target.getAttribute("src"),
                  caption: page?.image.caption,
                  window: { title },
                });
                if (page) ip.shareImage = () => foundry.documents.collections.Journal.showDialog.showDialog(page);
                ip.render({ force: true });
              }),
            );
            div.append(text);
          }
          break;
        case "image":
          {
            const img = document.createElement("img");
            img.src = page.src;
            img.alt = page.name;
            div.append(img);
          }
          break;
        default:
          {
            const text = document.createElement("p");
            text.innerText = "This page has no preview";
            div.append(text);
          }
          break;
      }
    }
    div.querySelectorAll(".actor-embed-name-link").forEach((element) =>
      element.addEventListener("click", async (event) => {
        event.preventDefault();
        const uuid = event.currentTarget.dataset.uuid;
        if (uuid) {
          const doc = await fromUuid(uuid);
          if (doc && doc.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)) {
            doc.sheet.render({ force: true });
          }
        }
      }),
    );

    noteEntryElement.setPosition({ top: window.mousePositionNote.y, left: window.mousePositionNote.x });

    div.scrollTo(0, 0);
  }

  /**
   * Configure HTML Element
   * @param {HTMLElement} button
   */
  toggleLock(button) {
    button.ariaLabel = this.noteEntryLocked ? "Release Preview" : "Keep Preview Open";
    button.dataset.tooltip = this.noteEntryLocked ? "Release Preview" : "Keep Preview Open";
    button.classList.toggle("fa-thumbtack", !this.noteEntryLocked);
    button.classList.toggle("fa-thumbtack-angle", this.noteEntryLocked);
  }

  /**
   * @inheritdoc
   * @param {object} options
   * @returns {HTMLElement}
   */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    const toggleControls = frame.querySelector('button[data-action="toggleControls"]');
    if (toggleControls) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("header-control", "fa-solid", "icon");
      this.toggleLock(button);
      button.dataset.toggle = "lock";
      const object = this;
      button.addEventListener("click", () => {
        object.noteEntryLocked = !object.noteEntryLocked;
        object.toggleLock(button);
        if (!this.noteEntryLocked) {
          object.queueClose();
        }
      });
      toggleControls.after(button);
      toggleControls.remove();
    }
    return frame;
  }

  /**
   * Prevent close if already triggered
   */
  preventClose() {
    if (this.noteEntryCloseTimer) {
      window.clearTimeout(this.noteEntryCloseTimer);
    }
    this.noteEntryCloseTimer = undefined;
  }

  /**
   * Trigger a close in 1/4 second
   */
  queueClose() {
    if (this.noteEntryLocked) {
      return;
    }
    this.preventClose();
    this.noteEntryCloseTimer = window.setTimeout(() => {
      foundry.applications.instances.get("note-preview-view")?.close();
    }, 250);
  }

  /**
   * @inheritdoc
   * @param {object} options
   */
  async close(options = {}) {
    this.preventClose();
    super.close(options);
  }
}

/**
 * Init Hook
 */
Hooks.once("init", () => {
  class PendragonNote extends CONFIG.Note.objectClass {
    /**
     * @inheritdoc
     * @returns {boolean}
     */
    get isVisible() {
      if (this.mapVisible === false) {
        return false;
      }
      if (!game.user.isGM) {
        const playerEntryId = this.document.getFlag("Pendragon", "playerEntryId") ?? "";
        const playerPageId = this.document.getFlag("Pendragon", "playerPageId") ?? "";
        if (playerEntryId) {
          const entry = game.journal.get(playerEntryId);
          if (entry) {
            if (playerPageId) {
              const page = entry.pages.get(playerPageId);
              if (page) {
                return entry.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED);
              }
            } else if (entry.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)) {
              return true;
            }
          }
        }
      }
      return super.isVisible;
    }

    _canView(user) {
      if (!user.isGM) {
        const playerEntryId = this.document.getFlag("Pendragon", "playerEntryId") ?? "";
        const playerPageId = this.document.getFlag("Pendragon", "playerPageId") ?? "";
        if (playerEntryId) {
          const entry = game.journal.get(playerEntryId);
          if (entry) {
            let page;
            if (playerPageId) {
              page = entry.pages.get(playerPageId);
              if (page?.testUserPermission(user, "LIMITED", { exact: true })) {
                return page.type === "image";
              }
            }
            (page ?? entry).testUserPermission(user, "OBSERVER");
          }
        }
      }
      return true;
    }

    _onClickLeft2(event) {
      if (event.shiftKey || !game.user.isGM) {
        const playerEntryId = this.document.getFlag("Pendragon", "playerEntryId") ?? "";
        const playerPageId = this.document.getFlag("Pendragon", "playerPageId") ?? "";
        if (playerEntryId) {
          const entry = game.journal.get(playerEntryId);
          if (!entry) {
            return;
          }
          const options = {};
          if (playerPageId) {
            const page = entry.pages.get(playerPageId);
            if (page?.type === "image") {
              return new ImagePopout({
                src: page.src,
                uuid: page.uuid,
                caption: page.image.caption,
                window: { title: page.name },
              }).render({ force: true });
            }
            options.mode = foundry.applications.sheets.journal.JournalEntrySheet.VIEW_MODES.SINGLE;
            options.pageId = playerPageId;
          }
          console.log(entry, options);
          return entry.sheet.render({ force: true, ...options });
        }
      }
      return super._onClickLeft2(event);
    }
  }
  CONFIG.Note.objectClass = PendragonNote;

  class PendragonLevel extends CONFIG.Level.documentClass {
    /**
     * @inheritdoc
     * @returns {boolean}
     */
    get isVisible() {
      if (this.mapVisible === false) {
        return false;
      }
      return super.isVisible;
    }
  }
  CONFIG.Level.documentClass = PendragonLevel;
});

/**
 * Get Scene Control Buttons
 * @param {SceneControl} controls
 */
Hooks.on("getSceneControlButtons", (controls) => {
  const toggle = controls.notes.tools.toggle;
  if (toggle) {
    for (const tool in controls.notes.tools) {
      if (controls.notes.tools[tool].order > toggle.order) {
        controls.notes.tools[tool].order++;
      }
    }
    controls.notes.tools.PendragonToolTip = {
      toggle: true,
      icon: "fa-regular fa-comment",
      name: "PendragonToolTip",
      active: game.settings.get("Pendragon", "tooltipToggle"),
      title: "Toggle Tooltips Display",
      order: toggle.order + 1,
      onChange: (event, toggled) => game.settings.set("Pendragon", "tooltipToggle", toggled),
      visible: true,
    };
  }
});

/**
 * Render Hook
 * @param {ApplicationV2} application
 * @param {HTMLElement} element
 * @param {ApplicationRenderContext} context
 * @param {ApplicationRenderOptions} options
 */
Hooks.on("renderSceneConfig", (application, element, context, options) => {
  const container = element.querySelector('[data-action="addLevel"]').closest("fieldset");
  if (container) {
    const formGroup = document.createElement("div");
    formGroup.classList.add("form-group");
    const label = document.createElement("label");
    label.setAttribute("for", application.id + "-asMap");
    label.innerText = "As a map";
    formGroup.append(label);
    const formFields = document.createElement("div");
    formFields.classList.add("form-fields");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "flags." + "Pendragon" + ".asMap";
    input.checked = application.document.getFlag("Pendragon", "asMap") ?? false;
    input.id = application.id + "-asMap";
    formFields.append(input);
    formGroup.append(formFields);
    const hint = document.createElement("p");
    hint.classList.add("hint");
    hint.innerText = "Convert map levels into layers and enable map note popup";
    formGroup.append(hint);
    container.append(formGroup);
  }
});

/**
 * Render Hook
 * @param {ApplicationV2} application
 * @param {HTMLElement} element
 * @param {ApplicationRenderContext} context
 * @param {ApplicationRenderOptions} options
 */
Hooks.on("renderLevelConfig", (application, element, context, options) => {
  if (context.document.parent?.flags?.Pendragon?.asMap === true) {
    const container = element.querySelector("[name=visibility\\.levels]")?.closest(".form-group");
    if (container) {
      {
        const formGroup = document.createElement("div");
        formGroup.classList.add("form-group");
        const label = document.createElement("label");
        label.setAttribute("for", application.id + "-ifZoomedOut");
        label.innerText = "Forced show if zoomed out";
        formGroup.append(label);
        const formFields = document.createElement("div");
        formFields.classList.add("form-fields");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = "flags." + "Pendragon" + ".ifZoomedOut";
        input.checked = application.document.getFlag("Pendragon", "ifZoomedOut") ?? false;
        input.id = application.id + "-ifZoomedOut";
        formFields.append(input);
        formGroup.append(formFields);
        container.before(formGroup);
      }
      {
        const formGroup = document.createElement("div");
        formGroup.classList.add("form-group");
        const label = document.createElement("label");
        label.setAttribute("for", application.id + "-ifZoomedIn");
        label.innerText = "Forced show if zoomed in";
        formGroup.append(label);
        const formFields = document.createElement("div");
        formFields.classList.add("form-fields");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = "flags." + "Pendragon" + ".ifZoomedIn";
        input.checked = application.document.getFlag("Pendragon", "ifZoomedIn") ?? false;
        input.id = application.id + "-ifZoomedIn";
        formFields.append(input);
        formGroup.append(formFields);
        container.before(formGroup);
      }
    }
  }
});

/**
 * Render Hook
 * @param {ApplicationV2} application
 * @param {HTMLElement} element
 * @param {ApplicationRenderContext} context
 * @param {ApplicationRenderOptions} options
 */
Hooks.on("renderSceneNavigation", (application, element, context, options) => {
  if (typeof context.scenes.viewed?.id !== "undefined") {
    const scene = game.scenes.get(context.scenes.viewed.id);
    if (scene?.flags?.Pendragon?.asMap === true) {
      if (typeof application.options.actions.togglePendragonLayer === "undefined") {
        application.options.actions.togglePendragonLayer = (event, element) => {
          const doc = canvas.scene.levels.contents.find((doc) => doc.id === element.dataset.levelId);
          if (doc) {
            doc.mapVisible = !(doc.mapVisible ?? true);
            canvas.draw();
          }
        };
      }
      let count = 0;
      const levels = element.querySelectorAll("#scene-navigation-levels div.ui-control");
      for (const level of levels) {
        const doc = canvas.scene.levels.contents.find((doc) => doc.id === level.dataset.levelId);
        if (doc) {
          if (doc?.flags?.Pendragon?.ifZoomedOut === true || doc?.flags?.Pendragon?.ifZoomedIn === true) {
            level.parentElement.remove();
          } else {
            const i = document.createElement("i");
            i.classList.add("fa-solid", "fa-check");
            i.style.marginRight = "0.25rem";
            if (doc.isVisible) {
              level.style.outline = "1px solid var(--control-hover-icon-color)";
            } else {
              i.style.height = 0;
              i.style.overflow = "hidden";
            }
            level.prepend(i);
            level.dataset.action = "togglePendragonLayer";
            count++;
          }
        }
      }
      const container = document.querySelector("#scene-navigation-levels");
      if (container) {
        container.style["--max-levels"] = count;
        container.style["--max-levels-actual"] = count;
      }
    }
  }
});

/**
 * Canvas Pan Hook
 * @param {Document} canvas
 * @param {object} position
 */
Hooks.on("canvasPan", (canvas, position) => {
  if (canvas.scene?.flags?.Pendragon?.asMap === true) {
    const breakPoint = canvas.scene.width * position.scale;
    const zoomedOut = window.innerWidth > breakPoint;
    let changed = false;
    for (const level of canvas.scene.levels.contents) {
      if (
        (level.flags?.Pendragon?.ifZoomedOut === true || level.flags?.Pendragon?.ifZoomedIn === true) &&
        level.flags?.Pendragon?.ifZoomedOut !== level.flags?.Pendragon?.ifZoomedIn
      ) {
        if (
          (level.flags?.Pendragon?.ifZoomedOut === false && (level.mapVisible ?? true) === zoomedOut) ||
          (level.flags?.Pendragon?.ifZoomedIn === false && (level.mapVisible ?? true) !== zoomedOut)
        ) {
          level.mapVisible = !level.mapVisible;
          changed = true;
        }
      }
    }
    for (const note of canvas.scene.notes.contents) {
      const zoomedOutNotes = note.flags.Pendragon?.ifZoomedOut ?? false;
      const mapVisible = zoomedOutNotes === zoomedOut;
      if (note.object && mapVisible !== note.object.mapVisible) {
        note.object.mapVisible = mapVisible;
        if (!changed) {
          note.object.draw();
        }
      }
    }
    if (changed) {
      canvas.draw();
    }
  }
});

/**
 * Render Hook
 * @param {ApplicationV2} application
 * @param {HTMLElement} element
 * @param {ApplicationRenderContext} context
 * @param {ApplicationRenderOptions} options
 */
Hooks.on("renderNoteConfig", (application, element, context, options) => {
  if (canvas.scene?.flags?.Pendragon?.asMap === true) {
    const ifZoomedOut = application.document.getFlag("Pendragon", "ifZoomedOut") ?? false;
    const formGroup = element.querySelector("[name=texture\\.tint]").closest("div.form-group");
    const newGroup = document.createElement("div");
    newGroup.classList.add("form-group");
    formGroup.after(newGroup);
    const label = document.createElement("label");
    label.setAttribute("for", application.id + "-ifZoomedOut");
    label.innerText = "Show if zoomed out";
    const div = document.createElement("div");
    div.classList.add("form-fields");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "flags." + "Pendragon" + ".ifZoomedOut";
    input.checked = ifZoomedOut;
    input.id = application.id + "-ifZoomedOut";
    div.append(input);
    newGroup.append(label);
    newGroup.append(div);
    formGroup.after(newGroup);
    {
      const container = element.querySelector("select[name=entryId]").closest("fieldset");
      const fieldset = document.createElement("fieldset");
      const legend = document.createElement("legend");
      legend.innerText = "Player version";
      fieldset.append(legend);
      const playerEntryId = application.document.getFlag("Pendragon", "playerEntryId") ?? "";
      const playerPageId = application.document.getFlag("Pendragon", "playerPageId") ?? "";
      {
        const formGroup = document.createElement("div");
        formGroup.classList.add("form-group");
        const label = document.createElement("label");
        label.innerText = "Journal Entry";
        label.for = application.id + "-playerEntryId";
        formGroup.append(label);
        const formFields = document.createElement("div");
        formFields.classList.add("form-fields");
        const select = document.createElement("select");
        select.id = application.id + "-playerEntryId";
        select.name = "flags." + "Pendragon" + ".playerEntryId";
        formFields.append(select);
        const option = document.createElement("option");
        select.append(option);
        game.journal.contents
          .map((doc) => {
            return { name: doc.name, id: doc.id };
          })
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach((doc) => {
            const option = document.createElement("option");
            option.value = doc.id;
            option.text = doc.name;
            if (doc.id === playerEntryId) {
              option.selected = true;
            }
            select.append(option);
          });
        select.addEventListener("change", (event) => {
          const otherSelect = element.querySelector("#" + application.id + "-playerPageId");
          otherSelect.querySelectorAll("option").forEach((element) => element.remove());
          if (event.target.value) {
            const doc = game.journal.get(event.target.value);
            if (doc) {
              doc.pages.contents
                .map((doc) => {
                  return { name: doc.name, id: doc.id, sort: doc.sort };
                })
                .sort((a, b) => a.sort - b.name)
                .forEach((doc) => {
                  const option = document.createElement("option");
                  option.value = doc.id;
                  option.text = doc.name;
                  if (doc.id === playerPageId) {
                    option.selected = true;
                  }
                  otherSelect.append(option);
                });
            }
          }
        });
        formGroup.append(formFields);
        fieldset.append(formGroup);
      }
      {
        const formGroup = document.createElement("div");
        formGroup.classList.add("form-group");
        const label = document.createElement("label");
        label.innerText = "Journal Entry";
        label.for = application.id + "-playerPageId";
        formGroup.append(label);
        const formFields = document.createElement("div");
        formFields.classList.add("form-fields");
        const select = document.createElement("select");
        select.id = application.id + "-playerPageId";
        select.name = "flags." + "Pendragon" + ".playerPageId";
        formFields.append(select);
        const option = document.createElement("option");
        select.append(option);
        if (playerEntryId) {
          const doc = game.journal.get(playerEntryId);
          if (doc) {
            doc.pages.contents
              .map((doc) => {
                return { name: doc.name, id: doc.id, sort: doc.sort };
              })
              .sort((a, b) => a.sort - b.name)
              .forEach((doc) => {
                const option = document.createElement("option");
                option.value = doc.id;
                option.text = doc.name;
                if (doc.id === playerPageId) {
                  option.selected = true;
                }
                select.append(option);
              });
          }
        }
        formGroup.append(formFields);
        fieldset.append(formGroup);
      }
      container.after(fieldset);
    }
  }
});

Hooks.on("hoverNote", (object, hovered) => {
  if (
    canvas.scene?.flags?.Pendragon?.asMap === true &&
    !(object.document.flags.Pendragon?.ifZoomedOut ?? false) &&
    game.settings.get("Pendragon", "tooltipToggle")
  ) {
    const boundingClientRect = document.querySelector(".placeable-tab.flexcol.notes-tab")?.getBoundingClientRect();
    if (
      boundingClientRect &&
      window.mousePositionNote.x >= boundingClientRect.x &&
      window.mousePositionNote.x <= boundingClientRect.x + boundingClientRect.width &&
      window.mousePositionNote.y >= boundingClientRect.y &&
      window.mousePositionNote.y <= boundingClientRect.y + boundingClientRect.height
    ) {
      // Don't show pop up for placeable tab notes
      return;
    }
    if (hovered) {
      let doc = object.page ?? object.entry;
      if (!game.user.isGM && (object.document.getFlag("Pendragon", "playerEntryId") ?? false)) {
        const entry = game.journal.get(object.document.getFlag("Pendragon", "playerEntryId"));
        if (entry) {
          doc = entry;
          if (object.document.getFlag("Pendragon", "playerPageId") ?? false) {
            const page = entry.pages.get(object.document.getFlag("Pendragon", "playerPageId"));
            if (page) {
              doc = page;
            }
          }
        }
      }
      if (doc && doc.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)) {
        const pages = doc.pages?.filter((page) =>
          page.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER),
        ) ?? [doc];
        if (
          pages.length > 0 &&
          pages.find(
            (doc) =>
              (doc.type === "text" && (doc.text?.content ?? "").length) ||
              (doc.type === "image" && (doc.src ?? "").length),
          )
        ) {
          foundry.utils.setProperty(object, "flags.Pendragon.tempWithPopup", true);
          // Switch to async now flag is set
          MapNotePopup.createEntryPreview(doc, pages);
        }
      }
    } else {
      foundry.applications.instances.get("note-preview-view")?.queueClose();
    }
  }
});

Hooks.on("refreshNote", (object, flags) => {
  if (object.flags?.Pendragon?.tempWithPopup) {
    object.tooltip.visible = false;
  }
});

window.mousePositionNote = { x: 0, y: 0 };
window.addEventListener(
  "pointermove",
  (event) => {
    window.mousePositionNote.x = event.clientX;
    window.mousePositionNote.y = event.clientY;
  },
  { passive: true },
);
