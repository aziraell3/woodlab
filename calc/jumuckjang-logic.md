# 주먹장 계산기 — 현재 로직 명세 (에이전트 재구현용)

이 문서는 **현재 구현된 동작의 단일 기준**이다. 다른 프로젝트에서 에이전트로 동일 기능을 만들 때 이 파일만으로 계산·작도·UX가 재현되어야 한다.  
참고 구현: `calc/jumuckjang.html`, `css/jumuckjang.css`, `js/jumuckjang.js`.

---

## 0. 제품 목적

- 목공 **주먹장(dovetail)** 설계 이해를 돕는 **교육·미리보기용** 계산기.
- 결과에만 의존하지 말라는 안내 문구를 타이틀 아래에 둔다.
- 오프라인 동작 가능(외부 CDN 불필요). 단위는 mm, 각도는 °.

---

## 1. 화면 구조

### 1.1 상단

1. **타이틀 행** (sticky): `주먹장 계산기` + 화면 가로 토글 `800 / 1024 / 1200`
2. **안내 문단** (`app-intro`): 교육용 안내 한 줄
3. **워크스페이스**
   - PC(≥768px): **좌 65% 미리보기 / 우 35% 입력** (`65fr` / `35fr`)
   - 모바일(<768px): 입력 메뉴(접기) → 미리보기 세로 흐름

### 1.2 미리보기 패널 (`workspace-preview`)

표시 순서(PC flex order 기준):

1. 작도 제목 + 상태 (`A형 · 기본 방향` 등)
2. 치수 표시 모드: `각 구간 표시` / `누적 치수 표시`
3. 작도 토글 5개: 대각선 / 주먹장 높이 / 중심선 / 주먹장 / 경사각
4. SVG 작도 (+ 전체보기 버튼)
5. `계산된 값` 킥커 + 메트릭 결과

### 1.3 입력 패널 (`workspace-inputs`)

1. **공통 입력값** 패널  
   - 킥커 행: 왼쪽 `공통 입력값`, **오른쪽 `교육용` 체크박스**
   - 부재의 가로 (`width`)
   - 주먹장의 높이 (`thick`) — 도면상 부재 세로(두께)
   - 경사각 (`angle`) + `방향반전` (`reverse`) 한 줄
2. **유형별 입력값** 패널  
   - 탭: A형 / B형 / C형  
   - 유형별 필드 (아래 §2)

---

## 2. 입력값 · 기본값 · 자동계산

### 2.1 공통

| id | 의미 | 기본 | 제약 |
|---|---|---:|---|
| `width` | 부재 가로 `m` | 132 | > 0 |
| `thick` | 주먹장 높이 `h` | 20 | > 0 |
| `angle` | 경사각 | 7 | ≥ 0, < 80 |
| `reverse` | 방향반전 | false | — |
| `edu-mode` | 교육용 | localStorage | §6 |

숫자 필드: `-`/`+`/`e` 입력 차단. `step="any"`만 소수점 허용. 최솟값 미만이면 min으로 보정.

### 2.2 개수 필드 (A/B/C 공통 규칙)

- id: `ac`, `bc`, `cc`
- **홀수만** (3, 5, …, 19). 짝수 입력 시 홀수로 내림 보정.
- UI: `+` / 입력 / `−` 스테퍼. 클릭 시 **±2** (홀수 유지).
- min=3, max=19.

### 2.3 A형

| id | 의미 | 기본 | 비고 |
|---|---|---:|---|
| `ac` | 주먹장 개수 `n` | 5 | 홀수 |
| `aw` | 주먹장 길이 | 자동 | **disabled**, `aw = m / ac` (소수 3자리) |
| `a-ends` | 좌/우 별도 지정 | false | **현재 UI hidden+disabled** (로직은 남아 있음) |
| `a-edge` | 좌/우 각각 길이 | 자동 | hidden; `a-edge = h * tan(angle°)` |

