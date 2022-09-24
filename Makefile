.PHONY: help render-gitbook
.DEFAULT_GOAL := help
.ROOT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
.USER_ID := $(shell id -u)

help:
    @grep -E '(^[a-zA-Z_-]+:.*?##.*$$)|(^##)' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[32m%-30s\033[0m %s\n", $$1, $$2}' | sed -e 's/\[32m##/[33m/'

render-gitbook:
	rm -R -f $(.ROOT_DIR)/_book
	docker run --rm --volume /etc/passwd:/etc/passwd:ro --user $(.USER_ID) --mount src=$(.ROOT_DIR),target=/book,type=bind fsbcgubt/docker-bookdown:latest Rscript -e "bookdown::render_book('index.Rmd', 'bookdown::gitbook')"