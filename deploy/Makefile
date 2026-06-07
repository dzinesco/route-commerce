# =============================================================================
# Makefile — convenience targets around deploy.sh
# =============================================================================
# All targets are wrappers; you can also invoke deploy.sh directly.

SHELL := /usr/bin/env bash
.SHELLFLAGS := -Eeu -o pipefail -c
.SHELLFLAGS_LOG := $(.SHELLFLAGS)

DEPLOY     := ./deploy.sh
HEALTH     := ./healthcheck.sh
WORKSPACE  ?= $(CURDIR)

.PHONY: help
help: ## Show this help message
	@awk 'BEGIN {FS = ":.*##"; printf "Targets:\n"} /^[a-zA-Z_-]+:.*##/ { printf "  %-20s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

.PHONY: deploy
deploy: ## Run a full deploy (build + up + nginx + healthcheck)
	$(DEPLOY)

.PHONY: deploy-verbose
deploy-verbose: ## Deploy with extra logging (PRUNE_IMAGES=0, longer healthcheck)
	PRUNE_IMAGES=0 HEALTHCHECK_TIMEOUT=120 $(DEPLOY)

.PHONY: health
health: ## Run a one-shot health check against the running stack
	WORKSPACE=$(WORKSPACE) $(HEALTH)

.PHONY: health-nginx
health-nginx: ## Health check including the nginx-fronted URL
	WORKSPACE=$(WORKSPACE) $(HEALTH) --nginx

.PHONY: status
status: ## Show current prod ports and running containers
	@echo "PostgREST port:  $$(cat .postgrest-port 2>/dev/null || echo none)"
	@echo "Next.js port:    $$(cat .nextjs-port 2>/dev/null || echo none)"
	@cd deploy && docker compose -p prod-app ps

.PHONY: logs
logs: ## Tail deploy.log
	tail -n 200 -f deploy.log

.PHONY: down
down: ## Stop the production stack (without redeploying)
	cd deploy && docker compose -p prod-app down --remove-orphans

.PHONY: rollback
rollback: ## Restart the previous stack (the one whose ports are still on disk)
	@if [[ ! -f .postgrest-port ]]; then echo "no .postgrest-port to roll back to"; exit 1; fi
	cd deploy && \
	  POSTGREST_HOST_PORT=$$(cat ../.postgrest-port) \
	  NEXTJS_HOST_PORT=$$(cat ../.nextjs-port) \
	  docker compose -p prod-app --env-file ../.env.production up -d
