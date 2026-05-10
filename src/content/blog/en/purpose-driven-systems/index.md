---
title: "Purpose-Driven Systems (feat. superpowers)"
pubDate: 2026-05-10
description: "A simple cycle for systems that last, and how superpowers turns that cycle into a tool."
category: "Development"
tags:
  - methodology
  - ai
  - claude-code
  - superpowers
draft: true
---

I like building systems that last. I work mostly on backends — services that run for years — and I've watched up close as some code stays clean over time while other code unravels fast. From that I've landed on one conclusion: what really breaks a system is **complexity accumulation**, and what causes that complexity accumulation is **purpose drift**. Peel back the visible symptom by one layer and the same thing is always underneath.

_(I've been carrying this view for a long time.)_

Every piece of software was built for a reason. That reason — the purpose — is what keeps a system going when it doesn't drift. The catch is that purpose isn't a static thing you define once and pin to a wall. It works as a cycle that keeps turning while development continues.

Here's how I lay out the cycle: **define purpose → develop → re-check purpose when adding a feature → revise or reaffirm → develop again**. Every time a new feature shows up, I run it against the original purpose. If they're out of alignment, I revise the purpose or reaffirm it before moving on to the next round of development. It's a simple cycle (one that's not always easy to hold to). Each turn either updates or reaffirms the purpose, and the moment that loop breaks, complexity starts to pile up.

_(Simple to describe. Going through it on every task isn't always enjoyable.)_

Lately a much larger share of my code gets written with AI. What used to take an hour finishes in ten minutes; what used to take days wraps up within a day. The speed boost is clearly a good thing, but it brings one worry along with it. As code pours out faster, won't the parts that drift from purpose pour out at the same rate, raising the breakage rate too? In the end, if the *human* who's supposed to define the purpose can't keep up with that speed, the cycle has effectively collapsed. Or has it?

Then I came across superpowers. It's a collection of Claude Code skills that enforces a sequence of stages — from brainstorming through verification — one step at a time. I started using it because it was just convenient. After a few days I noticed something: the flow this tool was enforcing looked familiar. The cycle I'd been running in my own head was sitting right there.

Only the wording was different. superpowers calls it **rigor at each step**; I call it **purpose preservation**. Different words, same direction. In one phrase: **firmly fixing the direction of development at the moment you decide what to build**. It struck me that superpowers is the tool form of the way I'd been thinking — vague and half-articulated until the tool gave it shape.

It gets clearer when you map each stage to a point in the cycle.

- **brainstorming**: asks what you're building and why, then produces a spec document. Maps directly to my cycle's "define purpose."
- **writing-plans**: separates the spec from the execution plan, so the purpose doesn't drift even when the implementation changes.
- **executing-plans**: runs that plan step by step. Maps directly to my cycle's "develop."
- **TDD**: a spec at the function level. Even inside a single function, you nail down what you're building first, then write the code.
- **verification-before-completion**: requires you to actually run things and verify before claiming anything is done.
- **code-review / finishing**: a final sweep over the whole thing at the wrap-up stage.

Interestingly, this flow is fractal. The same pattern repeats at the large scale (brainstorm ↔ plan ↔ execute) and at the small scale (test ↔ code ↔ verify).

![Sierpinski triangle zoom — the same pattern repeats at every scale (image: Mariko GODA, CC BY-SA 3.0)](./sierpinski-zoom.gif)

This blog was built exactly that way.

`docs/spec-editorial-philosophy.md` codifies the site's fundamental identity, and the sub-specs all point back to it — for example, `spec-migration.md` opens with the line ``Reference Philosophy: Follow `docs/spec-editorial-philosophy.md` ``.

Walk through six commits from the recent post-detail centering work, in chronological order:

1. `049f45b` add post detail centered layout design spec ← **brainstorm**
2. `23e794b` add implementation plan ← **plan**
3. `7081889` style: center post body ← **impl**
4. `3a6eda9` record post detail centered layout iteration ← **spec update**
5. `1b1ae26` fix TOC overhang math ← spec consistency
6. `5ac4c26` align design spec wide-figure math with the SSOT ← **SSOT alignment**

As shown above, a whole turn of the cycle is preserved in git. Feature additions like `prose comfort bump` (`b44c224`) and `code-block copy button` (`0b4dd6f`) were developed through the same cycle.

To wrap up: a system breaks down when complexity accumulates, and complexity accumulates when purpose drifts. So if purpose doesn't drift, a system doesn't break down so easily. Why I use superpowers is simple — it's a good expression of how I already think. The flow the tool enforces and the cycle in my head point to exactly the same place, so the cycle keeps turning even at AI speed.

**Tools don't change how you think — a good tool makes your thinking more solid.**
