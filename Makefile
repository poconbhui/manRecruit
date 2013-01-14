# Set default report output to spec
R = spec

.PHONY: test
test:
	mocha --compilers coffee:coffee-script -R $(R)
