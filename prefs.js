const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const SETTINGS_HOT_CORNER = 'hot-corner';

let settings;

function init() {
    settings = Convenience.getSettings();
}

function buildPrefsWidget() {
    let showName = settings.get_boolean(SETTINGS_HOT_CORNER);

    let frame = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, border_width: 10});
    let label = new Gtk.Label({label: "<b>Sensitivity</b>", use_markup: true, xalign: 0});
    frame.add(label);

    let vbox = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, margin_left: 20, margin_top: 10});
    let hbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
    vbox.add(hbox)

    let label = new Gtk.Label({label: "Keep hot corner sensitive, even in hidden state", 
            use_markup: true, xalign: 0});
    let onoff = new Gtk.Switch({active: showName});

    hbox.pack_start(label, true, true, 0);
    hbox.add(onoff);

    onoff.connect('notify::active', function(widget) {
        settings.set_boolean(SETTINGS_HOT_CORNER, widget.active);
    });

    frame.add(vbox);
    frame.show_all();
    return frame;
}
