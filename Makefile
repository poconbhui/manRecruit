.PHONY: start
start:
	npm start

.PHONY: test
test:
	npm test

.PHONY: clean
clean:
	rm -rf mongo_db node_modules *.log builtAssets *.rdb

.PHONY: start_mongo
start_mongo:
	mkdir mongo_db; mongod --dbpath mongo_db
