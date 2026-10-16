import { PENCheck, RollResult } from "../apps/checks.mjs";
import { OPCard } from "./opposed-card.mjs";
import { PENactorDetails } from "../apps/actorDetails.mjs";
import { CombatAction, CombatOutcome } from "../apps/combat-actions.mjs";

export class COCard {
  //Resolve a combined card - roll dice, update and close
  static async COResolve(config) {
    let targetMsg = await game.messages.get(config.targetChatId);
    let chatCards = targetMsg.flags.Pendragon.chatCard;
    if (chatCards.length < 2) {
      ui.notifications.warn(game.i18n.localize("PEN.resolveMore"));
      return;
    }

    const result = this.compareCombatResults(chatCards[0], chatCards[1]);
    let newchatCards = [];
    for (let cCount = 0; cCount < 2; cCount++) {
      chatCards[cCount].outcome = result[cCount];
      chatCards[cCount].outcomeLabel = game.i18n.localize("PEN.comRoll" + result[cCount]);

      //If Critical, Tie or Win then allow Damage Roll
      if (["C", "T", "W"].includes(result[cCount])) {
        chatCards[cCount].damRoll = true;
      }

      //If Critical then set Damage Roll to critical
      if (["C"].includes(result[cCount])) {
        chatCards[cCount].damCrit = true;
      }

      //If made Dodge or Evade roll then don't cause damage
      if (["evade", "dodge"].includes(chatCards[cCount].action)) {
        chatCards[cCount].damRoll = false;
        chatCards[cCount].damCrit = false;
      }

      //Set Shield Use if Partial Success or better and opponent is causing damage
      if (["C", "T", "W", "P"].includes(result[cCount])) {
        if (["C", "T", "W"].includes(result[1 - cCount])) {
          chatCards[cCount].damShield = true;
        }
      }

      newchatCards.push(chatCards[cCount]);
      if (cCount === 0) {
        await OPCard.showDiceRoll(chatCards[cCount], false);
      } else {
        await OPCard.showDiceRoll(chatCards[cCount], true);
      }
      if (game.settings.get("Pendragon", "autoXP") && chatCards[cCount].resultLevel != 1) {
        await PENCheck.tickXP(chatCards[cCount]);
      }
    }

    await targetMsg.update({
      "flags.Pendragon.chatCard": newchatCards,
      "flags.Pendragon.state": "closed",
    });
    const pushhtml = await PENCheck.startChat(targetMsg.flags.Pendragon);
    await targetMsg.update({ content: pushhtml });
    return;
  }

  static async resolveCombatRolls(config) {
    const targetMsg = await game.messages.get(config.targetChatId);
    const chatCards = targetMsg.flags.Pendragon.chatCard;
    if (chatCards.length < 2) {
      ui.notifications.warn(game.i18n.localize("PEN.resolveMore"));
      return;
    }

    const [card1, card2] = chatCards;

    // adjust modifiers due to opponent and recalculate results if needed
    CombatAction.adjustOpposingModifiers(card1, card2);
    CombatAction.adjustOpposingModifiers(card2, card1);

    // adjust damage formulas that depend on the opposing action
    await CombatAction.adjustDamage(card1, card2);
    await CombatAction.adjustDamage(card2, card1);

    // compare the results to determine the outcome
    const [r1, r2] = this.compareCombatResults(card1, card2);

    //map outcomes
    const updatedCard1 = this.mapOutcomeToCard(card1, r1, r2, card2.action);
    const updatedCard2 = this.mapOutcomeToCard(card2, r2, r1, card1.action);

    // show results
    await OPCard.showDiceRoll(updatedCard1);
    if (game.settings.get("Pendragon", "autoXP") && updatedCard1.resultLevel != 1) {
      await PENCheck.tickXP(updatedCard1);
    }

    await OPCard.showDiceRoll(updatedCard2);
    if (game.settings.get("Pendragon", "autoXP") && updatedCard2.resultLevel != 1) {
      await PENCheck.tickXP(updatedCard2);
    }

    await targetMsg.update({
      "flags.Pendragon.chatCard": [updatedCard1, updatedCard2],
      "flags.Pendragon.state": "closed",
    });
    const pushhtml = await PENCheck.startChat(targetMsg.flags.Pendragon);
    await targetMsg.update({ content: pushhtml });
  }

