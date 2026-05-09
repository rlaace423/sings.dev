# 튼튼한 시스템은 분명한 목적에서 비롯된다 (feat. superpowers) — Blog Post Design

**Date:** 2026-05-10

## Goal

Write a single Korean blog post for sings.dev that argues the root cause of long-lived software degrading into "spaghetti" is **purpose drift**, not complexity accumulation. The author proposes a simple cycle that preserves purpose across change — define purpose → develop → re-check purpose when adding features → reaffirm or update → develop again — and presents superpowers (the Claude Code skill collection) as **an expression of that methodology in tool form**, not as a methodology the author adopted from outside.

The article uses sings.dev itself as the running evidence: the top-level purpose anchored in `docs/spec-editorial-philosophy.md` (referenced explicitly by sub-specs like `docs/spec-migration.md`), and one full cycle visible in the recent post-detail centered-layout work — `brainstorm → plan → impl → spec 갱신 → SSOT 정렬` across six commits in a single week. The author's prior thinking is the main artist; superpowers is featured.

## Decision

- **Title**: 튼튼한 시스템은 분명한 목적에서 비롯된다 (feat. superpowers)
- **Slug**: `purpose-driven-systems`
- **Locale**: KO first at `src/content/blog/ko/purpose-driven-systems/index.md`. EN translation deferred to a later cycle per the site's established KO→EN pattern.
- **Category**: `Development`
- **Tags** (all `[NEW]` to the site taxonomy): `methodology`, `ai`, `claude-code`, `superpowers`
- **Frontmatter**: `pubDate: 2026-05-10`, descriptive `description` field, no `series` (standalone), no `draft` flag (publish on completion).
- **Length**: ~2900자 target; 2800–3300 acceptable range. Aligns with the `safe-random-history` register.
- **No images required.** Decision deferred to draft step — if the article wants one opening visual it can be added; not required by structure.

## Why

- **Framing as expression, not parallel.** The simpler "내 방법론이 superpowers와 부합한다" framing reads as coincidence ("happened to find a tool that fits"). Reframing as "내 사고방식이 superpowers의 형태로 잘 표현되어 있더라" credits the author's prior thinking and gives the article a more confident center of gravity. The (feat. superpowers) title encodes this — the author is the main artist, superpowers is featured.
- **Why sings.dev as anchor.** The author already noted the evidence is in git. Two distinct git artifacts map cleanly to the two halves of the methodology: `spec-editorial-philosophy.md` for "purpose stays solid as anchor", the post-detail centered-layout commit chain for "the cycle keeps it solid as features are added". Using a self-referential anchor keeps the article concrete without depending on company-context sources.
- **Why italic 곁다리 for the "지키기 쉽지 않은" tension.** Matches existing voice (`macos-terminal-hangul-1` uses `_(설정파일 수정을 통해 ...)_` and `_(내가 지금 쓸데없는 곳에 ...)_` for the same purpose). A dedicated tradeoff section would weigh the article down; a one-line acknowledgement under-delivers on the explicit "단순한(하지만 지키기 쉽지 않은)" framing the author wrote into the brief. Scattered italic asides hit the register without breaking flow.
- **Why fractal as a one-line note, not a centerpiece.** The fact that superpowers repeats the brainstorm↔plan↔execute pattern at smaller scale (test↔code↔verify) strengthens the alignment claim. But developing it would pull weight away from the §6 evidence. One sentence in §5 lands the point; readers familiar with the pattern recognize it, others move on.
- **Why methodology-led, not tool-led.** The author's stated thesis is about purpose preservation. A tool-review structure ("here's superpowers, here's why I like it") would invert the argument — the methodology becomes a justification for the tool, instead of the tool being an expression of the methodology. The 4-section outline the author drafted already correctly leads with methodology; this spec preserves that order.

## Article Structure

### §1. Hook / 본질 주장 (~300자)
- Open: "오래 유지되는 시스템을 만드는 걸 좋아합니다."
- Drop the thesis: 시스템이 망가지는 본질은 복잡성 누적이 아니라 **목적의 흔들림**이다.
- One italic 곁다리 acknowledging this is a long-held belief: `_(이건 꽤 오래전부터 가져온 생각인데요.)_`
- Tone: 정중체, 의견은 분명하게.

### §2. 단순한 사이클 (~450자)
- 모든 소프트웨어엔 목적이 있고, 그게 흔들리지 않아야 영속한다. 정적인 게 아니라 사이클.
- Cycle, each step bolded: **목적 정의 → 개발 → 기능 추가 시 목적 재확인 → 갱신/확정 → 다시 개발**.
- Embed "단순한(하지만 지키기 쉽지 않은)" naturally into prose.
- One italic 곁다리: `_(말로는 단순합니다. 매 작업마다 이걸 도는 게 즐겁기만 한 건 아니지만요.)_`

