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

const Mainloop = imports.mainloop;

let event_intellihide_setting=null;

let settings=null;
let intellihide=null;
let panel=null;

function init() { }

function show() { panel.set_preventHide(true); }
function hide() { panel.set_preventHide(false); }

function update_intellihide_status() {
    if(settings.get_boolean('enable-intellihide') && intellihide === null)
        intellihide = new Intellihide.intellihide(show, hide, panel);
    else {
        if(intellihide !== null) intellihide.destroy();
        intellihide = null;
        hide();
    }
}

function enable() {
    settings = Convenience.getSettings();
    panel = new TopPanel.topPanel(settings);
    event_intellihide_setting = settings.connect('changed::enable-intellihide', update_intellihide_status);
    update_intellihide_status();
}

function disable() {
    if(intellihide !== null) intellihide.destroy();
    if(event_intellihide_setting !== null) 
        settings.disconnect(event_intellihide_setting);
    panel.destroy();
    settings.run_dispose();
    
    panel=null;
    intellihide=null;
    settings = null;
}
