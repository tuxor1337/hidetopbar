
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;

const Main = imports.ui.main;
const Layout = imports.ui.layout;
const Tweener = imports.ui.tweener;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
                    
const PANEL_BOX = Main.panel.actor.get_parent();

const topPanel = new Lang.Class({
    Name: 'topPanel',
    
    _init: function(settings) {
        this._panelHeight = Main.panel.actor.get_height();
        this._preventHide = false;
        
        Main.layoutManager.removeChrome(PANEL_BOX);
        Main.layoutManager.addChrome(PANEL_BOX, {
            affectsStruts: false,
            trackFullscreen: true
        });
        
        // Load settings
        this._settings = settings;
        this._bindSettingsChanges();
        this._updateSettingsMouseSensitive();
        
        this._updateStaticBox();
       
        this._signalHandler = new Convenience.globalSignalHandler();
        this._signalHandler.push(
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
            ]
        );
        
        this._shortcutTimeout = 0;
        Main.wm.addKeybinding("shortcut-keybind",
            this._settings, Meta.KeyBindingFlags.NONE,
            Shell.KeyBindingMode.NORMAL,
            Lang.bind(this, this._handleShortcut)
        );
    },

    hide: function(animationTime, trigger) {
        if(this._preventHide) return;
        
        this._panelHeight = Main.panel.actor.get_height();
        
        if(global.get_pointer()[1] < this._panelHeight && trigger == "mouse-left") {
            return;
        }
        
        let x = Number(this._settings.get_boolean('hot-corner'));
        PANEL_BOX.height = x;
        
        Tweener.addTween(PANEL_BOX, {
            y: x - this._panelHeight,
            time: animationTime,
            transition: 'easeOutQuad',
            onComplete: function() { Main.panel.actor.set_opacity(x*255); }
        });
    },

    show: function(animationTime, trigger) {
        if(trigger == "mouse-enter" && this._settings.get_boolean('mouse-triggers-overview'))
            Main.overview.show();
        if(PANEL_BOX.y > 1-this._panelHeight) return;
        PANEL_BOX.height = this._panelHeight;
        Main.panel.actor.set_opacity(255);
        
        if(trigger == "showing-overview"
            && global.get_pointer()[1] < this._panelHeight
            && this._settings.get_boolean('hot-corner')) PANEL_BOX.y = 0;
        else {
            Tweener.addTween(PANEL_BOX, {
                y: 0,
                time: animationTime,
                transition: 'easeOutQuad',
                onComplete: this._updateStaticBox
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
        if(this._shortcutTimeout) {
            Mainloop.source_remove(this._shortcutTimeout);
            this._shortcutTimeout = null;
            this.hide(this._settings.get_double('animation-time-autohide'));
        }
        else {
            this.show(this._settings.get_double('shortcut-delay')/5.0);

            this._shortcutTimeout = Mainloop.timeout_add(
                this._settings.get_double('shortcut-delay')*1200,
                Lang.bind(this, this._handleMenus)
            );
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
            Shell.KeyBindingMode.NORMAL
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
        this.staticBox = PANEL_BOX.get_allocation_box();
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
    
    _bindSettingsChanges: function() {
        this._signalHandler = new Convenience.globalSignalHandler();
        this._signalHandler.pushWithLabel("settings",
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
            ]
        );
    },
    
    destroy: function() {
        Main.layoutManager.removeChrome(PANEL_BOX);
        Main.layoutManager.addChrome(PANEL_BOX, {
            affectsStruts: true,
            trackFullscreen: true
        });
        
        this._signalHandler.disconnect();
        Main.wm.removeKeybinding("shortcut-keybind");
        this._disablePressureBarrier();
    
        this.show(0.1);
    },
    
    set_preventHide: function(bool) {
        this._preventHide = bool;
        if(this._preventHide)
            this.show(this._settings.get_double('animation-time-autohide'));
        else if(!Main.overview.visible)
            this.hide(this._settings.get_double('animation-time-autohide'));
    },
});