현재 화면에서는 A형 좌/우 별도 지정을 쓰지 않는다. 재구현 시에도 기본은 **ends=false**로 동작하면 된다.

### 2.4 B형

| id | 의미 | 기본 | 비고 |
|---|---|---:|---|
| `bc` | 주먹장 개수 `n` | 5 | 홀수, ≥3 |
| `bt` | 주먹장 길이 | 자동 | **disabled**, `bt = (m - 2*b-edge) / (bc - 2)` |
| `b-edge` | 좌/우 주먹장 길이 `e` | 10 | > 0, `2e < m` |
| `edge-slope` | 좌/우 경사각 적용 | true | B 패널에 배치 |

### 2.5 C형

| id | 의미 | 기본 | 비고 |
|---|---|---:|---|
| `cc` | 주먹장 개수 `n` | 3 | 홀수 |
| `ct` | 주먹장 길이 `t` | 15 | > 0, `n*t < m` |

---

## 3. 계산 로직 (`compute`)

공통 기호:

- `m`, `h`, `angle`, `n`
- `ends`: 좌/우 끝 주먹장 사용 여부  
  - B형: 항상 `ends = (e > 0)` (e는 `b-edge`, 필수 > 0)  
  - A형: `a-ends` 체크 AND `a-edge > 0` (현재 UI에선 사실상 false)
- `edge`: ends일 때 끝 길이, 아니면 0
- `diagonalRequired`: 파란 대각선 작도·메트릭이 필요한지
- `step`: A/B 균등 분할 길이 `k`
- `total`: 대각선 총길이 `D`
- `marks`: 대각선 위 누적 마크 (길이 좌표)
- `segments`: 가로 구간 `{ w, kind }` 배열 (`keep` | `cut` | `edge`)
- `cumulative`: 구간 누적 x (0 … m)

### 3.1 공통 검증 실패 → error

다음이면 에러:

- `m,h,angle,n,edge` 비유한수
- `m≤0` 또는 `h≤0`
- `angle < 0` 또는 `angle ≥ 80`
- `n`이 정수가 아니거나 **짝수**이거나 `n < 3` 또는 `n > 19`
- `edge < 0`
- B형에서 `edge ≤ 0`
- `edge * 2 ≥ m`

메시지 예: `부재 치수, 주먹장 개수(홀수) 및 좌/우 주먹장 길이를 확인해 주세요.`

### 3.2 A형 대각선

```
diagonalCount = n
if (!ends && m/n 이 정수에 매우 가까움):
  step = m/n
  total = m
  diagonalRequired = false
else:
  step = max(floor(m/n)+1, ceil(aw), round(m*1.1/n))
  total = step * n
```

- `aw`는 자동값 `m/n` (입력 필드 값).
- `compareWidth = m`
- 조건: `diagonalRequired`이면 `total > m`, 아니면 `total ≥ m`. 그리고 `total < 1e7`.

### 3.3 B형 대각선 (중요)

파란 대각선은 **좌/우 주먹장을 제외한 중앙만** 다룬다.

```
centerWidth = m - 2*edge
diagonalCount = n - 2          // ← n이 아님
if (centerWidth / diagonalCount 이 정수):
  step = centerWidth / diagonalCount
  diagonalRequired = false
else:
  step = max(1, floor(centerWidth/diagonalCount)+1, round(centerWidth*1.1/diagonalCount))
total = diagonalCount * step
compareWidth = centerWidth
```

조건: `diagonalRequired`이면 `total > centerWidth`, 아니면 `total ≥ centerWidth`.

검증 예 (`m=132`, `e=10`, `n=5`):

- `centerWidth=112`, `diagonalCount=3`
- `112/3` 비정수 → `step = max(1, 38, 41) = 41`
- `total = 123` (> 112)

### 3.4 C형 대각선

