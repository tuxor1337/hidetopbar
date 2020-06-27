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

const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const PanelVisibilityManager = Me.imports.panelVisibilityManager;
const DEBUG = Me.imports.convenience.DEBUG;

let mSettings = null;
let mPVManager = null;
let monitorIndex = null;

function init() { }

function enable() {
    DEBUG("enable()");
    mSettings = ExtensionUtils.getSettings();
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
