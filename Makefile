SHELL := /bin/bash

JS_FILES = $(shell echo {extension,convenience,intellihide,panelVisibilityManager,prefs}.js)
UI_FILES = $(shell echo {Settings-40,Settings}.ui)

LOCALES_PO = $(wildcard locale/*/*/*.po)
LOCALES_MO = $(patsubst %.po,%.mo,$(LOCALES_PO))

.PHONY: distclean clean all

all: hidetopbar.zip

schemas/gschemas.compiled:
	glib-compile-schemas --strict ./schemas/

hidetopbar.zip: schemas/gschemas.compiled $(LOCALES_MO)
	zip hidetopbar.zip -r COPYING.txt $(JS_FILES) metadata.json $(LOCALES_MO) schemas Settings.ui Settings-40.ui

clean:
	rm -rf hidetopbar.zip schemas/gschemas.compiled ${LOCALES_MO}

distclean: clean
	rm -rf locale/hidetopbar.pot-stamp

%.mo: %.po locale/hidetopbar.pot locale/hidetopbar.pot-stamp
	msgfmt -c -o $@ $<

locale/hidetopbar.pot locale/hidetopbar.pot-stamp : $(UI_FILES)
	xgettext --copyright-holder="Thomas Vogt" \
			 --package-name="Hide Top Bar" \
			 --output=locale/hidetopbar.pot \
			 $(JS_FILES) $(UI_FILES)
	touch locale/hidetopbar.pot-stamp
