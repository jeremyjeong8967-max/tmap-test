/**
 * 순수 CSV 처리 함수의 경계 검증. 실제 앱 소스에서 함수를 로드합니다.
 * 실행: node tests/check-csv.cjs (외부 패키지 불필요)
 * 브라우저 동작 검증 기록은 VALIDATION.md를 참고하세요.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
const data = fs.readFileSync(path.join(root, 'assets/js/data.js'), 'utf8');
const context = vm.createContext({ window: {} });
vm.runInContext(data, context);
const start = source.indexOf('    function parseCsv(text)');
const end = source.indexOf('    let fileReadSequence');
assert.ok(start > 0 && end > start, 'CSV 처리 구역을 찾을 수 없습니다.');
vm.runInContext(`const state = window.HR_DEMO.initialState(); const CSV_HEADERS = ['사번', '귀속월', '근무시간'];\n${source.slice(start, end)}`, context);
const validate = text => context.validateCsv(text);
const header = '사번,귀속월,근무시간\n';
const cases = [
    ['정상 파일', () => assert.equal(validate(header + 'A10001,2026-11,160').errors.length, 0)],
    ['BOM·CRLF·따옴표', () => assert.equal(validate('\uFEFF사번,귀속월,근무시간\r\n"A10001","2026-11","160"').errors.length, 0)],
    ['0시간', () => assert.equal(validate(header + 'A10001,2026-11,0').errors.length, 0)],
    ['헤더 불일치', () => assert.throws(() => validate('이름,월,시간\nA10001,2026-11,1'))],
    ['빈 파일', () => assert.throws(() => validate(''))],
    ['헤더만 존재', () => assert.throws(() => validate(header))],
    ['알 수 없는 사번', () => assert.ok(validate(header + 'UNKNOWN,2026-11,160').errors.length)],
    ['잘못된 월', () => assert.ok(validate(header + 'A10001,2026-13,160').errors.length)],
    ['음수 시간', () => assert.ok(validate(header + 'A10001,2026-11,-1').errors.length)],
    ['사번·귀속월 중복', () => assert.ok(validate(header + 'A10001,2026-11,1\nA10001,2026-11,2').errors.length)],
    ['열 개수 오류', () => assert.ok(validate(header + 'A10001,2026-11,1,2').errors.length)],
    ['미종결 따옴표', () => assert.throws(() => validate(header + '"A10001,2026-11,1'))],
    ['비정상 따옴표 위치', () => assert.throws(() => validate(header + 'A"10001,2026-11,1'))],
    ['5,001행 제한', () => assert.throws(() => validate(header + Array(5001).fill('A10001,2026-11,1').join('\n')))]
];
for (const [name, test] of cases) { test(); console.log(`PASS ${name}`); }
console.log(`${cases.length}/${cases.length} CSV 검증 통과`);
