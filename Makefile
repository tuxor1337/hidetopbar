
JS_FILES = {extension,convenience,intellihide,panelVisibilityManager,prefs}.js

.PHONY: clean all

all: hidetopbar.zip

schemas:
	mkdir ./schemas/
	glib-compile-schemas --strict --targetdir=./schemas/ .

hidetopbar.zip: schemas
	zip hidetopbar.zip -r $(JS_FILES) metadata.json locale/*/*/*.mo schemas

clean:
	rm -rf hidetopbar.zip schemas
