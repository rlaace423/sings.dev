# GitHub Actions Build + Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move sings.dev's build/deploy from Cloudflare's build environment to GitHub Actions, leaving Cloudflare to host only the prebuilt assets via `wrangler deploy`.

**Architecture:** A single workflow `.github/workflows/deploy.yml` runs on push to `main`, builds on ubuntu-latest (which ships with the Chromium system libraries CF's image lacks), and deploys via `npx wrangler deploy`. Three existing spec docs are updated to reflect the change. Secret provisioning and disabling the old CF auto-build are manual one-time author follow-ups documented in the spec.

**Tech Stack:** GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/cache@v4`), Node 22, Wrangler 4, Playwright Chromium, `rehype-mermaid`.

**Spec:** [docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md](../specs/2026-05-12-github-actions-deploy-design.md)

---

## File map

- **Create:** `.github/workflows/deploy.yml` — CI/CD pipeline (build on ubuntu-latest, deploy via wrangler)
- **Modify:** `docs/spec-deploy.md` — replace "no automation" / "future work" stance with the actual workflow; keep manual `npx wrangler deploy` as the documented rollback path
- **Modify:** `docs/spec-mermaid-diagrams.md` — rewrite the "Build environment" section to reflect GitHub Actions ubuntu-latest and the reason the build was moved
- **Modify:** `docs/superpowers/specs/2026-05-10-mermaid-diagrams-design.md` — annotate the "Build dependency" decision and the "Out of scope (this cycle)" Cloudflare bullet with dated update notes; replace the "Author follow-up (Cloudflare Pages)" section with a retrospective

No source code is touched. No tests are added (the workflow's correctness is verified by the first deploy; the spec edits are markdown).

---

## Task 1: Add the GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/` directory and the workflow file**

Write the following to `.github/workflows/deploy.yml`:

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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Cache Playwright Chromium
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}
      - run: npm ci
      - run: npm run build
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"`

Expected: no output (silent success). Any traceback means the YAML is malformed — fix and re-run.

- [ ] **Step 3: Confirm the file is in place**

Run: `ls -la .github/workflows/deploy.yml`

Expected: file listed, non-zero size.

---

## Task 2: Update `docs/spec-deploy.md`

**Files:**
- Modify: `docs/spec-deploy.md`

- [ ] **Step 1: Re-read the file to confirm exact strings**

Read `docs/spec-deploy.md`. Confirm the "Deploy Command", "Pre-deploy Checklist", "Out of Scope for This Spec", and "Future Work" sections match the strings used in the edits below. If they've drifted, adjust the `old_string` values to match.

- [ ] **Step 2: Update "Deploy Command" section**

Edit `docs/spec-deploy.md`:

Replace:
```
- **Deploy Command**:
  - From the repo root, after a successful build: `npx wrangler deploy`.
  - There is no `deploy` script in `package.json`. Deploys are intentionally manual so that build verification happens explicitly each time.
```

With:
```
- **Deploy Command**:
  - Automatic: pushes to `main` trigger `.github/workflows/deploy.yml`, which runs `npm ci`, `npm run build`, and `npx wrangler deploy` on a GitHub Actions `ubuntu-latest` runner. See [docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md](docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md) for the design rationale (short version: Cloudflare's build base image lacks Chromium system libraries needed by `rehype-mermaid`).
  - Manual (rollback, or ad-hoc redeploy from a dev machine): `npx wrangler deploy` from the repo root after a local `npm run build`. Requires `CLOUDFLARE_API_TOKEN` (and `CLOUDFLARE_ACCOUNT_ID`) in the environment, or `wrangler login` for an interactive session.
  - There is no `deploy` script in `package.json` — deploy is `npx wrangler deploy`, the same command CI runs.
```

- [ ] **Step 3: Rename "Pre-deploy Checklist" to clarify it's the pre-push (local) checklist**

Edit `docs/spec-deploy.md`:

Replace:
```
- **Pre-deploy Checklist**:
  - `npm test` passes.
  - `npm run build` completes without errors.
  - `dist/pagefind/` exists and the build log shows locale filters for both `ko` and `en`.
  - Locally previewed via `npm run preview` at least once when something user-visible has changed.
```

