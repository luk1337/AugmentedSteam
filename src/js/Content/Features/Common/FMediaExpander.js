import {HTML, LocalStorage, Localization, TimeUtils} from "../../../modulesCore";
import {ContextType, Feature} from "../../modulesContent";
import {Page} from "../Page";

export default class FMediaExpander extends Feature {

    checkPrerequisites() {
        this._details = document.querySelector("#game_highlights .rightcol, .workshop_item_header .col_right");
        return this._details !== null;
    }

    apply() {
        HTML.beforeEnd("#highlight_player_area",
            `<div class="es_slider_toggle btnv6_blue_hoverfade btn_medium">
                <div data-tooltip-text="${Localization.str.expand_slider}" class="es_slider_expand"><i class="es_slider_toggle_icon"></i></div>
                <div data-tooltip-text="${Localization.str.contract_slider}" class="es_slider_contract"><i class="es_slider_toggle_icon"></i></div>
            </div>`);

        this._details.classList.add("as-side-details");

        this._sliderToggle = document.querySelector(".es_slider_toggle");
        this._sliderToggle.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();

            this._toggleView();
        });

        const expandSlider = LocalStorage.get("expand_slider", false);
        if (expandSlider) {
            this._toggleView();

            /*for (const node of document.querySelectorAll(".es_side_details_wrap, .es_side_details")) {

                // shrunk => expanded
                node.style.display = null;
                node.style.opacity = 1;
            }

            // Triggers the adjustment of the slider scroll bar
            TimeUtils.timer(250).then(() => {
                window.dispatchEvent(new Event("resize"));
            });*/
        }

        /*
         * Prevent the slider toggle from overlapping a sketchfab model's "X"
         * Example: https://steamcommunity.com/sharedfiles/filedetails/?id=606009216
         */
        const sketchfabNode = document.querySelector(".highlight_sketchfab_model");
        if (sketchfabNode) {
            const container = document.getElementById("highlight_player_area");
            container.addEventListener("mouseenter", () => {
                if (sketchfabNode.style.display === "none") { return; }
                this._sliderToggle.style.top = "32px";
            });
            container.addEventListener("mouseleave", () => {
                this._sliderToggle.style.top = null;
            });
        }
    }

    _buildSideDetails() {
        if (this._detailsBuilt) { return; }
        this._detailsBuilt = true;

        const details = this._details;

        if (details.matches(".rightcol")) {

            // Clone details on a store page
            let detailsClone = details.querySelector(".glance_ctn");
            if (!detailsClone) { return; }
            detailsClone = detailsClone.cloneNode(true);
            detailsClone.classList.add("es_side_details", "block", "responsive_apppage_details_left");

            const detailsWrap = HTML.wrap('<div class="es_side_details_wrap"></div>', detailsClone);
            const target = document.querySelector("div.rightcol.game_meta_data");
            if (target) {
                target.insertAdjacentElement("afterbegin", detailsWrap);
            }
        } else {

            // Clone details in the workshop
            const detailsClone = details.cloneNode(true);
            detailsClone.classList.add("panel", "es_side_details");
            HTML.afterBegin(detailsClone, `<div class="title">${Localization.str.details}</div><div class="hr padded"></div>`);
            let target = document.querySelector(".sidebar");
            if (target) {
                target.insertAdjacentElement("afterbegin", detailsClone);
            }

            // Sometimes for a split second the slider pushes the details down, this fixes it
            target = document.querySelector(".highlight_ctn");
            if (target) {
                HTML.wrap('<div class="leftcol"></div>', target);
            }
        }
    }

    _toggleView() {

        const expand = !this._sliderToggle.classList.contains("es_expanded");

        LocalStorage.set("expand_slider", expand);

        for (const node of document.querySelectorAll(
            ".es_slider_toggle, #game_highlights, .workshop_item_header, .as-side-details"
        )) {
            node.classList.toggle("es_expanded", expand);
        }

        this._details.addEventListener("transitionend", () => {

            if (this.context.type === ContextType.APP) {
                this._handleApp(expand);
            } else if (this.context.type === ContextType.SHARED_FILES) {
                this._handleWorkshop(expand);
            }

            /*
             * Triggers the adjustment of the slider scroll bar.
             * https://github.com/SteamDatabase/SteamTracking/blob/ad4e85261f2322eae0b0125e46d7d753bf755730/store.steampowered.com/public/javascript/gamehighlightplayer.js#L101
             */
            Page.runInPageContext(() => { window.SteamFacade.jqTrigger(window, "resize.GameHighlightPlayer"); });

            this._details.style.opacity = null;
        }, {"once": true});

        this._details.style.opacity = 0;
    }

    _handleApp(expand) {
        const clsList = this._details.classList;
        clsList.toggle("block", expand);
        clsList.toggle("responsive_apppage_details_left", expand);
        clsList.toggle("rightcol", !expand);

        if (expand) {
            document.querySelector(".rightcol.game_meta_data").insertAdjacentElement("afterbegin", this._details);
        } else {
            document.getElementById("game_highlights").insertAdjacentElement("afterbegin", this._details);
        }

        Page.runInPageContext(() => { window.SteamFacade.adjustVisibleAppTags(".popular_tags"); });
    }

    _handleWorkshop(expand) {}
}
