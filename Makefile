SHELL := /bin/bash

JS_FILES = {extension,convenience,intellihide,panelVisibilityManager,prefs}.js

.PHONY: clean all

all: hidetopbar.zip

schemas/gschemas.compiled:
	glib-compile-schemas --strict ./schemas/

hidetopbar.zip: schemas/gschemas.compiled
	zip hidetopbar.zip -r $(JS_FILES) metadata.json locale/*/*/*.mo schemas

clean:
	rm -rf hidetopbar.zip schemas/gschemas.compiled
