---
title: PHP Tricks & RCE 기법 정리 (해킹하는 부엉이들)
published: 2025-08-05
description: " "
tags: [ctf, php, rce]
category: Study
draft: false
---

<iframe width="100%" height="468" src="https://www.youtube.com/watch?v=qXR8QyvGscM&list=PLokTrj1EwOzww676mj_wIP7poVTq8oWyP" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

:::note
해킹하는 부엉이 - [초보자를 위한 PHP Tricks + RCE 기법들 소개] 발표를 정리하여 작성했습니다.  
해당 발표의 발표자이신 [`one3147`](https://one3147.tistory.com/)님의 동의를 받고 작성하는 글입니다
:::

요즘 CTF 나갈 때마다 느끼는 생각이 `nodejs`말고 다른 환경이 나오면 무기력해진다는 것이다.
nodejs는 계속 다뤄왔으니 해킹을 시작했을때부터 접근하기 쉬웠고 꽤 난이도 있는 문제들도 많이 풀어왔다.  
그러나 php랑 python으로 작성된 백엔드 바이너리를 볼 때마다 벽을 느끼곤한다

어떻게 보완할지 고민하던 와중 TeamH4C에서 진행하는 `해킹하는 부엉이들`에서 `One`님이 진행하신 해당 발표를 접하게 되었고 정리해보려한다

---

### PHP Tricks?
php에서는 (N)e(K) 형태의 문법을 지원한다. 이게 뭐냐면 대충 `2e12`로 표현하면 php가 $2 \cdot (10^{12})$ 같이 해석한다는거다.
이게 어떤식으로 악용 가능하냐면

```php
if(md5('QNKCDZO') == 0)
```
위와 같이 해시를 검증한다면 `0e8304...`이 되고 $0 \cdot 10^{8304...}$로 해석되어 `True`를 반환하게 된다.

이게 PHP 느슨한 비교를 사용하는 기법이랑 이어질 수가 있는데

```php
if('1e2' == 100) {}
```
문자열 삽입 -> number 타입과 비교 -> 1e2가 100으로 해석

### PHP 문법
```php
function sayHi() {
  echo 'hi'
}

'hi'();
```

- php에서는 문자열 뒤에다 `()`넣어서 호출해도 함수가 호출된다고 한다.

- `preg_`로 시작하는 함수들은 정규표현식을 기반으로 구현된다. 따라서 ReDos 가능성이 존재한다

---

### PHP LFI, RCE
```php
<?php
  include $_GET['path']
?>
```

CTF하다보면 이런 코드 한 번쯤은 봤을 것이다

`file:///` 프로토콜이랑 `php wrapper`들을 허용해서 LFI가 발생한다.
이는 이후 설명할 LFI to RCE로 연계 가능하다

그리고 자주 보이던 `allow_url_includes`가 켜져있으면 이런 코드에서 http 프로토콜 또한 허용해 include 한다.
`allow_url_includes = On` 이라면 원격에 있는 웹셸파일을 포함시켜 RCE하는 식의 기법도 있다

#### Log Poisoning RCE

LOG 파일에 payload를 주입해 LFI로 파일을 불러와 실행시키는 기법이다.
그냥 링크에 때려박으면 인코딩 되어 로그로 쓰여지기에, User Agent 같은 곳에 페이로드 삽입 후 `/var/log/apache2/access.log` 로그파일을 불러와 익스한다.

그러나 일반적으로는 `access.log`에 `excute perm`이 없어 RCE가 불가하기에 서버에서 파일에 실행 권한을 부여하는 취약점이 있지 않은 이상 트리거가 어렵다

#### PHP Session RCE
`session` 정보는 `/var/lib/php/sessions/session_(session)` 형태로 저장된다.

id나 password(대부분 해시 되겠지만) 같이 session에 저장되는 정보들에 php payload를 작성하고 `LFI`로 해당 파일을 로드한다면 페이로드를 실행할 수 있다

#### PHP Session Upload Progress RCE
`session.upload_progress.enabled`가 On일 때, 업로드 기능이 있는 엔드포인트에 다음과 같은 명령어를 전송하여 익스한다

```
curl url.kr/upload.php -H 'Cookie: PHPSESSID=mysession' -F 'PHP_SESSION_UPLOAD_PROGRESS=(BASE64 ENCODED RCE PAYLOAD)' -F 'upload=@/etc/passwd'
```

그러면 `/var/lib/php/sessions/session_my_sess`가 생성되어 인코딩된 페이로드가 저장되고, 이를 LFI 포인트에서 `php://filter/convert.base64-decode/resource=`으로 불러와 `RCE` 가능하다

만약 `session.upload_progress.cleanup` 옵션이 켜져있다면 `upload progress` 이후 바로 제거되기에 익스할 틈이 안난다
따라서 이땐 Dos등 race condition 가능한 포인트를 찾은 후 큰 파일을 업로드하여 cleanup 타이밍을 지연시켜야한다.

#### PHP + Nginx LFI to RCE
https://bierbaumer.net/security/php-lfi-with-nginx-assistance/
이거 읽어보고 적극적으로 활용해보도록 하자

#### Others
발표에선 언급 되지 않았으나 몇 개 더 찾아봤다

- `file()`, `hash_file()`, `file_get_contents()`, `copy()` 같은 함수에 값을 넣을 수 있다면 [자료](https://www.synacktiv.com/publications/php-filter-chains-file-read-from-error-based-oracle)보고 익스를 시도해보자. `error_based`로 세션파일 내용 알아낼 수 있다.

- LFI 우회 기법중에 `shell.p\\hp` 처럼 `\` 두 번 넣으면 우회되는 기법이 있다
- [SSU CTF에서 나온 기법인데 이것도 알아두면 좋을거 같다](https://www.jianshu.com/p/60fdf3880d3d)
- 해캠, SSU CTF에서 나왔던 기법이다.  
```php
$_GET['my_name.kr'];
// https://url?my_name.kr=1
```
쿼리를 이처럼 받는다면 정상적으로 쿼리를 넣기 힘들 것이다. `.`이 `_`로 치환되어 해석해 버리기 때문이다.  
`_`을 `[`로 대체해주자. SSU CTF 당시 어떤분의 설명에 의하면 `[`가 `_`로 치환되며 내부 조건문을 탈출하고 `.`은 건들지 않게 된다고 한다.
```
https://url?my[name.kr=1
```

- 발표에서 BOM Mapping도 나왔는데 나중에 정리해보겠다

---

정말 도움 되었다..! 웹 해킹 공부 시작 초반부터 `One`님 블로그 정독하며 공부해왔는데 다시 한 번 감사하다는 말씀 드리고 싶다