```
t = ct
조건: n≥3, t>0, n*t < m
horizontalGap g = (m - n*t) / (n-1)
x = round(t*1000), y = round(g*1000)
d = gcd(x,y); u=x/d; v=y/d
base = n*u + (n-1)*v
multiplier = max(1, floor(m/base)+1)
tooth = u*multiplier
gap = v*multiplier
total = base*multiplier
diagonalCount = n   // marks는 아래 방식
diagonalRequired = true
compareWidth = m  → total > m
```

### 3.5 가로 세그먼트 (`segments`)

**C형**

- `2n-1`개: 짝수 index → `{w:t, kind:'keep'}`, 홀수 → `{w:g, kind:'cut'}`

**A/B형**

```
if ends: push {w:edge, kind:'edge'}
segmentCount = (mode==='B') ? n-2 : n
for i in 0 .. segmentCount-1:
  w = (m - 2*edge) / segmentCount
  if ends || mode==='B':
    kind = (i%2===0) ? 'cut' : 'keep'
  else: // A형 ends 없음
    kind = (i%2===0) ? 'keep' : 'cut'
if ends: push {w:edge, kind:'edge'}
```

의미:

- A형(ends 없음): 유지·제거·유지·… (첫 구간 keep)
- B형: 초록 끝 + 중앙은 **첫 중앙 구간부터 cut**, keep, cut… + 초록 끝  
  예 n=5 → 구간 7개: edge, cut, keep, cut, keep, cut, edge

### 3.6 marks (대각선 라벨 좌표)

- A/B: `[0, step, 2*step, …, diagonalCount*step]` 길이 `diagonalCount+1`
- C: `cumulative.map(v => v * total / m)` (가로 누적을 대각선 길이로 스케일)

### 3.7 결과 메트릭 UI

- `diagonalRequired`:
  - `대각선 총길이` = `total`
  - A/B: `대각선 균등 분할` = `step`
  - C: `대각선 주먹장 길이` = `tooth`
- 불필요 시: `가로 균등 분할` = `step` 만 표시
- A형 + ends 선택 시 상세: 좌/우 주먹장 가로 길이

표시 포맷: 소수 3자리까지 반올림 후 `ko-KR` locale.

---

## 4. SVG 작도 규칙 (`draw`)

좌표계 상수(현재): `X=39`, `W=340`, `Y=248`, `H=min(88, W*h/m)`, viewBox 폭 420.

### 4.1 스케일

- 가로 투영: `xp(v) = X + W * v / m` (`v`는 0…m 누적)
- B형 대각선 가로 구간만:  
  `lineX = X + W*edge/m`, `lineW = W*centerWidth/m`  
  `xd(v) = lineX + lineW * v / total` (`v`는 marks의 대각선 길이 좌표)
- A/C: `lineX=X`, `lineW=W`, `centerWidth=m`
- 대각선 상승:  
  `rise = min(145, W * sqrt(max(0, total² - centerWidth²)) / m)`  
  미리보기용 상한 있음 → **제작용 절대 축척 도면이 아님**

### 4.2 경사 경계 (`borders`)

각 cumulative 지점 i:

- 양끝(i=0, last): `direction=0` (수직)
- 내부:
  - ends이고 (i===1 또는 i===last-1):  
    `edge-slope` ON이면 `direction = (i===1 ? -1 : +1)`, OFF면 0  
  - 그 외: `direction = (i%2===1 ? -1 : +1)`
- `direction *= reverse ? -1 : 1`
- `tilt = (H/2) * tan(angle)` (경사각 토글 OFF 또는 angle=0이면 기울기 0)
- `top = x + tilt*direction`, `bottom = x - tilt*direction`

### 4.3 레이어·색

| 요소 | 색 |
|---|---|
| 부재 배경·외곽 | `#ea580c` |
| 대각선·분할 라벨 | `#2563eb` |
| 직각 수직 가이드 | `#0d9488` dashed |
| 좌/우 edge 채움 | `#16a34a` |
| 제거(cut) 빗금 | 패턴 stroke `#dc2626` (배경 `#fee2e2`) |
| 경사 선·각도 라벨 | `#9333ea` |
| 비스듬하지 않은 내부 경계 | `#dc2626` |
| 중심선 | `#64748b` |

