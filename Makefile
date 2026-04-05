.PHONY: help render-gitbook render-pwa install-deps build-ts copy-pwa-assets clean-pwa clean
.DEFAULT_GOAL := help
.ROOT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
.USER_ID := $(shell id -u)

# BASE_PATH: URL prefix for PWA resources
# - Default (local development): Empty for root-relative paths
# - Production (GitHub Pages): BASE_PATH=/erstizeitung
BASE_PATH ?=

help:
	@grep -E '(^[a-zA-Z_-]+:.*?##.*$$)|(^##)' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[32m%-30s\033[0m %s\n", $$1, $$2}' | sed -e 's/\[32m##/[33m/'

render-gitbook: ## Render GitBook (Docker)
	rm -R -f $(.ROOT_DIR)/_book
	docker run --rm --volume /etc/passwd:/etc/passwd:ro --user $(.USER_ID) --mount src=$(.ROOT_DIR),target=/book,type=bind ghcr.io/fsbcg-ubt/docker-bookdown:latest Rscript -e "bookdown::render_book('index.Rmd', 'bookdown::gitbook')"

install-deps: ## Install Node.js dependencies
	@cd pwa && (npm ci || npm install)

build-ts: ## Compile TypeScript to JavaScript
	@cd pwa && npm run build

copy-pwa-assets: build-ts ## Copy PWA assets to _book
	@mkdir -p _book/icons
	@cp -r pwa/icons/* _book/icons/ 2>/dev/null || true

render-pwa: render-gitbook install-deps copy-pwa-assets ## Render GitBook + inject PWA
	@cd pwa && BASE_PATH=$(BASE_PATH) npx workbox-cli@7.3.0 generateSW dist/workbox-config.cjs
	@BASE_PATH=$(BASE_PATH) node pwa/dist/inject-html.js
	@echo "✅ PWA build complete!"

clean-pwa: ## Remove PWA files from _book/
	@rm -f _book/manifest.json _book/service-worker.js _book/register-sw.js _book/workbox-*.js
	@rm -f _book/offline-indicator.js _book/install-button.js
	@rm -f _book/pwa-styles.css _book/offline.html
	@rm -rf _book/icons

clean: ## Remove all generated files
	@rm -rf _book/
