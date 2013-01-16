# Set default report output to spec
R = spec

.PHONY: test
test:
	mocha --compilers coffee:coffee-script -R $(R)

.PHONY: clear_nation_lists
clear_nation_lists:
	coffee scripts/clear_nation_lists.coffee
