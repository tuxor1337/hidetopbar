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
const AUTOHIDE_TIME = 0.2;

function HideTopPanel() {
    this._init();
}

HideTopPanel.prototype = {
    _init: function() {
        this._shownEvent = 0;
        this._hidingEvent = 0;
    },

    _hideTopPanel: function() {
        Tweener.addTween(Main.panel.actor,
                     { y: -PANEL_HEIGHT,
                       time: AUTOHIDE_TIME+0.2,
                       transition: 'easeOutQuad',
                       onComplete: function() { Main.panel.actor.height=1; Main.panel.actor.y=0; }
                     });

        let params = { y: 1,
                       time: AUTOHIDE_TIME+0.2,
                       transition: 'easeOutQuad'
                     };
 
        Tweener.addTween(Main.panel._leftCorner.actor, params);
        Tweener.addTween(Main.panel._rightCorner.actor, params);

        params = { opacity: 0,
                   time: AUTOHIDE_TIME,
                   transition: 'easeOutQuad'
                 };

        Tweener.addTween(Main.panel._leftBox, params);
        Tweener.addTween(Main.panel._centerBox, params);
        Tweener.addTween(Main.panel._rightBox, params);
    },
    
    _showTopPanel: function() {
        Main.panel.actor.y=-PANEL_HEIGHT;
        Main.panel.actor.height=PANEL_HEIGHT;
        Tweener.addTween(Main.panel.actor, {
            y: 0,
            time: AUTOHIDE_TIME,
            transition: 'easeOutQuad'
        });

        let boxParams = {
            opacity: 255,
            time: AUTOHIDE_TIME + 0.2,
            transition: 'easeOutQuad'
        };

        Tweener.addTween(Main.panel._leftBox, boxParams);
        Tweener.addTween(Main.panel._centerBox, boxParams);
        Tweener.addTween(Main.panel._rightBox, boxParams);
    
        let params = {
            y: PANEL_HEIGHT - 1,
            time: AUTOHIDE_TIME,
            transition: 'easeOutQuad'
        };
    
        Tweener.addTween(Main.panel._leftCorner.actor, params);
        Tweener.addTween(Main.panel._rightCorner.actor, params);
        
        Main.overview._relayout();
    },
    
    enable: function() {
        this._hideTopPanel();
    
        this._shownEvent = Main.overview.connect('showing', this._showTopPanel);
        this._hidingEvent = Main.overview.connect('hiding', this._hideTopPanel);
    },
    
    disable: function() {
        this._showTopPanel();

        if (this._shownEvent) {
            Main.overview.disconnect(this._shownEvent);
        }

        if (this._hidingEvent) {
            Main.overview.disconnect(this._hidingEvent);
        }
    }
}

function init() {
    return new HideTopPanel();
}

