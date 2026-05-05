---
title: "IAM 정책 만들 때 챙길 세 가지"
pubDate: 2026-04-20
description: "AWS IAM 콘솔에서 정책을 만들 때 놓치기 쉬운 세 가지를 짧게 정리합니다."
category: "Development"
tags:
  - aws
  - iam
  - infrastructure
draft: true
---

AWS에서 새 정책을 만들 때, 콘솔 UI만 따라가면 실수하기 쉬운 지점이 몇 군데 있습니다. 이 글에서는 실무에서 자주 놓치는 세 가지를 기록해 둡니다. 라우팅 경계에 관한 이야기는 [다른 글](/posts/routing-with-clarity/)에서 다뤘습니다.

## 1. 정책 목록부터 확인하기

콘솔 왼쪽의 **Policies** 메뉴에서 기존 정책들을 먼저 훑어보면, 이미 누군가가 비슷한 것을 만들어 두었는지 알 수 있습니다.

![IAM 콘솔의 Policies 목록](./iam-policies-list.svg)

비슷한 정책이 있다면 복제해서 수정하는 쪽이 `CreatePolicy`를 처음부터 작성하는 것보다 안전합니다.

## 2. JSON 에디터로 전환하기

Visual 에디터는 권한을 빠르게 찍을 때는 편하지만, 조건(Condition) 블록이 복잡해지면 JSON이 훨씬 읽기 쉽습니다.

![IAM 콘솔의 정책 생성 전체 화면](./iam-console-overview.svg#wide)

예시 정책 문서:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceVpc": "vpc-12345678"
        }
      }
    }
  ]
}
```

CLI로 같은 일을 하려면 다음처럼 씁니다:

```bash
aws iam create-policy \
  --policy-name AllowS3ReadFromVpc \
  --policy-document file://policy.json
```

> 팁: 정책을 먼저 **dry-run** 하거나 로컬에서 `aws iam simulate-custom-policy` 로 검증해 두면 프로덕션에서 거절 로그를 보는 일이 줄어듭니다.

![](./spacer.svg)

## 3. SDK에서 재사용할 수 있게 ARN을 기록해 두기

생성된 정책의 ARN은 나중에 역할(role)에 붙일 때 반드시 필요합니다. CDK에서는 이렇게 참조합니다:

```typescript
import { aws_iam as iam } from "aws-cdk-lib";

const readOnly = iam.ManagedPolicy.fromManagedPolicyArn(
  this,
  "ReadOnlyFromVpc",
  "arn:aws:iam::123456789012:policy/AllowS3ReadFromVpc",
);

const role = new iam.Role(this, "WorkerRole", {
  assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
  managedPolicies: [readOnly],
});
```

필요한 값을 클릭 ![cursor](./cursor.svg) 으로 찾는 것보다, 처음부터 ARN을 메모해 두는 쪽이 다음 작업을 빠르게 만듭니다.

자세한 필드 설명은 [AWS IAM 정책 문법 공식 문서](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_grammar.html)를 확인하세요.
