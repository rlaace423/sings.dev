# Spec: Blog Evolution Roadmap

- **Goal**: Keep the blog's next major improvement areas visible so future work stays aligned with the site's editorial philosophy.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md` as the top-level guardrail for all roadmap decisions.
- **Document Role**:
  - This is a high-level roadmap, not an implementation spec.
  - It tracks what the next major improvement areas are, why they matter, and what order they should be approached in.
  - Any concrete work from this roadmap should still get its own focused spec and plan before implementation.

## Current State

- The core editorial identity, base layout, archive structure, post detail structure, search, and i18n foundation are already in place.
- Discovery work has started and its first major step is complete: `/posts` now acts as a calmer archive hub with category-first browsing.
- The remaining work should continue to deepen the blog's usability without making it feel heavier, louder, or more product-like.

## Priority Areas

### 1. Discovery

- **Intent**: Help readers find where to start and what to read next without turning the site into a portal.
- **Current Status**:
  - Archive hub work is in place.
  - Category pages now act as shallow landing pages.
  - Tags remain secondary browse links.
- **Next Likely Work**:
  - Strengthen post-to-post reading flow after finishing an article.
  - Add lighter browse entry points from the home page.
  - Continue refining browse structure without merging it with search.
- **Avoid**:
  - Popularity widgets
  - Tag clouds
  - Thumbnail-first grids
  - Discovery UI that feels louder than the writing

### 2. Identity

- **Intent**: Make it clearer who is writing, what kinds of work or thinking the blog contains, and why the site feels the way it does.
- **Likely Surfaces**:
  - Home page introduction
  - About page
  - Author presence around posts
- **Direction**:
  - Strengthen personality and authorship without drifting into branding or self-promotion.
  - Keep identity editorial and human, not corporate or portfolio-like.
- **Avoid**:
  - Marketing-style hero sections
  - Resume-site energy on the home page
  - Decorative identity elements that overshadow the writing

### 3. In-Post Reading Experience

- **Intent**: Make long posts easier to scan, understand, and stay with while preserving the writing's rhythm.
- **Likely Surfaces**:
  - Article structure cues
  - Image captions and figure handling
  - Optional summary aids for suitable posts
  - Additional reading guidance inside long technical posts
- **Direction**:
  - Prefer lightweight editorial aids over rigid templates.
  - Keep summaries optional rather than mandatory for every post.
  - Improve scanning without flattening tone or narrative flow.
- **Avoid**:
  - Mandatory TL;DR blocks on every post
  - Over-structured article chrome
  - UI patterns that make posts feel templated or mechanical

## Recommended Order

1. Continue the remaining discovery work from the archive-hub foundation.
2. Strengthen identity once browse and navigation feel steady.
3. Refine in-post reading experience after the outer navigation and site voice are more settled.

## Success Criteria

- The blog remains unmistakably calm, text-first, and personal.
- Readers can find relevant writing more easily without the site feeling heavier.
- The site's identity becomes clearer without drifting into marketing or portfolio patterns.
- Long posts become easier to read and scan without forcing every post into the same template.
