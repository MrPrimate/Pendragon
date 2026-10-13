// Re-render dependent party/battle sheets when a member actor is updated.
// Driven by the updateActor DB event (fires once per update) rather than from
// prepareDerivedData, which would re-render on every prepare pass and loop.
export function listen() {
  Hooks.on("updateActor", async (actor, changes, options, userId) => {
    await actor._updateParty(actor);
    await actor._updateBattle(actor);
    await actor._updateAssault(actor);
  });
}
