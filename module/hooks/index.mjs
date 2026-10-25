//import * as RenderItemSheet from "./render-item-sheet-v2.mjs";
//import * as RenderActorSheetV2 from "./render-actor-sheet-v2.mjs";
import * as UpdateActor from "./update-actor.mjs";
import * as RenderDialog from "./render-dialog.mjs";
import * as RenderChatMessage from "../setup/chat-messages.mjs";
import * as Init from "./init.mjs";

export const PendragonHooks = {
  listen() {
    Init.listen();
    //RenderActorSheet.listen();
    UpdateActor.listen();
    //RenderItemSheet.listen();
    RenderDialog.listen();
    RenderChatMessage.listen();
  },
};
