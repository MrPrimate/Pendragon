import PENDialog from "../setup/pen-dialog.mjs";
import { PENactorDetails } from "../apps/actorDetails.mjs";

const DECK_PACK = "cha-pen-fvtt-en-gmhandbook.gmhb-feastdeck";

export class FeastDeck {
  static HOST_PREFIX = "Host ";

  // Sync check for showing controls: a custom UUID is set, or the GM Handbook pack exists.
  // fromUuid() is async so the UUID is validated in getDeck ; a bad UUID warns them.
  static isAvailable() {
    return !!game.settings.get("Pendragon", "feastDeckUuid")?.trim() || !!game.packs.get(DECK_PACK);
  }

  // Glory prominence modifier (GMH Table 3.4)
  static getProminence(glory) {
    if (glory >= 32000) return 8;
    if (glory >= 16000) return 7;
    if (glory >= 12000) return 6;
    if (glory >= 8000) return 5;
    if (glory >= 6000) return 4;
    if (glory >= 4000) return 3;
    if (glory >= 3000) return 2;
    if (glory >= 1000) return 1;
    return 0;
  }

  // Feast Event cards per Round by Total APP (GMH Table 3.5)
  static getDrawLimit(totalAPP) {
    return Math.max(0, Math.min(6, Math.floor((totalAPP - 5) / 5) + 1));
  }

  // Total APP for the Round: APP + Geniality + Prominence
  static getTotalAPP(combatant) {
    const actor = combatant.actor;
    const prominence = this.getProminence(actor?.system?.glory ?? 0);
    return (actor?.system?.stats?.app?.total ?? 0) + combatant.getGeniality() + prominence;
  }

  static getDrawState(combat, combatantId) {
    return (combat.getFlag("Pendragon", "feastDraws") ?? {})[combatantId] ?? null;
  }

  static async setDrawState(combat, combatantId, state) {
    const all = foundry.utils.duplicate(combat.getFlag("Pendragon", "feastDraws") ?? {});
    all[combatantId] = state;
    await combat.setFlag("Pendragon", "feastDraws", all);
  }

