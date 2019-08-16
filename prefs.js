const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

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
    let frame = new Gtk.VBox({border_width: 10, spacing: 6}),
        settings_vbox,
        settings_array,
        settings_onoff,
        settings_hbox,
        settings_spin,
        model,
        model_row,
        binding,
        binding_key,
        binding_mods,
        treeview,
        treeview_col,
        cellrend;

/******************************************************************************
 ************************************** Section Sensitivity *******************
 ******************************************************************************/

    frame.pack_start(new Gtk.Label({
        label: _("<b>Sensitivity</b>"),
        use_markup: true,
        xalign: 0
    }), false, false, 0);

    settings_vbox = new Gtk.VBox({margin_left: 20, margin_top: 10, spacing: 6});
    settings_array = [
        ['mouse-sensitive',_("Show panel when mouse approaches edge of the screen")],
        ['mouse-sensitive-fullscreen-window',_("In the above case, also show panel when fullscreen.")],
        ['hot-corner',_("Keep hot corner sensitive, even in hidden state")],
        ['mouse-triggers-overview',_("In the above case show overview, too")],
    ];
    settings_array.forEach(function (s) {
        settings_onoff = new Gtk.Switch({active: settings.get_boolean(s[0])});
        settings_onoff.connect('notify::active', function(w) {
            settings.set_boolean(s[0], w.active);
        });
        settings.connect('changed::'+s[0], function(k,b) {
            settings_onoff.set_active(settings.get_boolean(b));
        });

        settings_hbox = new Gtk.HBox();
        settings_hbox.pack_start(new Gtk.Label({
            label: s[1],
            use_markup: true,
            xalign: 0
        }), true, true, 0);
        settings_hbox.pack_end(settings_onoff, false, false, 0);

        settings_vbox.pack_start(settings_hbox, false,false, 0);
    });
    frame.pack_start(settings_vbox, true, true, 0);

    settings_vbox = new Gtk.VBox({margin_left: 20, margin_bottom: 10, spacing: 6});
    settings_array = [
        ['pressure-threshold',_("Pressure barrier's threshold.")],
        ['pressure-timeout',_("Pressure barrier's timeout.")]
    ];
    settings_array.forEach(function (s) {
        settings_spin = Gtk.SpinButton.new_with_range(0,10000,1);
        settings_spin.set_value(settings.get_int(s[0]));
        settings_spin.connect('value-changed', function(w) {
            settings.set_int(s[0], w.get_value());
        });
        settings.connect('changed::'+s[0], function(k,b) {
            settings_spin.set_value(settings.get_int(b));
        });

        settings_hbox = new Gtk.HBox();
        settings_hbox.pack_start(new Gtk.Label({
            label: s[1],
            use_markup: true,
            xalign: 0
        }), true, true, 0);
        settings_hbox.pack_end(settings_spin, false, false, 0);

        settings_vbox.pack_start(settings_hbox, false,false, 0);
    });
    frame.pack_start(settings_vbox, true, true, 0);

/******************************************************************************
 ************************************** Section Animation *********************
 ******************************************************************************/

    frame.pack_start(new Gtk.Label({
        label: _("<b>Animation</b>"),
        use_markup: true,
        xalign: 0
    }), false, false, 0);

    settings_vbox = new Gtk.VBox({margin_left: 20, margin_top: 10, margin_bottom: 10, spacing: 6});
    settings_array = [
        ['animation-time-overview',_("Slide animation time when entering/leaving overview.")],
        ['animation-time-autohide',_("Slide animation time when mouse approaches edge of the screen.")]
    ];
    settings_array.forEach(function (s) {
        settings_spin = Gtk.SpinButton.new_with_range(0.0,1.0,0.1);
        settings_spin.set_value(settings.get_double(s[0]));
        settings_spin.connect('value-changed', function(w) {
            settings.set_double(s[0], w.get_value());
        });
        settings.connect('changed::'+s[0], function(k,b) {
            settings_spin.set_value(settings.get_double(b));
        });

        settings_hbox = new Gtk.HBox();
        settings_hbox.pack_start(new Gtk.Label({
            label: s[1],
            use_markup: true,
            xalign: 0
        }), true, true, 0);
        settings_hbox.pack_end(settings_spin, false, false, 0);

        settings_vbox.pack_start(settings_hbox, false,false, 0);
    });
    frame.pack_start(settings_vbox, true, true, 0);

/******************************************************************************
 ************************************** Section Shortcuts *********************
 ******************************************************************************/

    frame.pack_start(new Gtk.Label({
        label: _("<b>Keyboard shortcuts</b>"),
        use_markup: true,
        xalign: 0
    }), false, false, 0);

    settings_vbox = new Gtk.VBox({margin_left: 20, margin_top: 10, spacing: 6});

