//
// Hides the Gnome "top bar" except in overview mode.
// https://extensions.gnome.org/extension/545/hide-top-bar/
// https://github.com/mlutfy/hidetopbar
//
// See README for more information.
//

const Main = imports.ui.main;
const Layout = imports.ui.layout;
const Meta = imports.gi.Meta;
const Tweener = imports.ui.tweener;
const Settings = imports.misc.extensionUtils.getCurrentExtension()
                    .imports.convenience.getSettings();
                    
const PANEL_ACTOR = Main.panel.actor;
const PANEL_BOX = PANEL_ACTOR.get_parent();

let _panelHeight = PANEL_ACTOR.get_height();

let _showEvent = 0;
let _hideEvent = 0;

let _stgsEventAnim = 0;
let _stgsEventAnim2 = 0;
let _stgsEventHotCorner = 0;
let _stgsEventSensitive = 0;
let _stgsEventOverv = 0;
let _stgsEventPressTime = 0;
let _stgsEventPressThresh = 0;

let _leaveEvent = 0;
let _menuEvent = 0;
let _blockerMenu = 0;

let _panelPressure = 0;
let _panelBarrier = 0;

let _settingsHotCorner = Settings.get_boolean('hot-corner');
let _settingsMouseSensitive = Settings.get_boolean('mouse-sensitive');
let _settingsShowOverview = Settings.get_boolean('mouse-triggers-overview');
let _settingsAnimTimeOverv = Settings.get_double('animation-time-overview');
let _settingsAnimTimeAutoh = Settings.get_double('animation-time-autohide');

function _hidePanel(animationTime, trigger) {
    _panelHeight = PANEL_ACTOR.get_height();
    
    if(global.get_pointer()[1] < _panelHeight && trigger == "mouse-left") {
        return;
    }
    
    let x = Number(_settingsHotCorner);
    PANEL_BOX.height = x;
    
    Tweener.addTween(PANEL_BOX, {
        y: x - _panelHeight,
        time: animationTime,
        transition: 'easeOutQuad',
        onComplete: function() { PANEL_ACTOR.set_opacity(x*255); }
    });
}

function _showPanel(animationTime, trigger) {
    if(trigger == "mouse-enter" && _settingsShowOverview)
        Main.overview.show();
    if(PANEL_BOX.y > 1-_panelHeight) return;
    PANEL_BOX.height = _panelHeight;
    PANEL_ACTOR.set_opacity(255);
    
    Tweener.addTween(PANEL_BOX, {
        y: 0,
        time: animationTime,
        transition: 'easeOutQuad'
    });
}

function _handleMenus() {
    if(!Main.overview.visible) {
        let blocker = Main.panel.menuManager.activeMenu;
        if(blocker == null) {
            _hidePanel(_settingsAnimTimeAutoh, "mouse-left");
        } else {
            _blockerMenu = blocker;
            _menuEvent = _blockerMenu.connect('open-state-changed', function(menu, open){
                if(!open) {
                    _blockerMenu.disconnect(_menuEvent);
                    _menuEvent = 0; _blockerMenu = 0;
                    _handleMenus();
                }
            });
        }
    }
}

function _updateMouseSensitive() {
    _settingsMouseSensitive = Settings.get_boolean('mouse-sensitive');
    if(_settingsMouseSensitive) {
        _disable_mouse_sensitive();
        _leaveEvent = PANEL_ACTOR.connect('leave-event', _handleMenus);
        _initPressureBarrier();
    } else _disable_mouse_sensitive();
}

function _disable_mouse_sensitive() {
    if(_panelBarrier && _panelPressure) {
            _panelPressure.removeBarrier(_panelBarrier);
            _panelBarrier.destroy();
    }
    if(_leaveEvent) PANEL_ACTOR.disconnect(_leaveEvent);
}

function _initPressureBarrier() {
    _panelPressure = new Layout.PressureBarrier(
        Settings.get_int('pressure-threshold'),
        Settings.get_int('pressure-timeout'), 
        imports.gi.Shell.KeyBindingMode.NORMAL
    );
    _panelPressure.setEventFilter(function(event) {
        if (event.grabbed && Main.modalCount == 0)
            return true;
        return false;
    });
    _panelPressure.connect('trigger', function(barrier) {
        if (Main.layoutManager.primaryMonitor.inFullscreen)
            return;
        _showPanel(_settingsAnimTimeAutoh, "mouse-enter");
    });
    let monitor = Main.layoutManager.primaryMonitor;
    _panelBarrier = new Meta.Barrier({ display: global.display,
                           x1: monitor.x, x2: monitor.x + monitor.width,
                           y1: monitor.y, y2: monitor.y,
                           directions: Meta.BarrierDirection.POSITIVE_Y });
    _panelPressure.addBarrier(_panelBarrier);
}

function _setup_settings_handler() {
    _stgsEventAnim = Settings.connect('changed::animation-time-overview',
        function() { 
            _settingsAnimTimeOverv = Settings.get_double('animation-time-overview');
    });
    _stgsEventAnim2 = Settings.connect('changed::animation-time-autohide',
        function() { 
            _settingsAnimTimeAutoh = Settings.get_double('animation-time-autohide');
    });
    _stgsEventOverv = Settings.connect('changed::mouse-triggers-overview',
        function() { 
            _settingsShowOverview = Settings.get_boolean('mouse-triggers-overview');
    });
    _stgsEventHotCorner = Settings.connect('changed::hot-corner', function() { 
        _settingsHotCorner = Settings.get_boolean('hot-corner');
        _hidePanel(0.1);
    });
    _stgsEventPressTime = Settings.connect('changed::pressure-timeout', _updateMouseSensitive);
    _stgsEventPressThresh = Settings.connect('changed::pressure-threshold', _updateMouseSensitive);
    _stgsEventSensitive = Settings.connect('changed::mouse-sensitive', _updateMouseSensitive);
}

function _disconnect_settings_handler() {
    if(_stgsEventAnim) Settings.disconnect(_stgsEventAnim);
    if(_stgsEventAnim2) Settings.disconnect(_stgsEventAnim2);
    if(_stgsEventOverv) Settings.disconnect(_stgsEventOverv);
    if(_stgsEventHotCorner) Settings.disconnect(_stgsEventHotCorner);
    if(_stgsEventPressThresh) Settings.disconnect(_stgsEventPressThresh);
    if(_stgsEventPressTime) Settings.disconnect(_stgsEventPressTime);
    if(_stgsEventSensitive) Settings.disconnect(_stgsEventSensitive);
}

function init() { }

function enable() {    
    Main.layoutManager.removeChrome(PANEL_BOX);
    Main.layoutManager.addChrome(PANEL_BOX, { affectsStruts: false, trackFullscreen: true });
    
    _showEvent = Main.overview.connect('showing', function() {
        _showPanel(_settingsAnimTimeOverv);
    });
    _hideEvent = Main.overview.connect('hiding', function() {
        _hidePanel(_settingsAnimTimeOverv);
    });
    
    _setup_settings_handler();
    _updateMouseSensitive();
    
    _hidePanel(0.1);
}

function disable() {
    Main.layoutManager.removeChrome(PANEL_BOX);
    Main.layoutManager.addChrome(PANEL_BOX, { affectsStruts: true, trackFullscreen: true });
    
    if(_showEvent) Main.overview.disconnect(_showEvent);
    if(_hideEvent) Main.overview.disconnect(_hideEvent);
    
    _disconnect_settings_handler();
    _disable_mouse_sensitive();
    
    _showPanel(0.1);
}
