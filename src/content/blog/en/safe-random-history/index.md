---
title: "Generating Safe Random Numbers"
pubDate: 2023-05-01
description: "From coin tosses and dice to a computer's pseudo-random output — why we need random numbers and why naive randomness isn't enough."
category: "Development"
tags:
  - cryptography
  - random
  - security
series:
  id: "safe-random"
  index: 1
  total: 2
  subtitle: "Why it matters"
---

alea iacta est — the die is cast!

A **random number** is a value whose outcome can't be predicted. For a very long time we've leaned on various methods to make decisions where no one's preference dominates and the result can't be guessed in advance — coin tosses and dice rolls are the obvious examples.

Coin tossing traces back to Caesar's Rome. Roman coins of the time had nothing on them but the denomination, until Caesar ordered his own face engraved on one side. From that point on, people would toss a coin and read the emperor-side as a favorable sign. The same coin toss has carried through to today — modern football matches still use it to decide which side picks first.

![Pre-match coin toss in football](./coin-toss.webp)

Dice are older — their origins are uncertain, but they go back well before recorded history. Around 3000 BCE Egyptians played Senet, an ancient board game built around piece movement and chance. And excavations from the Indus Valley civilization (around 2600 BCE) have turned up six-sided dice that look very close to the ones we use today.

![Rolling dice](./dice-roll.webp)

From antiquity to now, we've kept finding ourselves in situations where a value needs to be decided by randomness. The same is true in computer science. We need random numbers when a game draws a starry night sky, when card games like poker compute the probability of a specific card appearing, and when we set up encrypted communication.

![A computer-drawn starry night sky](./starry-night.webp)

But what if those random numbers could be guessed? In a game it might not be a huge deal — maybe enemy patterns become easy to read, or someone finds a guaranteed-win strategy. From a cryptography point of view, though, predictable randomness is a system-wide failure. Financial IT, blockchain systems, encrypted communication — most cryptographic systems use random numbers as keys, so a guessable random number means every digital certificate, every website password, every blockchain wallet is effectively compromised.

The catch is that computers can't easily produce a real random number. Unlike a human who can make an arbitrary choice without thinking (though human choices are easily biased by surrounding context), a computer is fundamentally a deterministic system — same input, same output. To work around that, computers reach for whatever entropy they can find — the current time at millisecond or nanosecond resolution, CPU temperature, mouse movement at the moment of generation — and produce a *pseudo* random number that's as close to truly random as possible.

So when we write programs, we need to understand random numbers and verify that the libraries we're using actually produce useful ones. The next post covers the types of random number generators, how they generate, and how to pick the right one.
