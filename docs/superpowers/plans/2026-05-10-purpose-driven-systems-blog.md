# Purpose-Driven Systems Blog Post Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draft and publish the Korean blog post `튼튼한 시스템은 분명한 목적에서 비롯된다 (feat. superpowers)` at `src/content/blog/ko/purpose-driven-systems/index.md`, matching the section structure, voice, and length targets in the design spec.

**Architecture:** Single-file content addition under sings.dev's existing Astro content collection. Frontmatter conforms to the `blog` collection schema in `src/content/config.ts` (`title`, `pubDate`, `description`, `category`, required; `tags` array optional but used here). Body is GitHub-flavored markdown rendered through the site's existing prose pipeline (`prose-site`). The post is standalone (no `series`), KO-locale only this iteration. EN translation is deferred to a separate later cycle per the site's KO→EN pattern.

**Tech Stack:** Astro 6 content collection, Markdown (GFM), Korean prose, the site's `prose-site` styles. Verification via `npm run dev` for visual render and `npm test` for the existing test suite (no new tests added — the spec verification target explicitly excludes test additions).

**Reference Spec:** `docs/superpowers/specs/2026-05-10-purpose-driven-systems-blog-design.md`.

---

## File Structure

### Create

- `src/content/blog/ko/purpose-driven-systems/` — new post folder, co-located assets if any.
- `src/content/blog/ko/purpose-driven-systems/index.md` — the post itself, with frontmatter and seven prose sections (§1–§7) matching the spec.

### Modify

- None. This iteration only adds the new post.

### Out of scope

- `src/content/blog/en/purpose-driven-systems/` — EN translation deferred. Will follow as a separate cycle.
- `docs/spec-roadmap.md` — not updated as a side effect of publishing.
- `docs/spec-editorial-philosophy.md`, `docs/spec-migration.md`, etc. — referenced in the post body as-is, never modified to "look presentable" for the article.
- Any new component, layout, or test infrastructure.

---

## Tasks

### Task 1: Scaffold the post folder and frontmatter

**Files:**
- Create: `src/content/blog/ko/purpose-driven-systems/index.md`

- [ ] **Step 1: Create the post folder**

```bash
mkdir -p src/content/blog/ko/purpose-driven-systems
```

- [ ] **Step 2: Write the frontmatter and section header skeleton**

Create `src/content/blog/ko/purpose-driven-systems/index.md` with this exact content:

```markdown
---
title: "튼튼한 시스템은 분명한 목적에서 비롯된다 (feat. superpowers)"
pubDate: 2026-05-10
description: "오래 가는 시스템에 필요한 단순한 사이클, 그리고 그 사이클을 도구화한 superpowers를 살펴봅니다."
category: "Development"
tags:
  - methodology
  - ai
  - claude-code
  - superpowers
---

<!-- §1. Hook / 본질 주장 -->

<!-- §2. 단순한 사이클 -->

<!-- §3. AI 시대의 고민 -->

<!-- §4. superpowers와의 만남 -->

<!-- §5. superpowers의 흐름 -->

<!-- §6. sings.dev 증거 -->

<!-- §7. 마무리 -->
```

The HTML comments are scaffolding markers; they will be replaced with prose section by section in Task 2.

- [ ] **Step 3: Run the dev server and verify the post appears**

Run: `npm run dev`
Then open `http://localhost:4321/posts/purpose-driven-systems/` in a browser.
Expected: page renders with the title heading rendered from frontmatter; body is empty (just the HTML comments). No build error in the terminal.

Stop the dev server (Ctrl+C) before continuing.

- [ ] **Step 4: Verify the post appears in archive and category listings**

With dev server running again (`npm run dev`), check:
- `http://localhost:4321/posts/` — new post is listed at the top (newest pubDate).
- `http://localhost:4321/category/development/` — new post is listed.
- `http://localhost:4321/tags/methodology/` — single-post archive page renders.
- `http://localhost:4321/tags/ai/` — same.
- `http://localhost:4321/tags/claude-code/` — same.
- `http://localhost:4321/tags/superpowers/` — same.

