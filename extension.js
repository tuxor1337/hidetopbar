//
// Hides the Gnome "top bar" except in overview mode.
// https://extensions.gnome.org/extension/545/hide-top-bar/
// https://github.com/mlutfy/hidetopbar
//
// Based on Finnbarr P. Murphy's extension "autohidetopbar@fpmurphy.com"
// http://www.fpmurphy.com/gnome-shell-extensions/
//
// See README for more information.
//

const Main = imports.ui.main;
const Tweener = imports.ui.tweener;

const PANEL_HEIGHT = Main.panel.actor.get_height();
const ANIMATION_TIME = 0.2;

function HideTopPanel() {
    this._init();
}

HideTopPanel.prototype = {
    _init: function() {
        this._showEvent = 0;
        this._hideEvent = 0;
    },

    _hideTopPanel: function() {
        Main.panel.actor.set_height(1);

/* see: https://github.com/mlutfy/hidetopbar/pull/3#issuecomment-11931395
        Tweener.addTween(Main.panel.actor, {
            y: -PANEL_HEIGHT,
            time: ANIMATION_TIME + 0.2,
            transition: 'easeOutQuad',
            onComplete: function() {
                Main.panel.actor.height = 1;
                Main.panel.actor.y = 0;
            }
        });
*/

        let params = {
            y: 1,
            time: ANIMATION_TIME + 0.2,
            transition: 'easeOutQuad'
        };
 
        Tweener.addTween(Main.panel._leftCorner.actor, params);
        Tweener.addTween(Main.panel._rightCorner.actor, params);

        params = {
            opacity: 0,
            time: ANIMATION_TIME,
            transition: 'easeOutQuad'
        };

        Tweener.addTween(Main.panel._leftBox, params);
        Tweener.addTween(Main.panel._centerBox, params);
        Tweener.addTween(Main.panel._rightBox, params);
    },

    _showTopPanel: function() {
        Main.panel.actor.set_height(PANEL_HEIGHT);
/*
        Main.panel.actor.y = -PANEL_HEIGHT;
        Main.panel.actor.height = PANEL_HEIGHT;
        Tweener.addTween(Main.panel.actor, { 
            y: 0,
            time: ANIMATION_TIME,
            transition: 'easeOutQuad'
        });
*/

        let params = {
            y: PANEL_HEIGHT - 1,
            time: ANIMATION_TIME + 0.4,
            transition: 'easeOutQuad'
        };

        Tweener.addTween(Main.panel._leftCorner.actor, params);
        Tweener.addTween(Main.panel._rightCorner.actor, params);

        params = {
            opacity: 255,
            time: ANIMATION_TIME + 0.5,
            transition: 'easeOutQuad'
        };

        Tweener.addTween(Main.panel._leftBox, params);
        Tweener.addTween(Main.panel._centerBox, params);
        Tweener.addTween(Main.panel._rightBox, params);

        Main.overview._relayout();
    },

    enable: function() {
        this._showEvent = Main.overview.connect('showing', this._showTopPanel);
        this._hideEvent = Main.overview.connect('hiding', this._hideTopPanel);

        this._hideTopPanel();
    },

    disable: function() {
        if (this._showEvent) {
            Main.overview.disconnect(this._showEvent);
        }

        if (this._hideEvent) {
            Main.overview.disconnect(this._hideEvent);
        }

        this._showTopPanel();
    }
};

function init() {
    return new HideTopPanel();
}

