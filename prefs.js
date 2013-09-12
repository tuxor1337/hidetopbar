const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext.domain('hidetopbar');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

let settings;

function init() {
    settings = Convenience.getSettings();
    Convenience.initTranslations("hidetopbar");
}

function buildPrefsWidget() {
    let frame = new Gtk.VBox({border_width: 10});
    frame.pack_start(new Gtk.Label({
        label: _("<b>Sensitivity</b>"),
        use_markup: true,
        xalign: 0
    }), false, false, 0);

    let settings_vbox = new Gtk.VBox({margin_left: 20, margin_top: 10});
    let settings_array = [
        ['mouse-sensitive',_("Show panel when mouse approaches edge of the screen")],
        ['use-pressure-barrier',_("Use a pressure barrier")],
        ['hot-corner',_("Keep hot corner sensitive, even in hidden state")],
        ['mouse-triggers-overview',_("In the above case show overview, too")],
    ];
    settings_array.forEach(function (s) {
        let hbox = new Gtk.HBox();
        let onoff = new Gtk.Switch({active: settings.get_boolean(s[0])});
        
        hbox.pack_start(new Gtk.Label({
            label: s[1],
            use_markup: true,
            xalign: 0
        }), true, true, 0);
        hbox.pack_end(onoff, false, false, 0);
        
        settings.connect('changed::'+s[0], function(k,b) {
            onoff.set_active(settings.get_boolean(b)); });

        onoff.connect('notify::active', function(w) {
            settings.set_boolean(s[0], w.active);
        });
        
        settings_vbox.pack_start(hbox, false,false, 0);
    });

    frame.pack_start(settings_vbox, true, true, 0);
    
    frame.pack_start(new Gtk.Label({
        label: _("<b>Animation</b>"),
        use_markup: true,
        xalign: 0
    }), false, false, 0);

    let settings_vbox = new Gtk.VBox({margin_left: 20, margin_top: 10});
    let settings_array = [
        ['animation-time-overview',_("Slide animation time when entering/leaving overview.")],
        ['animation-time-autohide',_("Slide animation time when mouse approaches edge of the screen.")]
    ];
    settings_array.forEach(function (s) {
        let hbox = new Gtk.HBox();
        let spin = Gtk.SpinButton.new_with_range(0.0,1.0,0.1);
        spin.set_value(settings.get_double(s[0]));
        
        hbox.pack_start(new Gtk.Label({
            label: s[1],
            use_markup: true,
            xalign: 0
        }), true, true, 0);
        hbox.pack_end(spin, false, false, 0);
        
        settings.connect('changed::'+s[0], function(k,b) {
            spin.set_value(settings.get_double(b)); });

        spin.connect('value-changed', function(w) {
            settings.set_double(s[0], w.get_value());
        });
        
        settings_vbox.pack_start(hbox, false,false, 0);
    });

    frame.pack_start(settings_vbox, true, true, 0);
    frame.show_all();
    return frame;
}
