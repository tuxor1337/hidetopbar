//
// Hides the Gnome "top bar" except in overview mode.
// https://extensions.gnome.org/extension/545/hide-top-bar/
// https://github.com/mlutfy/hidetopbar
//
// See README for more information.
//

const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Lang = imports.lang;
const Settings = imports.misc.extensionUtils.getCurrentExtension()
                    .imports.convenience.getSettings();
                    
const PANEL_BOX = Main.panel.actor.get_parent();
const PANEL_HEIGHT = PANEL_BOX.get_height();
const ANIMATION_TIME_OVERVIEW = 0.4;
const ANIMATION_TIME_AUTOHIDE = 0.2;

let _showEvent = 0;
let _hideEvent = 0;
let _stgsEvent = 0;
let _stgsEvent2 = 0;
let _enterEvent = 0;
let _leaveEvent = 0;
let _menuEvent = 0;
let _blockerMenu = 0;

function _hidePanel(animationTime) {
    let x = Number(Settings.get_boolean('hot-corner'))
    PANEL_BOX.height = x;
    Tweener.addTween(Main.panel.actor, {
        y: x-PANEL_HEIGHT,
        time: animationTime,
        transition: 'easeOutQuad'
    });
}

function _showPanel(animationTime) {
    Tweener.addTween(Main.panel.actor, {
        y: 0,
        time: animationTime,
        transition: 'easeOutQuad'
    });
    
    PANEL_BOX.height = PANEL_HEIGHT;
}

function _toggleMouseSensitive() {
    if(Settings.get_boolean('mouse-sensitive')) {
        _enterEvent = Main.panel.actor.connect('enter-event', function() {
            _showPanel(ANIMATION_TIME_AUTOHIDE); });
        _leaveEvent = Main.panel.actor.connect('leave-event', function tmpFct() { 
            if(!Main.overview.visible) {
                blocker = (Main.panel._menus || Main.panel.menuManager)._activeMenu
                if(blocker == null) {
                    _hidePanel(ANIMATION_TIME_AUTOHIDE);
                } else {
                    _blockerMenu = blocker
                    _menuEvent = _blockerMenu.connect('open-state-changed', function(menu, open){
                        if(!open) {
                            _blockerMenu.disconnect(_menuEvent);
                            _menuEvent = 0; _blockerMenu = 0;
                            tmpFct();
                        }
                    });
                }
            }
        });
    } else {
        if(_enterEvent) Main.panel.actor.disconnect(_enterEvent);
        if(_leaveEvent) Main.panel.actor.disconnect(_leaveEvent);
    }
}

function init() { }

function enable() {
    Main.layoutManager.removeChrome(PANEL_BOX);
    Main.layoutManager.addChrome(PANEL_BOX, { affectsStruts: false });
    
    _showEvent = Main.overview.connect('showing', function() { _showPanel(ANIMATION_TIME_OVERVIEW); });
    _hideEvent = Main.overview.connect('hiding', function() { _hidePanel(ANIMATION_TIME_OVERVIEW); });
    _stgsEvent = Settings.connect('changed::hot-corner', function() { _hidePanel(0.1); });
    
    _stgsEvent2 = Settings.connect('changed::mouse-sensitive', _toggleMouseSensitive);
    _toggleMouseSensitive();
    
    _hidePanel(0.1);
}

function disable() {
    Main.layoutManager.removeChrome(PANEL_BOX);
    Main.layoutManager.addChrome(PANEL_BOX, { affectsStruts: true});
    
    if(_showEvent) Main.overview.disconnect(_showEvent);
    if(_hideEvent) Main.overview.disconnect(_hideEvent);
    if(_stgsEvent) Settings.disconnect(_stgsEvent);
    if(_stgsEvent2) Settings.disconnect(_stgsEvent2);
    if(_enterEvent) Main.panel.actor.disconnect(_enterEvent);
    if(_leaveEvent) Main.panel.actor.disconnect(_leaveEvent);
    
    _showPanel(0.1);
}

