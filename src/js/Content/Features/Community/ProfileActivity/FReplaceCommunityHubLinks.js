import {SyncedStorage} from "../../../../modulesCore";
import {CallbackFeature} from "../../../modulesContent";

export default class FReplaceCommunityHubLinks extends CallbackFeature {

    checkPrerequisites() {
        return SyncedStorage.get("replacecommunityhublinks");
    }

    setup() {
        this.callback();
    }

    callback(parent = document) {

        // Don't replace user-provided links i.e. links in announcements/comments
        const nodes = parent.querySelectorAll(".blotter_block a:not(.bb_link)");

        for (const node of nodes) {
            if (!node.hasAttribute("href")) { continue; }
            node.href = node.href.replace(/steamcommunity\.com\/(?:app|games)/, "store.steampowered.com/app");
        }
    }
}
