/**
 * This file is part of Hide Top Bar
 *
 * Copyright 2020 Thomas Vogt
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

import * as Convenience from './convenience.js';
import * as Intellihide from './intellihide.js';
import * as DesktopIconsIntegration from './desktopIconsIntegration.js';
const DEBUG = Convenience.DEBUG;

const MessageTray = Main.messageTray;
const PanelBox = Main.layoutManager.panelBox;
const ShellActionMode = (
    Shell.ActionMode ? Shell.ActionMode : Shell.KeyBindingMode
);
const _searchEntryBin = Main.overview._overview._controls._searchEntryBin;

export class PanelVisibilityManager {

    constructor(settings) {
        this._base_y = PanelBox.y;
        this._settings = settings;
        this._preventHide = false;
        this._showInOverview = true;
        this._intellihideBlock = false;
        this._staticBox = new Clutter.ActorBox();
        this._animationActive = false;
        this._unredirectDisabled = false;

        this._desktopIconsUsableArea = (
            new DesktopIconsIntegration.DesktopIconsUsableAreaClass()
        );
        Main.layoutManager.removeChrome(PanelBox);
        Main.layoutManager.addChrome(PanelBox, {
            affectsStruts: false,
            trackFullscreen: true
        });

        // We lost the original notification's position because of
        // PanelBox->affectsStruts = false and now it appears beneath the
        // top bar, fix it
        this._oldEase = MessageTray._bannerBin.ease;
        MessageTray._bannerBin.ease = (
            function(params) {
                if (params.hasOwnProperty("y") && PanelBox.y >= 0) {
                    params.y += PanelBox.height;
                }
                this._oldEase.apply(MessageTray._bannerBin, arguments);
            }
        ).bind(this);

        // store all signal and timeout handlers in one object to make sure that they are
        // removed on destroy
        this._signalsHandler = new Convenience.GlobalSignalsHandler();

        // Panel._toggleMenu() returns early while the panel is unmapped, so
        // Super+S and Super+V do nothing with the bar hidden. Reveal it first.
        this._oldToggleQuickSettings = this._wrapMenuToggle('toggleQuickSettings');
        this._oldToggleCalendar = this._wrapMenuToggle('toggleCalendar');

        this._cursorTracker = (
            (typeof global.backend?.get_cursor_tracker === "function")
            ? global.backend.get_cursor_tracker()
            : Meta.CursorTracker.get_for_display(global.display)  // GNOME Shell 45-47
        );

        // Load settings
        this._bindSettingsChanges();
        this._updateSettingsMouseSensitive();
        this._updateSettingsShowInOverview();
        this._intellihide = new Intellihide.Intellihide(
            this._settings,
        );

        this._updateHotCorner(false);
        this._updateStaticBox();

        // Wait until the panel has an allocation: after login this can take
        // a second or two, and on unlock a relayout can still be queued.
        // notify::allocation is not enough, it only fires if the box changes.
        this._signalsHandler.addTimeout(
            'bindUiChangesTimeout', 100,
            () => {
                if (!PanelBox.has_allocation())
                    return GLib.SOURCE_CONTINUE;
                this._bindUIChanges();
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    hide(animationTime, trigger) {
        DEBUG("hide(" + trigger + ")");
        if(this._preventHide) return;

        let anchor_y = PanelBox.get_pivot_point()[1],
            delta_y = -PanelBox.height;
        if(anchor_y < 0) delta_y = -delta_y;
        let mouse = global.get_pointer();
        if(trigger == "mouse-left" && this._isHovering(...mouse)) return;

        this._stopWatchingPointer();

        if(this._animationActive) {
            PanelBox.remove_all_transitions();
            this._animationActive = false;
        }

        this._animationActive = true;
        PanelBox.ease({
            y: this._base_y + delta_y,
            duration: animationTime * 1000,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                this._animationActive = false;
                if (!this._settings.get_boolean('keep-round-corners')) {
                    PanelBox.hide();
                }
                this._updateHotCorner(true);
                this._setUnredirectDisabled(false);
            }
        });
    }

    // While the panel is on screen above a window that covers the whole
    // monitor, that window must not be unredirected (X11) or put on a
    // direct-scanout plane (Wayland): the compositor would skip painting
    // the stage and the panel would stay invisible although it still
    // receives input. GNOME Shell does the same for its own notifications,
    // OSDs and menus. The calls are counted by Mutter, so keep them paired.
    _setUnredirectDisabled(disabled) {
        if (disabled === this._unredirectDisabled) return;
        if (shellVersion >= 48) {
            if (disabled)
                global.compositor.disable_unredirect();
            else
                global.compositor.enable_unredirect();
        } else {
            if (disabled)
                Meta.disable_unredirect_for_display(global.display);
            else
                Meta.enable_unredirect_for_display(global.display);
        }
        this._unredirectDisabled = disabled;
    }

    show(animationTime, trigger) {
        DEBUG("show(" + trigger + ")");
        if(trigger == "mouse-enter"
           && this._settings.get_boolean('mouse-triggers-overview')) {
            Main.overview.show();
        }

        if(this._animationActive) {
            PanelBox.remove_all_transitions();
            this._animationActive = false;
        }

        this._updateHotCorner(false);
        PanelBox.show();
        this._setUnredirectDisabled(trigger != "destroy");
        if(trigger == "destroy"
           || trigger == "menu-shortcut"
           || (
               trigger == "showing-overview"
               && global.get_pointer()[1] < PanelBox.height
               && this._settings.get_boolean('hot-corner')
              )
          ) {
            PanelBox.y = this._base_y;
        } else {
            this._animationActive = true;
            PanelBox.ease({
                y: this._base_y,
                duration: animationTime * 1000,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                    this._animationActive = false;
                    this._updateStaticBox();

                    const mouse = global.get_pointer();

                    if(!this._isHovering(...mouse))
                    {
                        // The cursor has already left the panel, so we can
                        // start hiding the panel immediately.
                        this._handleMenus();
                    }
                    else if(!this._signalsHandler.has("pointerListener"))
                    {
                        // The cursor is still on the panel. Start watching the
                        // pointer so we know when it leaves the panel.
                        this._signalsHandler.addWithLabel(
                            "pointerListener",
                            [
                                this._cursorTracker,
                                'position-invalidated',
                                () => this._handlePointer(...global.get_pointer()),
                            ],
                        );
                    }
                }
            });
        }
    }

    _wrapMenuToggle(name) {
        const original = Main.panel[name];
        Main.panel[name] = (...args) => {
            if (this._signalsHandler.has("menuToggle")) return;
            if (PanelBox.visible && PanelBox.y === this._base_y) {
                original.apply(Main.panel, args);
                return;
            }
            this.show(0, "menu-shortcut");
            this._updateStaticBox();
            // Open the menu only after the frame that picks the revealed
            // panel under the pointer. If that pick came after the menu's
            // grab, the panel button under the pointer would get an enter
            // event and PopupMenuManager would switch to its menu.
            this._signalsHandler.addWithLabel(
                "menuToggle",
                [
                    global.stage,
                    'after-update',
                    (stage, view) => {
                        if (!PanelBox.peek_stage_views().includes(view)) return;
                        this._signalsHandler.disconnectWithLabel("menuToggle");
                        try {
                            original.apply(Main.panel, args);
                        } finally {
                            this._handleMenus();
                        }
                    },
                ],
            );
        };
        return original;
    }

    _isHovering(x, y) {
        return (    y >= this._staticBox.y1 &&
                    y < this._staticBox.y2 &&
                    x >= this._staticBox.x1 &&
                    x < this._staticBox.x2 );
    }

    _stopWatchingPointer() {
        this._signalsHandler.disconnectWithLabel("pointerListener");
    }

    _handlePointer(x, y) {
        if(!this._animationActive && !this._isHovering(x, y)) {
            this._handleMenus();
        }
    }

    _handleMenus() {
        if(!Main.overview.visible) {
            let blocker = Main.panel.menuManager.activeMenu
                ?? this._panelGrabMenu();
            if(blocker == null) {
                this._releaseBlocker();
                this.hide(
                    this._settings.get_double('animation-time-autohide'),
                    "mouse-left"
                );
            } else if(blocker !== this._blockerMenu) {
                this._releaseBlocker();
                this._blockerMenu = blocker;
                this._signalsHandler.addWithLabel(
                    'blockerMenu',
                    [
                        blocker,
                        'open-state-changed',
                        (menu, open) => {
                            if(!open && this._blockerMenu !== null) {
                                this._releaseBlocker();
                                this._handleMenus();
                            }
                        },
                    ],
                );
            }
        }
    }

    _releaseBlocker() {
        if(this._blockerMenu) {
            this._signalsHandler.disconnectWithLabel('blockerMenu');
            this._blockerMenu = null;
        }
    }

    // Menus of other extensions (ArcMenu, App Icons Taskbar) have their own
    // PopupMenuManager. Find the open menu holding the input grab that was
    // opened from the panel, directly or from such a menu: hiding the panel
    // unmaps its source actor, and the menu closes.
    _panelGrabMenu() {
        let actor = global.stage.get_grab_actor();
        let grabMenu = null;
        const seen = new Set();
        while(actor) {
            if(PanelBox.contains(actor))
                return grabMenu?.isOpen ? grabMenu : null;
            const menu = actor._delegate;
            if(menu instanceof PopupMenu.PopupMenuBase && menu.sourceActor
               && !seen.has(menu)) {
                seen.add(menu);
                grabMenu ??= menu;
                actor = menu.sourceActor;
            } else {
                actor = actor.get_parent();
            }
        }
        return null;
    }

    _handleShortcut() {
        let delay_time = this._settings.get_double('shortcut-delay');
        if(this._signalsHandler.has('shortcutTimeout')) {
            this._signalsHandler.disconnectWithLabel('shortcutTimeout');
            if(delay_time < 0.05
               || this._settings.get_boolean('shortcut-toggles')) {
                this._intellihideBlock = false;
                this._preventHide = false;
                this.hide(
                    this._settings.get_double('animation-time-autohide'),
                    "shortcut"
                );
                return;
            }
        }

        // If setting 'shortcut-toggles' is false, repeatedly pressing the
        // shortcut should prevent the bar from hiding
        if(!this._preventHide || this._intellihideBlock) {
            this._intellihideBlock = true;
            this._preventHide = true;

            if(delay_time > 0.05) {
                let show_time = Math.min(
                  this._settings.get_double('animation-time-autohide'),
                  Math.max(0.1, delay_time/5.0));
                this.show(show_time, "shortcut");

                this._signalsHandler.addTimeout(
                    'shortcutTimeout', delay_time*1200,
                    () => {
                        this._preventHide = false;
                        this._intellihideBlock = false;
                        this._handleMenus();
                        return false;
                    }
                );
            } else {
                this.show(
                    this._settings.get_double('animation-time-autohide'),
                    "shortcut"
                );
                // Nothing to undo, the entry marks the shortcut as pressed.
                this._signalsHandler.addUndo('shortcutTimeout', () => {});
            }
            // Key-focus the "Activities" button
            //  Currently, this is deactivated because we can't make sure that
            //  the panel doesn't hide as long as it has the key focus.
            // Main -> panel -> _leftBox -> (StBin) -> (panel-button)
            // Main.panel._leftBox.first_child.first_child.grab_key_focus();
        }
    }

    _disablePressureBarrier() {
        this._stopWatchingPointer();

        if(this._panelBarrier && this._panelPressure) {
            this._panelPressure.removeBarrier(this._panelBarrier);
            this._panelBarrier.destroy();
            this._panelBarrier = null;
        }
    }

    _initPressureBarrier() {
        this._panelPressure = new Layout.PressureBarrier(
            this._settings.get_int('pressure-threshold'),
            this._settings.get_int('pressure-timeout'),
            ShellActionMode.NORMAL
        );
        this._signalsHandler.addWithLabel(
            "panelPressure",
            [
                this._panelPressure,
                'trigger',
                (barrier) => {
                    if (
                        Main.layoutManager.primaryMonitor?.inFullscreen
                        && !this._settings.get_boolean('mouse-sensitive-fullscreen-window')
                    ) {
                        return;
                    }
                    this.show(
                        this._settings.get_double('animation-time-autohide'),
                        "mouse-enter"
                    );
                },
            ],
        );
        let anchor_y = PanelBox.get_pivot_point()[1],
            direction = Meta.BarrierDirection.POSITIVE_Y;
        if(anchor_y < 0) {
            anchor_y -= PanelBox.height;
            direction = Meta.BarrierDirection.NEGATIVE_Y;
        }
        this._panelBarrier = new Meta.Barrier({
            ...(shellVersion === 45  ? { display: global.display } : { backend: global.backend }),
            x1: PanelBox.x,
            x2: PanelBox.x + PanelBox.width,
            y1: this._base_y - anchor_y,
            y2: this._base_y - anchor_y,
            directions: direction
        });
        this._panelPressure.addBarrier(this._panelBarrier);
    }

    _updateStaticBox() {
        DEBUG("_updateStaticBox()");
        let anchor_y = PanelBox.get_pivot_point()[1];
        this._staticBox.init_rect(
            PanelBox.x, PanelBox.y-anchor_y, PanelBox.width, PanelBox.height
        );
        this._intellihide.updateTargetBox(this._staticBox);
        this._desktopIconsUsableArea.resetMargins();
        this._desktopIconsUsableArea.setMargins(-1, PanelBox.height, 0, 0, 0);
    }

    _updateHotCorner(panel_hidden) {
        let HotCorner = null;
        for(let i = 0; i < Main.layoutManager.hotCorners.length; i++){
          let hc = Main.layoutManager.hotCorners[i];
          if(hc){
            HotCorner = hc;
            break;
          }
        }
        if(HotCorner){
          this._signalsHandler.disconnectWithLabel('hotCornerBarrierTimeout');
          if(!panel_hidden || this._settings.get_boolean('hot-corner')) {
              HotCorner.setBarrierSize(PanelBox.height);
          } else {
              this._signalsHandler.addTimeout(
                  'hotCornerBarrierTimeout', 100, function () {
                      HotCorner.setBarrierSize(0)
                  }
              );
          }
        }
    }

    _updateSettingsHotCorner() {
        this.hide(0.1, "hot-corner-setting-changed");
    }

    _updateSettingsMouseSensitive() {
        if(this._settings.get_boolean('mouse-sensitive')) {
            this._disablePressureBarrier();
            this._initPressureBarrier();
        } else this._disablePressureBarrier();
    }

    _updateSettingsShowInOverview() {
        this._showInOverview = this._settings.get_boolean('show-in-overview');
        this._updateSearchEntryPadding();
    }

    _updateSearchEntryPadding() {
        if (!_searchEntryBin) return;
        _searchEntryBin.set_style(
            this._showInOverview ? `padding-top: ${PanelBox.height}px;` : null
        );
    }

    _updateIntellihideStatus() {
        if(this._settings.get_boolean('enable-intellihide')) {
            this._intellihideBlock = false;
            this._preventHide = false;
            this._intellihide.enable();
        } else {
            this._intellihide.disable();
            this._intellihideBlock = true;
            this._preventHide = false;
            this.hide(0, "init");
        }
    }

    _updatePreventHide() {
        if(this._intellihideBlock) return;

        this._preventHide = !this._intellihide.getOverlapStatus();
        let animTime = this._settings.get_double('animation-time-autohide');
        if(this._preventHide) {
            if (this._showInOverview || !Main.overview.visible)
                this.show(animTime, "intellihide");
        } else if(!Main.overview.visible)
            this.hide(animTime, "intellihide");
    }

    _bindUIChanges() {
        this._signalsHandler.add(
            [
                Main.overview,
                'showing',
                () => {
                    if(this._showInOverview) {
                        this.show(
                            this._settings.get_double(
                                'animation-time-overview'
                            ),
                            "showing-overview"
                        );
                    }
                }
            ],
            [
                Main.overview,
                'hiding',
                () => {
                    this.hide(
                        this._settings.get_double('animation-time-overview'),
                        "hiding-overview"
                    );
                }
            ],
            [
                Main.panel,
                'leave-event',
                this._handleMenus.bind(this)
            ],
            [
                PanelBox,
                'notify::anchor-y',
                () => {
                    this._updateStaticBox();
                    this._updateSettingsMouseSensitive();
                }
            ],
            [
                PanelBox,
                'notify::height',
                this._updateSearchEntryPadding.bind(this)
            ],
            [
                Main.layoutManager,
                'monitors-changed',
                () => {
                    this._base_y = PanelBox.y;
                    this._updateStaticBox();
                    this._updateSettingsMouseSensitive();
                    // LayoutManager._updateBoxes() has just moved PanelBox
                    // back on screen: hide it again unless it is held.
                    this._handleMenus();
                }
            ],
            [
                this._intellihide,
                'status-changed',
                this._updatePreventHide.bind(this)
            ]
        );

        Main.wm.addKeybinding("shortcut-keybind",
            this._settings, Meta.KeyBindingFlags.NONE,
            ShellActionMode.NORMAL,
            this._handleShortcut.bind(this)
        );

        this._updateIntellihideStatus();
    }

    _bindSettingsChanges() {
        this._signalsHandler.addWithLabel("settings",
            [
                this._settings,
                'changed::hot-corner',
                this._updateSettingsHotCorner.bind(this)
            ],
            [
                this._settings,
                'changed::mouse-sensitive',
                this._updateSettingsMouseSensitive.bind(this)
            ],
            [
                this._settings,
                'changed::pressure-timeout',
                this._updateSettingsMouseSensitive.bind(this)
            ],
            [
                this._settings,
                'changed::pressure-threshold',
                this._updateSettingsMouseSensitive.bind(this)
            ],
            [
                this._settings,
                'changed::show-in-overview',
                this._updateSettingsShowInOverview.bind(this)
            ],
            [
                this._settings,
                'changed::enable-intellihide',
                this._updateIntellihideStatus.bind(this)
            ],
            [
                this._settings,
                'changed::enable-active-window',
                this._updateIntellihideStatus.bind(this)
            ]
        );
    }

    destroy() {
        this._intellihide.destroy();
        this._signalsHandler.destroy();
        Main.wm.removeKeybinding("shortcut-keybind");
        this._disablePressureBarrier();
        this._releaseBlocker();
        if (_searchEntryBin) {
          _searchEntryBin.style = null;
        }

        MessageTray._bannerBin.ease = this._oldEase;
        Main.panel.toggleQuickSettings = this._oldToggleQuickSettings;
        Main.panel.toggleCalendar = this._oldToggleCalendar;
        this.show(0, "destroy");
        this._setUnredirectDisabled(false);

        // The shell disables this extension while the screen is locked. Giving
        // the top bar its strut back then shrinks the work area and pushes
        // floating windows down.
        Main.layoutManager.removeChrome(PanelBox);
        Main.layoutManager.addChrome(PanelBox, {
            affectsStruts: Main.sessionMode.currentMode !== 'unlock-dialog',
            trackFullscreen: true
        });
        this._desktopIconsUsableArea.destroy();
        this._desktopIconsUsableArea = null;
    }
};