제거 빗금: 8×8 패턴, 교차 대각선 stroke-width 0.5.

### 4.4 표시 토글별

- **주먹장 (`showJoint`)**: cut/edge 폴리곤 채움, 내부 경계선, cut 상단 실선 등
- **경사각 (`showSlope`)**: 기울어진 경계(보라) + 각도 텍스트. joint OFF여도 경계선은 joint∥slope 중 하나면 그림
- **주먹장 높이 (`showHeight`)**: 상단 가로선(유지/edge는 점선) + 좌측 높이 치수선
- **중심선 (`showCenter`)**: 부재 세로 중앙 수평 점선 + `중심선` 라벨
- **대각선 (`showDiagonal`)**: `diagonalRequired`일 때만 의미 있음. 불필요면 토글 disabled, 라벨 `대각선 불필요`

### 4.5 대각선 작도 디테일

대각선이 보일 때:

1. 파란 사선: 양끝 **pad 24px** 만큼 선 방향으로 연장
2. 각 mark에 파란 점
3. **직각 수직 가이드** (청록 점선, guideTop → baseY+16)
   - **A/C**: 첫·마지막 mark **제외** (중간만)
   - **B**: **모든 mark 포함** (첫·마지막도 그림)
4. 치수 라벨 (marks ≤ 17일 때만)
   - `view=each`: 구간 중앙에 `step`(또는 구간 길이), 대각선 각도로 rotate. 마지막 구간 포함(`slice(0,-1)`)
   - `view=cumulative`: mark 위치의 누적값
     - **A/C**: 첫·마지막 제외 (`slice(1,-1)`)
     - **B**: 첫만 제외, **마지막 누적값 포함** (`slice(1)`)

### 4.6 경사 각도 라벨 위치

- 기울기가 있는 내부 경계만
- `labelDir = direction * (reverse ? -1 : 1)`  
  → 반전해도 **부재 바깥쪽**에 라벨이 오도록 오프셋 보정
- x = `p.x ± 11`, y는 교대로 mid±오프셋
- text-anchor: 바깥쪽 방향에 맞춰 start/end

### 4.7 하단 부재 가로 치수

- B형은 세그먼트 폭 라벨과 겹치지 않게 치수선을 더 아래(오프셋 32/54)에 배치
- A/C는 더 타이트(20/42)

### 4.8 세그먼트 폭 텍스트

`showDiagonal || showJoint` 이고 segments ≤ 13일 때, 각 구간 중앙 아래:

- edge → 초록
- 그 외 → 파랑

---

## 5. 작도 토글 연동

토글 라벨은 **현재 상태**를 표시한다: `○○ 보임` / `○○ 숨김`.  
`aria-pressed=true` = 보이는 상태.

개별 flip:

| 키 | 동작 |
|---|---|
| diagonal | 단독 토글 |
| height | 단독 토글 |
| center | 토글. **켤 때 height도 ON** |
| joint | 토글. **켤 때 height도 ON** |
| slope | 단독 토글 |

주의: height를 끈다고 joint/center를 끄지 **않는다**.

---

## 6. 교육용 모드

- 위치: **공통 입력값 킥커 우측**
- localStorage 키: `woodlab.jumuckjang.edu-mode.v5` (`1`/`0`)
- **체크 UI 극성 (반전 의미)**:
  - **체크 해제** = 작도 토글 전부 ON (모두 보임) → “일반/전체 표시”
  - **체크** = 작도 토글 전부 OFF (모두 숨김)
- 개별 토글 중 하나라도 OFF → 교육용 체크를 ON으로 동기화
- 전부 ON → 교육용 체크 OFF
- 초기화 시 `applyEduMode(false)` (전부 보이게)

---

## 7. 화면 폭 기억

