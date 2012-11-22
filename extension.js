//
// Hides Gnome's topbar except in overview mode.
// http://www.bidon.ca
//
// Based on Finnbarr P. Murphy's extension "autohidetopbar@fpmurphy.com"
// http://www.fpmurphy.com/gnome-shell-extensions/
//

const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;

let text, button;

// change these to suit your own tastes and your system
const PANEL_HEIGHT = 25;
const AUTOHIDE_ANIMATION_TIME = 0.2;
const TIME_DELTA = 1500;

function _hideTopPanel() {
    Tweener.addTween(Main.panel.actor,
                    { height: 1,
                       time: AUTOHIDE_ANIMATION_TIME,
                       transition: 'easeOutQuad'
                     });

    let params = { y: 0,
                   time: AUTOHIDE_ANIMATION_TIME,
                   transition: 'easeOutQuad'
                 };

    Tweener.addTween(Main.panel._leftCorner.actor, params);
    Tweener.addTween(Main.panel._rightCorner.actor, params);

    params = { opacity: 0,
               time: AUTOHIDE_ANIMATION_TIME - 0.1,
               transition: 'easeOutQuad'
             };

    Tweener.addTween(Main.panel._leftBox, params);
    Tweener.addTween(Main.panel._centerBox, params);
    Tweener.addTween(Main.panel._rightBox, params);
}

function _showTopPanel() {
    let params = { y: PANEL_HEIGHT - 1,
                   time: AUTOHIDE_ANIMATION_TIME + 0.1,
                   transition: 'easeOutQuad'
                 };

    Tweener.addTween(Main.panel._leftCorner.actor, params);
    Tweener.addTween(Main.panel._rightCorner.actor, params);

    Tweener.addTween(Main.panel.actor,
                 { height: PANEL_HEIGHT,
                   time: AUTOHIDE_ANIMATION_TIME,
                   transition: 'easeOutQuad'
                 });

    params = { opacity: 255,
               time: AUTOHIDE_ANIMATION_TIME+0.2,
               transition: 'easeOutQuad'
             };

    Tweener.addTween(Main.panel._leftBox, params);
    Tweener.addTween(Main.panel._centerBox, params);
    Tweener.addTween(Main.panel._rightBox, params);
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

