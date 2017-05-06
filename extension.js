//
// Hides the Gnome "top bar" except in overview mode.
// https://extensions.gnome.org/extension/545/hide-top-bar/
// https://github.com/mlutfy/hidetopbar
//
// See README for more information.
//

const Main = imports.ui.main;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const PanelVisibilityManager = Me.imports.panelVisibilityManager;
const DEBUG = Convenience.DEBUG;

let mSettings = null;
let mPVManager = null;
let monitorIndex = null;

function init() { }

function enable() {
    DEBUG("enable()");
    mSettings = Convenience.getSettings();
    monitorIndex = Main.layoutManager.primaryIndex;
    mPVManager = new PanelVisibilityManager.PanelVisibilityManager(mSettings, monitorIndex);
}

function disable() {
    DEBUG("disable()");
    mPVManager.destroy();
    mSettings.run_dispose();

    mPVManager = null;
    mSettings = null;
}
