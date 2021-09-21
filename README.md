About Hide Top Bar
------------------

This GNOME extension helps to hide GNOME's top bar when it gets into your way.

In the extension's preferences, different behaviors can be specified: unhiding on mouse-over or on pressing a keyboard shortcut, or when no window requires the space.

![clip](https://user-images.githubusercontent.com/1518387/115446545-a6201500-a217-11eb-84f9-abbcd3251a10.gif)

Installation from extensions.gnome.org
--------------------------------------

Unless you are on Debian or Ubuntu (see section below), the recommended way of installing Hide Top Bar is via the official builds on
[extensions.gnome.org/.../hide-top-bar/](https://extensions.gnome.org/extension/545/hide-top-bar/).

If you're installing via a Chrome browser, make sure you read the
[GNOME Shell integration for Chrome Installation Guide](https://wiki.gnome.org/Projects/GnomeShellIntegrationForChrome/Installation).


[Debian](https://packages.debian.org/unstable/gnome-shell-extension-autohidetopbar)/[Ubuntu](https://launchpad.net/ubuntu/+source/gnome-shell-extension-autohidetopbar)
---------------

If you are using a Debian based distribution, the preferred installation method is to use 
the packaged version. By this, compatibility problems caused by different gnome-shell versions in
your distribution can be avoided. You can install the package with:

    sudo apt install gnome-shell-extension-autohidetopbar

If you find problems with the _Debian packaged version_, please file bugs at
the [Debian Bugtracking system](https://www.debian.org/Bugs/Reporting).

Installation from source
------------------------

If you insist on installing from source, the commands `xgettext` and `msgfmt`
from the `gettext` package (package name may vary depending on your
distribution) are required.

The procedure to install from source is as follows: Check out the source code into your local
extensions directory, compile by running `make`, install and restart GNOME Shell. For example:

    cd ~/.local/share/gnome-shell/extensions/
    git clone https://github.com/mlutfy/hidetopbar.git hidetopbar@mathieu.bidon.ca
    cd hidetopbar@mathieu.bidon.ca
    make
    cd ..
    gnome-extensions enable hidetopbar@mathieu.bidon.ca
    gnome-shell --replace &

The last commandline restarts GNOME Shell.


Updating the language strings
-----------------------------

Whenever you notice that there are localizable strings in Hide Top Bar that are not
covered by the strings in `./locale/`, you can regenerate the `*.pot`-file using the
following command:

    make ./locale/hidetopbar.pot

As mentioned in the previous section, running `make` requires the `gettext` package
 to be installed (the package names may vary depending on your distribution).

License
-------

Copyright (c) 2013-2021 Thomas Vogt.

Copyright (c) 2012-2013 Mathieu Lutfy.

Copyright (c) 2012 Philip Witte.

Hide Top Bar is free software: you can redistribute it and/or modify it under the terms of the
GNU General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

Hide Top Bar is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Hide Top Bar (see COPYING.txt).
If not, see gnu.org/licenses/.
