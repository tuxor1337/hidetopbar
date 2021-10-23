/*
 * The code in this file is distributed under a "1-clause BSD license",
 * which makes it compatible with GPLv2 and GPLv3 too, and others.
 *
 * License text:
 *
 * Copyright (C) 2021 Sergio Costas (rastersoft@gmail.com)
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
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