  // update a card
  // damage formulas that depend on the opposing action (e.g. set spear) are
  // pre-calculated in CombatAction.adjustDamage before results are compared,
  // so mapping here only converts actions, suppresses damage and adds notes
  static mapOutcomeToCard(card, myResult, otherResult, otherAction) {
    const updatedCard = { ...card };
    this.applyBaseOutcome(updatedCard, myResult, otherResult, otherAction);
    this.convertSetSpear(updatedCard, otherAction);
    this.applyDodgeOutcome(updatedCard, myResult);
    this.applyEvadeOutcome(updatedCard, myResult);
    this.applyDisarmOutcome(updatedCard, myResult);
    this.applySetSpearOutcome(updatedCard, myResult, otherAction);
    this.applyDisarmedOutcome(updatedCard, otherResult, otherAction);
    this.applyEvadedOutcome(updatedCard, otherResult, otherAction);
    this.applyDodgedOutcome(updatedCard, otherResult, otherAction);
    this.applyShieldOutcome(updatedCard, myResult, otherResult, otherAction);
    this.applyKnockdownOutcome(updatedCard, myResult, otherResult);
    return updatedCard;
  }

  // shared win/loss bookkeeping: damage flags, shield use, outcome labels
  static applyBaseOutcome(card, myResult, otherResult, otherAction) {
    // reckless and defend cancel each other out and are treated like opposed attack
    if (
      (card.action == CombatAction.RECKLESS && otherAction == CombatAction.DEFEND) ||
      (card.action == CombatAction.DEFEND && otherAction == CombatAction.RECKLESS)
    ) {
      card.action = CombatAction.ATTACK;
      otherAction = CombatAction.ATTACK;
    }
    card.outcome = myResult;
    card.outcomeLabel = game.i18n.localize(`PEN.comRoll${myResult}`);
    // assume no damage
    card.damRoll = false;
    card.damCrit = false;
    // assume no shield/parry
    card.damShield = false;

    if (this.canInflictDamage(card.action)) {
      // inflict damage on a win or tie
      if ([CombatOutcome.WIN, CombatOutcome.TIE].includes(myResult)) {
        card.damRoll = true;
      }

      // inflict critical damage on a critical
      if (myResult == CombatOutcome.CRITICAL) {
        card.damRoll = true;
        card.damCrit = true;
      }

      // defend ignores damage on win or tie
      if (
        otherAction == CombatAction.DEFEND &&
        [CombatOutcome.TIE, CombatOutcome.WIN, CombatOutcome.CRITICAL].includes(otherResult)
      ) {
        card.damRoll = false;
        card.damCrit = false;
        card.outcomeNote = "Opponent does not take damage.";
      }

      // mount ignores damage on win
      if (otherAction == CombatAction.MOUNT && [CombatOutcome.WIN, CombatOutcome.CRITICAL].includes(otherResult)) {
        card.damRoll = false;
        card.damCrit = false;
      }
    }
  }

  // disarm on a win/crit: the loser drops their weapon or object
  static applyDisarmOutcome(card, myResult) {
    if (card.action == CombatAction.DISARM) {
      if (myResult == CombatOutcome.CRITICAL) {
        card.damRoll = false;
        card.damCrit = false;
        card.damShield = false;
        card.outcomeNote = game.i18n.localize("PEN.actionNote.disarmCritical");
      } else if (myResult == CombatOutcome.WIN) {
        card.damRoll = false;
        card.damCrit = false;
        card.damShield = false;
        card.outcomeNote = game.i18n.localize("PEN.actionNote.disarmWin");
      }
    }
  }

  // set spear that is not answered by a charge counts as a simple attack
  static convertSetSpear(card, otherAction) {
    if (card.action == CombatAction.SET_SPEAR && otherAction != CombatAction.CHARGE) {
      card.action = CombatAction.ATTACK;
    }
  }

  // set spear vs charge on a win/crit strikes with the charger's own damage
  // (pre-calculated in CombatAction.adjustDamage); excess past a horse kill
  // is suffered by the rider
  static applySetSpearOutcome(card, myResult, otherAction) {
    if (card.action == CombatAction.SET_SPEAR && otherAction == CombatAction.CHARGE) {
      if ([CombatOutcome.CRITICAL, CombatOutcome.WIN].includes(myResult)) {
        card.outcomeNote = game.i18n.localize("PEN.actionNote.setSpearHit");
      }
    }
  }

  // dodge: a reckless throw to the side vs melee attacks only, unmounted only;
  // on a crit/win/tie neither side takes nor deals damage
  static applyDodgeOutcome(card, myResult) {
    if (card.action != CombatAction.DODGE) return;
    if (myResult == CombatOutcome.CRITICAL) {
      this.suppressDamage(card);
      card.outcomeNote = game.i18n.localize("PEN.actionNote.dodgeCritical");
    } else if ([CombatOutcome.WIN, CombatOutcome.TIE].includes(myResult)) {
      this.suppressDamage(card);
      card.outcomeNote = game.i18n.localize("PEN.actionNote.dodgeWin");
    } else if (myResult == CombatOutcome.LOSE) {
      card.outcomeNote = game.i18n.localize("PEN.actionNote.dodgeLose");
    } else if (myResult === CombatOutcome.FUMBLE) {
      card.outcomeNote = game.i18n.localize("PEN.actionNote.dodgeFumble");
    }
  }