With:
```
- **Pre-push Checklist** (local, before merging to `main`):
  - `npm test` passes.
  - `npm run build` completes without errors locally — fast-feedback gate before CI runs the same build.
  - `dist/pagefind/` exists and the build log shows locale filters for both `ko` and `en`.
  - Locally previewed via `npm run preview` at least once when something user-visible has changed.
  - CI runs the same build + deploy on the merged commit; failures show up in the GitHub Actions tab and notify by GitHub's default failure-email.
```

- [ ] **Step 4: Trim "Out of Scope" — CI/CD is no longer out of scope**

Edit `docs/spec-deploy.md`:

Replace:
```
- **Out of Scope for This Spec**:
  - DNS / domain configuration. Domain ownership and DNS routing are managed outside the repo.
  - CI/CD automation. There is no GitHub Actions workflow yet; deploys run from a developer machine.
```

With:
```
- **Out of Scope for This Spec**:
  - DNS / domain configuration. Domain ownership and DNS routing are managed outside the repo.
```

- [ ] **Step 5: Refresh "Future Work" — current item is done; capture the realistic next ones**

Edit `docs/spec-deploy.md`:

Replace:
```
- **Future Work**:
  - A GitHub Actions workflow that runs `npm test`, `npm run build`, and `npx wrangler deploy` on tagged commits could be added later. Until then, manual deploy stays the source of truth and the pre-deploy checklist above is the only gate.
```

With:
```
- **Future Work**:
  - Add `npm test` as a workflow step when a regression makes the locally-run test gate insufficient.
  - PR-build workflow (build, no deploy) once there is a concrete reason to verify branches before merge.
```

- [ ] **Step 6: Confirm the diff is clean**

Run: `git diff docs/spec-deploy.md`

Expected: only the four sections above changed, nothing else.

---

## Task 3: Update `docs/spec-mermaid-diagrams.md`

**Files:**
- Modify: `docs/spec-mermaid-diagrams.md` (the "Build environment" section)

- [ ] **Step 1: Re-read the file to confirm exact strings**

Read `docs/spec-mermaid-diagrams.md`. Confirm the "Build environment" section matches the `old_string` below.

- [ ] **Step 2: Replace the "Build environment" section with the new reality**

Edit `docs/spec-mermaid-diagrams.md`:

Replace:
```
## Build environment

`rehype-mermaid` requires Playwright + Chromium. `package.json`'s `postinstall` hook auto-downloads Chromium on `npm install`. The first build after install or in a clean CI cache adds 30–60s for the binary download; subsequent builds reuse the cache.

**CI/CD note:** the postinstall strategy depends on lifecycle scripts running. If a hardened CI environment uses `npm ci --ignore-scripts` (or the platform suppresses scripts by default), Chromium will not be downloaded and the `rehype-mermaid` render step will fail at build time. Fix in that case: append an explicit `npx playwright install chromium` step before the build runs.

**Version drift:** Playwright pins its Chromium revision to the package version. After `npm update` (or any time Playwright's package version changes), run `npx playwright install chromium` to re-sync the cached binary.
```

With:
```
## Build environment

`rehype-mermaid` requires Playwright + Chromium at build time. `package.json`'s `postinstall` hook downloads the matching Chromium binary on `npm install` / `npm ci`.

**Where the build runs:** GitHub Actions, `ubuntu-latest`. See [docs/spec-deploy.md](docs/spec-deploy.md) for the deploy pipeline overview. The runner ships with Chromium's system dependencies (`libatk-1.0.so.0`, `libnss3`, `libgbm1`, etc.) preinstalled — this is why the build was moved off Cloudflare's build image, which lacks those libraries and does not expose `sudo apt-get`. Full rationale: [docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md](docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md).

**Caching:** the workflow caches `~/.cache/ms-playwright/` keyed on `package-lock.json`. The cache invalidates automatically when the `playwright` package version changes, so the npm package and the cached binary never drift apart.

**Local development:** any modern macOS or Linux dev environment has the needed system libs. `npm install` runs the postinstall hook and Chromium lands in the Playwright cache; subsequent builds reuse it. After `npm update` (or any change to Playwright's pinned version), re-run `npm install` or `npx playwright install chromium` to re-sync.
```

- [ ] **Step 3: Confirm the diff is clean**

Run: `git diff docs/spec-mermaid-diagrams.md`

Expected: only the "Build environment" section changed.

---

## Task 4: Annotate `docs/superpowers/specs/2026-05-10-mermaid-diagrams-design.md`

**Files:**
- Modify: `docs/superpowers/specs/2026-05-10-mermaid-diagrams-design.md`