Expected: all six pages render without error. The four tag pages each show exactly one post (this new one, since the tags are `[NEW]`).

Stop the dev server before continuing.

- [ ] **Step 5: Commit the scaffold**

```bash
git add src/content/blog/ko/purpose-driven-systems/index.md
git commit -m "$(cat <<'EOF'
content: scaffold purpose-driven systems essay

Set up the post folder and frontmatter for "튼튼한 시스템은 분명한
목적에서 비롯된다 (feat. superpowers)" per
docs/superpowers/specs/2026-05-10-purpose-driven-systems-blog-design.md.
Body filled in subsequent commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Draft the full prose body (§1 through §7)

**Files:**
- Modify: `src/content/blog/ko/purpose-driven-systems/index.md`

Each step replaces one HTML comment marker (`<!-- §N. ... -->`) with the prose for that section. Spec section guidance (target length, voice notes, italic 곁다리 placement, commit hash citations) is in `docs/superpowers/specs/2026-05-10-purpose-driven-systems-blog-design.md` under "Article Structure". Voice references (for tone matching) are `src/content/blog/ko/macos-terminal-hangul-1/index.md` and `src/content/blog/ko/safe-random-history/index.md`.

For each section, after writing prose, do a quick self-check against the spec criteria for that section before moving to the next. Verification at this step is observational, not test-driven — the writing analog of "does this pass review."

- [ ] **Step 1: Write §1 (Hook / 본질 주장)**

Replace the `<!-- §1. Hook / 본질 주장 -->` marker. Per spec §1:
- Opens with "오래 유지되는 시스템을 만드는 걸 좋아합니다." (or close paraphrase that lands the same personal observation).
- Drops the **causal-chain** thesis: 시스템이 망가지는 본질은 **복잡성 누적**이고, 그 복잡성 누적의 원인은 결국 **목적의 흔들림**이다. (관찰되는 증상 → 그 아래의 원인.)
- One italic 곁다리 acknowledging the belief is long-held: `_(이건 꽤 오래전부터 가져온 생각인데요.)_` or close paraphrase.
- 정중체. Bold the two key terms.
- Target: ~300자.

Self-check before next step:
- Causal-chain framing used (NOT binary "A가 아니라 B").
- Both **복잡성 누적** and **목적의 흔들림** appear in bold.
- Exactly one italic 곁다리.
- Length 250–350자.

- [ ] **Step 2: Write §2 (단순한 사이클)**

Replace the `<!-- §2. 단순한 사이클 -->` marker. Per spec §2:
- Argument: 모든 소프트웨어엔 목적이 있고, 그게 흔들리지 않아야 영속한다 — 정적인 게 아니라 사이클로 작동.
- Spell out the cycle, each stage in **bold**: **목적 정의 → 개발 → 기능 추가 시 목적 재확인 → 갱신/확정 → 다시 개발**.
- Embed "단순한(하지만 지키기 쉽지 않은)" naturally into prose somewhere in this section.
- One italic 곁다리: `_(말로는 단순합니다. 매 작업마다 이걸 도는 게 즐겁기만 한 건 아니지만요.)_` or close paraphrase.
- Target: ~450자.

Self-check before next step:
- Cycle written out with bold on each stage.
- "단순한(하지만 지키기 쉽지 않은)" explicitly in prose.
- Exactly one italic 곁다리.
- Length 400–500자.

- [ ] **Step 3: Write §3 (AI 시대의 고민)**

Replace the `<!-- §3. AI 시대의 고민 -->` marker. Per spec §3:
- Pivot: 최근 AI로 코드를 짜는 비중이 커졌다.
- Concern: 빨라진 만큼 사이클을 손으로 지키기 어려워지지 않을까. 망가지는 속도도 빨라지지 않을까.
- One self-question to bridge into §4 ("정말 그럴까?" 류 — 사용자 voice의 자문 패턴).
- Target: ~280자. Short, transitional.

Self-check before next step:
- AI-development context introduced.
- Concern stated directly (not hedged).
- One self-question that opens §4.
- Length 230–330자.

- [ ] **Step 4: Write §4 (superpowers와의 만남)**

Replace the `<!-- §4. superpowers와의 만남 -->` marker. Per spec §4:
- Introduce superpowers in one line: Claude Code 위에서 작동하는 skill 모음, brainstorming부터 verification까지 단계별로 강제.
- "처음엔 그냥 편하길래 썼는데, 흐름을 보니 익숙한 모양이 보였음" — 사용자 voice의 깨달음 톤.
- The pivot insight (must include both bolded terms): superpowers의 표면 어휘는 **rigor at each step**, 내 사고방식의 표면 어휘는 **purpose preservation**. 어휘는 다르지만 **같은 곳에 도착하는 두 vantage point** — 무엇을 만들지의 순간에 단단히 못 박는 것.
- 결론 한 줄: 도구가 내 사고방식을 도구화한 형태였다.
- Target: ~400자.

Self-check before next step:
- superpowers defined in a sentence (not a paragraph).
- **rigor at each step** and **purpose preservation** both bolded.
- The "같은 곳에 도착" framing appears.
- "도구화" word appears in the closing line.
- Length 350–450자.

- [ ] **Step 5: Write §5 (superpowers의 흐름)**

Replace the `<!-- §5. superpowers의 흐름 -->` marker. Per spec §5:
- Walk through superpowers stages, each as 1–2 lines:
  - **brainstorming** → spec 문서 산출 (사이클의 "목적 정의")
  - **writing-plans** → spec과 실행 계획 분리 (구현이 바뀌어도 목적은 안 흔들림)
  - **executing-plans** → 단계별 실행
  - **TDD** → 함수 단위의 spec
  - **verification-before-completion** → 주장 전 검증
  - **code-review / finishing** → 마무리
- One sentence noting the **fractal** pattern — 큰 단위(brainstorm↔plan↔execute)에서도 작은 단위(test↔code↔verify)에서도 같은 패턴 반복됨.
- Target: ~550자.

Self-check before next step:
- All six stage names present, each bolded, each with a one-line gloss tying back to the user's cycle.
- One fractal note (one sentence, not a paragraph).
- Length 500–600자.

- [ ] **Step 6: Write §6 (sings.dev 증거)**

Replace the `<!-- §6. sings.dev 증거 -->` marker. Per spec §6:

Open with one direct line, no hedging: `이 블로그가 정확히 그렇게 만들어졌습니다.`

Then three sub-parts:

**(a) 정적 증거 (~200자)** — `docs/spec-editorial-philosophy.md`가 사이트의 근본 정체성을 codify하고, sub-spec들이 명시적으로 reference. Cite the literal line from `spec-migration.md`: ``Reference Philosophy: Follow `docs/spec-editorial-philosophy.md` ``.

**(b) 동적 증거 (~400자)** — 지난 1주일 사이의 post-detail 가운데 정렬 작업 6개 커밋, 시간순으로 따라가며 사이클을 짚어주기:

1. `049f45b` add post detail centered layout design spec ← **brainstorm**
2. `23e794b` add implementation plan ← **plan**
3. `7081889` style: center post body ← **impl**
4. `3a6eda9` record post detail centered layout iteration ← **spec 갱신**
5. `1b1ae26` fix TOC overhang math ← spec 정합성
6. `5ac4c26` align design spec wide-figure math with the SSOT ← **SSOT 정렬**

Frame: 한 사이클이 통째로 git에 남음. 새 기능을 추가하면서 spec이 갱신되고 다시 정렬됨 — 사용자 사이클의 "기능 추가 시 목적 재확인 → 갱신/확정"이 그대로 보임.

**(c) 패턴 증거 (~100자)** — 한 줄 정도. `prose comfort bump`(`6731db7` → `7812dd3` → `952b81c` → `b44c224`), `code-block copy button`(...→ `0b4dd6f`) 시리즈도 같은 흐름. 일회성이 아닌 정착된 패턴.

One italic 곁다리 closing the section: `_(매 기능마다 spec을 쓰고 갱신하는 건 사실 귀찮습니다. 그런데 안 했을 때의 비용이 더 크다는 걸 여러 번 겪어서요.)_`

Inline references appear as plain text or backtick-quoted (file paths and short hashes). The article does not linkify them — the reader who wants to verify can clone the repo or browse on GitHub independently.

Target: ~700자 total for §6.

Self-check before next step:
- Opening line is exactly `이 블로그가 정확히 그렇게 만들어졌습니다.` (no hedging tail).
- All six commit hashes appear and verify against `git log` (next sub-step).
- The `Reference Philosophy: Follow ...` line is quoted with the exact wording from `spec-migration.md` line 5.
- One italic 곁다리 at the end of §6.
- Length 600–800자.

- [ ] **Step 7: Verify all six §6(b) commit hashes exist in git log**

Run:

```bash
git log --oneline | grep -E "^(049f45b|23e794b|7081889|3a6eda9|1b1ae26|5ac4c26)"
```

Expected: six lines printed, one for each hash. Confirm each one matches the title cited in §6(b):

```
5ac4c26 docs: align design spec wide-figure math with the SSOT
1b1ae26 docs: fix TOC overhang math in spec-post-detail wide-figure note
3a6eda9 docs: record post detail centered layout iteration
7081889 style: center post body on viewport with TOC overhanging at xl:
23e794b docs: add implementation plan for post detail centered layout
049f45b docs: add post detail centered layout design spec
```

If any hash is missing or mismatched, fix the §6 prose before continuing.

- [ ] **Step 8: Verify the §6(c) auxiliary hashes exist**

Run:

```bash
git log --oneline | grep -E "^(6731db7|7812dd3|952b81c|b44c224|0b4dd6f)"
```

Expected: five lines printed:

```
b44c224 docs: record body prose size decision and prose comfort bump
6b698fb [...] (not cited but adjacent — ok to ignore)
952b81c style: apply prose-lg on .prose-site and center narrow figure images
7812dd3 docs: add implementation plan for the prose comfort bump
6731db7 docs: add prose comfort bump design spec
0b4dd6f docs: record code-block copy button in post-detail and roadmap specs
```

If any cited hash is wrong, correct §6(c) before continuing.

- [ ] **Step 9: Write §7 (마무리)**

Replace the `<!-- §7. 마무리 -->` marker. Per spec §7:
- Open with the "정리하자면…" register (사용자 마무리 톤).
- Restate the thesis once more, in one line — 목적이 흔들리지 않으면 시스템은 안 망가진다 (or close paraphrase consistent with the §1 causal-chain framing).
- One line on why use superpowers — 내 사고방식의 좋은 expression이라서.
- Final closing line, exact:

> **도구가 사고를 바꾸는 게 아니라, 좋은 도구는 사고를 더 단단하게 만들어준다.**

- Target: ~250자.

Self-check before next step:
- "정리하자면" or equivalent register opens the section.
- Final line is byte-exact: `**도구가 사고를 바꾸는 게 아니라, 좋은 도구는 사고를 더 단단하게 만들어준다.**`
- "이미 가진" must NOT appear in the final line (the spec explicitly cut it).
- Length 200–300자.

- [ ] **Step 10: Render the full post in dev server and eyeball**

Run: `npm run dev`
Open: `http://localhost:4321/posts/purpose-driven-systems/`

