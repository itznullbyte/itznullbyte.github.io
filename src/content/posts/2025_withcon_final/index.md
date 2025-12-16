---
title: Whitehat Contest Final Write-Up
published: 2025-11-22
description: " "
tags: [CTF_Writeup, whitehatcontest]
category: CTF
draft: false
---

## TL;DR
화햇콘 본선에 갔다왔는데 웹이 생각보다 잘 안 풀렸네요..

## Lemo (Web)

파일 수정과 게시판 기능이 있는 서비스였고, 백엔드는 **Deno + Fresh 프레임워크**, 프록시는 **NGINX** 구성이었다.  
Flag는 `/flag` 에 존재했다.

---

## 1. 취약점 분석

### 1-1. SQL Injection

누가봐도 SQLI가 터질거 같이 생긴 함수가 회원가입 기능에 존재한다.

```js
export function createUser(username: string, password: string, role: Role = Role.USER) {
  const result = db.exec(`INSERT INTO users (username, password, role) VALUES ('${username}', '${password}', ${role})`);
  return result;
}
```
이를 통해 관리자 계정을 생성할 수 있다.

### 1-2. Nginx Filtering

Nginx에서 url query를 sanitizing 하며 `ip` 파라미터가 존재하면 임의로 바꿔버린다.
```js
function fix(r) {
    var out = [];
    var args = r.args;

    for (var k in args) {
        if (!Object.prototype.hasOwnProperty.call(args, k))
            continue;

        if (k === 'ip')
            continue;

        var v = args[k];
        if (Array.isArray(v)) {
            for (var i = 0; i < v.length; i++) {
                out.push(k + '=' + encodeURIComponent(v[i]));
            }
        } else {
            out.push(k + '=' + encodeURIComponent(v));
        }
    }

    var real_ip = r.variables.remote_addr || "";
    out.push('ip=' + real_ip);
    return out.join('&');
}

export default { fix };
```

### 1-3. Middleware

```js
import type { FreshContext } from '$fresh/server.ts';

export async function handler(req: Request, ctx: FreshContext) {
  ctx.state = ctx.state ?? {};

  const ip = ctx.state.ip;
  const NODE_ENV = Deno.env.get('NODE_ENV') ?? 'production';

  console.log(ip, NODE_ENV);
  if (ip !== '127.0.0.1' || NODE_ENV !== 'development')
    return new Response('403 Forbidden', { status: 403 });

  return await ctx.next();
}
```

관리자 페이지에서 임의의 파일을 쓰기 위해서는 ip가 `127.0.0.1`이어야하며, NODE_ENV 값이 development여야 한다.

---

### Exploit
SQLI로 admin 권한을 얻고 `routes/`에 존재하는 파일들을 읽어올 수 있다.
그러나 Deno는 sandboxing 되어있기에 routes를 벗어나 바로 flag를 읽을 수는 없다.

```js
async function parseQuery(req: Request) {
  const url = new URL(req.url);

  const rawQS = url.search?.length ? url.search.slice(1) : '';

  const parsed = qs.parse(rawQS);

  console.log(parsed);

  return parsed;
}

export async function handler(req: Request, ctx: FreshContext) {
  ctx.state = ctx.state ?? {};
  ctx.state.query = await parseQuery(req);
  if (ctx.state.query.ip) {
    if (typeof ctx.state.query.ip !== 'string') {
      return new Response('400 Bad Request', { status: 400 });
    }
    ctx.state.ip = ctx.state.query.ip;
  } else {
    ctx.state.ip = '127.0.0.1';
  }

  return await ctx.next();
}
```

전역적으로 적용된 미들웨어를 보면 수상하게 `qs.parse`를 사용한다. qs모듈에는 `maxQueryLimit = 1000`이 기본적으로 설정되어 있어 쿼리를 1000개 넘게 주면 뒤에가 잘리게 된다.
이를 통해 nginx단에서 붙여주는 ip를 날리고 `127.0.0.1`을 집어넣을 수 있다.

### NODE_ENV 우회
이걸 생각을 못해서 못풀었다. `SQLI`를 admin만 따고 끝내는게 아니라, 
```sql
ATTACH DATABASE '.env' AS env;
CREATE TABLE env.t(t TEXT);
INSERT INTO env.t VALUES('NODE_ENV=development' || CAST(X'0A' AS TEXT));
```

이런식으로 `.env`를 생성해 `NODE_ENV`를 덮을 수 있다.

이러면 `writeTextFile()`을 사용할 수 있게된다.

### FFI
```
"preview": "deno run --allow-net --allow-ffi --allow-env --allow-read=. --allow-write=routes/ --watch=routes/ main.ts",
```

allow-ffi가 적용되어 있어 ffi로 플래그를 읽을 수 있었다.