This is the mermaid *design* spec (the dated, frozen one). Style: preserve the original text, add dated update notes where the original turned out wrong, and replace the obsolete "Author follow-up" section with a retrospective.

- [ ] **Step 1: Re-read the file to confirm exact strings**

Read `docs/superpowers/specs/2026-05-10-mermaid-diagrams-design.md`. Confirm the three target locations match the `old_string` values below.

- [ ] **Step 2: Annotate the "Build dependency" decision bullet**

Edit `docs/superpowers/specs/2026-05-10-mermaid-diagrams-design.md`:

Replace:
```
- **Build dependency**: `playwright` package + a `postinstall` hook in `package.json` that runs `playwright install chromium` so both local dev and CI/CD pull the headless Chromium binary automatically on first install. No `--with-deps` flag (which requires sudo apt-get) — system fonts and libs are assumed to come from the build host's base image.
```

With:
```
- **Build dependency**: `playwright` package + a `postinstall` hook in `package.json` that runs `playwright install chromium` so both local dev and CI/CD pull the headless Chromium binary automatically on first install. No `--with-deps` flag (which requires sudo apt-get) — system fonts and libs are assumed to come from the build host's base image.

  > **Update 2026-05-12:** the "system fonts and libs from the base image" assumption held for local dev but did NOT hold for Cloudflare's build environment, which lacks GUI libraries like `libatk-1.0.so.0` and does not expose `sudo apt-get`. The build was moved to GitHub Actions `ubuntu-latest` (which has the deps preinstalled). See [docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md](docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md).
```

- [ ] **Step 3: Annotate the "Out of scope" Cloudflare Pages bullet**

Edit `docs/superpowers/specs/2026-05-10-mermaid-diagrams-design.md`:

Replace:
```
- Cloudflare Pages build-environment fine-tuning. The default expectation is `postinstall` works; if the first deploy fails because Chromium misses a system library, the author handles it as a follow-up — see "Author follow-up" below.
```

With:
```
- Cloudflare Pages build-environment fine-tuning. The default expectation is `postinstall` works; if the first deploy fails because Chromium misses a system library, the author handles it as a follow-up — see "Author follow-up" below.

  > **Update 2026-05-12:** this prediction came true — Chromium failed to launch on CF for missing system libs. The follow-up resolution turned out to be moving the build off CF entirely rather than fine-tuning CF. See [docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md](docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md).
```

- [ ] **Step 4: Replace the "Author follow-up (Cloudflare Pages)" section with a retrospective**

Edit `docs/superpowers/specs/2026-05-10-mermaid-diagrams-design.md`:

Replace:
```
## Author follow-up (Cloudflare Pages)

After the implementation is committed and pushed, the next Cloudflare Pages build will:

1. Run `npm install`, which triggers `postinstall: playwright install chromium`. Chromium binary downloads (~150MB) into the build environment's cache.
2. Run `npm run build`, which invokes Astro and `rehype-mermaid`. rehype-mermaid spawns headless Chromium to render each mermaid block as SVG.
3. **Possible failure modes** to watch:
   - **Chromium fails to launch**: missing system libraries (`libnss3`, `libgbm1`, `libasound2`, etc.) on the Cloudflare Pages base image. Fix: add those packages via the build configuration, or switch strategy to commit prerendered SVGs.
   - **Build time spike**: first build with Chromium download adds ~30-60s. Subsequent builds reuse the cache.
   - **Korean glyphs render as tofu**: missing CJK fonts in the build image. Fix: install `fonts-noto-cjk` via the build-time apt step, or bundle a webfont and reference it in the mermaid `themeVariables.fontFamily`.

The author monitors the first deploy via the Cloudflare Pages dashboard and adjusts if needed. None of these failure modes are introduced by this design — they are pre-existing constraints of running Playwright in a CF Pages container.
```

With:
```
## Author follow-up (resolved 2026-05-12)

The original prediction here was that the first CF build might fail and the author would patch CF's image. What actually happened:

1. The first CF deploy ran `npm install` + `npm run build`. `postinstall` downloaded Chromium successfully (~150MB).
2. `rehype-mermaid` then tried to spawn headless Chromium and got `libatk-1.0.so.0: cannot open shared object file`. CF's build base image has no GUI library stack.
3. CF does not expose `sudo apt-get`, so `playwright install --with-deps` and any apt-based workaround was unavailable.
4. **Resolution:** the build was moved off Cloudflare entirely onto GitHub Actions `ubuntu-latest`, which has the GUI deps preinstalled. Cloudflare now hosts only the prebuilt `dist/` via `wrangler deploy`. The git-connected automatic CF build was disabled by the author.

For the design and rationale of the new pipeline see [docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md](docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md). For day-to-day deploy documentation see [docs/spec-deploy.md](docs/spec-deploy.md).

Korean glyph rendering and Chromium download time were non-issues in the new environment — preserving the original failure-modes list here as a record of the prediction.
```

