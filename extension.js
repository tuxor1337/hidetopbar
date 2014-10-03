//
// Hides the Gnome "top bar" except in overview mode.
// https://extensions.gnome.org/extension/545/hide-top-bar/
// https://github.com/mlutfy/hidetopbar
//
// See README for more information.
//

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Intellihide = Me.imports.intellihide;
const TopPanel = Me.imports.topPanel;

let settings;
let intellihide;
let panel;

function init() { }

function show() { panel.set_preventHide(true); }
function hide() { panel.set_preventHide(false); }

function enable() {
    settings = Convenience.getSettings();
    panel = new TopPanel.topPanel(settings);
    intellihide = new Intellihide.intellihide(show, hide, panel);
}

function disable() {
    intellihide.destroy();
    panel.destroy();
    settings.run_dispose();
    
    panel=null;
    intellihide=null;
    settings = null;
}
