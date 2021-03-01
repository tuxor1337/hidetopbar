SHELL := /bin/bash

JS_FILES = $(shell echo {extension,convenience,intellihide,panelVisibilityManager,prefs}.js)

LOCALES_PO = $(wildcard locale/*/*/*.po)
LOCALES_MO = $(patsubst %.po,%.mo,$(LOCALES_PO))

.PHONY: distclean clean all

all: hidetopbar.zip

schemas/gschemas.compiled:
	glib-compile-schemas --strict ./schemas/

hidetopbar.zip: schemas/gschemas.compiled $(LOCALES_MO)
	zip hidetopbar.zip -r COPYING.txt $(JS_FILES) metadata.json $(LOCALES_MO) schemas Settings.ui

clean:
	rm -rf hidetopbar.zip schemas/gschemas.compiled ${LOCALES_MO}

distclean: clean
	rm -rf locale/hidetopbar.pot-stamp

%.mo: %.po locale/hidetopbar.pot locale/hidetopbar.pot-stamp
	msgfmt -c -o $@ $<

locale/hidetopbar.pot locale/hidetopbar.pot-stamp : $(JS_FILES) Settings.ui
	xgettext --output=./locale/hidetopbar.pot --language=JavaScript $(JS_FILES)
	intltool-extract --type=gettext/glade Settings.ui
	xgettext -k --keyword=_ --keyword=N_ --join-existing \
	         -o ./locale/hidetopbar.pot Settings.ui.h
	rm Settings.ui.h
	touch locale/hidetopbar.pot-stamp
