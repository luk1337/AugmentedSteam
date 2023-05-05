import {HTML, Localization, SyncedStorage, TimeUtils} from "../../../../modulesCore";
import {Background, Feature, Messenger, Sortbox, User} from "../../../modulesContent";
import {Page} from "../../Page";

export default class FReviewSort extends Feature {

    checkPrerequisites() {
        return document.querySelectorAll(".review_box").length > 1;
    }

    apply() {

        const pagingInfo = document.querySelector(".workshopBrowsePagingInfo").textContent;
        this._numReviews = Math.max(...pagingInfo.replace(/,/g, "").match(/\d+/g));
        this._path = window.location.pathname.match(/\/((?:id|profiles)\/.+?)\//)[1];

        this._curPage = new URLSearchParams(window.location.search).get("p") || 1;
        this._pageCount = 10;

        Messenger.addMessageListener("updateReview", id => {
            Background.action("updatereviewnode", this._path, document.querySelector(`[id$="${id}"`).closest(".review_box").outerHTML, this._numReviews)
                .then(() => { this._getReviews(); });
        });

        Page.runInPageContext(() => {
            window.SteamFacade.jq(document).ajaxSuccess((event, xhr, {url}) => {
                const pathname = new URL(url).pathname;
                if (pathname.startsWith("/userreviews/rate/")
                    || pathname.startsWith("/userreviews/votetag/")
                    || pathname.startsWith("/userreviews/update/")) {

                    const id = pathname.split("/").pop();
                    window.Messenger.postMessage("updateReview", id);
                }
            });
        });

        document.querySelector("#leftContents > h1").before(Sortbox.get(
            "reviews",
            [
                ["default", Localization.str.date],
                ["rating", Localization.str.rating],
                ["helpful", Localization.str.helpful],
                ["funny", Localization.str.funny],
                ["length", Localization.str.length],
                ["visibility", Localization.str.visibility],
                ["playtime", Localization.str.playtime],
                ["awards", Localization.str.awards],
            ],
            SyncedStorage.get("sortreviewsby"),
            (sortBy, reversed) => { this._sortReviews(sortBy, reversed); },
            "sortreviewsby"
        ));
    }

    async _sortReviews(sortBy, reversed) {

        if (!this._reviews) {
            await this._getReviews();
        }

        for (const node of document.querySelectorAll(".review_box, .review_developer_response_container")) {
            node.remove();
        }

        let displayedReviews = this._reviews.slice().sort((a, b) => {
            switch (sortBy) {
                case "rating":
                case "helpful":
                case "funny":
                case "length":
                case "visibility":
                case "playtime":
                case "awards":
                    return b[sortBy] - a[sortBy];
                case "default":
                    return a[sortBy] - b[sortBy];
                default:
                    this.logError(
                        new Error("Invalid sorting criteria"),
                        "Can't sort reviews by criteria '%s'",
                        sortBy,
                    );
                    return 0;
            }
        });

        if (reversed) {
            displayedReviews.reverse();
        }

        displayedReviews = displayedReviews.slice(this._pageCount * (this._curPage - 1), this._pageCount * this._curPage);

        const footer = document.querySelector("#leftContents > .workshopBrowsePaging:last-child");
        for (const {node} of displayedReviews) {
            HTML.beforeBegin(footer, node);
        }

        // Add back sanitized event handlers
        const loggedIn = User.isSignedIn ? 1 : 0;
        const loginURL = encodeURIComponent(`https://steamcommunity.com/login/home/?goto=${this._path}/recommended/?insideModal=0`);
        const ids = displayedReviews.map(review => review.id);
        document.querySelectorAll(".review_box").forEach((node, i) => {
            const id = ids[i];

            for (const award of node.querySelectorAll(".review_award")) {
                // More button shows up after 3 awards
                if (award.classList.contains("more_btn")) {
                    award.setAttribute("onclick", "UserReview_ShowMoreAwards(this);");
                } else {
                    const selected = award.dataset.tooltipHtml.match(/animated\/(\d+)\.png/)[1];
                    award.setAttribute("onclick", `UserReview_Award(${loggedIn}, "${loginURL}", "${id}", OnUserReviewAward, ${selected});`);
                }
            }

            // Only exists when the requested profile is yours
            const containers = node.querySelectorAll(".dselect_container");

            if (containers.length > 0) {
                for (const container of containers) {
                    const type = container.id.startsWith("ReviewVisibility") ? "Visibility" : "Language";
                    const arg = `Review${type}${id}`;
                    const input = container.querySelector("input");
                    const trigger = container.querySelector(".trigger");
                    const selections = container.querySelectorAll(".dropcontainer a");

                    input.setAttribute("onchange", `OnReview${type}Change("${id}", "${arg}");`);

                    trigger.setAttribute("href", "javascript:DSelectNoop();"); // eslint-disable-line no-script-url
                    trigger.setAttribute("onfocus", `DSelectOnFocus("${arg}");`);
                    trigger.setAttribute("onblur", `DSelectOnBlur("${arg}");`);
                    trigger.setAttribute("onclick", `DSelectOnTriggerClick("${arg}");`);

                    selections.forEach((selection, selIndex) => {
                        selection.setAttribute("href", "javascript:DSelectNoop();"); // eslint-disable-line no-script-url
                        selection.setAttribute("onmouseover", `DHighlightItem("${arg}", ${selIndex}, false);`);
                        selection.setAttribute("onclick", `DHighlightItem("${arg}", ${selIndex}, true);`);
                    });
                }

            // Otherwise you have buttons to vote for and award the review
            } else {
                const [upvote, downvote, funny, award] = node.querySelectorAll(".control_block > .btn_small_thin");

                for (const btn of [upvote, downvote, funny]) {
                    btn.setAttribute("href", "javascript:void(0)"); // eslint-disable-line no-script-url
                }

                upvote.setAttribute("onclick", `UserReviewVoteUp(${loggedIn}, "${loginURL}", "${id}");`);
                downvote.setAttribute("onclick", `UserReviewVoteDown(${loggedIn}, "${loginURL}", "${id}");`);
                funny.setAttribute("onclick", `UserReviewVoteTag(${loggedIn}, "${loginURL}", "${id}");`);
                award.setAttribute("onclick", `UserReview_Award(${loggedIn}, "${loginURL}", "${id}", OnUserReviewAward);`);
            }
        });
    }

    async _getReviews() {

        Page.runInPageContext((processing, wait) => {
            window.SteamFacade.showBlockingWaitDialog(processing, wait);
        }, [Localization.str.processing, Localization.str.wait]);

        try {
            this._reviews = await Background.action("reviews", this._path, this._numReviews);
        } finally {

            // Delay half a second to avoid dialog flicker when grabbing cache
            await TimeUtils.timer(500);

            Page.runInPageContext(() => {
                window.SteamFacade.dismissActiveModal();
            });
        }
    }
}
