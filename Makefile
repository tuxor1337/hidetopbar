SHELL := /bin/bash

JS_FILES = $(shell echo {extension,convenience,intellihide,panelVisibilityManager,prefs}.js)

.PHONY: clean all

all: hidetopbar.zip

schemas/gschemas.compiled:
	glib-compile-schemas --strict ./schemas/

hidetopbar.zip: schemas/gschemas.compiled
	zip hidetopbar.zip -r COPYING.txt $(JS_FILES) metadata.json locale/*/*/*.mo schemas

clean:
	rm -rf hidetopbar.zip schemas/gschemas.compiled

%.mo: %.po locale/hidetopbar.pot
	msgfmt -c -o $@ $<
