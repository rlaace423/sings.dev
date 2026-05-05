---
title: "Inside the Ethereum KeyStore File"
pubDate: 2018-05-08
description: "How a private key is recovered from an Ethereum KeyStore file — password verification, mac comparison, AES decryption — plus follow-up questions on the design."
category: "Development"
tags:
  - ethereum
  - keystore
  - encryption
  - cryptography
series:
  id: "ethereum-keystore"
  index: 2
  total: 2
  subtitle: "Decryption and follow-ups"
draft: true
---

In the previous post we walked through how Ethereum KeyStore files encrypt a user's private key. To summarize what we covered:

> The private key is encrypted with AES, using the Scrypt-derived value of the password (the one entered at KeyStore creation) as the encryption key.

To sign a transaction we now need to pull the private key back out of the KeyStore file, so this post is about that decryption process.

## Verifying the entered password

The most important step during decryption is asking "**is the entered password correct?**" If decryption proceeds with a wrong password, the resulting private key will be different from the original, and a wrong private key can't prove ownership of the address.

So password verification is essential, and this is where the **mac** value comes in.

### 1. Generating a new derived key

To produce a `mac`, we need a derived key. Just like in the encryption process, we run Scrypt over the entered password to produce a new derived key.

![Generating a new derived key from the entered password](./new-derived-key.webp)

We use the exact Scrypt parameters that are recorded inside the KeyStore file. So if the same password is entered, the resulting derived key will match the one produced during the original encryption.

### 2. Generating a new mac

Just like in encryption, we combine the derived key from above with the ciphertext stored in the KeyStore file to compute a new `mac`.

![Generating a new mac from the new derived key](./new-mac.webp)

The ciphertext used here is the same value already recorded in the KeyStore file.

### 3. Comparing against the existing mac

Simple. If the newly generated `mac` matches the one stored in the KeyStore file, the password was correct.

![Comparing against the existing mac](./mac-comparison.webp)

## Decryption

Most of the work is already done. Now we just use the derived key generated above to decrypt the ciphertext that's stored in the KeyStore file.

![Decrypting the ciphertext stored in the KeyStore file](./aes-decryption.webp)

Encryption used AES, a two-way cipher. So feeding the ciphertext (the encryption result of the original private key) back through AES yields the original private key.

## Things worth thinking about

Across both posts we've covered how Ethereum KeyStore encryption and decryption work end to end. Below are a few questions that tend to come up — and some commentary on what each design choice is actually doing.

### Q: Why use a random salt?

**A:** To strengthen the one-way hash. By design, a one-way hash always produces the same output for the same input — which makes it vulnerable to rainbow-table attacks. Mixing in a random salt before hashing makes precomputed tables useless and the original value much harder to reverse.

### Q: A KeyStore file stores all kinds of values, but why not the Scrypt result itself?

**A:** Because storing it would defeat the entire scheme. The Scrypt result *is* the key used to decrypt the private key — keeping it next to the ciphertext would be like leaving the key in the lock.

### Q: Why Scrypt, of all the available one-way hashes?

**A:** Scrypt is one of the strongest password-based KDFs in current use. By design, it deliberately consumes a large amount of memory while computing each output, which makes brute-force attacks much more expensive than they'd be against a faster hash like SHA-256.

---

Thanks for reading. If you spot anything that's wrong, unclear, or could be sharpened, let me know and I'll update the post.