### §3. AI 시대의 고민 (~280자)
- 최근 AI로 코드를 짜는 비중이 커졌다.
- Concern: 빨라진 만큼 사이클을 손으로 지키기 어려워지지 않을까. 망가지는 속도도 빨라지지 않을까.
- One self-question to set up §4 ("정말 그럴까?" 류).

### §4. superpowers와의 만남 (~400자)
- 그러던 중 superpowers를 써보게 됨. 한 줄 정의: Claude Code 위에서 작동하는 skill 모음, brainstorming부터 verification까지 단계별로 강제.
- 처음엔 그냥 편하길래 썼는데, 흐름을 보니 "이거 내가 손으로 하던 거 아닌가?"
- Insight (bold pivot): superpowers의 표면 어휘는 **rigor at each step**, 내 사고방식의 표면 어휘는 **purpose preservation**. 어휘는 다르지만 **같은 곳에 도착하는 두 vantage point** — 무엇을 만들지의 순간에 단단히 못 박는 것.
- 결론: 도구가 내 사고방식을 도구화한 형태였다.

### §5. superpowers의 흐름 (~550자)
- 단계별 풀이 (각 1–2줄):
  - **brainstorming** → spec 문서 산출 (사이클의 "목적 정의")
  - **writing-plans** → spec과 실행 계획 분리 (구현이 바뀌어도 목적은 안 흔들림)
  - **executing-plans** → 단계별 실행
  - **TDD** → 함수 단위의 spec
  - **verification-before-completion** → 주장 전 검증
  - **code-review / finishing** → 마무리
- One-sentence fractal note: 큰 단위(brainstorm↔plan↔execute)에서도 작은 단위(test↔code↔verify)에서도 같은 패턴이 반복됨.

### §6. sings.dev 증거 (~700자)

Open with a single line that reads as observation, not boast: "이 블로그가 정확히 그렇게 만들어졌습니다 — git이 그대로 보여줘서 인용하기 쉽거든요."

- **(a) 정적 증거: 최상위 purpose가 anchor 역할** (~200자)
  - `docs/spec-editorial-philosophy.md`가 사이트의 근본 정체성을 codify.
  - sub-spec들이 명시적으로 reference. 인용: `spec-migration.md`의 `Reference Philosophy: Follow docs/spec-editorial-philosophy.md` 한 줄.

- **(b) 동적 증거: 한 사이클이 git에 통째로** (~400자)
  - 지난 1주일 사이의 post-detail 가운데 정렬 작업 6개 커밋, 시간순:
    1. `049f45b` add post detail centered layout design spec ← **brainstorm**
    2. `23e794b` add implementation plan ← **plan**
    3. `7081889` style: center post body ← **impl**
    4. `3a6eda9` record post detail centered layout iteration ← **spec 갱신**
    5. `1b1ae26` fix TOC overhang math ← spec 정합성
    6. `5ac4c26` align design spec wide-figure math with the SSOT ← **SSOT 정렬**
  - 한 사이클이 통째로 git에 남음. 새 기능을 추가하면서 spec이 갱신되고 다시 정렬됨 — 사용자 사이클의 "기능 추가 시 목적 재확인 → 갱신/확정"이 그대로 보임.

- **(c) 패턴 증거** (~100자)
  - `prose comfort bump`, `code-block copy button` 시리즈도 동일 흐름. 일회성이 아니라 정착된 패턴.

- One italic 곁다리: `_(매 기능마다 spec을 쓰고 갱신하는 건 사실 귀찮습니다. 그런데 안 했을 때의 비용이 더 크다는 걸 여러 번 겪어서요.)_`

### §7. 마무리 (~250자)
- "정리하자면…" 마무리 톤.
- 본질 주장 한 번 더: 목적이 흔들리지 않으면 시스템은 안 망가진다.
- superpowers를 쓰는 이유 — 내 사고방식의 좋은 expression이라서.
- 마지막 한 줄: **도구가 사고를 바꾸는 게 아니라, 좋은 도구는 이미 가진 사고를 더 단단하게 만들어준다.**

## Source Material

Top-level purpose anchor (for §6a):
- `docs/spec-editorial-philosophy.md`
- `docs/spec-migration.md` line 5: `Reference Philosophy: Follow docs/spec-editorial-philosophy.md`

Cycle in action — post-detail centered-layout series, in git order (for §6b):
- `049f45b` docs: add post detail centered layout design spec
- `23e794b` docs: add implementation plan for post detail centered layout
- `7081889` style: center post body on viewport with TOC overhanging at xl:
- `3a6eda9` docs: record post detail centered layout iteration
- `1b1ae26` docs: fix TOC overhang math in spec-post-detail wide-figure note
- `5ac4c26` docs: align design spec wide-figure math with the SSOT

