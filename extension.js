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
let _stgsEventPress = 0;

let _enterEvent = 0;
let _leaveEvent = 0;
let _menuEvent = 0;
let _blockerMenu = 0;

let _panelPressure = 0;
let _panelBarrier = 0;
if("PressureBarrier" in Layout) {
    _panelPressure = new Layout.PressureBarrier(100,1000,
                                      imports.gi.Shell.KeyBindingMode.NORMAL);
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
}

let _settingsHotCorner = Settings.get_boolean('hot-corner');
let _settingsMouseSensitive = Settings.get_boolean('mouse-sensitive');
let _settingsPress = Settings.get_boolean('use-pressure-barrier');
let _settingsShowOverview = Settings.get_boolean('mouse-triggers-overview');
let _settingsAnimTimeOverv = Settings.get_double('animation-time-overview');
let _settingsAnimTimeAutoh = Settings.get_double('animation-time-autohide');

function _hidePanel(animationTime, trigger) {
    /* Still looking for some kind of "size-changed" event, see issue #12. */
    _panelHeight = PANEL_ACTOR.get_height();
    
    if(global.get_pointer()[1] < _panelHeight && trigger == "mouse-left") {
        return;
    }
    
    let x = Number(_settingsHotCorner)
    PANEL_BOX.height = x;
    
    Tweener.addTween(PANEL_ACTOR, {
        y: x - _panelHeight,
        time: animationTime,
        transition: 'easeOutQuad',
        onComplete: function() {
            Main.panel._centerBox.hide();
            Main.panel._rightBox.hide();
        
            els = Main.panel._leftBox.get_children();
            for each(el in els.slice(1)) {
                if(typeof(el._container) == "undefined") el.hide();
                else el._container.hide();
            }
            
            PANEL_ACTOR.set_opacity(x*255);
        }
    });
}

function _showPanel(animationTime, trigger) {
    if(trigger == "mouse-enter" && _settingsShowOverview)
        Main.overview.show();
    if(PANEL_ACTOR.y > 1-_panelHeight) return;
    PANEL_BOX.height = _panelHeight;
    PANEL_ACTOR.set_opacity(255);
    Main.panel._centerBox.show();
    Main.panel._rightBox.show();
    
    els = Main.panel._leftBox.get_children();
    for each(el in els.slice(1)) {
        if(typeof(el._container) == "undefined") el.show();
        else el._container.show();
    }
    
    Tweener.addTween(PANEL_ACTOR, {
        y: 0,
        time: animationTime,
        transition: 'easeOutQuad',
    });
}

function _handleMenus() {
    if(!Main.overview.visible) {
        blocker = Main.panel.menuManager.activeMenu;
        if(blocker == null) {
            _hidePanel(_settingsAnimTimeAutoh, "mouse-left");
        } else {
            _blockerMenu = blocker
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
        if(_panelPressure && _settingsPress) {
            monitor = Main.layoutManager.primaryMonitor;
            _panelBarrier = new Meta.Barrier({ display: global.display,
                                   x1: monitor.x, x2: monitor.x + monitor.width,
                                   y1: monitor.y, y2: monitor.y,
                                   directions: Meta.BarrierDirection.POSITIVE_Y });
            _panelPressure.addBarrier(_panelBarrier);
        } else {
            _enterEvent = PANEL_ACTOR.connect('enter-event', function() {
                _showPanel(_settingsAnimTimeAutoh, "mouse-enter");
            });
        }
        _leaveEvent = PANEL_ACTOR.connect('leave-event', _handleMenus);
    } else _disable_mouse_sensitive();
}

function _disable_mouse_sensitive() {
    if(_panelBarrier && _panelPressure) {
            _panelPressure.removeBarrier(_panelBarrier);
            _panelBarrier.destroy();
    }
    if(_enterEvent) PANEL_ACTOR.disconnect(_enterEvent);
    if(_leaveEvent) PANEL_ACTOR.disconnect(_leaveEvent);
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
    _stgsEventPress = Settings.connect('changed::use-pressure-barrier', function() { 
        _settingsPress = Settings.get_boolean('use-pressure-barrier');
        _updateMouseSensitive();
    });
    _stgsEventHotCorner = Settings.connect('changed::hot-corner', function() { 
        _settingsHotCorner = Settings.get_boolean('hot-corner');
        _hidePanel(0.1);
    });
    
    _stgsEventSensitive = Settings.connect('changed::mouse-sensitive', _updateMouseSensitive);
}

function _disconnect_settings_handler() {
    if(_stgsEventAnim) Settings.disconnect(_stgsEventAnim);
    if(_stgsEventAnim2) Settings.disconnect(_stgsEventAnim2);
    if(_stgsEventPress) Settings.disconnect(_stgsEventPress);
    if(_stgsEventOverv) Settings.disconnect(_stgsEventOverv);
    if(_stgsEventHotCorner) Settings.disconnect(_stgsEventHotCorner);
    if(_stgsEventSensitive) Settings.disconnect(_stgsEventSensitive);
}

function init() { }

function enable() {    
    Main.layoutManager.removeChrome(PANEL_BOX);
    Main.layoutManager.addChrome(PANEL_BOX, { affectsStruts: false });
    
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
    Main.layoutManager.addChrome(PANEL_BOX, { affectsStruts: true });
    
    if(_showEvent) Main.overview.disconnect(_showEvent);
    if(_hideEvent) Main.overview.disconnect(_hideEvent);
    
    _disconnect_settings_handler();
    _disable_mouse_sensitive();
    
    _showPanel(0.1);
}
