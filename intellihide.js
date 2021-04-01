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

// Note that the code in this file is taken from the Dash to Dock Gnome Shell
// extension (https://github.com/micheleg/dash-to-dock) with only minor
// modifications. Dash to Dock is distributed under the terms of the GNU
// General Public License, version 2 or later.

const GLib = imports.gi.GLib;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;

const Main = imports.ui.main;
const Signals = imports.signals;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

// A good compromise between reactivity and efficiency; to be tuned.
const INTELLIHIDE_CHECK_INTERVAL = 100;

const OverlapStatus = {
    UNDEFINED: -1,
    FALSE: 0,
    TRUE: 1
};

const IntellihideMode = {
    ALL_WINDOWS: 0,
    FOCUS_APPLICATION_WINDOWS: 1,
    MAXIMIZED_WINDOWS : 2
};

// List of windows type taken into account. Order is important (keep the original
// enum order).
const handledWindowTypes = [
    Meta.WindowType.NORMAL,
    Meta.WindowType.DOCK,
    Meta.WindowType.DIALOG,
    Meta.WindowType.MODAL_DIALOG,
    Meta.WindowType.TOOLBAR,
    Meta.WindowType.MENU,
    Meta.WindowType.UTILITY,
    Meta.WindowType.SPLASHSCREEN
];

/**
 * A rough and ugly implementation of the intellihide behaviour.
 * Intallihide object: emit 'status-changed' signal when the overlap of windows
 * with the provided targetBoxClutter.ActorBox changes;
 */
