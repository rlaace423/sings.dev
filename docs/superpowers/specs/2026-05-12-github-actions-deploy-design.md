# GitHub Actions build + deploy for sings.dev — Design

**Date:** 2026-05-12

## Goal

Move the build of sings.dev from Cloudflare's build environment into a GitHub Actions runner, and reduce Cloudflare's role to hosting the prebuilt assets via `wrangler deploy`.

The immediate driver is `rehype-mermaid` (added 2026-05-10): it spawns headless Chromium at build time, and Cloudflare's build base image is missing GUI system libraries (`libatk-1.0.so.0`, etc.). Every mermaid post fails its markdown parse during the CF build, ships with an empty `<main>`, and the failure isn't blocking enough to abort the deploy — so the broken page goes live. Cloudflare doesn't expose `sudo apt-get`, so `playwright install --with-deps` is not an option there.

This decision also retires the previous spec's incorrect assumption that "system fonts and libs are assumed to come from the build host's base image." A typical headless build container has no GUI stack — that assumption was load-bearing in the wrong direction.

## Decision

- **Runner**: `ubuntu-latest` on GitHub Actions — has Chromium's system dependencies, Node 24, npm, and is sized for this build.
- **Trigger**: `push` to `main` only. PR builds deferred (no secret exposure surface, no immediate PR-only verification need).
- **Workflow file**: `.github/workflows/deploy.yml`.
- **Steps**: checkout → setup-node (Node 24, npm cache) → cache Playwright Chromium → install `fonts-noto-cjk` (Korean glyph metrics for mermaid build) → `npm ci` (postinstall handles Chromium) → `npm run build` → `npx wrangler deploy`.
- **Secrets**: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` — both required, because `wrangler.jsonc` does not pin `account_id`.
- **Concurrency**: `group: deploy-${{ github.ref }}`, `cancel-in-progress: false` — serialize back-to-back pushes, never kill an in-flight deploy.
- **Permissions**: `contents: read` — minimal; the job only checks out source and pushes to Cloudflare.
- **Cloudflare side**: after the workflow is live, the existing git-connected automatic build for the `sings-dev` Workers project is disabled by the author, so Cloudflare stops attempting (and failing) parallel builds.

## Why

- **GitHub Actions over CF build**: ubuntu-latest already has the Chromium system deps CF's image lacks. Fixing CF would require either committing prerendered SVGs (manual regen on every change, source-truth drift) or vendoring Chromium deps into a custom build image (CF's build environment doesn't expose enough of the image layer to make this clean). Moving the build sidesteps both.
- **Over Vercel/Netlify migration**: would move DNS and decouple sings.dev from other Cloudflare services in use. Build-environment fix doesn't justify host migration.
- **Over a homelab (Proxmox) runner**: GitHub Actions has zero operational overhead — no machine to maintain, no network exposure, no on-call when it breaks at 2am.
- **`ubuntu-latest`, not a pinned image version**: deploys are not release artifacts; tracking GitHub's current LTS image keeps the build deps fresh without manual bumps. If a future ubuntu-latest update breaks the build, that's a small, isolated fix.
- **Playwright Chromium cache keyed on `package-lock.json`**: when the `playwright` package version changes (via lockfile), the cache key changes and the postinstall re-downloads the matching binary. No version drift between the npm package and the cached binary.
- **Separate secrets for token and account_id**: `account_id` is not strictly secret (it's an identifier), but GitHub Secrets is the standard env-var injection mechanism for Actions and keeps both values out of the repo. The alternative — pinning `account_id` in `wrangler.jsonc` — is slightly cheaper but pulls a CF-specific identifier into source. Secret keeps the repo host-agnostic.
- **`cancel-in-progress: false`**: `wrangler deploy` is short (~10-30s). Canceling an in-flight deploy to start the next push risks two overlapping deploys racing the same project. Serial-strict is safer for a deploy queue this small.
- **No pre-deploy test step in the workflow (yet)**: the existing test suite runs locally as part of the pre-deploy checklist in `docs/spec-deploy.md`. Adding `npm test` to the workflow is a one-line follow-up that doesn't gate this work; deferring keeps the first version of the workflow minimal.

## Architecture

### Workflow file

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches:
      - main

permissions:
  contents: read

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - name: Cache Playwright Chromium
        uses: actions/cache@v5
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}
      # CJK glyphs for rehype-mermaid text-width measurement at build time;
      # see Fonts section in docs/spec-mermaid-diagrams.md.
      - name: Install CJK fonts for mermaid build
        run: |
          sudo apt-get update
          sudo apt-get install -y --no-install-recommends fonts-noto-cjk
      - run: npm ci
      - run: npm run build
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### Secret provisioning (manual, post-merge)

The workflow file can be committed first; manual steps follow.

1. **CF API token**: CF Dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template (or custom: `Account.Workers Scripts:Edit`, `Account.Account Settings:Read`). Copy the token.
2. **GitHub secrets**: repo → Settings → Secrets and variables → Actions → New repository secret. Add:
   - `CLOUDFLARE_API_TOKEN` — the token from step 1.
   - `CLOUDFLARE_ACCOUNT_ID` — the account ID visible in CF Dashboard's right sidebar.
3. **Disable CF auto-build**: CF Dashboard → Workers & Pages → `sings-dev` → Settings → Builds & deployments → disable the git-connected automatic build (or clear the build command). This prevents Cloudflare from continuing to retry the broken Chromium build in parallel with the GitHub Actions one.

Order: it's safe to commit the workflow before the secrets exist. The first push will run the workflow, build succeed, and the `wrangler deploy` step will fail with a clear "missing token" error. After secrets are registered, an empty commit (`git commit --allow-empty -m "trigger deploy"`) or any subsequent push completes the deploy.

### Spec touch-ups

Three existing docs carry incorrect assumptions or stale "no automation" statements:

- **`docs/spec-deploy.md`** — currently says "There is no GitHub Actions workflow yet; deploys run from a developer machine" and lists the workflow as Future Work. Update to: workflow is the primary deploy path; manual `npx wrangler deploy` from a dev machine remains documented as the rollback path.
- **`docs/spec-mermaid-diagrams.md`** — the "Build environment" / "CI/CD note" paragraph implies the build happens on Cloudflare. Replace with: build runs on GitHub Actions (ubuntu-latest provides the system deps), postinstall handles Chromium, Playwright cache via Actions cache.
- **`docs/superpowers/specs/2026-05-10-mermaid-diagrams-design.md`** — the "Build dependency" decision carries the incorrect base-image assumption, and the "Out of scope" item plus "Author follow-up (Cloudflare Pages)" section are now obsolete. Add a dated correction note: deploy moved to GitHub Actions on 2026-05-12 because CF's base image cannot launch Chromium; the original "Author follow-up" predictions about apt-installing system libs were not actionable on CF.

## Verification target

After workflow is committed, secrets are set, and CF auto-build is disabled:

- `git push origin main` triggers `Deploy to Cloudflare` workflow in the GitHub Actions tab.
- Workflow completes green. Build log shows the two mermaid posts (`ko/purpose-driven-systems`, `en/purpose-driven-systems`) rendering without `[ERROR] [glob-loader]` errors.
- `curl -sL https://sings.dev/posts/purpose-driven-systems/ | grep -o '<picture' | wc -l` returns the number of mermaid diagrams in the post (2 for this post). Previously: 0 (the parse failed before any rendering).
- Incognito browser load of `https://sings.dev/posts/purpose-driven-systems/` shows both diagrams in the dawn/night palette. Theme toggle flips them alongside the rest of the page (existing manual-toggle hook from the 2026-05-10 design).
- Cloudflare Dashboard → `sings-dev` deploy history shows the new deploy associated with the GitHub Actions run, and no further "build failed" entries from the disabled CF auto-build path.
- A no-op push afterwards (e.g., empty commit) completes in under ~1 minute thanks to cache hits on both npm and Playwright Chromium.

