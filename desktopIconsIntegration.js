/* DING: Desktop Icons New Generation for GNOME Shell
 *
 * Copyright (C) 2021 Sergio Costas (rastersoft@gmail.com)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*******************************************************************************
 * Integration class
 *
 * This class must be added to other extensions in order to integrate
 * them with Desktop Icons NG. It allows an extension to notify how much margin
 * it uses in each side of each monitor.
 *
 * DON'T SEND PATCHES TO THIS FILE TO THE EXTENSION MAINTAINER. SEND THEM TO
 * DESKTOP ICONS NG MAINTAINER: https://gitlab.com/rastersoft/desktop-icons-ng
 *
 * To use it in your own extension, you must declare a global variable in the
 * extension.js file as:
 *
 *     const DesktopIconsIntegration = Me.imports.desktopIconsIntegration;
 *     var DesktopIconsUsableArea;
 *
 * That global variable MUST have that specific name, because DING (or other
 * programs using this method) will search for that, unless your init() function
 * returns a class, in which case you can avoid creating that variable.
 *
 * Then, in the *enable()* function, create a *DesktopIconsUsableAreaClass()*
 * object with
 *
 *     new DesktopIconsIntegration.DesktopIconsUsableAreaClass(object);
 *
 * (it will automagically assign itself to the previous variable, so you can
 * just call to *new()* without assigning it to any variable). The object
 * parameter must be the extension object ("this") if your init function returns
 * an object, or NULL if your *enable()* and *disable()* functions are in the
 * extension.js file.
 *
 * Now, in the *disable()* function just call to
 *
 *     DesktopIconsUsableArea.destroy();
 *
 * if *init()* doesn't return an object, or
 *
 *     this.DesktopIconsUsableArea.destroy();
 *
 * if it does return an object with the extension and *disable()* is a method.
 *
 * In your code, every time you change the margins, you should call first to
 *
 *     Me.imports.extension.DesktopIconsUsableArea.resetMargins();
 *
 * to clear the current margins, and then call to
 *
 *     Me.imports.extension.DesktopIconsUsableArea.setMargins(...);
 *
 * (with *Me* defined with *const Me = ExtensionUtils.getCurrentExtension();*)
 * as many times as you need to set the margins in each monitor. You don't need
 * to call it for all the monitors, only for those where you paint something.
 * If you don't set values for a monitor, they will be considered zero.
 *
 * Of course, if your *init()* function returns an object, you should call
 * instead to
 *
 *     this.DesktopIconsUsableArea.resetMargins();
 *     this.DesktopIconsUsableArea.setMargins(...);
 *
 *******************************************************************************/

const Signals = imports.signals;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var DesktopIconsUsableAreaClass = class {
    /**
     *
     * @param {Object} container The extension object if init() returns an object,
     *                           or NULL if the enable() and disable() methods
     *                           are functions in the extension.js file.
     */
    constructor(container) {
        this._version = 1;
        // This UUID allows to ensure that the object is really a DesktopIconsIntegration object
        this._uuid = "21a63db8-e654-4fea-9ab3-acd49e427834";
        if (container) {
            this._container = container;
        } else {
            this._container = Me.imports.extension;
        }
        this._container.DesktopIconsUsableArea = this;
        this._margins = {};
    }

    /**
     * Sets or updates the top, bottom, left and right margins for a
     * monitor.
     *
     * @param {int} monitor Monitor number to which set the margins.
     *                      A negative value means "the primary monitor".
     * @param {int} top Top margin in pixels
     * @param {int} bottom Bottom margin in pixels
     * @param {int} left Left margin in pixels
     * @param {int} right Right margin in pixels
     */
    setMargins(monitor, top, bottom, left, right) {
        this._margins[monitor] = {
            'top': top,
            'bottom': bottom,
            'left': left,
            'right': right
        };
        // it doesn't matter that this signal gets emitted several times,
        // because the receiver does a time-filtering: if it receives several
        // signals in a short time interval, it will ignore all but the last one.
        this.emit('margins-changed');
    }

    /**
     * Clears the current margins. Must be called before configuring the monitors
     * margins with setMargins().
     */
    resetMargins() {
        this._margins = {};
        this.emit('margins-changed');
    }

    get margins() {
        return this._margins;
    }

    get version() {
        return this._version;
    }

    get uuid() {
        return this._uuid;
    }
    destroy() {
        this.emit('destroy');
        this._container.DesktopIconsUsableArea = null;
    }
}
Signals.addSignalMethods(DesktopIconsUsableAreaClass.prototype);
