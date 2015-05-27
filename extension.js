//
// Hides the Gnome "top bar" except in overview mode.
// https://extensions.gnome.org/extension/545/hide-top-bar/
// https://github.com/mlutfy/hidetopbar
//
// See README for more information.
//

const Mainloop = imports.mainloop;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const TopPanel = Me.imports.topPanel;
const DEBUG = Convenience.DEBUG;

let settings = null;
let panel = null;

function init() { }

function enable() {
    DEBUG("enable()");
    settings = Convenience.getSettings();
    panel = new TopPanel.topPanel(settings);
}

function disable() {
    DEBUG("disable()");
    panel.destroy();
    settings.run_dispose();

    panel = null;
    settings = null;
}
