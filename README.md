About:
------

Hides Gnome's topbar except in overview mode.
* https://extensions.gnome.org/extension/545/hide-top-bar/
* https://github.com/mlutfy/hidetopbar

Maintained by Thomas Vogt.
With contributions by Philip Witte and Mathieu Lutfy.
Tested on Gnome 3.6.1.

Installation:
-------------

Compile the gsettings schema by running

    mkdir ./schemas/
    glib-compile-schemas --strict --targetdir=./schemas/ .

Install this in your extensions directory:

    ~/.local/share/gnome-shell/extensions/
    
Example:

    cd ~/.local/share/gnome-shell/extensions/
    git clone https://github.com/mlutfy/hidetopbar.git hidetopbar@mathieu.bidon.c
    cd hidetopbar@mathieu.bidon.ca
    mkdir ./schemas/
    glib-compile-schemas --strict --targetdir=./schemas/ .
    gnome-shell-extension-tool -e hidetopbar@mathieu.bidon.ca
    
You can also manage extensions from https://extensions.gnome.org/local/

License:
--------

Copyright (c) 2012-2013 minor tweaks and maintenance by Mathieu Lutfy.

Copyright (c) 2012 major fix by Philip Witte.

Copyright (c) 2013 major fixes by Thomas Vogt.

This program is free software; you can redistribute it and/or
modify it under the terms of VERSION 2 of the GNU General Public
License as published by the Free Software Foundation provided
that the above copyright notice is included.
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
Go to http://www.gnu.org/licenses/gpl-2.0.html to get a copy
of the license.