  // evade: disengagement from melee combat; on a win/crit the character
  // deals and takes no damage and is no longer engaged
  static applyEvadeOutcome(card, myResult) {
    if (card.action != CombatAction.EVADE) return;
    if ([CombatOutcome.CRITICAL, CombatOutcome.WIN].includes(myResult)) {
      this.suppressDamage(card);
      card.outcomeNote = game.i18n.localize("PEN.actionNote.evadeWin");
    } else if (myResult === CombatOutcome.FUMBLE) {
      card.outcomeNote = game.i18n.localize("PEN.actionNote.evadeFumble");
    }
  }

  // neither side rolls damage: no damage dealt, no crit, no shield use
  static suppressDamage(card) {
    card.damRoll = false;
    card.damCrit = false;
    card.damShield = false;
  }

  // knocked down while losing: the loser starts prone next round
  static applyKnockdownOutcome(card, myResult, otherResult) {
    if (
      card.knockdown &&
      [CombatOutcome.LOSE, CombatOutcome.FUMBLE].includes(myResult) &&
      ![CombatOutcome.CRITICAL, CombatOutcome.WIN, CombatOutcome.TIE].includes(otherResult)
    ) {
      card.outcomeNote = game.i18n.localize("PEN.actionNote.knockedDown");
    }
  }

  // being disarmed by the opponent
  // (no note - the disarmer's own card already says this)
  static applyDisarmedOutcome(card, otherResult, otherAction) {
    if (otherAction == CombatAction.DISARM && [CombatOutcome.WIN, CombatOutcome.CRITICAL].includes(otherResult)) {
      card.damRoll = false;
      card.damCrit = false;
      card.damShield = false;
    }
  }

  // the opponent evaded: they disengage and no damage is dealt either way
  // (no note - the evader's own card already says this)
  static applyEvadedOutcome(card, otherResult, otherAction) {
    if (otherAction == CombatAction.EVADE && [CombatOutcome.WIN, CombatOutcome.CRITICAL].includes(otherResult)) {
      card.damRoll = false;
      card.damCrit = false;
    }
  }

  // the opponent dodged: the attack misses
  // (no note - the dodger's own card already says this)
  static applyDodgedOutcome(card, otherResult, otherAction) {
    if (
      otherAction == CombatAction.DODGE &&
      [CombatOutcome.WIN, CombatOutcome.CRITICAL, CombatOutcome.TIE].includes(otherResult)
    ) {
      card.damRoll = false;
      card.damCrit = false;
    }
  }

  // check for shield/parry vs a damaging action
  static applyShieldOutcome(card, myResult, otherResult, otherAction) {
    if (
      this.canInflictDamage(otherAction) &&
      [CombatOutcome.WIN, CombatOutcome.TIE, CombatOutcome.CRITICAL].includes(otherResult)
    ) {
      // by default you get benefit of shield/parry on a partial or better
      if ([CombatOutcome.WIN, CombatOutcome.TIE, CombatOutcome.CRITICAL, CombatOutcome.PARTIAL].includes(myResult)) {
        card.damShield = true;
      }

      // denied if either party used a reckless attack
      if (card.action == CombatAction.RECKLESS || otherAction == CombatAction.RECKLESS) {
        card.damShield = false;
        card.outcomeNote = "Reckless attacks prevent the use of shields.";
      }

      // denied if mounting up
      if (card.action == CombatAction.MOUNT) {
        card.damShield = false;
        card.outcomeNote = "You may not use a shield when mounting.";
      }
    }

    // check for weapon breakage
    //  will weapon break / be dropped?
    // if TIE, swords break most weapons; swords and daggers immune
    // if CRITICAL vs FUMBLE, loser's weapon breaks (even if sword)
    // otherwise, FUMBLE means sword dropped or weapon breaks
  }

  // check whether the action inflicts damage
  static canInflictDamage(action) {
    // opposed actions that don't roll damage on win:
    // defend, disarm, dodge, evade, hook, mount, pickup
    const nonDamagingActions = [
      CombatAction.DEFEND,
      CombatAction.DISARM,
      CombatAction.DODGE,
      CombatAction.EVADE,
      CombatAction.HOOK,
      CombatAction.MOUNT,
      CombatAction.PICKUP,
    ];
    if (nonDamagingActions.includes(action)) return false;
    return true;
  }