var Intellihide = class HideTopBar_Intellihide {

    constructor(settings, monitorIndex) {
        // Load settings
        this._settings = settings;
        this._monitorIndex = monitorIndex;

        this._signalsHandler = new Convenience.GlobalSignalsHandler();
        this._tracker = Shell.WindowTracker.get_default();
        this._focusApp = null; // The application whose window is focused.
        this._topApp = null; // The application whose window is on top on the monitor with the dock.

        this._isEnabled = false;
        this.status = OverlapStatus.UNDEFINED;
        this._targetBox = null;

        this._checkOverlapTimeoutContinue = false;
        this._checkOverlapTimeoutId = 0;

        this._trackedWindows = new Map();

        // Connect global signals
        this._signalsHandler.add([
            // Listen for notification banners to appear or disappear
            Main.messageTray,
            'show',
            this._checkOverlap.bind(this)
        ], [
            Main.messageTray,
            'hide',
            this._checkOverlap.bind(this)
        ], [
            // Add signals on windows created from now on
            global.display,
            'window-created',
            this._windowCreated.bind(this)
        ], [
            // triggered for instance when the window list order changes,
            // included when the workspace is switched
            global.display,
            'restacked',
            this._checkOverlap.bind(this)
        ], [
            // when windows are alwasy on top, the focus window can change
            // without the windows being restacked. Thus monitor window focus change.
            this._tracker,
            'notify::focus-app',
            this._checkOverlap.bind(this)
        ], [
            // update wne monitor changes, for instance in multimonitor when monitor are attached
            Meta.MonitorManager.get(),
            'monitors-changed',
            this._checkOverlap.bind(this)
        ]);
    }

    destroy() {
        // Disconnect global signals
        this._signalsHandler.destroy();

        // Remove  residual windows signals
        this.disable();
    }

    enable() {
        this._isEnabled = true;
        this._status = OverlapStatus.UNDEFINED;
        global.get_window_actors().forEach(function(wa) {
            this._addWindowSignals(wa);
        }, this);
        this._doCheckOverlap();
    }

    disable() {
        this._isEnabled = false;

        for (let wa of this._trackedWindows.keys()) {
            this._removeWindowSignals(wa);
        }
        this._trackedWindows.clear();

        if (this._checkOverlapTimeoutId > 0) {
            GLib.source_remove(this._checkOverlapTimeoutId);
            this._checkOverlapTimeoutId = 0;
        }
    }

    _windowCreated(display, metaWindow) {
        this._addWindowSignals(metaWindow.get_compositor_private());
    }

    _addWindowSignals(wa) {
        if (!this._handledWindow(wa))
            return;
        let signalId = wa.connect('notify::allocation', this._checkOverlap.bind(this));
        this._trackedWindows.set(wa, signalId);
        wa.connect('destroy', this._removeWindowSignals.bind(this));
    }

    _removeWindowSignals(wa) {
        if (this._trackedWindows.get(wa)) {
           wa.disconnect(this._trackedWindows.get(wa));
           this._trackedWindows.delete(wa);
        }
    }

    updateTargetBox(box) {
        this._targetBox = box;
        this._checkOverlap();
    }

    forceUpdate() {
        this._status = OverlapStatus.UNDEFINED;
        this._doCheckOverlap();
    }

    getOverlapStatus() {
        return (this._status == OverlapStatus.TRUE);
    }

    _checkOverlap() {
        if (!this._isEnabled || (this._targetBox == null))
            return;

        /* Limit the number of calls to the doCheckOverlap function */
        if (this._checkOverlapTimeoutId) {
            this._checkOverlapTimeoutContinue = true;
            return
        }

        this._doCheckOverlap();

        this._checkOverlapTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT, INTELLIHIDE_CHECK_INTERVAL, () => {
            this._doCheckOverlap();
            if (this._checkOverlapTimeoutContinue) {
                this._checkOverlapTimeoutContinue = false;
                return GLib.SOURCE_CONTINUE;
            } else {
                this._checkOverlapTimeoutId = 0;
                return GLib.SOURCE_REMOVE;
            }
        });
    }

    _doCheckOverlap() {

        if (!this._isEnabled || (this._targetBox == null))
            return;

        let overlaps = OverlapStatus.FALSE;
        let windows = global.get_window_actors();

        if (windows.length > 0) {
            /*
             * Get the top window on the monitor where the dock is placed.
             * The idea is that we dont want to overlap with the windows of the topmost application,
             * event is it's not the focused app -- for instance because in multimonitor the user
             * select a window in the secondary monitor.
             */

            let topWindow = null;
            for (let i = windows.length - 1; i >= 0; i--) {
                let meta_win = windows[i].get_meta_window();
                if (this._handledWindow(windows[i]) && (meta_win.get_monitor() == this._monitorIndex)) {
                    topWindow = meta_win;
                    break;
                }
            }

            if (topWindow !== null) {
                this._topApp = this._tracker.get_window_app(topWindow);
                // If there isn't a focused app, use that of the window on top
                this._focusApp = this._tracker.focus_app || this._topApp

                windows = windows.filter(this._intellihideFilterInteresting, this);

                for (let i = 0;  i < windows.length; i++) {
                    let win = windows[i].get_meta_window();

                    if (win) {
                        let rect = win.get_frame_rect();

                        let test = (rect.x < this._targetBox.x2) &&
                                   (rect.x + rect.width > this._targetBox.x1) &&
                                   (rect.y < this._targetBox.y2) &&
                                   (rect.y + rect.height > this._targetBox.y1);

                        if (test) {
                            overlaps = OverlapStatus.TRUE;
                            break;
                        }
                    }
                }
            }
        }

        // Check if notification banner overlaps
        if (Main.messageTray.visible) {
            let rect = Main.messageTray._bannerBin.get_allocation_box();
            let test = (rect.x1 < this._targetBox.x2) &&
                    (rect.x2 > this._targetBox.x1) &&
                    (rect.y1 < this._targetBox.y2) &&
                    (rect.y2 > this._targetBox.y1);
            if (test) overlaps = OverlapStatus.TRUE;
        }

        if (this._status !== overlaps) {
            this._status = overlaps;
            this.emit('status-changed', this._status);
        }

    }

    // Filter interesting windows to be considered for intellihide.
    // Consider all windows visible on the current workspace.
    // Optionally skip windows of other applications
    _intellihideFilterInteresting(wa) {
        let meta_win = wa.get_meta_window();
        if (!this._handledWindow(wa))
            return false;

        let currentWorkspace = global.workspace_manager.get_active_workspace_index();
        let wksp = meta_win.get_workspace();
        let wksp_index = wksp.index();

        // Depending on the intellihide mode, exclude non-relevent windows
        if (this._settings.get_boolean('enable-active-window')) {
                // Skip windows of other apps
                if (this._focusApp) {
                    // The DropDownTerminal extension is not an application per se
                    // so we match its window by wm class instead
                    if (meta_win.get_wm_class() == 'DropDownTerminalWindow')
                        return true;

                    let currentApp = this._tracker.get_window_app(meta_win);
                    let focusWindow = global.display.get_focus_window()

                    // Consider half maximized windows side by side
                    // and windows which are alwayson top
                    if((currentApp != this._focusApp) && (currentApp != this._topApp)
                        && !((focusWindow && focusWindow.maximized_vertically && !focusWindow.maximized_horizontally)
                              && (meta_win.maximized_vertically && !meta_win.maximized_horizontally)
                              && meta_win.get_monitor() == focusWindow.get_monitor())
                        && !meta_win.is_above())
                        return false;
                }
        }

        if ( wksp_index == currentWorkspace && meta_win.showing_on_its_workspace() )
            return true;
        else
            return false;

    }

    // Filter windows by type
    // inspired by Opacify@gnome-shell.localdomain.pl
    _handledWindow(wa) {
        let metaWindow = wa.get_meta_window();

        if (!metaWindow)
            return false;

        // The DropDownTerminal extension uses the POPUP_MENU window type hint
        // so we match its window by wm class instead
        if (metaWindow.get_wm_class() == 'DropDownTerminalWindow')
            return true;

        let wtype = metaWindow.get_window_type();
        for (let i = 0; i < handledWindowTypes.length; i++) {
            var hwtype = handledWindowTypes[i];
            if (hwtype == wtype)
                return true;
            else if (hwtype > wtype)
                return false;
        }
        return false;
    }
};

Signals.addSignalMethods(Intellihide.prototype);