Pattern repetition (for §6c):
- `prose comfort bump` series: `6731db7` (spec) → `7812dd3` (plan) → `952b81c` (impl) → `b44c224` (spec record)
- `code-block copy button` series, ending in `0b4dd6f docs: record code-block copy button in post-detail and roadmap specs`

Voice references:
- `src/content/blog/ko/macos-terminal-hangul-1/index.md` — italic 곁다리 patterns, self-questioning rhythm
- `src/content/blog/ko/safe-random-history/index.md` — methodology essay register, mid-2010s engineering blog tone

## Scope

### In scope

- One Korean blog post at `src/content/blog/ko/purpose-driven-systems/index.md` matching the structure and voice above.
- Frontmatter conforming to the site's content collection schema (`src/content/config.ts`): `title`, `pubDate`, `description`, `category`, `tags`. No `series`, no `draft`.
- Exactly the source material listed above. Commit hashes and file paths must match the repo at the time of writing.
- A single italic 곁다리 in §2 and §6, plus the optional one in §1 — not more.

### Out of scope

- The English translation. Will follow as a separate cycle per the site's KO→EN pattern.
- Any deeper technical comparison of superpowers vs other AI dev tooling.
- Modifying the existing specs (`spec-editorial-philosophy.md`, etc.) to look "presentable" for the article. The article cites them as they are.
- Adding the `methodology`, `ai`, `claude-code`, or `superpowers` tags to other posts. Each tag is `[NEW]`; their first use is this post.
- Updating `docs/spec-roadmap.md` or other docs as a side effect of publishing.

## Verification Target

- Drafted post lives at `src/content/blog/ko/purpose-driven-systems/index.md`.
- `npm run dev` renders the post correctly at `/posts/purpose-driven-systems/`:
  - Frontmatter valid; appears in `/posts/`, `/category/development/`, and the four new tag pages.
  - Italic 곁다리 patterns render with the site's prose treatment matching `macos-terminal-hangul-1`.
  - Inline references to `docs/spec-editorial-philosophy.md` and the six commit hashes appear as plain text or backtick-quoted, not as broken links (these files/hashes are repo-internal, not URLs the reader can follow).
- `npm test` passes with no new test additions required (post-only change).
- Manual reading pass: 본문이 voice references와 톤이 같은지 확인.
- Word count within 2800–3300자 range.
- The four new tags surface correctly in `/tags/methodology/`, `/tags/ai/`, `/tags/claude-code/`, `/tags/superpowers/` — each will be an archive of one post initially.

## Publishing

- File path: `src/content/blog/ko/purpose-driven-systems/index.md`
- Asset folder co-located (`src/content/blog/ko/purpose-driven-systems/`) — empty unless an opening image is decided in the draft step.
- Commit message convention (matching recent commits): `content: publish 'purpose-driven systems (feat. superpowers)' essay`
- No PR required — author-direct merge is the established pattern for content commits on this repo (see `e0ee3bd content: migrate macOS terminal Korean / NFC vs NFD post (KO + EN)` etc.).

## Alternatives Considered

- **Tool-led structure: "I use superpowers, and here's why."** Rejected. Inverts the argument so methodology becomes the justification for the tool. The author's own framing leads with methodology; preserving that order is what makes the (feat. superpowers) framing land.
- **Dedicated "지키기 쉽지 않은" tradeoffs section.** Rejected during brainstorming. Adds weight that the methodology essay register doesn't carry well; italic 곁다리 hits the same note without slowing the spine.
- **Use only the post-detail centered-layout cycle as evidence (skip editorial-philosophy).** Rejected. The methodology has two halves — purpose anchor + cycle — and each half deserves its own evidence type. Dropping the static evidence weakens the "purpose stays solid" half of the claim.
- **Use only editorial-philosophy as evidence (skip the cycle).** Rejected. The static evidence shows purpose exists; it doesn't show the cycle in motion. The author's methodology is fundamentally about the *cycle*, so dynamic evidence is the load-bearing piece.
- **Run the article through deeper meta self-reference ("이 글 자체도 spec → plan → draft 사이클로 작성됨").** Rejected as the article spine. A single sentence at the end is allowed if the author prefers; treated as a draft-step decision, not a structural one.
- **Bundle the EN translation with this work.** Rejected. The author's established pattern is to publish KO first, then translate as a separate cycle. Bundling here would inflate scope and slow the KO publish.
- **Open the article with company-context experience instead of sings.dev.** Rejected during brainstorming. Increases sensitivity-of-source overhead with no proportional gain in concreteness, since sings.dev is a fully transparent and self-contained anchor.

---

After approval, the next step is `superpowers:writing-plans` to produce a step-by-step drafting plan.
