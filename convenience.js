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

import GLib from 'gi://GLib';
import Meta from 'gi://Meta';

export const DEBUG = function (message) {
    // Enable for debugging purposes.
    if(false) console.log(Date().substr(16,8) + " [hidetopbar]: " + message);
}

// Central place for everything that has to be undone on destroy(): signal
// connections, timeouts and arbitrary undo functions. Entries are grouped by
// a label (any value, e.g. a string or a window actor).
export class GlobalSignalsHandler {
    constructor() {
        this._entries = new Map();
    }

    add(/*unlimited 3-long array arguments*/){
        this._addSignals('generic', arguments);
    }

    // Labels are undone newest first, and so are the entries of one label.
    // An undo that throws is logged and does not stop the others.
    destroy() {
        for( let label of [...this._entries.keys()].reverse() )
            this.disconnectWithLabel(label);
    }

    addWithLabel(label /* plus unlimited 3-long array arguments*/) {
        // skip first element of thearguments array;
        let elements = new Array;
        for(let i = 1 ; i< arguments.length; i++)
            elements.push(arguments[i]);
        this._addSignals(label, elements);
    }

    // Like GLib.timeout_add(), the callback's return value is kept. The entry
    // goes away when the source removes itself.
    addTimeout(label, ms, callback) {
        let entry = null;
        const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
            let result = false;
            try {
                result = callback();
            } finally {
                if (!result)
                    this._removeEntry(label, entry);
            }
            return result;
        });
        entry = () => GLib.source_remove(id);
        this._pushEntry(label, entry);
    }

    addUndo(label, undo) {
        this._pushEntry(label, undo);
    }

    has(label) {
        return this._entries.has(label);
    }

    _addSignals(label, elements) {
        for( let i = 0; i < elements.length; i++ ) {
            const object = elements[i][0];
            let id = object.connect(elements[i][1], elements[i][2]);
            this._pushEntry(label, () => object.disconnect(id));
        }
    }

    _pushEntry(label, undo) {
        if(!this._entries.has(label))
            this._entries.set(label, new Array());
        this._entries.get(label).push(undo);
    }

    _removeEntry(label, undo) {
        const list = this._entries.get(label);
        if(!list)
            return;
        const index = list.indexOf(undo);
        if(index >= 0)
            list.splice(index, 1);
        if(list.length == 0)
            this._entries.delete(label);
    }

    disconnectWithLabel(label) {
        const list = this._entries.get(label);
        if(!list)
            return;
        this._entries.delete(label);
        while(list.length > 0) {
            try {
                list.pop()();
            } catch(e) {
                logError(e, 'hidetopbar: undo failed');
            }
        }
    }
};

export function getMonitorManager() {
    if (global.backend.get_monitor_manager !== undefined)
        return global.backend.get_monitor_manager();
    else
        return Meta.MonitorManager.get();
}

