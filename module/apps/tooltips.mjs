// This class is registered as game.Pendragon.tooltips
export class PendragonTooltips {
  // Special global tooltip element provided by foundry
  // it is available in the setup and ready hooks
  #tooltip = document.getElementById("tooltip");
  get tooltip() {
    return this.#tooltip;
  }

  // a mutation observer so we can watch for the tooltip becoming active
  #observer;

  // hook up an observer
  // this gets called by the system in the appropriate hook
  // changes to the class attribute on the global tooltip call our handler
  observe() {
    this.#observer?.disconnect();
    this.#observer = new MutationObserver(this._onMutation.bind(this));
    this.#observer.observe(this.tooltip, { attributeFilter: ["class"], attributeOldValue: true });
  }

  _onMutation(mutationList) {
    const tooltip = this.tooltip;

    // watching for the 'active' class to be added
    // that tells us the tooltip is going to render
    let isActivated = false;
    for (const { type, attributeName, oldValue } of mutationList) {
      if (type === "attributes" && attributeName === "class") {
        const difference = new Set(tooltip.classList).difference(new Set(oldValue?.split(" ")));
        if (difference.has("active")) isActivated = true;
      }
    }

    // now we do any fancy rendering we need
    if (isActivated) this._processTooltip();
  }

  // do any custom tooltip rendering
  async _processTooltip() {
    // see if we need to load a document tooltip
    // if not, we do nothing and tooltip renders normally
    const loading = this.tooltip.querySelector(".loading");
    const needsLoading = loading?.dataset.uuid !== undefined;
    if (needsLoading) {
      // get the document
      const doc = await fromUuid(loading.dataset.uuid);
      return this._onRenderTooltipContent(doc);
    }
  }

  // this renders a document as a tooltip
  // either by calling a custom renderTooltip() method if it exists
  // or by building the context and rendering a template
  async _onRenderTooltipContent(document) {
    // check for a custom renderTooltip() method
    // first check the doc, then the system
    const { content } = await (document.renderTooltip?.() ?? document.system?.renderTooltip?.() ?? {});
    // if we didn't get any content to render, just return
    if (!content) return;
    // finally, set tooltip innerHTML = content
    // we could also adjust the tooltip position at this point
    this.tooltip.innerHTML = content;
  }
}
