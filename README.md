About:
------

Hides Gnome's topbar except in overview mode.
* https://extensions.gnome.org/extension/545/hide-top-bar/
* https://github.com/mlutfy/hidetopbar

Maintained by Thomas Vogt.
With contributions by Philip Witte and Mathieu Lutfy.

Installing from gnome.org:
--------------------------

The recommended way of installing Hide Top Bar is via the official builds on
[gnome.org/.../hide-top-bar/](https://extensions.gnome.org/extension/545/hide-top-bar/).

If you're installing via a Chrome browser, make sure you read the
[GNOME Shell integration for Chrome Installation
Guide](https://wiki.gnome.org/Projects/GnomeShellIntegrationForChrome/Installation).

Local installation:
-------------------

If you insist on installing from source, check out the source code into your local extensions directory, compile by running `make`, install and restart GNOME Shell. Example:

    cd ~/.local/share/gnome-shell/extensions/
    git clone https://github.com/mlutfy/hidetopbar.git hidetopbar@mathieu.bidon.ca
    cd hidetopbar@mathieu.bidon.ca
    make
    cd ..
    gnome-extensions enable hidetopbar@mathieu.bidon.ca
    gnome-shell --replace &
    
The last commandline restarts GNOME Shell.

Updating the language strings:
------------------------------

Whenever you notice that there are localizable strings in Hide Top Bar that are not
covered by the strings in `./locale/`, you can regenerate the `*.pot`-file using the
following command:

    xgettext --output=./locale/hidetopbar.pot --language=JavaScript *.js

License:
--------

Copyright (c) 2013-2020 Thomas Vogt.

Copyright (c) 2012-2013 Mathieu Lutfy.

Copyright (c) 2012 Philip Witte.

This program is free software; you can redistribute it and/or
modify it under the terms of VERSION 2 of the GNU General Public
License as published by the Free Software Foundation provided
that the above copyright notice is included.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
Go to http://www.gnu.org/licenses/gpl-2.0.html to get a copy
of the license.
