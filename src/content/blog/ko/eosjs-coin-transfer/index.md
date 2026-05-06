---
title: "eosjs 설치부터 전송까지"
pubDate: 2018-09-27
description: "eosio 블록체인의 javascript 라이브러리 eosjs를 설치·설정하고 transfer 메서드로 EOS 코인을 전송하는 과정을 정리합니다."
category: "Development"
tags:
  - eos
  - eosjs
  - blockchain
  - javascript
series:
  id: "eosjs-transfer"
  index: 1
  total: 2
  subtitle: "EOS 코인 전송"
---

안녕하세요, 김상호입니다. 이번 포스팅에서는 eosio 블록체인의 javascript 라이브러리인 eosjs를 소개해보고자 합니다.

eosjs는 이더리움의 web3.js와 같은 **"특정 블록체인에 대한 특정 언어(eosjs의 경우 javascript)로 접근 가능한 API"** 입니다. 물론 SwiftyEOS(swift), eos-java-rpc-wrapper(java) 등 다른 언어들에 대한 구현체도 여럿 존재합니다. 여기서 eosjs는 eosio 측에서 직접 개발을 맡은 라이브러리입니다.

## eosio는 이미 RPC가 지원되는데 굳이 필요한가요?

그렇습니다. eosio는 http 요청을 통한 정보 제공 및 트랜잭션 전송 기능을 훌륭히 수행합니다. 하지만 eosjs를 사용했을 때의 장점 또한 존재합니다. 아래의 설명은 eosio의 RPC를 통해 코인 전송을 하기위한 과정입니다.

1. `/v1/chain/get_info` 호출을 통한 last_irreversible_block_num 획득
2. `/v1/chain/get_block` 호출을 통한 last_irreversible_block 정보 조회
3. `/v1/chain/push_transaction` 호출을 통한 실제 트랜잭션 전송

위와 같이 EOS 코인을 전송하기 위해 http 요청이 필요하고, 각 요청에 대한 에러 처리도 고스란히 개발자의 몫이 됩니다. eosjs도 결국 eosio RPC 요청에 대한 wrapper라고 볼 수 있지만, 이러한 작업을 편하게 수행하기 위해 다양한 named action function을 제공합니다. 따라서 eosjs를 사용한다면 **transfer** 메서드 호출 한 번에 위 작업을 수행할 수 있습니다.

이제 eosjs를 이용해 EOS 코인을 전송해보도록 하겠습니다.

## eosjs 설치

이제 eosjs를 사용하기 위한 설정 작업을 진행하겠습니다. 직접 html에 script 태그를 이용한 방법은 아래와 같습니다.

```html
<script src="https://cdn.jsdelivr.net/npm/eosjs@16.0.9/lib/eos.min.js"
  integrity="sha512-zhPSKFEBlDVvUzjl9aBS66cI8tDYoLetynuKvIekHT8NZZl2oxwcZ//M/eT/2Rb/pR/cjFvLD8104Cy//sdEnA=="
  crossorigin="anonymous"></script>
```

만약 node.js와 같이 javascript 모듈러를 사용할 수 있는 환경이라면 아래의 작업을 수행합니다. (nodejs / npm 기준)

```bash
# 필요한 위치에서 아래의 명령어를 수행해 eosjs 설치
$ npm install eosjs --save
```

```javascript
// .js 파일 내부에 eosjs 사용
let Eos = require('eosjs');
```

> [!NOTE]
> 현재 eosjs는 하위 호환성을 보장하지 않는 업데이트가 10월 둘째주에 예정되어 있습니다. 따라서 10월 둘째 주 이후엔 본 포스팅과 내용이 다를 수 있으며, 본 포스팅의 내용을 기반으로 구현이 필요하다면 `package.json`에 eosjs의 버전이 `^16.0.8`과 같이 기록되어 있는지 확인하세요!

## eosjs 설정

무사히 eosjs를 설치하였다면 필요한 정보를 eosjs에게 알려 줄 차례입니다. 아래와 같이 chainID, 트랜잭션에 필요한 프라이빗 키, 접속할 nodeos의 주소를 입력합니다.

```javascript
let eos = Eos({
    chainId: '038f4b0fc8ff18a4f0842a8f05...',
    keyProvider: [
        "5JR9m7o......",
        "5JAj2AMS5....",
        ......
    ],
    httpEndpoint: "https://eos.greymass.com:443",
    broadcast: true,
    verbose: true,
    sign: true
});
```

- `chainId`: 연결할 체인 ID를 명시해줍니다. 주요 체인들의 chain ID는 아래와 같습니다.

| 체인 | Chain ID |
| --- | --- |
| EOS 메인넷 | `aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906` |
| Jungle 테스트넷 | `038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca` |
| Crypto Kylin 테스트넷 | `5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191` |

- `keyProvider`: 특정 계정에서 transfer를 하기 위해서, 해당 트랜잭션에 프라이빗 키 서명이 필요합니다. 따라서 필요한 프라이빗 키를 명시해 줍니다.
- `httpEndpoint`: 요청을 보낼 타겟 nodeos 주소입니다. 위 예제에서는 [greymass](https://greymass.com)의 퍼블릭 RPC 주소를 사용하였습니다.

## eosjs로 EOS 전송

설정까지 무사히 끝났다면 실제 코인 전송을 진행해봅시다. 윗 단계에서 생성한 eos객체의 transfer 메서드를 사용합니다. 순서대로 **보내는 이**, **받는 이**, **수량**, **메모**를 파라미터로 사용합니다.

```javascript
eos.transfer('lazylion1234', 'babylion1234', '1.0000 EOS', 'send!');
```

transfer 메서드의 마지막 파라미터에 callback을 사용할 수 있습니다.

```javascript
eos.transfer('lazylion1234', 'babylion1234', '1.0000 EOS', 'send!',
    (error, result) => {
        if(error) {
            console.error('Failed...');
        } else {
            console.log("Success!");
        }
    }
);
```

javascript의 특성 상 위 메서드의 callback은 비동기적으로 수행됩니다. 하지만 파라미터로 callback이 명시되지 않았다면 transfer 메서드는 promise를 반환합니다. 따라서 아래와 같이 메서드 호출 이후의 처리를 동기적으로 진행할 수 있습니다.

```javascript
async function() {
    try {
        ......
        let result = await eos.transfer('lazylion1234', 'babylion1234', '1.0000 EOS', 'send!');
        // 전송된 트랜잭션에 대한 트랜잭션ID 출력
        console.log('transaction ID is '+ result.transaction_id);
        ......
    } catch (err) {
        console.error('error!');
    }
}
```

## transfer 로그 확인

마지막으로 transfer 메서드 호출 시 출력되는 로그를 확인해봅시다.

![eos.transfer 메서드 결과](./transfer-log.webp)

- **1**: eos 객체 생성 시 자동으로 수행되는 부분입니다. 입력한 httpEndpoint에 `get_info` 요청을 보냅니다.
- **2**: transfer 메서드 호출 시 출력된 내용입니다. 내부적으로 여러 RPC 요청을 보내 transfer 액션을 수행함을 알 수 있습니다.

지금까지 기본적인 eosjs 사용법 및 EOS 코인 전송 방법에 대해 알아보았습니다. 다음 포스팅에서는 트랜잭션 메서드를 이용한 토큰 전송을 같이 해보는 시간을 갖도록 하겠습니다. 감사합니다!
