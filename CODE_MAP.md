# 개발자 코드 위치 안내

줄 번호는 이 패키지 생성 시점 기준입니다. 각 파일의 구역 주석을 함께 사용하세요.

## app.js

| 함수 | 시작 줄 |
|---|---:|
| icon | 35 |
| escapeHtml | 39 |
| loadState | 48 |
| persist | 72 |
| toast | 88 |
| openDialog | 94 |
| closeDialog | 100 |
| badge | 102 |
| notice | 103 |
| heading | 104 |
| table | 107 |
| footer | 110 |
| tabs | 111 |
| saveFile | 114 |
| definitionList | 122 |
| renderHome | 127 |
| serviceCard | 148 |
| renderPeople | 153 |
| updatePeopleResults | 171 |
| employeeDetail | 181 |
| registrationDialog | 186 |
| renderOrganization | 198 |
| renderAttendance | 206 |
| parseCsv | 213 |
| validateCsv | 239 |
| inspectCsv | 259 |
| uploadHistory | 274 |
| renderPayroll | 279 |
| updateSettlementResults | 284 |
| settlementDialog | 288 |
| renderRetirement | 293 |
| renderYearend | 298 |
| renderEvaluation | 304 |
| renderIntegration | 311 |
| renderSettings | 316 |
| currentRoute | 324 |
| setDrawer | 325 |
| renderRoute | 331 |

## styles.css

| 구역 | 시작 줄 |
|---|---:|
| 01. DESIGN TOKENS — 색상·간격·크기 수정의 시작점 | 7 |
| 02. APPLICATION SHELL — 헤더, LNB, 메인 컨테이너 | 52 |
| 03. COMMON COMPONENTS — 모든 업무화면에서 재사용 | 75 |
| 04. HOME — 확정 시안의 그라데이션 배너·서비스 카드 | 127 |
| 05. BUSINESS VIEWS — 밀도·상태 표현, 실제 계산·권한 로직 없음 | 162 |
| 06. RESPONSIVE — 모바일은 표 가로 스크롤 + 요약, LNB는 drawer | 179 |

## 권장 수정 순서

1. data.js에서 메뉴와 예시 데이터를 확인합니다.
2. styles.css의 01 토큰과 04 홈을 수정합니다.
3. app.js의 해당 render 함수와 이벤트 분기를 함께 확인합니다.
4. 실제 서버 연결은 예시 상태·DTO와 분리된 어댑터를 추가한 뒤 진행합니다.
5. tools/build-preview.py로 단일 HTML을 재생성합니다.