Expected:
- All seven sections render in order with their prose populated.
- Bold and italic markdown render correctly.
- Inline backticks (file paths, commit hashes) render in monospace.
- No build error, no missing-frontmatter warning.

Stop the dev server before continuing.

- [ ] **Step 11: Commit the full first draft**

```bash
git add src/content/blog/ko/purpose-driven-systems/index.md
git commit -m "$(cat <<'EOF'
content: draft purpose-driven systems essay (KO)

First-pass draft of the seven sections per
docs/superpowers/specs/2026-05-10-purpose-driven-systems-blog-design.md.
Polishes pending in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Whole-draft polish — voice, tone, length, italic distribution

**Files:**
- Modify: `src/content/blog/ko/purpose-driven-systems/index.md`

This task is the deliberate "read it cold and tighten" pass. The first-pass draft from Task 2 may have voice drift between sections, repetitive phrasings, or italic 곁다리 distribution that doesn't match the spec.

- [ ] **Step 1: Read the draft once start-to-finish without editing**

Open `src/content/blog/ko/purpose-driven-systems/index.md` and read straight through. Do not edit during this pass. Note in your head:
- Sections that read inconsistently with each other in voice.
- Pivot lines (§1 thesis, §4 insight, §7 closing) that don't land hard enough.
- Any hedging or filler that crept in.

- [ ] **Step 2: Compare voice against the references**

Open `src/content/blog/ko/macos-terminal-hangul-1/index.md` and `src/content/blog/ko/safe-random-history/index.md` in your editor. Skim the prose rhythm in each. Compare to the new draft:
- 정중체 ("~합니다") consistency.
- Bold-for-key-term frequency comparable.
- Italic 곁다리 used for self-doubt or cost acknowledgment, not for decoration.
- Self-questions used at most 1–2 times for breathing.

If voice has drifted in any section, edit inline.

- [ ] **Step 3: Verify italic 곁다리 distribution**

Count the italic 곁다리 (`_(...)_`) instances in the draft. Per spec they should appear in:
- §1 (one, optional but recommended)
- §2 (one, required)
- §6 (one at the end, required)

So 2 required + 1 optional = 2–3 instances total. Run:

```bash
grep -c '_(' src/content/blog/ko/purpose-driven-systems/index.md
```

Expected: 2 or 3. If higher, find and remove the extras (most likely from §3 or §5 where they're not in the spec).

- [ ] **Step 4: Verify the §1 thesis framing is causal-chain, not binary**

The thesis must use the causal-chain shape (`복잡성 누적이고, 그 원인은...`). Verify by grepping:

```bash
grep -E "복잡성 누적이고|복잡성 누적이.*원인" src/content/blog/ko/purpose-driven-systems/index.md
```

Expected: at least one match in the §1 region.

Also verify the binary form was NOT used:

```bash
grep -E "복잡성 누적이 아니라" src/content/blog/ko/purpose-driven-systems/index.md
```

Expected: no match (empty output). If matched, the §1 thesis has the wrong framing — fix to causal-chain form.

- [ ] **Step 5: Verify the §7 closing line is byte-exact**

Run:

```bash
grep -F "도구가 사고를 바꾸는 게 아니라, 좋은 도구는 사고를 더 단단하게 만들어준다" src/content/blog/ko/purpose-driven-systems/index.md
```

Expected: one match. The line must NOT contain "이미 가진" (per the spec revision):

```bash
grep -F "이미 가진 사고" src/content/blog/ko/purpose-driven-systems/index.md
```

Expected: no match.

- [ ] **Step 6: Check total Korean character count**

Run:

```bash
awk '/^---$/{c++; next} c==2' src/content/blog/ko/purpose-driven-systems/index.md | wc -m
```

This counts characters in the body only (after the closing `---` of frontmatter). Expected: between 2800 and 3300 (the spec's acceptable range).

If under 2800, the draft is too thin — find a section that's underweight per spec target and expand. If over 3300, find a section that's bloated and tighten.

- [ ] **Step 7: Check §6 self-reference opening is no-hedge**

Run:

```bash
grep -F "이 블로그가 정확히 그렇게 만들어졌습니다." src/content/blog/ko/purpose-driven-systems/index.md
```

Expected: one match.

Verify the line is NOT followed by hedging like `git이 그대로 보여줘서` (per spec revision):

```bash
grep -F "git이 그대로 보여줘서" src/content/blog/ko/purpose-driven-systems/index.md
```

Expected: no match.

- [ ] **Step 8: Render in dev server and read on-page**

Run: `npm run dev`
Open: `http://localhost:4321/posts/purpose-driven-systems/`