## Scope

### In scope

- New `.github/workflows/deploy.yml`.
- Spec touch-ups in `docs/spec-deploy.md`, `docs/spec-mermaid-diagrams.md`, and `docs/superpowers/specs/2026-05-10-mermaid-diagrams-design.md`.
- Documenting the manual one-time setup (CF token, GH secrets, disabling CF auto-build) so the author can complete it after the workflow lands.

### Out of scope

- **PR build workflow** — defer until there's a concrete reason (e.g., a regression a PR build would have caught).
- **Pre-deploy `npm test` gate in the workflow** — keep the test suite as part of the local pre-deploy checklist for now; can be added as a one-line follow-up.
- **Wrangler version bumps / compat date changes** — orthogonal.
- **Slack/email/webhook notifications on deploy failure** — GitHub's default email-on-failure is enough for a single-maintainer project.
- **Rollback automation** — manual rollback via CF Dashboard (retains previous versions) or re-deploying a prior commit remains the documented path; no need to automate.
- **Migrating CF Workers config from `wrangler.jsonc` to anywhere else** — current config works.

## Alternatives Considered

| Option | Trade-off | Decision |
|---|---|---|
| Client-side mermaid.js | +700KB JS per page, breaks calm-static posture | ✗ |
| **GitHub Actions build + `wrangler deploy`** | One workflow file, ubuntu-latest has the deps | ✓ |
| Migrate hosting (Vercel/Netlify) | DNS move, decouples from other CF services | ✗ |
| Homelab (Proxmox) build runner | Possible, but ops overhead for a single project | ✗ |
| Commit prerendered SVGs, keep CF build | Manual regen per mermaid edit, source-truth drift | ✗ |
| Vendor Chromium deps in a custom CF build image | CF build env doesn't expose enough of the image layer cleanly | ✗ |

---

After approval and spec self-review, the next step is `superpowers:writing-plans` to produce a step-by-step implementation plan.
