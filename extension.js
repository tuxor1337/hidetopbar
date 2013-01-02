//
// Hides Gnome's topbar except in overview mode.
// https://github.com/mlutfy/hidetopbar
// http://www.bidon.ca
//
// Based on Finnbarr P. Murphy's extension "autohidetopbar@fpmurphy.com"
// http://www.fpmurphy.com/gnome-shell-extensions/
//

const Main = imports.ui.main;
const Tweener = imports.ui.tweener;

let PANEL_HEIGHT = 25;
const AUTOHIDE_TIME = 0.2;

function _hideTopPanel() {
    Main.panel.actor.set_height(1);
    Main.panel._leftCorner.actor.set_y(0);
    Main.panel._rightCorner.actor.set_y(0);

    Main.panel._leftBox.set_opacity(0);
    Main.panel._centerBox.hide();
    Main.panel._rightBox.hide();
}

function _showTopPanel() {
    Tweener.addTween(Main.panel.actor, {
        height: PANEL_HEIGHT,
        time: AUTOHIDE_TIME,
        transition: 'easeOutQuad',
        onComplete: function() {
            Main.panel._centerBox.show();
            Main.panel._centerBox.set_opacity(0);

            Main.panel._rightBox.show();
            Main.panel._rightBox.set_opacity(0);

            let boxParams = {
                opacity: 255,
                time: 0.2,
                transition: 'easeOutQuad'
            };

            Tweener.addTween(Main.panel._leftBox, boxParams);
            Tweener.addTween(Main.panel._centerBox, boxParams);
            Tweener.addTween(Main.panel._rightBox, boxParams);
        }
    });

    let params = {
        y: PANEL_HEIGHT - 1,
        time: AUTOHIDE_TIME,
        transition: 'easeOutQuad'
    };

    Tweener.addTween(Main.panel._leftCorner.actor, params);
    Tweener.addTween(Main.panel._rightCorner.actor, params);
}

function init() {
}

function enable() {
    _hideTopPanel();

    Main.overview.connect('shown', _showTopPanel);
    Main.overview.connect('hiding', _hideTopPanel);
}

function disable() {
    _showTopPanel();

    Main.overview.disconnect(_showTopPanel);
    Main.overview.disconnect(_hideTopPanel);
}

