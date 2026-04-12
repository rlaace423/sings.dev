# Header Full-Bleed Design

**Date:** 2026-04-13

## Goal

Make the public site's header background and bottom border span the full viewport width while keeping the header contents aligned to the existing centered site container.

## Decision

- Keep the current content rhythm and reading width.
- Move the header out of the centered page shell in `src/layouts/Layout.astro`.
- Keep the sticky, translucent, blurred header treatment on the outer full-bleed header element.
- Add an inner header container in `src/components/Header.astro` using the existing `max-w-4xl` width and horizontal padding so the logo, navigation, and controls stay visually aligned with the rest of the page.

## Why

The current site is intentionally text-first and narrow for readability. The issue is not the article measure itself, but that the header is constrained to the same shell, which makes the whole site feel narrower on large screens. Making only the header chrome full-bleed solves that without loosening the reading width.

## Constraints

- Do not move the header controls to the viewport edges.
- Do not widen the article measure as part of this change.
- Preserve the current smart sticky mobile behavior.
- Keep the implementation dependency-free.

## Verification Target

- The header renders before the centered page shell in `Layout.astro`.
- `Header.astro` contains an inner centered container with `max-w-4xl`.
- Site build remains successful.