  static compareCombatResults(p1, p2) {
    // work around fact JS can't use tuple for case statement
    const k = (result1, result2) => `${result1}_${result2}`;
    switch (k(p1.resultLevel, p2.resultLevel)) {
      case k(RollResult.CRITICAL, RollResult.CRITICAL):
        return [CombatOutcome.TIE, CombatOutcome.TIE];
      case k(RollResult.CRITICAL, RollResult.SUCCESS):
        return [CombatOutcome.CRITICAL, CombatOutcome.PARTIAL];
      case k(RollResult.CRITICAL, RollResult.FAIL):
        return [CombatOutcome.CRITICAL, CombatOutcome.LOSE];
      case k(RollResult.CRITICAL, RollResult.FUMBLE):
        return [CombatOutcome.CRITICAL, CombatOutcome.FUMBLE];
      case k(RollResult.SUCCESS, RollResult.CRITICAL):
        return [CombatOutcome.PARTIAL, CombatOutcome.CRITICAL];
      // if both succeed, compare the rolls
      case k(RollResult.SUCCESS, RollResult.SUCCESS):
        if (p1.rollVal === p2.rollVal) {
          return [CombatOutcome.TIE, CombatOutcome.TIE];
        } else if (p1.rollVal > p2.rollVal) {
          return [CombatOutcome.WIN, CombatOutcome.PARTIAL];
        } else {
          return [CombatOutcome.PARTIAL, CombatOutcome.WIN];
        }
      case k(RollResult.SUCCESS, RollResult.FAIL):
        return [CombatOutcome.WIN, CombatOutcome.LOSE];
      case k(RollResult.SUCCESS, RollResult.FUMBLE):
        return [CombatOutcome.WIN, CombatOutcome.FUMBLE];

      case k(RollResult.FAIL, RollResult.CRITICAL):
        return [CombatOutcome.LOSE, CombatOutcome.CRITICAL];
      case k(RollResult.FAIL, RollResult.SUCCESS):
        return [CombatOutcome.LOSE, CombatOutcome.WIN];
      case k(RollResult.FAIL, RollResult.FAIL):
        return [CombatOutcome.LOSE, CombatOutcome.LOSE];
      case k(RollResult.FAIL, RollResult.FUMBLE):
        return [CombatOutcome.LOSE, CombatOutcome.FUMBLE];

      case k(RollResult.FUMBLE, RollResult.CRITICAL):
        return [CombatOutcome.FUMBLE, CombatOutcome.CRITICAL];
      case k(RollResult.FUMBLE, RollResult.SUCCESS):
        return [CombatOutcome.FUMBLE, CombatOutcome.WIN];
      case k(RollResult.FUMBLE, RollResult.FAIL):
        return [CombatOutcome.FUMBLE, CombatOutcome.LOSE];
      case k(RollResult.FUMBLE, RollResult.FUMBLE):
        return [CombatOutcome.FUMBLE, CombatOutcome.FUMBLE];
    }
  }

  //Generate Damage Roll off the Combat Roll Damage Button
  static async combatDamageRoll(config) {
    let targetMsg = await game.messages.get(config.targetChatId);
    let rank = config.dataset.rank;

    //Turn off the DamageRoll button for the clicked button and update the existing chat message so the button disappears to prevent multiple rerolls
    const chatCards = targetMsg.flags.Pendragon.chatCard;
    chatCards[rank].damRoll = false;
    const newChatCards = [];
    for (let cCard of chatCards) {
      newChatCards.push(cCard);
    }
    await targetMsg.update({
      "flags.Pendragon.chatCard": newChatCards,
    });
    const pushhtml = await PENCheck.startChat(targetMsg.flags.Pendragon);
    await targetMsg.update({ content: pushhtml });

    //Prep the damage roll with details from combat roll
    let actor = null;
    let token = null;
    if (targetMsg.flags.Pendragon.chatCard[rank].particType === "actor") {
      actor = await PENactorDetails._getParticipant(
        targetMsg.flags.Pendragon.chatCard[rank].particId,
        targetMsg.flags.Pendragon.chatCard[rank].particType,
      );
    } else if (targetMsg.flags.Pendragon.chatCard[rank].particType === "token") {
      token = await PENactorDetails._getParticipant(
        targetMsg.flags.Pendragon.chatCard[rank].particId,
        targetMsg.flags.Pendragon.chatCard[rank].particType,
      );
    } else {
      return;
    }

    await PENCheck._trigger({
      rollType: "DM",
      cardType: "NO",
      shiftKey: true,
      damCrit: chatCards[rank].damCrit,
      itemId: chatCards[rank].itemId,
      damMod: chatCards[rank].damMod,
      // if set (v2 actions) can simply use already-calculated value
      itemDamage: chatCards[rank].itemDamage,
      action: chatCards[rank].action,
      actor: actor,
      token: token,
    });
    return;
  }
}
