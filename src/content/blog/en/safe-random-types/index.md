---
title: "Generating Safe Random Numbers"
pubDate: 2024-01-02
description: "How TRNGs and CSPRNGs produce safe random numbers, and how to use them across operating systems and programming languages."
category: "Development"
tags:
  - cryptography
  - random
  - security
series:
  id: "safe-random"
  index: 2
  total: 2
  subtitle: "TRNG and CSPRNG"
---

Previous post: [Generating Safe Random Numbers (1/2)](/en/posts/safe-random-history)

![An AI's idea of a random number generator,, hmm?](./ai-rng.webp)

The random numbers from part 1 are produced by an algorithm seeded with an initial value. They're called **Pseudo-Random Number Generators (PRNGs)**, and the output looks effectively random. But if the seed is the same, the output is the same — and given the seed and the algorithm, it's possible to predict subsequent numbers. That makes PRNGs unsuitable for cryptographic use or anywhere security matters. For those cases, we need a different type of generator.

## True Random Number Generator (TRNG)

TRNGs **generate the safest kind of random numbers** — effectively unpredictable, with no skew in the distribution. They draw entropy (the degree of unpredictability) from physical phenomena that produce statistically random signals — radioactive decay, the cosmic microwave background, atmospheric noise, quantum effects — phenomena that look random as far as we currently understand them. TRNGs are usually built as semiconductor chips.

![Infinite Noise TRNG modules](./usb-trng.webp)

A common example is your CPU. Most modern CPUs ship with a security module called the TPM (Trusted Platform Module), and one of the TPM's core components is a TRNG. A CPU's TRNG typically harvests entropy from thermal noise in the silicon.

> CPU instructions like **RDRAND** let you read out the collected entropy.

TRNGs let you generate effectively unpredictable, safe random numbers — but they have downsides.

Because TRNGs rely on physical phenomena to gather entropy, their design and implementation are more complex than a PRNG's, and the cost goes up. Environments where the relevant physical effect is hard to access, or where size and power are constrained (e.g., portable devices), can struggle to guarantee good randomness. And in practice, random numbers need to be generated fast enough — TRNGs, by their nature, can be slower than PRNGs, which are just running algorithm steps.

Given those downsides, we want something that's as safe as a TRNG and as fast as a PRNG.

## Cryptographically Secure PRNG (CSPRNG)

A **CSPRNG** (Cryptographically Secure Pseudo-Random Number Generator) is technically a PRNG, but **it's designed to meet security and cryptographic requirements — producing random numbers that are unpredictable enough for those uses**.

A CSPRNG starts by gathering enough entropy from various sources to use as a seed:

- **Hardware events** — mouse movement, system interrupt timing, disk I/O, etc.
- **System state** — system time, CPU temperature, etc.
- **Hardware devices** — the CPU TRNG described above can also feed a CSPRNG.

With enough entropy, the seed is set and the generator is initialized. From there, like any PRNG, it produces safe random numbers quickly via its internal algorithm. Most CSPRNG algorithms also re-seed the generator whenever new entropy becomes available, making the output even harder to predict.

## Using a CSPRNG

CSPRNGs let us generate cryptographically safe random numbers quickly. Most operating systems and programming languages expose one:

- **Linux, MacOS** — **/dev/random** and **/dev/urandom** store entropy collected at the OS kernel level. They're consumed by kernel functions like `get_random_bytes` and used by crypto libraries like OpenSSL when generating random numbers. (See the Linux kernel's [random.c](https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/drivers/char/random.c) for details.)
- **Windows** — the **BCryptGenRandom** function in the [Cryptography API: Next Generation (CNG)](https://learn.microsoft.com/en-us/windows/win32/seccng/cng-portal).
- **Node.js** — **crypto.randomBytes**, or **crypto.randomInt** (v14 or later).
- **Python** — **os.urandom**.
- **Java** — **java.security.SecureRandom**.
- **C#** — **System.Security.Cryptography.RandomNumberGenerator.Create**.

We've now covered a brief history of random numbers and the two safer generator types: TRNGs and CSPRNGs. CSPRNGs give us a cost-effective way to produce safe random numbers. When you're picking an OS or a language, it's worth checking that whichever random function you're about to reach for actually generates random numbers safely.
