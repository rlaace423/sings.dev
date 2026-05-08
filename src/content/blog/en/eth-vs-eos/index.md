---
title: "ETH vs EOS: Addresses and Fees"
pubDate: 2018-12-06
description: "A side-by-side look at how Ethereum and EOS differ on addresses and transaction fees."
category: "Development"
tags:
  - ethereum
  - eos
  - blockchain
---

This post compares Ethereum and EOS along two dimensions: how each handles addresses, and how each handles transaction fees.

## Addresses

The established coins — Bitcoin, Ethereum — both work in terms of an **address**. An address plays the same role as a bank account number. So if A wants to send ether (ETH, Ethereum's native currency) to B, A has to know B's address. Ethereum addresses are made of digits and letters and look like this:

```text
0x15a664416e42766a6cc0a1221d9c088548a6e731
0xc5b4aaa4a05017e2e44d483d132c8c9c82cbc493
0x69189716420FFCc0cA2e4F9869433389Df331f9c
```

Not friendly. An Ethereum address isn't human-readable, so it's hard to imagine a general user feeling comfortable working with one directly.

EOS adds an **account** layer on top of the address concept. An account is closer to a **username** than an account number. Users sign up on the EOS blockchain — similar to creating an account on a website — and can then send EOS to other people's accounts.

Another way to think about EOS accounts is the IP-address-vs-domain analogy. Strictly speaking, reaching a website requires knowing its IP address. But nobody types `125.209.222.142` into the browser to visit Naver. DNS already exists for that — it maps IP addresses to human-readable strings — so we visit the site through `www.naver.com` instead of the raw IP.

![Figure 1. How DNS works](./dns-overview.webp)

EOS accounts look like this:

```text
flowerprince
upbitwallets
lioninjungle
```

EOS accounts are human-readable strings. You can memorize your own account name, share it with someone easily, and the whole thing feels much more familiar to a general user.

![Figure 2. Ethereum addresses vs. EOS accounts](./eth-address-vs-eos-account.webp)

## Fees

In any computer network, taking an action — e.g., sending coins — eventually means someone's machine has to do that work. Nothing is free, so somebody has to cover the cost.

On Ethereum, every transaction incurs a **fee**. If A sends some ether to B, A pays a fee to whoever processed and recorded that transaction on the blockchain. This is also a defining characteristic of PoW-based coins in general.

![Figure 3. Example of gas fees on an Ethereum transfer](./eth-gas-fee-example.webp)

EOS works a little differently. There is no concept of a fee. Instead, the user stakes a certain amount of EOS to the system, and that stake grants the right to use the EOS network in proportion to it. The staked amount isn't consumed — it can be reclaimed at any time.

By staking EOS, you're effectively **acquiring ownership of system resources** in proportion to the staked amount. Three resource types exist — CPU, NET, and RAM — and you need to know which of the three to allocate more of, depending on the kind of transactions you plan to issue.

![Figure 4. Resource allocation and usage for the flowerprince account](./eos-resource-allocation.webp)

This unusual structure means a general user feels the fee burden less, but actually using EOS properly requires understanding the resource model — so there's a small learning curve up front.
