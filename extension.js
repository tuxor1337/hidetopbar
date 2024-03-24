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

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import * as PanelVisibilityManager from './panelVisibilityManager.js';
import * as Convenience from './convenience.js';
const DEBUG = Convenience.DEBUG;

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

let mSettings = null;
let mPVManager = null;
let monitorIndex = null;

export default class HideTopBarExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        console.log(`Initiating ${this.uuid}`);
    }

    enable() {
        DEBUG("enable()");
        mSettings = this.getSettings();
        monitorIndex = Main.layoutManager.primaryIndex;
        mPVManager = new PanelVisibilityManager.PanelVisibilityManager(
            mSettings, monitorIndex,
        );
    }

    disable() {
        DEBUG("disable()");
        mPVManager.destroy();

        mPVManager = null;
        mSettings = null;
    }
}