  static async postCardMessage(combat, combatant, state) {
    const partic = await PENactorDetails._getParticipantId(combatant.token, combatant.actor);
    const particImg = await PENactorDetails.getParticImg(partic?.particId, partic?.particType);
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/Pendragon/templates/chat/feast-card.hbs",
      {
        card: state,
        name: combatant.name,
        particId: partic?.particId,
        particType: partic?.particType,
        particImg,
        canRedraw: !state.host && state.drawn < state.limit,
        data: { combatId: combat.id, combatantId: combatant.id, cardId: state.cardId },
      },
    );
    await ChatMessage.implementation.create({
      author: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: combatant.actor, token: combatant.token, alias: combatant.name }),
      flavor: game.i18n.format("PEN.feast.cardFlavor", { name: combatant.name, round: state.round }),
      content,
      flags: { Pendragon: { feastCard: true } },
    });
  }

  // the card's Geniality modifier (printed on the art) is entered at play time
  static async promptGeniality(titleKey, hintKey) {
    const html = await foundry.applications.handlebars.renderTemplate(
      "systems/Pendragon/templates/dialog/feast-geniality.hbs",
      { hint: game.i18n.localize(hintKey) },
    );
    const result = await PENDialog.input({
      window: {
        title: game.i18n.localize(titleKey),
      },
      position: {
        width: 300,
      },
      content: html,
    });
    return result ? Number(result.geniality) || 0 : null;
  }

  // the tracker controls delegate here; players route to the GM via socket
  static async triggerTrackerAction(dataset, presetType = "feastDraw") {
    return this.triggerChatAction({ presetType, dataset, targetChatId: "" });
  }

  static async handleDraw(dataset) {
    const combat = game.combats.get(dataset.combatId);
    const combatant = combat?.combatants.get(dataset.combatantId);
    if (!combat || !combatant) {
      return;
    }
    if (!this.isAvailable()) {
      ui.notifications.warn(game.i18n.localize("PEN.feast.deckMissing"));
      return;
    }
    let state = this.getDrawState(combat, combatant.id);
    if (state && state.round !== combat.round) {
      state = null;
    }
    const limit = this.getDrawLimit(this.getTotalAPP(combatant));
    if (limit <= 0) {
      ui.notifications.warn(game.i18n.format("PEN.feast.noCards", { name: combatant.name }));
      return;
    }
    if (state?.cardId) {
      ui.notifications.warn(game.i18n.localize("PEN.feast.cardPending"));
      return;
    }
    if (state?.complete) {
      ui.notifications.warn(game.i18n.format("PEN.feast.roundComplete", { name: combatant.name }));
      return;
    }
    const drawn = state?.drawn ?? 0;
    if (drawn >= limit) {
      ui.notifications.warn(game.i18n.format("PEN.feast.drawLimitReached", { drawn, limit }));
      return;
    }
    const cards = await this.getDeckCards();
    if (!cards.length) {
      ui.notifications.warn(game.i18n.localize("PEN.feast.deckMissing"));
      return;
    }
    const playedIds = combat.getFlag("Pendragon", "feastDeckPlayed") ?? [];
    let pool = cards.filter((c) => !playedIds.includes(c.id));
    if (!pool.length) {
      // deck exhausted: played cards return to the deck (GMH p. 42)
      pool = cards;
      await combat.unsetFlag("Pendragon", "feastDeckPlayed");
    }
    const card = pool[Math.floor(Math.random() * pool.length)];
    const host = card.name?.startsWith(this.HOST_PREFIX);
    const newState = {
      round: combat.round,
      drawn: drawn + 1,
      limit,
      cardId: card.id,
      cardName: card.name,
      cardImg: card.faces?.[0]?.img ?? card.img,
      host,
    };
    await this.setDrawState(combat, combatant.id, newState);
    await this.postCardMessage(combat, combatant, newState);
  }

  // new Round means fresh card drawing (GMH pp. 41-42)
  static resetRound(combat) {
    combat.unsetFlag("Pendragon", "feastDraws");
  }

  // a drawn card is no longer pending (played or skipped back to the deck)
  static async clearPendingCard(combat, combatantId) {
    const state = { ...this.getDrawState(combat, combatantId) };
    if (!state.cardId) {
      return;
    }
    state.cardId = null;
    state.cardName = null;
    state.cardImg = null;
    state.host = false;
    await this.setDrawState(combat, combatantId, state);
  }

  // played cards are set aside until the deck is exhausted
  static async markPlayed(combat, cardId) {
    const played = foundry.utils.duplicate(combat.getFlag("Pendragon", "feastDeckPlayed") ?? []);
    if (!played.includes(cardId)) {
      played.push(cardId);
    }
    await combat.setFlag("Pendragon", "feastDeckPlayed", played);
  }

  static async getDeckCards() {
    // * false stops fallback message being displayed on the draw
    const deck = await this.getDeck(false);
    return deck ? Array.from(deck.cards) : [];
  }

  // Custom Cards stack from the world setting wins; warn on a bad UUID and
  // fall back to the GM Handbook pack so drawing still works.
  static async getDeck(initial) {
    const uuid = game.settings.get("Pendragon", "feastDeckUuid")?.trim();
    if (uuid) {
      const deck = await fromUuid(uuid);
      if (deck) return deck;
      //Warning message only shown when Combat type is changed to Feast, not every draw
      if (initial) {
        ui.notifications.warn(game.i18n.localize("PEN.feast.deckUuidInvalid"));
      }
    }
    const pack = game.packs.get(DECK_PACK);
    if (!pack) return null;
    const stacks = await pack.getDocuments();
    return stacks.find((s) => s.name === "Feast Deck") ?? stacks[0] ?? null;
  }

  // chat card action on the clicker's client; may need input before applying
  static async triggerChatAction({ presetType, dataset, targetChatId }) {
    if (presetType === "feastPlay" || presetType === "feastGeniality") {
      const adjust = presetType === "feastGeniality";
      const geniality = await this.promptGeniality(
        adjust ? "PEN.feast.genialityAdjustPrompt" : "PEN.feast.genialityPrompt",
        adjust ? "PEN.feast.genialityAdjustHint" : "PEN.feast.genialityPromptHint",
      );
      if (geniality === null) {
        return;
      }
      dataset = { ...dataset, geniality };
    }
    if (game.user.isGM) {
      return this.applyChatAction({ presetType, dataset, targetChatId });
    }
    const availableGM = game.users.find((d) => d.active && d.isGM)?.id;
    if (!availableGM) {
      ui.notifications.warn(game.i18n.localize("PEN.noAvailableGM"));
      return;
    }
    game.socket.emit("system.Pendragon", {
      type: "chatUpdate",
      to: availableGM,
      value: { presetType, targetChatId, originGM: false, event: null, dataset },
    });
  }

  // GM-side chat card action; players arrive here via socket
  static async applyChatAction({ presetType, dataset, targetChatId }) {
    const combat = game.combats.get(dataset.combatId);
    const combatant = combat?.combatants.get(dataset.combatantId);
    if (!combat || !combatant) {
      return;
    }
    if (presetType === "feastDraw") {
      // skip any pending card back to the deck and draw again
      const pending = this.getDrawState(combat, combatant.id);
      if (pending?.cardId) {
        // snapshot before the pending state is cleared
        const skipped = { cardName: pending.cardName, drawn: pending.drawn, limit: pending.limit };
        await this.clearPendingCard(combat, combatant.id);
        const message = targetChatId ? game.messages.get(targetChatId) : null;
        if (message) {
          await message.update({ content: await this.renderSkippedMessage(combat, combatant, skipped) });
        }
      }
      return this.handleDraw(dataset);
    }
    if (presetType === "feastGeniality") {
      // outcome of the card's check, entered by the player/GM (GMH p. 42)
      const gained = Number(dataset.geniality) || 0;
      if (gained === 0) {
        return;
      }
      const { actual, capped } = await combatant.addGeniality(gained);
      await this.postGenialityChange(combatant, {
        reasons: [{ label: game.i18n.localize("PEN.feast.genialityChange"), delta: actual, capped }],
        newTotal: combatant.getGeniality(),
      });
      return;
    }
    if (presetType === "feastPlay") {
      const state = this.getDrawState(combat, combatant.id);
      // the played card must still be pending
      if (!state?.cardId || state.cardId !== dataset.cardId) {
        return;
      }
      const seatLevel = Number.isFinite(combatant.initiative) ? Math.floor(combatant.initiative) : null;
      const seatDelta = seatLevel !== null ? seatLevel - 1 : 0;
      const cardDelta = Number(dataset.geniality) || 0;
      const reasons = [];
      // seating geniality at the start of the attendee's action (GMH p. 40)
      if (seatDelta !== 0 && seatLevel !== null) {
        const { actual, capped } = await combatant.addGeniality(seatDelta);
        reasons.push({
          label: game.i18n.format("PEN.feast.seatingGeniality", {
            seat: game.i18n.localize("PEN.feast.resultLevel." + seatLevel),
          }),
          delta: actual,
          capped,
        });
      }
      // the card's printed Geniality modifier
      if (cardDelta !== 0) {
        const { actual, capped } = await combatant.addGeniality(cardDelta);
        reasons.push({
          label: game.i18n.format("PEN.feast.cardGeniality", { card: state.cardName }),
          delta: actual,
          capped,
        });
      }
      const newTotal = combatant.getGeniality();
      // snapshot for the played message before the pending state is cleared
      const playedState = { ...state };
      await this.markPlayed(combat, dataset.cardId);
      // playing a card ends the knight's drawing for the Round (GMH p. 42)
      state.complete = true;
      state.cardId = null;
      state.cardName = null;
      state.cardImg = null;
      state.host = false;
      await this.setDrawState(combat, combatant.id, state);
      const message = targetChatId ? game.messages.get(targetChatId) : null;
      if (message) {
        await message.update({ content: await this.renderPlayedMessage(combat, combatant, playedState, cardDelta) });
      }
      // post the Geniality change to chat
      if (reasons.length > 0) {
        await this.postGenialityChange(combatant, { reasons, newTotal });
      }
    }
  }

  static async renderPlayedMessage(combat, combatant, state, gained) {
    return foundry.applications.handlebars.renderTemplate("systems/Pendragon/templates/chat/feast-card.hbs", {
      played: true,
      name: combatant.name,
      particId: combatant.actor?.id,
      particType: "actor",
      particImg: combatant.actor?.img,
      card: state,
      gained,
      data: { combatId: combat.id, combatantId: combatant.id },
    });
  }

  static async renderSkippedMessage(combat, combatant, state) {
    return foundry.applications.handlebars.renderTemplate("systems/Pendragon/templates/chat/feast-card.hbs", {
      skipped: true,
      name: combatant.name,
      particId: combatant.actor?.id,
      particType: "actor",
      particImg: combatant.actor?.img,
      card: { cardName: state.cardName, drawn: state.drawn, limit: state.limit },
    });
  }

  // post a Geniality change to chat so attendees can follow along
  static async postGenialityChange(combatant, { reasons, newTotal }) {
    if (reasons.length === 0) return;
    const content = [
      `<strong>${foundry.utils.escapeHTML(combatant.name)}</strong>:`,
      ...reasons.map((r) => {
        const deltaStr = r.delta >= 0 ? `+${r.delta}` : `${r.delta}`;
        const cappedStr = r.capped ? ` <em>(${game.i18n.localize("PEN.feast.capped")})</em>` : "";
        return `  ${foundry.utils.escapeHTML(r.label)}: ${deltaStr}${cappedStr}`;
      }),
      game.i18n.format("PEN.feast.genialityNewTotal", { total: newTotal }),
    ].join("<br>");
    await ChatMessage.create({
      author: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: combatant.actor, token: combatant.token, alias: combatant.name }),
      content,
    });
  }
}
