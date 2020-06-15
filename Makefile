# This Makefile is a wrapper around the scripts from `package.json`.
# https://github.com/lgarron/Makefile-scripts

# Note: the first command becomes the default `make` target.
NPM_COMMANDS = build build-binary build-web build-main dev-web clean prepack

.PHONY: $(NPM_COMMANDS)
$(NPM_COMMANDS):
	npm run $@

# We write the npm commands to the top of the file above to make shell autocompletion work in more places.
DYNAMIC_NPM_COMMANDS = $(shell cat package.json | npx jq --raw-output ".scripts | keys_unsorted | join(\" \")")
.PHONY: update-Makefile
update-Makefile:
	sed -i "" "s/^NPM_COMMANDS = .*$$/NPM_COMMANDS = ${DYNAMIC_NPM_COMMANDS}/" Makefile

SOURCE_PATH = "./dist/web/"
SFTP_PATH = "towns.dreamhost.com:~/garron.net/app/main-branch"
URL       = "https://garron.net/app/main-branch/"

.PHONY: deploy
deploy: clean build
	rsync -avz \
		--exclude .DS_Store \
		--exclude .git \
		${SOURCE_PATH} \
		${SFTP_PATH}
	echo "\nDone deploying. Go to ${URL}\n"
