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

var DEBUG = function (message) {
    // Enable for debugging purposes.
    if(false) global.log(Date().substr(16,8) + " [hidetopbar]: " + message);
}

// try to simplify global signals handling
var GlobalSignalsHandler = class HideTopBar_GlobalSignalsHandler {
    constructor() {
        this._signals = new Object();
    }

    add(/*unlimited 3-long array arguments*/){
        this._addSignals('generic', arguments);
    }

    destroy() {
        for( let label in this._signals )
            this.disconnectWithLabel(label);
    }

    addWithLabel(label /* plus unlimited 3-long array arguments*/) {
        // skip first element of thearguments array;
        let elements = new Array;
        for(let i = 1 ; i< arguments.length; i++)
            elements.push(arguments[i]);
        this._addSignals(label, elements);
    }

    _addSignals(label, elements) {
        if(this._signals[label] == undefined)
            this._signals[label] = new Array();
        for( let i = 0; i < elements.length; i++ ) {
            let object = elements[i][0];
            let event = elements[i][1];
            let id = object.connect(event, elements[i][2]);
            this._signals[label].push( [ object , id ] );
        }
    }

    disconnectWithLabel(label) {
        if(this._signals[label]) {
            for( let i = 0; i < this._signals[label].length; i++ ) {
                this._signals[label][i][0].disconnect(this._signals[label][i][1]);
            }
            delete this._signals[label];
        }
    }
};