- [ ] **Step 5: Confirm the diff is clean**

Run: `git diff docs/superpowers/specs/2026-05-10-mermaid-diagrams-design.md`

Expected: three update notes / replacements; no incidental changes.

---

## Task 5: Stage, review, commit

- [ ] **Step 1: Status check**

Run: `git status`

Expected files:
- `.github/workflows/deploy.yml` (new)
- `docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md` (new — written during brainstorming, still uncommitted)
- `docs/superpowers/plans/2026-05-12-github-actions-deploy.md` (new — this plan, still uncommitted)
- `docs/spec-deploy.md` (modified)
- `docs/spec-mermaid-diagrams.md` (modified)
- `docs/superpowers/specs/2026-05-10-mermaid-diagrams-design.md` (modified)

- [ ] **Step 2: Full diff review**

Run: `git diff` (unstaged) and `git diff --cached` (staged) to scan all changes one more time.

Expected: no incidental edits, no leftover scratch text, no broken markdown links.

- [ ] **Step 3: Commit the design + plan docs first**

```bash
git add docs/superpowers/specs/2026-05-12-github-actions-deploy-design.md \
        docs/superpowers/plans/2026-05-12-github-actions-deploy.md
git commit -m "$(cat <<'EOF'
docs: add design + plan for github actions build/deploy migration

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Commit workflow + spec touch-ups**

```bash
git add .github/workflows/deploy.yml \
        docs/spec-deploy.md \
        docs/spec-mermaid-diagrams.md \
        docs/superpowers/specs/2026-05-10-mermaid-diagrams-design.md
git commit -m "$(cat <<'EOF'
ci: move build/deploy to github actions

Cloudflare's build base image lacks libatk-1.0.so.0 and other Chromium
system libs, breaking rehype-mermaid's build-time SVG render. CF doesn't
allow sudo apt-get, so playwright install --with-deps isn't an option.

Build now runs on GitHub Actions ubuntu-latest (which has the deps),
and Cloudflare hosts only the prebuilt dist/ via wrangler deploy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Verify commits landed**

Run: `git log --oneline -5`

Expected: the two new commits at the top.

- [ ] **Step 6: Stop here — do not push.**

The author handles the push + the manual CF/GH setup (see "After execution" below). Pushing before secrets are in place will run the workflow and fail at the `wrangler deploy` step; this is harmless but noisy, so let the author sequence the steps.

---

## After execution: author manual setup

Once the commits are in place, the author completes the following one-time setup. Order can be any of the three, but all three must be done before the first push to `main` triggers a clean deploy:

1. **Create a Cloudflare API token**
   - CF Dashboard → My Profile → API Tokens → Create Token
   - Template: "Edit Cloudflare Workers" (or custom: `Account.Workers Scripts:Edit`, `Account.Account Settings:Read`)
   - Copy the token (shown once)

2. **Register GitHub secrets**
   - Repo → Settings → Secrets and variables → Actions → New repository secret
   - `CLOUDFLARE_API_TOKEN` = token from step 1
   - `CLOUDFLARE_ACCOUNT_ID` = account ID from the CF Dashboard right sidebar

3. **Disable the old Cloudflare auto-build**
   - CF Dashboard → Workers & Pages → `sings-dev` → Settings → Builds & deployments
   - Disable the git-connected automatic build (or clear the build command). Otherwise CF will keep trying to build and keep failing.

After all three are done:

```bash
git push origin main
```

Then verify:

- GitHub Actions tab → `Deploy to Cloudflare` workflow shows the run going green.
- `curl -sL https://sings.dev/posts/purpose-driven-systems/ | grep -o '<picture' | wc -l` returns the number of mermaid diagrams on the page (currently 2 — previously 0).
- Incognito browser load shows the two diagrams in the dawn/night palette and toggles them along with the rest of the theme.
- A no-op follow-up push (`git commit --allow-empty -m "verify cache hit"; git push`) completes in under ~1 minute (npm + Playwright caches warm).
