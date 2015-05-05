
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Clutter = imports.gi.Clutter;

const Main = imports.ui.main;
const Layout = imports.ui.layout;
const Tweener = imports.ui.tweener;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Intellihide = Me.imports.intellihide;
                    
const PANEL_BOX = Main.panel.actor.get_parent();

const topPanel = new Lang.Class({
    Name: 'topPanel',
    
    _init: function(settings) {
        this._panelHeight = Main.panel.actor.get_height();
        this._preventHide = false;
        this._intellihideBlock = false;
        this._staticBox = new Clutter.ActorBox();
        this._initialY = PANEL_BOX.y;
        
        Main.layoutManager.removeChrome(PANEL_BOX);
        Main.layoutManager.addChrome(PANEL_BOX, {
            affectsStruts: false,
            trackFullscreen: true
        });
        
        // Load settings
        this._settings = settings;
        this._bindSettingsChanges();
        this._updateSettingsMouseSensitive();

        this._intellihide = new Intellihide.intellihide(this._settings);
       
        this._signalsHandler = new Convenience.GlobalSignalsHandler();
        this._signalsHandler.add(
            [
                Main.overview,
                'showing',
                Lang.bind(this, function() {
                    this.show(
                        this._settings.get_double('animation-time-overview'),
                        "showing-overview"
                    );
                })
            ],
            [
                Main.overview,
                'hiding',
                Lang.bind(this, function() {
                    this.hide(
                        this._settings.get_double('animation-time-overview'),
                        "hiding-overview"
                    );
                })
            ],
            [
                Main.panel.actor,
                'leave-event',
                Lang.bind(this, this._handleMenus)
            ],
            [
                global.screen,
                'monitors-changed',
                Lang.bind(this, this._updateStaticBox)
            ],
            [
                this._intellihide,
                'status-changed',
                Lang.bind(this, this._updatePreventHide)
            ]
        );
        
        this._updateStaticBox();
        
        this._shortcutTimeout = 0;
        Main.wm.addKeybinding("shortcut-keybind",
            this._settings, Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            Lang.bind(this, this._handleShortcut)
        );
    },

    hide: function(animationTime, trigger) {
        if(this._preventHide || PANEL_BOX.height <= 1) return;
        
        this._panelHeight = Main.panel.actor.get_height();
        
        if(global.get_pointer()[1] < this._panelHeight && trigger == "mouse-left") {
            return;
        }
        
        let x = Number(this._settings.get_boolean('hot-corner'));
        PANEL_BOX.height = x;
        
        Tweener.addTween(PANEL_BOX, {
            y: this._initialY + x - this._panelHeight,
            time: animationTime,
            transition: 'easeOutQuad',
            onComplete: function() { Main.panel.actor.set_opacity(x*255); }
        });
    },

    show: function(animationTime, trigger) {
        if(trigger == "mouse-enter" && this._settings.get_boolean('mouse-triggers-overview'))
            Main.overview.show();
        if(PANEL_BOX.y - this._initialY > 1-this._panelHeight) return;
        PANEL_BOX.height = this._panelHeight;
        Main.panel.actor.set_opacity(255);
        
        if(trigger == "showing-overview"
            && global.get_pointer()[1] < this._panelHeight
            && this._settings.get_boolean('hot-corner')) PANEL_BOX.y = this._initialY;
        else {
            Tweener.addTween(PANEL_BOX, {
                y: this._initialY,
                time: animationTime,
                transition: 'easeOutQuad',
                onComplete: Lang.bind(this, this._updateStaticBox)
            });
        }
    },

    _handleMenus: function() {
        if(!Main.overview.visible) {
            let blocker = Main.panel.menuManager.activeMenu;
            if(blocker == null) {
                this.hide(
                    this._settings.get_double('animation-time-autohide'),
                    "mouse-left"
                );
            } else {
                this._blockerMenu = blocker;
                this._menuEvent = this._blockerMenu.connect(
                    'open-state-changed',
                    Lang.bind(this, function(menu, open){
                        if(!open) {
                            this._blockerMenu.disconnect(this._menuEvent);
                            this._menuEvent=null;
                            this._blockerMenu=null;
                            this._handleMenus();
                        }
                    })
                );
            }
        }
    },
    
    _handleShortcut: function () {
        var delay_time = this._settings.get_double('shortcut-delay');
        if(this._shortcutTimeout && (delay_time < 0.05
           || this._settings.get_boolean('shortcut-toggles'))) {
            Mainloop.source_remove(this._shortcutTimeout);
            this._shortcutTimeout = null;
            this._intellihideBlock = false;
            this._preventHide = false;
            this.hide(this._settings.get_double('animation-time-autohide'));
        } else {
            this._intellihideBlock = true;
            this._preventHide = true;
            
            if(delay_time > 0.05) {
                this.show(delay_time/5.0);
                
                this._shortcutTimeout = Mainloop.timeout_add(
                    delay_time*1200,
                    Lang.bind(this, function () {
                        this._preventHide = false;
                        this._intellihideBlock = false;
                        this._handleMenus();
                        this._shortcutTimeout = null;
                        return false;
                    })
                );
            } else {
                this.show(this._settings.get_double('animation-time-autohide'));
                this._shortcutTimeout = true;
            }
        }
    },

    _disablePressureBarrier: function() {
        if(this._panelBarrier && this._panelPressure) {
            this._panelPressure.removeBarrier(this._panelBarrier);
            this._panelBarrier.destroy();
        }
    },

    _initPressureBarrier: function() {
        this._panelPressure = new Layout.PressureBarrier(
            this._settings.get_int('pressure-threshold'),
            this._settings.get_int('pressure-timeout'), 
            Shell.ActionMode.NORMAL
        );
        this._panelPressure.setEventFilter(function(event) {
            if (event.grabbed && Main.modalCount == 0)
                return true;
            return false;
        });
        this._panelPressure.connect(
            'trigger',
            Lang.bind(this, function(barrier) {
                if (Main.layoutManager.primaryMonitor.inFullscreen)
                    return;
                this.show(
                    this._settings.get_double('animation-time-autohide'),
                    "mouse-enter"
                );
            })
        );
        let monitor = Main.layoutManager.primaryMonitor;
        this._panelBarrier = new Meta.Barrier({
            display: global.display,
            x1: monitor.x,
            x2: monitor.x + monitor.width,
            y1: monitor.y,
            y2: monitor.y,
            directions: Meta.BarrierDirection.POSITIVE_Y
        });
        this._panelPressure.addBarrier(this._panelBarrier);
    },

    _updateStaticBox: function() {
        this._staticBox.init_rect(
            PANEL_BOX.x, PANEL_BOX.y, PANEL_BOX.width, PANEL_BOX.height
        );
        this._initialY = PANEL_BOX.y;
        this._intellihide.updateTargetBox(this._staticBox);
    },
    
    _updateSettingsHotCorner: function() {
        this.hide(0.1);
    },

    _updateSettingsMouseSensitive: function() {
        if(this._settings.get_boolean('mouse-sensitive')) {
            this._disablePressureBarrier();
            this._initPressureBarrier();
        } else this._disablePressureBarrier();
    },

    _updateIntellihideStatus: function() {
        if(this._settings.get_boolean('enable-intellihide'))
            this._intellihide.enable();
        else
            this._intellihide.disable();

        this._intellihide._onlyActive(this._settings.get_boolean('enable-active-window'));
    },

    _updatePreventHide: function() {
        if(this._intellihideBlock) return;

        this._preventHide = !this._intellihide.getOverlapStatus();
        if(this._preventHide)
            this.show(this._settings.get_double('animation-time-autohide'));
        else if(!Main.overview.visible)
            this.hide(this._settings.get_double('animation-time-autohide'));
    },

    _bindSettingsChanges: function() {
        this._signalsHandler = new Convenience.GlobalSignalsHandler();
        this._signalsHandler.addWithLabel("settings",
            [
                this._settings,
                'changed::hot-corner',
                Lang.bind(this, this._updateSettingsHotCorner)
            ],
            [
                this._settings,
                'changed::mouse-sensitive',
                Lang.bind(this, this._updateSettingsMouseSensitive)
            ],
            [
                this._settings,
                'changed::pressure-timeout',
                Lang.bind(this, this._updateSettingsMouseSensitive)
            ],
            [
                this._settings,
                'changed::pressure-threshold',
                Lang.bind(this, this._updateSettingsMouseSensitive)
            ],
            [
                this._settings,
                'changed::enable-intellihide',
                Lang.bind(this, this._updateIntellihideStatus)
            ],
            [
                this._settings,
                'changed::enable-active-window',
                Lang.bind(this, this._updateIntellihideStatus)
            ]
        );
    },
    
    destroy: function() {
        Main.layoutManager.removeChrome(PANEL_BOX);
        Main.layoutManager.addChrome(PANEL_BOX, {
            affectsStruts: true,
            trackFullscreen: true
        });
        
        this._signalsHandler.disconnect();
        Main.wm.removeKeybinding("shortcut-keybind");
        this._disablePressureBarrier();
        this._intellihide.destroy();
    
        this.show(0.1);
    }
});
