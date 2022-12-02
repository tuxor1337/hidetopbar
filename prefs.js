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

const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

const Gettext = imports.gettext.domain('hidetopbar');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

let settings;

function init() {
    settings = ExtensionUtils.getSettings();
    ExtensionUtils.initTranslations("hidetopbar");
}

function buildPrefsWidget() {
    const isGtk4 = Gtk.get_major_version() >= '4';

    let frame = new Gtk.ScrolledWindow(
        { hscrollbar_policy: Gtk.PolicyType.NEVER });
    let builder = new Gtk.Builder();
    builder.set_translation_domain("hidetopbar");
    settingsPath = isGtk4 ? '/Settings-40.ui' : '/Settings.ui'
    builder.add_from_file(Me.path + settingsPath);

    let notebook = builder.get_object("settings_notebook");
    if (isGtk4) {
        frame.set_child(notebook);
    } else {
        frame.add(notebook);
    }

/******************************************************************************
 ************************************** Section Sensitivity *******************
 ******************************************************************************/

    ['mouse-sensitive',
     'mouse-sensitive-fullscreen-window',
     'show-in-overview',
     'hot-corner',
     'mouse-triggers-overview',
     'keep-round-corners'
    ].forEach(function (s) {
        let settings_onoff = builder.get_object("toggle_" + s.replace(/-/g, "_"));
        settings_onoff.set_active(settings.get_boolean(s));
        settings_onoff.connect('notify::active', function (w) {
            settings.set_boolean(s, w.active);
        });
        settings.connect('changed::' + s, function (k,b) {
            settings_onoff.set_active(settings.get_boolean(b));
        });
    });

    ['pressure-threshold',
     'pressure-timeout'
    ].forEach(function (s) {
        let settings_spin = builder.get_object("spin_" + s.replace(/-/g, "_"));
        settings_spin.set_value(settings.get_int(s));
        settings_spin.connect('value-changed', function (w) {
            settings.set_int(s, w.get_value());
        });
        settings.connect('changed::' + s, function (k,b) {
            settings_spin.set_value(settings.get_int(b));
        });
    });

/******************************************************************************
 ************************************** Section Animation *********************
 ******************************************************************************/

    ['animation-time-overview',
     'animation-time-autohide',
    ].forEach(function (s) {
        let settings_spin = builder.get_object("spin_" + s.replace(/-/g, "_"));
        settings_spin.set_value(settings.get_double(s));
        settings_spin.connect('value-changed', function (w) {
            settings.set_double(s, w.get_value());
        });
        settings.connect('changed::' + s, function (k,b) {
            settings_spin.set_value(settings.get_double(b));
        });
    });

/******************************************************************************
 ************************************** Section Shortcuts *********************
 ******************************************************************************/

/* ++++++++++++++++++++++++++++++++++++ Keyboard accelerator +++++ */

    let model = builder.get_object("store_shortcut_keybind");
    let model_row = model.get_iter_first()[1];
    let binding = settings.get_strv('shortcut-keybind')[0],
        binding_key,
        binding_mods;
    if (binding) {
        [binding_key, binding_mods] = Gtk.accelerator_parse(binding);
    } else {
        [binding_key, binding_mods] = [0, 0];
    }
    model.set(model_row, [0, 1], [binding_mods, binding_key]);

    let cellrend = builder.get_object("accel_shortcut_keybind");

    cellrend.connect('accel-edited',
      function (rend, iter, binding_key, binding_mods) {
        let value = Gtk.accelerator_name(binding_key, binding_mods);
        let [succ, iterator] = model.get_iter_from_string(iter);

        if (!succ) {
            throw new Error("Error updating keybinding");
        }

        model.set(iterator, [0, 1], [binding_mods, binding_key]);
        settings.set_strv('shortcut-keybind', [value]);
      });

    cellrend.connect('accel-cleared',
      function (rend, iter, binding_key, binding_mods) {
        let [succ, iterator] = model.get_iter_from_string(iter);

        if (!succ) {
            throw new Error("Error clearing keybinding");
        }

        model.set(iterator, [0, 1], [0, 0]);
        settings.set_strv('shortcut-keybind', []);
      });

    settings.connect('changed::shortcut-keybind', function (k, b) {
        let binding = settings.get_strv('shortcut-keybind')[0];
        let binding_key = binding_mods = 0;
        if (binding) {
            [binding_key, binding_mods] = Gtk.accelerator_parse(binding);
        }
        model.set(model_row, [0, 1], [binding_mods, binding_key]);
    });

/* ++++++++++++++++++++++++++++++++++++ End: Keyboard accelerator +++++ */

    ['shortcut-delay',
    ].forEach(function (s) {
        let settings_spin = builder.get_object("spin_" + s.replace(/-/g, "_"));
        settings_spin.set_value(settings.get_double(s));
        settings_spin.connect('value-changed', function (w) {
            settings.set_double(s, w.get_value());
        });
        settings.connect('changed::' + s, function (k,b) {
            settings_spin.set_value(settings.get_double(b));
        });
    });

    ['shortcut-toggles',
    ].forEach(function (s) {
        let settings_onoff = builder.get_object("toggle_" + s.replace(/-/g, "_"));
        settings_onoff.set_active(settings.get_boolean(s))
        settings_onoff.connect('notify::active', function (w) {
            settings.set_boolean(s, w.active);
        });
        settings.connect('changed::' + s, function (k,b) {
            settings_onoff.set_active(settings.get_boolean(b));
        });
    });

/******************************************************************************
 ************************************** Section Intellihide *******************
 ******************************************************************************/

    ['enable-intellihide',
     'enable-active-window',
    ].forEach(function (s) {
        let settings_onoff = builder.get_object("toggle_" + s.replace(/-/g, "_"));
        settings_onoff.set_active(settings.get_boolean(s))
        settings_onoff.connect('notify::active', function (w) {
            settings.set_boolean(s, w.active);
        });
        settings.connect('changed::' + s, function (k,b) {
            settings_onoff.set_active(settings.get_boolean(b));
        });
    });

    if (!isGtk4) {
        frame.show_all();
    }
    return frame;
}