Read the post on the rendered page (not the source). On-page reading often surfaces rhythm issues that source view hides — line breaks, paragraph density, code-block boundaries.

If anything reads off, edit inline and re-render.

Stop the dev server.

- [ ] **Step 9: Commit the polish pass**

```bash
git add src/content/blog/ko/purpose-driven-systems/index.md
git commit -m "$(cat <<'EOF'
content: polish purpose-driven systems essay

Whole-draft pass — voice, italic 곁다리 distribution, length,
thesis-framing and closing-line byte-checks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If Step 1–8 produced no edits, skip this commit (no changes to commit).

---

### Task 4: Final verification — render, taxonomy, test suite

**Files:**
- None modified. This task is verification only.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all existing tests pass. No new tests required by this work.

If any test fails, investigate — content-only changes shouldn't break tests, so a failure indicates either a frontmatter schema mismatch or an unrelated regression that needs to be addressed before proceeding.

- [ ] **Step 2: Run the dev server and verify all rendering paths**

Run: `npm run dev`

Open each of the following URLs and verify the post is present and renders cleanly:

- `http://localhost:4321/posts/purpose-driven-systems/` — full post page, all 7 sections, italic 곁다리 styled, bold rendered, code spans for file paths and hashes.
- `http://localhost:4321/posts/` — post appears in the archive listing, sorted by `pubDate` (newest first; 2026-05-10 should be at or near the top).
- `http://localhost:4321/category/development/` — post appears in the category listing.
- `http://localhost:4321/tags/methodology/` — single-post tag page.
- `http://localhost:4321/tags/ai/` — single-post tag page.
- `http://localhost:4321/tags/claude-code/` — single-post tag page.
- `http://localhost:4321/tags/superpowers/` — single-post tag page.

