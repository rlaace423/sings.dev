---
title: "eosjs 설치부터 전송까지"
pubDate: 2018-10-04
description: "eosjs의 transaction 메서드를 사용해 EOS 위에서 컨트랙트 기반 토큰을 전송하는 과정을 정리합니다."
category: "Development"
tags:
  - eos
  - eosjs
  - blockchain
  - javascript
series:
  id: "eosjs-transfer"
  index: 2
  total: 2
  subtitle: "토큰 전송"
---

안녕하세요, 김상호입니다. 저번 포스팅에 이어 이번에는 eosjs를 통한 토큰 전송에 대해 설명해보려 합니다.

저번 포스팅에서 eosjs의 transfer 메서드를 사용해 코인 전송을 진행하였습니다. EOS 환경에서 transfer와 같은 어떠한 "액션"을 실행하기 위해 필수적으로 두 가지가 필요합니다.

- 컨트랙트의 계정 이름 (EOS 코인의 경우 `eosio.token`)
- 컨트랙트에 정의된 액션 이름 (EOS 코인의 경우 `transfer`)

우리가 사용한 eosjs의 transfer 메서드는 내부적으로 위의 정보가 들어 있습니다. (EOS 블록체인의 기축통화이고, 가장 많이 전송될 코인이기 때문에 편의를 위해 구현되었을 것입니다)

하지만 **토큰**은 다릅니다. eosjs가 특정 토큰이 올라가있는 컨트랙트의 계정 이름을 알 수도 없고, 그 컨트랙트 내부에 전송 기능이 transfer가 아닌 다른 액션 이름을 가질 수도 있기 때문입니다. 따라서 이와 같은 경우엔 eosjs의 transaction 메서드를 사용할 수 있습니다.

## eosjs의 transaction 메서드

transaction 메서드의 내용은 아래와 같습니다. 참고로 아래의 예시는 await 키워드를 사용해 결과를 result 변수에 담도록 설계하였습니다.

```javascript
let result = await eos.transaction({
    actions: [{
        account: "lioncontract",
        name: "transfer",
        data: {
            from: "lazylion1234",
            to: "babylion1234",
            quantity: "12.0000 LION",
            memo: "eosjs is quite easy to use!!"
        },
        authorization: [{
            actor: "lazylion1234",
            permission: "active"
        }]
    }]
});

console.log(result.transaction_id); // 성공한 트랜잭션ID 출력
```

- `actions`: 수행할 액션을 배열에 담습니다. 토큰 transfer의 경우, 일반적으로 송금 액션 한 개가 들어갑니다. 위 예시에서는 lioncontract 컨트랙트의 transfer 액션을 실행하게 됩니다.
- `actions → account`: 컨트랙트의 계정 이름입니다.
- `actions → name`: 컨트랙트에 정의된 수행할 액션 이름입니다.
- `actions → data`: 해당 액션에 필요한 데이터입니다. lioncontract의 transfer 메서드는 EOS의 transfer와 같은 내용이 필요함을 알 수 있습니다.
- `actions → authorization`: 이 액션을 수행할 권한을 명시합니다. 보내는 이가 lazylion1234이므로, 이 계정의 active 권한이 필요합니다.

## transaction 로그 확인

transaction 메서드 호출 시 출력되는 로그를 확인해봅시다.

![eosjs의 transaction 메서드 실행 결과](./transaction-log.webp)

eosjs가 해당 컨트랙트의 abi를 찾고 현재 block 정보를 받아와 알맞게 트랜잭션을 생성한 후, 서명하여 트랜잭션을 push해줍니다.

지금까지 eosjs를 통한 코인, 토큰 전송에 대해 알아보았습니다. eosjs를 사용하면 복잡한 여러 단계의 과정을 쉽게 해결할 수 있습니다. 궁금한 점이나 수정이 필요한 점 있으시다면 댓글 달아주세요. 감사합니다.
