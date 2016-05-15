_%.js : %.wppl
	@webppl "$<" --require . --require underscore --require console.table --compile --out "$@"
	@sed -i -e 's/var console\.table/var consoleTable/' examples/_coin.js