Stop the dev server before continuing.

- [ ] **Step 3: Verify the post does NOT appear in the EN locale tree**

Open: `http://localhost:4321/en/posts/`

Expected: this page lists EN posts only. The new KO post must NOT appear here. If it does, the post folder is in the wrong locale tree — move from `src/content/blog/ko/` to verify, or fix the path.

(Per spec: EN translation is deferred to a later cycle, intentionally.)

- [ ] **Step 4: Build the production site to surface any build-time errors**

Run: `npm run build`

Expected: build succeeds. Output ends with the standard "Complete!" line and a count of generated pages. The new tag pages (4 new tags) and the new post page should be among them.

If the build errors, the most likely cause is a frontmatter schema violation or a markdown syntax issue. Fix and re-run.

- [ ] **Step 5: No commit unless fixes were needed**

Task 4 is verification-only. If Steps 1–4 surfaced no fixes, no commit at this stage.

If any fixes were committed in Step 1 or Step 4, the commit message should describe what was fixed:

```bash
git commit -m "$(cat <<'EOF'
content: fix <specific issue> in purpose-driven systems essay

<one-line description of what was wrong>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Plan Self-Review Notes

**Spec coverage check:**
- Spec §1 (Hook) → Task 2 Step 1 ✓
- Spec §2 (사이클) → Task 2 Step 2 ✓
- Spec §3 (AI 고민) → Task 2 Step 3 ✓
- Spec §4 (만남) → Task 2 Step 4 ✓
- Spec §5 (흐름) → Task 2 Step 5 ✓
- Spec §6 (증거) → Task 2 Step 6, with hash verification at Steps 7–8 ✓
- Spec §7 (마무리) → Task 2 Step 9 ✓
- Spec Decision (frontmatter, slug, locale) → Task 1 Step 2 ✓
- Spec Verification Target (npm test, dev render, frontmatter, tag pages) → Task 1 Step 4 + Task 4 ✓
- Spec Verification Target (word count 2800–3300) → Task 3 Step 6 ✓
- Spec voice references — Task 3 Step 2 ✓

No spec gap.

**Type / signature consistency:** N/A — no code surface.

**Placeholder scan:** No `TBD` / `TODO` / "implement later" / "fill in details" / "etc." in any step. Each prose step references the spec for content guidance and includes concrete self-check criteria.

---

After plan execution, the next step is `superpowers:finishing-a-development-branch` to decide merge mechanic (direct merge vs PR) and complete the work.
