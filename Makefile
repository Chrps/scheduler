SHELL := /bin/bash

# Update if your GitHub repo name changes.
REPO_NAME ?= cleaning-schedular
DIST_DIR ?= dist/$(REPO_NAME)/browser
LOCAL_DB_URL ?= postgresql://postgres:postgres@127.0.0.1:54322/postgres

.PHONY: help install build build-gh-pages verify-404 deploy-ready clean list-users make-admin make-user invite-email

help:
	@echo "Available targets:"
	@echo "  make install       - Install dependencies"
	@echo "  make build         - Standard production build"
	@echo "  make build-gh-pages- Build for GitHub Pages with base href"
	@echo "  make verify-404    - Verify 404.html exists in built output"
	@echo "  make deploy-ready  - Build for GitHub Pages and verify 404"
	@echo "  make list-users    - List Supabase auth users and roles (local DB)"
	@echo "  make invite-email  - Add email to signup allowlist (EMAIL=<email>)"
	@echo "  make make-admin    - Promote user to admin (EMAIL=<email>)"
	@echo "  make make-user     - Demote user to user role (EMAIL=<email>)"
	@echo "  make clean         - Remove dist output"

install:
	npm ci

build:
	npm run build -- --configuration production

build-gh-pages:
	npm run build -- --configuration production --base-href /$(REPO_NAME)/

verify-404:
	@test -f "$(DIST_DIR)/404.html" || (echo "Missing $(DIST_DIR)/404.html" && exit 1)
	@echo "Found $(DIST_DIR)/404.html"

deploy-ready: build-gh-pages verify-404
	@echo "Build is ready for GitHub Pages deployment."

list-users:
	@psql "$(LOCAL_DB_URL)" -c "select p.id, coalesce(p.email, u.email) as email, p.role, p.created_at from public.profiles p left join auth.users u on u.id = p.id order by p.created_at;"

invite-email:
	@test -n "$(EMAIL)" || (echo "Usage: make invite-email EMAIL=you@example.com" && exit 1)
	@psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -c "insert into public.signup_allowlist (email) values (lower('$(EMAIL)')) on conflict (email) do update set created_at = now();"
	@psql "$(LOCAL_DB_URL)" -c "select email, created_at from public.signup_allowlist where lower(email) = lower('$(EMAIL)');"

make-admin:
	@test -n "$(EMAIL)" || (echo "Usage: make make-admin EMAIL=you@example.com" && exit 1)
	@psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -c "update public.profiles set role = 'admin' where lower(email) = lower('$(EMAIL)');"
	@psql "$(LOCAL_DB_URL)" -c "select id, email, role from public.profiles where lower(email) = lower('$(EMAIL)');"

make-user:
	@test -n "$(EMAIL)" || (echo "Usage: make make-user EMAIL=you@example.com" && exit 1)
	@psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -c "update public.profiles set role = 'user' where lower(email) = lower('$(EMAIL)');"
	@psql "$(LOCAL_DB_URL)" -c "select id, email, role from public.profiles where lower(email) = lower('$(EMAIL)');"

clean:
	rm -rf dist
