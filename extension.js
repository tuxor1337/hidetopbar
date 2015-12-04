//
// Hides the Gnome "top bar" except in overview mode.
// https://extensions.gnome.org/extension/545/hide-top-bar/
// https://github.com/mlutfy/hidetopbar
//
// See README for more information.
//

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const PanelVisibilityManager = Me.imports.panelVisibilityManager;
const DEBUG = Convenience.DEBUG;

let mSettings = null;
let mPVManager = null;

function init() { }

function enable() {
    DEBUG("enable()");
    mSettings = Convenience.getSettings();
    mPVManager = new PanelVisibilityManager.PanelVisibilityManager(mSettings);
}

function disable() {
    DEBUG("disable()");
    mPVManager.destroy();
    mSettings.run_dispose();

    mPVManager = null;
    mSettings = null;
}