/* ++++++++++++++++++++++++++++++++++++ Keyboard accelerator +++++ */

    settings_hbox = new Gtk.HBox();
    model = new Gtk.ListStore();

    model.set_column_types([
        GObject.TYPE_INT,
        GObject.TYPE_INT
    ]);
    model_row = model.append();
    binding = settings.get_strv('shortcut-keybind')[0];
    if (binding) {
        [binding_key, binding_mods] = Gtk.accelerator_parse(binding);
    } else {
        [binding_key, binding_mods] = [0, 0];
    }
    model.set(model_row, [0, 1], [binding_mods, binding_key]);

    treeview = new Gtk.TreeView({ 'expand': false, 'model': model });
    cellrend = new Gtk.CellRendererAccel({
        'editable': true,
        'accel-mode': Gtk.CellRendererAccelMode.GTK
    });

    cellrend.connect('accel-edited', function(rend, iter, binding_key, binding_mods) {
        let value = Gtk.accelerator_name(binding_key, binding_mods);
        let [succ, iterator] = model.get_iter_from_string(iter);

        if (!succ) {
            throw new Error("Error updating keybinding");
        }

        model.set(iterator, [0, 1], [binding_mods, binding_key]);
        settings.set_strv('shortcut-keybind', [value]);
    });

    cellrend.connect('accel-cleared', function(rend, iter, binding_key, binding_mods) {
        let [succ, iterator] = model.get_iter_from_string(iter);

        if (!succ) {
            throw new Error("Error clearing keybinding");
        }

        model.set(iterator, [0, 1], [0, 0]);
        settings.set_strv('shortcut-keybind', []);
    });

    treeview_col = new Gtk.TreeViewColumn({ min_width: 200 });
    treeview_col.pack_end(cellrend, false);
    treeview_col.add_attribute(cellrend, 'accel-mods', 0);
    treeview_col.add_attribute(cellrend, 'accel-key', 1);
    treeview.append_column(treeview_col);
    treeview.set_headers_visible(false);

    settings_hbox.pack_start(new Gtk.Label({
        label: _("Key that triggers the bar to be shown."),
        use_markup: true,
        xalign: 0
    }), true, true, 0);
    settings_hbox.pack_end(treeview, false, true, 0);

    settings.connect('changed::shortcut-keybind', function(k, b) {
        let model_row = model.get(0);
        model.set(model_row, [0, 1], settings.get_strv(b));
    });

    settings_vbox.pack_start(settings_hbox, false, false, 3);

/* ++++++++++++++++++++++++++++++++++++ End: Keyboard accelerator +++++ */

    settings_spin = Gtk.SpinButton.new_with_range(0.0,10.0,0.1);
    settings_spin.set_value(settings.get_double('shortcut-delay'));

    settings_hbox = new Gtk.HBox();
    settings_hbox.pack_start(new Gtk.Label({
        label: _("Delay before the bar rehides after key press."),
        use_markup: true,
        xalign: 0
    }), true, true, 0);
    settings_hbox.pack_end(settings_spin, false, false, 0);

    settings.connect('changed::shortcut-delay', function(k,b) {
        settings_spin.set_value(settings.get_double(b));
    });
    settings_spin.connect('value-changed', function(w) {
        settings.set_double('shortcut-delay', w.get_value());
    });

    settings_vbox.pack_start(settings_hbox, false,false, 0);

    settings_array = [
        ['shortcut-toggles',_("Pressing the shortcut again rehides the panel.")],
    ];
    settings_array.forEach(function (s) {
        settings_onoff = new Gtk.Switch({active: settings.get_boolean(s[0])});
        settings_onoff.connect('notify::active', function(w) {
            settings.set_boolean(s[0], w.active);
        });
        settings.connect('changed::'+s[0], function(k,b) {
            settings_onoff.set_active(settings.get_boolean(b));
        });

        settings_hbox = new Gtk.HBox();
        settings_hbox.pack_start(new Gtk.Label({
            label: s[1],
            use_markup: true,
            xalign: 0
        }), true, true, 0);
        settings_hbox.pack_end(settings_onoff, false, false, 0);

        settings_vbox.pack_start(settings_hbox, false,false, 0);
    });

    frame.pack_start(settings_vbox, true, true, 0);

/******************************************************************************
 ************************************** Section Intellihide *******************
 ******************************************************************************/

    frame.pack_start(new Gtk.Label({
        label: _("<b>Intellihide</b>"),
        use_markup: true,
        xalign: 0
    }), false, false, 0);

    settings_vbox = new Gtk.VBox({margin_left: 20, margin_top: 10, spacing: 6});
    settings_array = [
        ['enable-intellihide',_("Only hide panel when a window takes the space")],
        ['enable-active-window',_("Only when the active window takes the space")],
    ];
    settings_array.forEach(function (s) {
        settings_onoff = new Gtk.Switch({active: settings.get_boolean(s[0])});
        settings_onoff.connect('notify::active', function(w) {
            settings.set_boolean(s[0], w.active);
        });
        settings.connect('changed::'+s[0], function(k,b) {
            settings_onoff.set_active(settings.get_boolean(b));
        });

        settings_hbox = new Gtk.HBox();
        settings_hbox.pack_start(new Gtk.Label({
            label: s[1],
            use_markup: true,
            xalign: 0
        }), true, true, 0);
        settings_hbox.pack_end(settings_onoff, false, false, 0);

        settings_vbox.pack_start(settings_hbox, false,false, 0);
    });
    frame.pack_start(settings_vbox, true, true, 0);

    frame.show_all();
    return frame;
}
