---
title: React2Shell Analysis
published: 2025-12-11
description: " "
tags: [analysis, react2shell, CVE-2025-55182]
category: Analysis
draft: true
---
## TL;DR
2025년 12월 `React Server Component(RSC)`에서 `RCE`가 가능한 취약점이 발견되었습니다. 해당 취약점은 [**CVE-2025-55182**](https://nvd.nist.gov/vuln/detail/CVE-2025-55182)를 발급받았으며, 단순히 공격자가 Next.js, React 환경의 서버에 요청을 보내는 행위만으로 임의 코드를 실행할 수 있을 정도로 파급력이 강해 CVSS 최고 점수인 10.0를 부여받았습니다.

RSC 19.0.0 ~ 19.2.0 계열이 취약하며 19.0.1 / 19.1.2 / 19.2.1 로 업데이트하면 문제가 해결됩니다.

---

## About RSC
React Server Component (RSC)는 `React Flight`라는 직렬화 프로토콜을 통해 클라이언트와 서버 간 통신을 합니다.

RSC는 아래와 같은 순서로 동작합니다.

1. 서버에서 컴포넌트 트리 렌더링
2. React Flight 프로토콜을 통한 직렬화
3. 클라이언트로 스트리밍 전송
4. 클라이언트에서의 병합 및 react application으로의 변환

## About Flight Protocol
React Server Component를 위해 설계된 자체 이진 통신 프로토콜입니다.
React 생태계에서 JSON의 대체제로써 이용되며 컴포넌트 트리를 효율적으로 직렬화/역직렬화 할 수 있습니다.