- CSS 변수 `--app-max-width`
- 옵션: 800, 1024, 1200 (기본 800)
- localStorage: `woodlab.jumuckjang.app-width`
- **모바일(<768px)에서는 width 토글 숨김**

---

## 8. 레이아웃 · 모바일 UX

### PC (≥768px)

- 미리보기 왼쪽, 입력 오른쪽 sticky (`top≈52px`)
- 입력 접기 가능 (`입력값` 토글, 접으면 열 축소)
- 미리보기 영역 **내부 스크롤 없음** (페이지 스크롤 사용)

### 모바일 (<768px)

- 타이틀 sticky 높이 32px
- 입력 바 sticky `top:32px`, 펼치면 fixed 시트 + backdrop
- 하단에 **닫기** 버튼 (PC에서는 숨김)
- `계산하기` 버튼: 미리보기가 숨겨진 상태(`previewDismissed`)에서만 노출
- 전체 초기화 시 미리보기 숨김 + 입력 메뉴 오픈

### 전체보기

- figure 내 ⛶ 토글 → 미리보기 오버레이 전체보기
- body 스크롤 잠금

---

## 9. 상태 · 초기화

런타임 상태:

- `mode`: `'A'|'B'|'C'`
- `view`: `'each'|'cumulative'`
- 작도 토글 5종 boolean
- `previewDismissed`
- `figureFullscreen`

전체 초기화:

- 숫자/체크 기본값 복구 (**edu-mode는 defaults 루프에서 제외** 후 `applyEduMode(false)`)
- mode=A, view=each
- previewDismissed=true → 미리보기 숨김, 계산하기 노출, 입력 메뉴 오픈

탭별 개수 필드는 독립. 공통 `m/h/angle/reverse`는 공유.

---

## 10. 재구현 수용 기준 (체크리스트)

에이전트는 아래를 모두 만족해야 “현재 로직 구현 완료”로 본다.

1. A/B/C 탭, 홀수 개수 3–19, 스테퍼 ±2
2. A: `aw=m/n` 자동·disabled. ends UI 없어도 계산은 ends=false
3. B: `bt=(m-2e)/(n-2)` 자동. 대각선 `diagonalCount=n-2`, 중앙만 사선
4. B 예제 132/10/5 → step 41, total 123, 세그먼트 edge+3중앙+edge
5. C: keep/cut 교차, 정수 비율 대각선, `n*t<m`
6. 교육용 체크가 공통 입력 킥커 우측. 체크=전부 숨김, 해제=전부 보임 + 기억
7. joint/center ON 시 height ON. height OFF가 joint를 끄지 않음
8. B형 수직 가이드: 첫·마지막 포함. 누적 모드에서 마지막 누적값 표시
9. A/C형 수직 가이드·누적 라벨: 첫·마지막 제외
10. 반전 시 각도 라벨이 부재 **바깥**에 유지
11. 제거 빗금 색 `#dc2626`
12. PC 65/35, 입력 sticky, 모바일 폭 토글 숨김·입력 시트·닫기 버튼
13. 화면 폭 800/1024/1200 기억
14. 에러 시 SVG 비우고 메시지. NaN 좌표 금지
15. 미리보기는 교육용이며 절대 축척 도면이 아님을 전제

---

## 11. 의도적으로 넣지 않는 것

- 톱날 두께(kerf), 공차, 강도 보정
- 네트워크/계정/저장 서버
- B형에서 `bt`를 사용자가 직접 편집해 대각선에 반영하는 모델 (현재는 표시용 자동값)
- A형 좌/우 별도 지정 UI (코드 잔존 가능, 화면 노출 금지가 현행)

---

## 12. 파일 매핑 (현 레포)

| 파일 | 역할 |
|---|---|
| `calc/jumuckjang.html` | 마크업·기본값 |
| `css/jumuckjang.css` | 레이아웃·토글·모바일 |
| `js/jumuckjang.js` | 계산·작도·상태 |
| `calc/jumuckjang-logic.md` | **본 명세 (재구현 SSOT)** |
