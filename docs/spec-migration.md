# Spec: Past Post Migration

- **Goal**: Define how the author's archival posts (typically from Medium) get brought into sings.dev with high fidelity, and how Korean originals get adapted into English versions (and vice versa).
- **Scope**: Both directions of work — (a) ingesting an existing Medium URL into `src/content/blog/{ko,en}/<slug>/`, and (b) producing the matching translation under the other locale.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md`. Migration is archival work, so the author's voice in the original source is the target — interface preferences exist to support reading, not to override what the author already chose to say.
- **Document Role**: This is the authoritative source for the migration workflow. Other Claude sessions are routed here through a memory pointer. Update this file (not memory) when migration rules change so the change is reviewable and version-controlled.

## Rules

### 1. Preserve original wording. Limited editorial latitude allowed for genuinely awkward parts.

Do not rewrite the overall tone, register, or sentence structure. Keep original commas, particles, filler words (`과연` / `이것은` / `물론,`), idiomatic phrasings (`두 마리 토끼`), and the author's voice. Do not "tighten" or "match the new site's tone" — the post is archival.

Limited editorial latitude is allowed for parts that are genuinely awkward — e.g. an uncommon term replaced by a more common synonym (`암호화 파워` → `암호화 강도`). The bar is high: only words or phrases that read as errors or unusual choices, not stylistic preferences. When in doubt, preserve and add to the spelling/awkwardness list for approval rather than silent edit.

### 2. Spelling and Korean spacing fixes are welcome — but require explicit author approval before applying.

Common candidates: `암호화 되지` → `암호화되지`, `사이닝 하기` → `사이닝하기`, mid-sentence numbered list spacing, `(자세한 설명은 ... 을 참고)` particle agreement, etc. Present a numbered list of proposed fixes with `old → new` and let the author approve or reject each. Do not silently apply.

### 3. Include every image from the original. No `<!-- TODO -->` placeholders.

WebFetch's small-model summary often misses Medium image URLs because Medium lazy-loads. If WebFetch returns no body image URLs, fall back to:
- `curl` the raw HTML and grep for `miro.medium.com` / `cdn-images-1.medium.com` patterns
- A Chrome-based browser tool to render the JS page and extract from DOM
- Asking the author to save the images into `~/Downloads` (typical fallback when Cloudflare bot protection blocks both)

Download images and co-locate inside the post folder, reference relatively. Use the site's existing figure-caption convention: standalone markdown images are promoted to `<figure>` with the alt text reused as the caption (see `docs/spec-post-detail.md`).

### 4. Re-author embedded elements as native markdown.

Medium has no native table feature, so the original may use GitHub Gists for tables — convert these to GitHub-flavored Markdown tables. Other embeds (CodePen, Twitter, YouTube, etc.) should become native equivalents or short text references. Do not preserve the iframe/script form.

### 5. Locale-specific abbreviation register.

Korean posts use `예:` (not `ex:` or `e.g.,`) for inline examples. English posts use `e.g.,` (the proper Latin abbreviation). Medium's auto-typography also tends to convert `-` to `–` (en-dash) inside terms like `SHA3-256` — always normalize back to plain hyphen, since the original source was a hyphen.

### 6. Image format and naming.

Images saved from Medium typically arrive as `.webp` files named `<part>-<index>.webp` (e.g. `1-1.webp` for part 1's first image). When migrating: copy each into the post folder under a descriptive name that matches its caption (e.g. `scrypt-encryption.webp`), then reference via `![caption](./descriptive-name.webp)` so the figure-caption convention promotes it to a `<figure>` with `<figcaption>`. Do not alter the file format — webp is fine for the site.

### 7. Image fidelity — do not pre-process.

Source images committed to the repo must be md5-identical to what the author provided. Astro applies a small lossless optimization (~2–5% size reduction, metadata trim) during build automatically; that is the right place for it. Astro also deduplicates by content hash — two posts referencing identical webp content emit one file in `dist/_astro/`, not two. That is a feature.

### 8. Translation rule (KO ↔ EN).

The author has explicitly granted editorial autonomy for translation. Adapt for natural target-language flow rather than literal translation:

- Preserve technical content exactly: variable names, JSON examples, byte counts, algorithm names, code blocks. Do not paraphrase technical claims.
- Preserve structure: same headings, same image positions, same flow.
- Adapt sentence structure for readability. Korean-specific filler ("결국", "과연", "하지만 …이죠") often does not translate naturally; restructure rather than carry it across.
- Drop closing conventions that do not serve the target reader (e.g., trailing standalone "감사합니다." in English).
- Update locale-specific references: `ko.wikipedia.org` ↔ `en.wikipedia.org`, `(예:` ↔ `(e.g.,`.
- Match the site's existing voice on the target side: calm, direct, mid-2010s engineering blog register.
- Use natural typography for casing in the target language. In English, lowercase generic terms (`private key`, `public key`, `ciphertext`, `derived key`) and capitalize only proper nouns or JSON field names.
- Title: pick a concise target-language title that captures the spirit, not a literal translation. KO descriptive titles may map to a different EN form (e.g., "이더리움 KeyStore 파일 생성 및 암호화/복호화 원리" → "Inside the Ethereum KeyStore File").

Default new translations to `draft: true` so the author can review the adaptation in dev before publishing.

### 9. Image folder layout for translated posts.

Each locale's post folder owns its own assets. Do not reach across with `../../../ko/.../image.webp` from an `en/` post — copy the same image files into the EN post's folder. Astro's dedup-by-content-hash means there is no deploy-size penalty for the duplicated source files; the same single output file is served. Filenames match across locales so `en/post-slug/scrypt-encryption.webp` and `ko/post-slug/scrypt-encryption.webp` are byte-identical, which keeps maintenance simple.

### 10. Strip company-name self-identification.

The author's archival Medium posts often open with a company-byline greeting like "안녕하세요, 헥슬란트 김상호입니다." Posts now live on the personal blog (sings.dev), not on a company publication, so the company affiliation is no longer the publication context. Silently strip the company name from this kind of self-identification when migrating:

- `안녕하세요, 헥슬란트 김상호입니다` → `안녕하세요, 김상호입니다` (or drop the greeting entirely if it adds nothing)
- `헥슬란트에서 진행한 …` → `이전에 진행한 …` or rephrase to drop the attribution
- `헥토 월렛원의 Octet 플랫폼` → `Octet 플랫폼`

Specific company names to watch for (current and prior employers): `헥슬란트` / `Hexlant`, `헥토 월렛원` / `Hecto Walletone`, `현대오토에버` / `Hyundai AutoEver`, `Walletone`. Add anything else the author signals over time.

Edge case — when the company *is* the technical subject of the sentence ("Hexlant developed the X protocol"), use judgment: rephrase neutrally if natural, otherwise flag in the migration report (rule 11) and let the author decide.

The same rule applies in translation: drop company self-identification in the target-language version too.

### 11. End-of-migration report.

After completing each migration (post committed), present a "Notes from this migration" summary at the end of the response. The author has explicitly asked for this so unusual decisions are auditable even when migrations work cleanly.

Format — short bulleted summary:

- **Category and tags chosen** (always present, per rule 12): the chosen `category` and `tags` list, with `[NEW]` markers next to anything newly introduced to the site's taxonomy
- **Editorial fixes applied silently** (per rule 1 and rule 8 autonomy): lexical fixes, company-name strips, translation adaptations
- **Issues encountered and how they were handled**: image fetch failure → author provided manually, broken markdown render → quote relocated, etc.
- **Things needing author follow-up**: spelling candidates list (per rule 2), factual ambiguities, missing assets

If the migration was uneventful — verbatim text, clean images, no embeds, no judgment calls — say so explicitly ("no notable adaptations") rather than omitting the section. The point is consistent transparency, not noise filtering. The category-and-tags line is the one item that always appears regardless of how clean the migration was.

### 12. Pick category and tags from post content; report what was chosen and flag new additions.

Read the post and choose `category` (single string, required) and `tags` (array of strings, optional but typical). Prefer reusing existing values from the rest of the site's taxonomy so the archive's category and tag pages stay coherent — but introduce new entries when the post genuinely does not fit anything existing.

To check what is currently in use, grep the blog content collection:

```
grep -hE "^(category|  - )" src/content/blog/{ko,en}/*/index.md | sort -u
```

Conventions: tags are lowercase, single-word or kebab-case. Categories are TitleCase nouns. Keep tag count modest (3–5 typical).

In the migration report (rule 11), always include a one-line summary of what was picked, with `[NEW]` markers next to anything not already in the site:

```
Category: Cryptography [NEW]
Tags: ethereum, keystore, scrypt [NEW], encryption
```

The `[NEW]` flagging lets the author decide whether the new addition is worth keeping or whether to fold it into an existing entry.

## Workflow — applying the rules in order

For a typical migration request (the author pastes a Medium URL or says "이 글 옮겨줘"):

1. **Fetch fully** — get the source post including images.
2. **Preserve text verbatim** (rule 1) — strict by default, with limited lexical latitude under the rule 1 exception.
3. **Strip company self-identification** (rule 10) — silently remove byline greetings and prior-employer attributions.
4. **Choose category and tags** (rule 12) — prefer existing, flag `[NEW]` additions.
5. **Fetch images** (rules 3, 6, 7) — co-locate as descriptive filenames, never pre-process.
6. **Convert embeds** (rule 4) — gists / iframes → native markdown.
7. **Apply locale-specific typography** (rule 5) — `예:` vs `e.g.`, hyphen vs en-dash.
8. **List spelling candidates** (rule 2) — present a numbered `old → new` list; do not auto-apply.
9. **For translations** (rule 8): adapt rather than translate literally, default `draft: true`.
10. **Present final draft and migration-notes summary** (rule 11) — always include category/tags.
11. **Wait for author approval** — do not apply spelling/awkwardness fixes without an explicit "ok".
