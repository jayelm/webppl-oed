_%.js : examples/%.wppl src/oed.wppl
	@webppl "$<" --require . --require underscore --require console.table --require babyparse --compile --out "$@"
	@sed -i -e 's/var console\.table/var consoleTable/' "$@"
