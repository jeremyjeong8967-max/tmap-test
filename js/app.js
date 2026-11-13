/* ======================================================================
 * TMAP MOBILITY × U.STRA HR / 디자인 목업 v0.3
 * 코드 위치 안내
 * 01 아이콘·유틸리티 / 02 상태·로컬 저장 / 03 공통 UI
 * 04 홈 / 05 인사·복합조회·인재검색 / 06 조직·발령
 * 07 근태 CSV 검증 / 08 급여·퇴직·연말정산 / 09 평가
 * 10 연계·설정 / 11 라우팅·이벤트·초기화
 *
 * 경계: 클라이언트 시연입니다. 서버 권한·계산·지급·마감·API는 미구현.
 * 실제 서버에 전달할 DTO·상태·검증은 기존 소스 확인 후 정의해야 합니다.
 * ====================================================================== */
(() => {
    'use strict';
    const { MENUS, SETTLEMENTS, TASKS, STORAGE_KEY, initialState } = window.HR_DEMO;
    const $ = selector => document.querySelector(selector);
    const main = $('#main');
    const dialog = $('#dialog');

    /* 01. ICONS & UTILITIES — 내부 SVG, 외부 라이브러리 의존 없음 */
    const ICON_PATHS = {
        home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1Z"/>',
        person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2Z"/>',
        org: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="16" width="5" height="5" rx="1"/><rect x="10" y="16" width="5" height="5" rx="1"/><rect x="18" y="16" width="4" height="5" rx="1"/><path d="M12 7v5M4.5 16v-4H20v4M12 12v4"/>',
        calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18"/>',
        database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 10c0 4 18 4 18 0M3 15c0 4 18 4 18 0"/>',
        document: '<path d="M6 2h9l4 4v16H6Z"/><path d="M14 2v5h5M9 11h7m-7 4h7m-7 4h4"/>',
        chart: '<path d="M3 21h19M5 18V9h3v9m4 0V3h3v15m4 0V6h3v12"/>',
        search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
        link: '<path d="m10 13 4-4m-6 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>',
        settings: '<circle cx="12" cy="12" r="4"/><path d="m9 2 6 0 1 4 4 1 2 5-3 3v4l-5 3-3-2-4 1-4-4 1-4-2-3 3-5h4Z"/>',
        bell: '<path d="M5 17h14l-2-4V8a5 5 0 0 0-10 0v5Zm5 4h4"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v2"/>',
        arrow: '<path d="M3 12h18m-7-7 7 7-7 7"/>'
    };
    function icon(name) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.document}</svg>`;
    }
    // 동적 텍스트는 반드시 이스케이프하여 이름·CSV·저장 메모의 HTML 실행을 방지합니다.
    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    }
    const money = value => Number(value).toLocaleString('ko-KR');
    const options = (values, selected = '') => values.map(value => `<option${value === selected ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');

    /* 02. STATE & PERSISTENCE — localStorage 실패 시 메모리 모드로 동작 */
    let storageAvailable = true;
    let loadWarning = '';
    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return initialState();
            const saved = JSON.parse(raw);
            if (saved.schemaVersion !== 1 || !Array.isArray(saved.employees) || !saved.employees.every(item => item && ['id', 'name', 'org', 'grade', 'status'].every(key => typeof item[key] === 'string')) || !saved.reviews || !saved.evaluation || !Array.isArray(saved.uploads)) {
                throw new Error('Invalid local demo data');
            }
            return saved;
        } catch {
            loadWarning = '저장 데이터 읽기에 실패해 기본 예시로 열었습니다. 자동 덮어쓰기를 막기 위해 메모리 모드로 동작합니다.';
            storageAvailable = false;
            return initialState();
        }
    }
    let state = loadState();
    let activePeopleTab = '직원 조회';
    let pendingPeopleOrg = '';
    let focusPeopleSearch = false;
    let activeEvaluationTab = '성과평가';
    let activePayrollTab = '환수·차액';
    let csvCandidate = null;
    let toastTimer;
    let returnFocus;
    function persist() {
        if (!storageAvailable) {
            toast('메모리에만 반영했습니다. 브라우저를 닫으면 유지되지 않습니다.');
            return false;
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            return true;
        } catch {
            storageAvailable = false;
            toast('브라우저 저장이 제한되어 메모리에만 반영했습니다.');
            return false;
        }
    }

    /* 03. SHARED UI — DOM 슬롯·모달·테이블·상태·다운로드 */
    function toast(message) {
        clearTimeout(toastTimer);
        $('#toast').textContent = message;
        $('#toast').hidden = false;
        toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4000);
    }
    function openDialog(title, content) {
        returnFocus = document.activeElement;
        $('#dialog-title').textContent = title;
        $('#dialog-body').innerHTML = content;
        dialog.showModal();
    }
    function closeDialog() { dialog.close(); }
    dialog.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus(); });
    function badge(text, type = '') { return `<span class="badge ${type}">${escapeHtml(text)}</span>`; }
    function notice(text) { return `<div class="notice">${icon('info')}<span>${text}</span></div>`; }
    function heading(title, subtitle = '', action = '') {
        return `<div class="page-heading"><div><div class="breadcrumb">U.STRA HR / ${escapeHtml(title)}</div><h1>${escapeHtml(title)}</h1>${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}</div><div class="actions">${action}</div></div>`;
    }
    function table(headers, rows, emptyMessage = '조회 결과가 없습니다. 조건을 변경해 주세요.') {
        return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td class="empty" colspan="${headers.length}">${emptyMessage}</td></tr>`}</tbody></table></div>`;
    }
    function footer() { return '<p class="page-footer">모든 데이터는 가상입니다. 실제 U.STRA 서버·DB·API에 연결되지 않은 디자인 목업입니다.</p>'; }
    function tabs(values, active, group) {
        return `<div class="tabs" aria-label="${group}">${values.map(value => `<button type="button" data-action="tab" data-group="${group}" data-value="${value}" aria-pressed="${value === active}">${value}</button>`).join('')}</div>`;
    }
    function saveFile(filename, content, type = 'text/plain;charset=utf-8') {
        const url = URL.createObjectURL(new Blob([content], { type }));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function definitionList(items) {
        return `<dl class="detail-list">${items.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`;
    }

    /* 04. HOME — 확정 이미지의 주된 시각 구조. 업무 행은 고정 예시입니다. */
    function renderHome() {
        main.innerHTML = `
            <section class="hero" aria-labelledby="home-title">
                <div class="hero-art" aria-hidden="true"></div>
                <h1 id="home-title">함께 만드는 더 나은 HR</h1>
                <p>인사부터 정산까지, 필요한 업무를 한곳에서</p>
                <button class="hero-button" data-action="scroll-tasks">담당 업무 확인하기 ${icon('arrow')}</button>
            </section>
            <section class="home-section" aria-labelledby="quick-title">
                <div class="section-heading"><h2 id="quick-title">자주 찾는 업무</h2></div>
                <div class="service-grid">
                    ${serviceCard('people', '인사정보', '임직원 정보와 인사이력 조회', 'id')}
                    ${serviceCard('payroll', '급여·정산', '지급내역과 정산 근거 검토', 'documents')}
                    ${serviceCard('evaluation', '평가관리', '평가 업무와 진행현황 확인', 'check')}
                </div>
            </section>
            <section class="home-section" id="tasks" aria-labelledby="tasks-title">
                <div class="section-heading"><h2 id="tasks-title">담당 업무 <span class="label">고정 예시 데이터</span></h2><button class="button" data-action="task-info">전체 보기 ${icon('arrow')}</button></div>
                <div class="home-table">${table(['업무', '대상', '상태', '바로가기'], TASKS.map(task => `<tr><td>${task.title}</td><td>${task.target}</td><td>${badge(task.status)}</td><td><a class="text-button" href="#${task.route}">보기 →</a></td></tr>`))}</div>
            </section>${footer()}`;
    }
    function serviceCard(route, title, description, kind) {
        return `<a class="service-card" href="#${route}"><h3>${title}</h3><p>${description}</p><span class="card-arrow" aria-hidden="true">→</span><div class="glass-icon ${kind}" aria-hidden="true">${kind === 'id' ? '<i class="head"></i><i class="body"></i>' : ''}${kind === 'check' ? '<i class="tick">✓</i>' : ''}<i class="line"></i></div></a>`;
    }

    /* 05. PEOPLE / COMPOSITE / TALENT — 조회·등록만 시연, 서버 검증 아님 */
    function renderPeople(isTalent = false) {
        const composite = !isTalent && activePeopleTab === '임직원·가족·지원금 복합조회';
        main.innerHTML = `${heading(isTalent ? '인재검색' : '인사정보', isTalent ? '가상 인사·경력 데이터를 조건으로 검색합니다.' : '임직원 기준정보와 이력을 확인합니다.', isTalent ? '' : '<button class="button primary" data-action="register">직원 등록</button>')}
            ${notice(isTalent ? '검색 범위·확장 컬럼·서버 권한은 미확정입니다. AI 추천은 구현하지 않았습니다.' : '조회 기준일·이력·권한은 서버 미연계입니다. 등록은 현재 브라우저의 가상 데이터에만 반영합니다.')}
            ${isTalent ? '' : tabs(['직원 조회', '임직원·가족·지원금 복합조회'], activePeopleTab, 'people')}
            <form id="people-search" class="filters">
                <div class="field grow"><label for="people-query">${isTalent ? '이름·사번·경력' : '이름·사번'}</label><input id="people-query" name="query" placeholder="검색어 입력" maxlength="80"></div>
                <div class="field"><label for="people-org">조직</label><select id="people-org" name="org">${options(['전체', ...new Set(state.employees.map(p => p.org))])}</select></div>
                <div class="field"><label for="people-status">재직상태</label><select id="people-status" name="status">${options(['전체', '재직', '휴직', '퇴직'])}</select></div>
                ${composite ? `<div class="field"><label for="family">가족 구분</label><select id="family" name="family">${options(['전체', '배우자', '자녀', '없음'])}</select></div><div class="field"><label for="support">지원금 구분</label><select id="support" name="support">${options(['전체', '교육지원', '건강지원', '없음'])}</select></div>` : ''}
                <button class="button primary" type="submit">조회</button><button class="button" type="reset">초기화</button>
            </form>
            <div class="section-heading"><h2>${composite ? '복합조회 결과' : '임직원 목록'} <span class="label" id="people-count"></span></h2>${isTalent ? '<button class="button" data-action="talent-columns">조회 컬럼 안내</button>' : ''}</div>
            <div id="people-results"></div>${footer()}`;
        if (pendingPeopleOrg) { $('#people-org').value = pendingPeopleOrg; pendingPeopleOrg = ''; }
        updatePeopleResults(isTalent, composite);
        if (focusPeopleSearch) { $('#people-query').focus(); focusPeopleSearch = false; }
    }
    function updatePeopleResults(isTalent, composite) {
        const data = new FormData($('#people-search'));
        const query = String(data.get('query') || '').trim().toLowerCase();
        const filtered = state.employees.filter(person => {
            const text = `${person.id} ${person.name} ${isTalent ? person.career : ''}`.toLowerCase();
            return text.includes(query) && ['org', 'status', 'family', 'support'].every(key => !data.get(key) || data.get(key) === '전체' || data.get(key) === person[key]);
        });
        $('#people-count').textContent = `${filtered.length}명 · 가상 데이터`;
        $('#people-results').innerHTML = table(['사번', '이름', '소속', '직급', '재직상태', ...(composite ? ['가족 구분', '지원금 구분', '예시 지원금'] : []), ...(isTalent ? ['경력 분야'] : []), '상세'], filtered.map(p => `<tr><td>${escapeHtml(p.id)}</td><td><strong>${escapeHtml(p.name)}</strong></td><td>${escapeHtml(p.org)}</td><td>${escapeHtml(p.grade)}</td><td>${badge(p.status, 'neutral')}</td>${composite ? `<td>${escapeHtml(p.family)}</td><td>${escapeHtml(p.support)}</td><td class="numeric">${money(p.supportAmount)}원</td>` : ''}${isTalent ? `<td>${escapeHtml(p.career)}</td>` : ''}<td><button class="text-button" data-action="employee-detail" data-id="${escapeHtml(p.id)}">보기 →</button></td></tr>`));
    }
    function employeeDetail(id) {
        const p = state.employees.find(person => person.id === id);
        if (!p) return;
        openDialog('인사기록카드', `<div class="person-summary"><div class="person-avatar">${escapeHtml(p.name[0])}</div><div><h3>${escapeHtml(p.name)}</h3><span class="subtitle">${escapeHtml(p.id)} · ${escapeHtml(p.org)}</span></div></div>${definitionList([['직급', p.grade], ['재직상태', p.status], ['입사일', p.joined || '미입력'], ['경력 분야', p.career || '미입력']])}<p class="source-note">인사·발령 이력은 서버 연결 전입니다. 입사일은 현재 예시값이며 이력 처리 근거가 아닙니다.</p>`);
    }
    function registrationDialog() {
        openDialog('직원 등록 · 가상 데이터', `<p class="source-note">이 양식의 필수값은 목업용입니다. 실제 U.STRA 등록 계약은 확인 필요합니다.</p><form id="employee-form"><div class="form-grid">
            <div class="field"><label for="new-id">사번 *</label><input id="new-id" name="id" required maxlength="20" pattern="[A-Za-z0-9_]+" placeholder="예: A10007"></div>
            <div class="field"><label for="new-name">이름 *</label><input id="new-name" name="name" required maxlength="30"></div>
            <div class="field"><label for="new-org">조직 *</label><select id="new-org" name="org">${options(['플랫폼기획팀', '서비스운영팀', '경영지원팀', '데이터분석팀'])}</select></div>
            <div class="field"><label for="new-grade">직급 *</label><select id="new-grade" name="grade">${options(['매니저', '리더'])}</select></div>
            <div class="field"><label for="new-joined">입사일 *</label><input id="new-joined" name="joined" type="date" required></div>
            <div class="field"><label for="new-career">경력 분야</label><input id="new-career" name="career" maxlength="60"></div>
        </div><p id="register-error" role="alert" class="source-note"></p><div class="actions"><button type="submit" class="button primary">가상 직원 저장</button><button type="button" class="button" data-action="close">취소</button></div></form>`);
    }

    /* 06. ORGANIZATION — 현재 예시 조직만 표시. 발령 실행 기능은 없음 */
    function renderOrganization() {
        main.innerHTML = `${heading('조직·발령', '조직구조와 발령 검토 위치를 확인합니다.')}${notice('조직도는 가상 구조입니다. 기준일 조회·겸직·발령 실행·소급·취소는 기존 서버 기능 확인이 필요합니다.')}
            <section class="panel"><div class="section-heading"><h2>조직도</h2>${badge('가상 조직', 'neutral')}</div><div class="organizations"><div class="org-node root"><strong>티맵모빌리티</strong><br><small>시연용 조직구조</small></div><div class="org-children">${['플랫폼기획팀', '서비스운영팀', '경영지원팀', '데이터분석팀'].map(org => `<button class="org-node" data-action="org-search" data-org="${org}"><strong>${org}</strong><br><small>표본 ${state.employees.filter(p => p.org === org).length}명</small></button>`).join('')}</div></div></section>
            <section class="panel"><h2>발령관리</h2><p class="source-note">발령 내역과 적용된 인사 상태를 구분하는 화면 영역입니다. 실제 발령 유형·적용일·상태값은 미확정입니다.</p><button class="button" data-action="movement-info">처리 범위 확인</button></section>${footer()}`;
    }

    /* 07. CSV VALIDATION — 목업 전용 계약. 실제 근태·급여 반영 없음 */
    const CSV_HEADERS = ['사번', '귀속월', '근무시간'];
    function renderAttendance() {
        csvCandidate = null;
        main.innerHTML = `${heading('근태 연계', '집계파일의 형식과 예시 데이터를 검증합니다.', '<button class="button" data-action="csv-template">CSV 양식 다운로드</button>')}${notice('목업 전용 형식: 사번,귀속월,근무시간. 티맵 원본·급여 업로드 규격이 아닙니다. 변환·실제 반영은 미구현입니다.')}
            <section class="panel"><h2>근태 집계 데이터 검증</h2><p class="source-note">UTF-8 CSV / 최대 1MB·5,000행 / 예: A10001,2026-11,160</p><div class="file-zone"><label for="csv-file">집계파일 선택</label><input id="csv-file" type="file" accept=".csv,text/csv"><p class="source-note">선택 후 검증 결과를 확인하고 검증 이력을 저장할 수 있습니다.</p></div><div id="csv-results" aria-live="polite"></div></section>
            <section class="panel"><h2>검증 이력</h2><div id="upload-history">${uploadHistory()}</div></section>${footer()}`;
    }
    // 따옴표·쉼표·CRLF·필드 내 줄바꿈을 처리하는 작은 CSV 파서.
    function parseCsv(text) {
        const rows = [];
        let row = [], field = '', quoted = false, closed = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (quoted) {
                if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
                else if (c === '"') { quoted = false; closed = true; }
                else field += c;
            } else if (c === '"') {
                if (field || closed) throw new Error('따옴표 위치가 올바르지 않습니다.');
                quoted = true;
            } else if (c === ',') {
                row.push(field); field = ''; closed = false;
            } else if (c === '\r' || c === '\n') {
                if (c === '\r' && text[i + 1] === '\n') i++;
                row.push(field); rows.push(row); row = []; field = ''; closed = false;
            } else {
                if (closed) throw new Error('닫는 따옴표 뒤에 잘못된 문자가 있습니다.');
                field += c;
            }
        }
        if (quoted) throw new Error('닫히지 않은 따옴표가 있습니다.');
        if (field || row.length || closed) { row.push(field); rows.push(row); }
        return rows.filter(record => record.some(value => value.trim() !== ''));
    }
    function validateCsv(text) {
        const rows = parseCsv(text.replace(/^\uFEFF/, ''));
        if (!rows.length || rows[0].join(',') !== CSV_HEADERS.join(',')) throw new Error('헤더는 사번,귀속월,근무시간 순서여야 합니다.');
        if (rows.length < 2) throw new Error('데이터 행이 없습니다.');
        if (rows.length > 5001) throw new Error('최대 5,000행까지 검증할 수 있습니다.');
        const errors = [], keys = new Set();
        rows.slice(1).forEach((row, index) => {
            const line = index + 2;
            if (row.length !== 3) { errors.push(`${line}행: 열 개수는 3개여야 합니다.`); return; }
            const [id, month, hours] = row.map(value => value.trim());
            if (!state.employees.some(person => person.id === id)) errors.push(`${line}행: 등록된 가상 사번이 아닙니다.`);
            if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) errors.push(`${line}행: 귀속월은 YYYY-MM 형식이어야 합니다.`);
            if (!/^\d+(\.\d+)?$/.test(hours) || !Number.isFinite(Number(hours))) errors.push(`${line}행: 근무시간은 0 이상의 유한한 숫자여야 합니다.`);
            const key = `${id}|${month}`;
            if (keys.has(key)) errors.push(`${line}행: 사번·귀속월이 중복되었습니다.`);
            keys.add(key);
        });
        return { count: rows.length - 1, errors };
    }
    let fileReadSequence = 0;
    async function inspectCsv(file) {
        const sequence = ++fileReadSequence;
        csvCandidate = null;
        if (!file) return;
        try {
            if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('CSV 파일을 선택해 주세요.');
            if (file.size > 1024 * 1024) throw new Error('파일 크기는 1MB 이하여야 합니다.');
            const report = validateCsv(await file.text());
            if (sequence !== fileReadSequence || !$('#csv-results')) return;
            csvCandidate = { filename: file.name, ...report };
            $('#csv-results').innerHTML = `<div class="result-box">${badge(report.errors.length ? `검증 오류 ${report.errors.length}건` : '검증 통과', report.errors.length ? 'error' : 'success')}<p class="source-note">${report.count}행 검사 · 실제 반영 없음</p>${report.errors.length ? `<ul>${report.errors.slice(0, 100).map(error => `<li>${escapeHtml(error)}</li>`).join('')}</ul>${report.errors.length > 100 ? '<p>오류는 100건까지만 표시합니다.</p>' : ''}` : ''}<button class="button" data-action="save-upload">검증 이력 저장</button></div>`;
        } catch (error) {
            if (sequence === fileReadSequence && $('#csv-results')) $('#csv-results').innerHTML = `<p role="alert">${badge(error.message, 'error')}</p>`;
        }
    }
    function uploadHistory() {
        return table(['파일명', '검증 행', '오류', '검증 시각'], state.uploads.map(row => `<tr><td>${escapeHtml(row.filename)}</td><td>${row.count}</td><td>${row.errors}</td><td>${escapeHtml(row.created)}</td></tr>`), '저장된 검증 이력이 없습니다.');
    }

    /* 08. SETTLEMENT — 검토 메모만 저장. 금액 계산·원장 변경 금지 */
    function renderPayroll() {
        main.innerHTML = `${heading('급여·정산', '기지급 내역과 정산 검토 자료를 구분합니다.')}${notice('계산·지급·환수·확정·마감 처리는 구현하지 않았습니다. 금액은 고정 예시이며 검토 메모만 저장됩니다.')}${tabs(['급여 결과', '환수·차액'], activePayrollTab, 'payroll')}
            ${activePayrollTab === '급여 결과' ? `<section class="panel"><h2>기지급 결과 · 예시</h2>${table(['대상자', '기지급액', '근거'], SETTLEMENTS.map(row => `<tr><td>${row.name}</td><td class="numeric">${money(row.paid)}원</td><td>시연용 고정 지급내역</td></tr>`))}</section>` : `<div class="filters"><div class="field"><label>귀속월 · 고정 예시</label><input value="2026.11" readonly></div><div class="field"><label for="settlement-type">정산유형</label><select id="settlement-type">${options(['전체', '퇴사월 차액', '기지급 환수'])}</select></div></div><div id="settlement-results"></div>`}${footer()}`;
        if (activePayrollTab === '환수·차액') updateSettlementResults();
    }
    function updateSettlementResults() {
        const type = $('#settlement-type').value;
        $('#settlement-results').innerHTML = table(['대상자', '정산유형', '기지급액', '검토 메모', '검토'], SETTLEMENTS.filter(row => type === '전체' || row.type === type).map(row => `<tr><td>${row.name}</td><td>${row.type}</td><td class="numeric">${money(row.paid)}원</td><td>${badge(state.reviews[row.id] ? '메모 저장됨' : row.status, 'neutral')}</td><td><button class="text-button" data-action="settlement-detail" data-id="${row.id}">검토 내역 보기 →</button></td></tr>`));
    }
    function settlementDialog(id) {
        const row = SETTLEMENTS.find(item => item.id === id);
        if (!row) return;
        openDialog('정산 검토 · 예시', `${definitionList([['대상자', row.name], ['정산유형', row.type], ['기지급액', `${money(row.paid)}원`], ['예시 설명', row.note]])}<p class="source-note">검토 저장은 급여 승인·확정·지급을 의미하지 않습니다.</p><form id="review-form" data-id="${id}"><div class="field"><label for="review-note">검토 메모</label><textarea id="review-note" name="note" required maxlength="1000">${escapeHtml(state.reviews[id] || '')}</textarea></div><div class="actions" style="margin-top:16px"><button class="button primary" type="submit">검토 메모 저장</button><button type="button" class="button" data-action="close">닫기</button></div></form>`);
    }
    function renderRetirement() {
        main.innerHTML = `${heading('퇴직정산', '중도정산 이력과 산입내역의 검토 화면 구성안입니다.')}${notice('퇴직·중도정산 계산식, 산입규칙, 기준일·마감 정책은 확인 전입니다. 계산·실제 반영 버튼은 제공하지 않습니다.')}
            <div class="split"><section class="panel"><h2>정산 검토 대상 · 예시</h2>${table(['사번', '대상자', '자료 상태'], ['<tr><td>A10006</td><td>한지우</td><td>' + badge('자료 확인 필요', 'neutral') + '</td></tr>'])}<p class="source-note">대상자는 가상 퇴직자이며 정산액은 산출하지 않습니다.</p></section>
            <section class="panel"><h3>검토 항목</h3>${definitionList([['중도정산 이력', '서버 조회 계약 확인 필요'], ['산입 항목', '고객 규칙 확인 필요'], ['기지급 내역', '연결 대상 확인 필요']])}<button class="text-button" data-action="retirement-info">확인 범위 보기 →</button></section></div>${footer()}`;
    }
    function renderYearend() {
        main.innerHTML = `${heading('연말정산', '귀속연도·대상·입력자료·결과를 구분하는 화면 구성안입니다.')}${notice('세액·공제 계산과 신고·제출은 미구현입니다. 적용 모듈과 고객 범위 확인 후 연결합니다.')}
            <section class="panel"><div class="section-heading"><h2>자료 확인</h2>${badge('연계 전', 'neutral')}</div>${definitionList([['귀속연도', '2026 · 예시'], ['대상자 조회', '기존 서버 기능 확인 필요'], ['정산자료', '자료 종류·수집 방식 확인 필요'], ['결과 조회', '전문 모듈 연결 계약 확인 필요']])}</section>${footer()}`;
    }

    /* 09. EVALUATION — 저장·제출 잠금은 시연용 UI 상태, 실제 제도 아님 */
    function renderEvaluation() {
        const locked = state.evaluation.status === '제출됨';
        main.innerHTML = `${heading('평가관리', '평가 유형별 메뉴와 입력·저장 상태를 시연합니다.')}${notice('실제 평가단계·배점·공개 범위는 미확정입니다. 아래 의견 저장·제출·잠금은 목업 시연 규칙이며 서버 제출이 아닙니다.')}${tabs(['성과평가', '역량평가', '다면평가', '종합평가'], activeEvaluationTab, 'evaluation')}
            ${activeEvaluationTab !== '성과평가' ? `<section class="panel"><h2>${activeEvaluationTab}</h2><p class="empty">${activeEvaluationTab}의 평가표·평가자·척도·결과 공개 기준은 확인 후 구성합니다.</p></section>` : `<section class="panel"><div class="section-heading"><h2>평가 의견 입력</h2>${badge(state.evaluation.status, locked ? 'success' : 'neutral')}</div><p class="source-note">회차·대상자: 가상 성과평가 / 김하린 · 점수 계산 없음</p><form id="evaluation-form"><div class="field"><label for="evaluation-comment">평가 의견 · 시연용</label><textarea id="evaluation-comment" name="comment" maxlength="2000" ${locked ? 'readonly' : ''}>${escapeHtml(state.evaluation.comment)}</textarea></div><div class="actions" style="margin-top:20px"><button class="button" type="submit" ${locked ? 'disabled' : ''}>임시저장</button><button type="button" class="button primary" data-action="submit-evaluation" ${locked ? 'disabled' : ''}>제출 시연</button>${locked ? '<span class="source-note">제출 상태로 입력이 잠겼습니다. 초기화는 시스템 관리에서 가능합니다.</span>' : ''}</div></form></section>`}${footer()}`;
    }

    /* 10. INTEGRATION / SETTINGS — 실행하지 않는 서버 동작을 명시 */
    function renderIntegration() {
        main.innerHTML = `${heading('연계·이관 관리', '견적 범위와 연결 준비 항목을 확인합니다.')}${notice('API 호출·데이터 이관을 실제 실행하지 않습니다. 아래는 범위 점검용 화면입니다.')}
            <section class="panel"><h2>인사조직정보 API</h2>${definitionList([['대상', '인사·조직정보'], ['제공 방향', '확인 필요'], ['인증·기준일', '확인 필요'], ['조회·오류 계약', '기존 소스 접근 후 확인']])}</section>
            <section class="panel"><h2>초기 데이터 이관</h2>${table(['데이터', '현재 범위', '상세 계약'], ['인사', '조직', '발령', '급여'].map(item => `<tr><td>${item}</td><td>재직자 · 견적 기준</td><td>${badge('기간·이력 깊이·항목 확인 필요', 'neutral')}</td></tr>`))}<p class="source-note">이관 건수·금액 대사와 오류 재처리 방식은 상세 범위 확정 후 설계합니다.</p></section>${footer()}`;
    }
    function renderSettings() {
        main.innerHTML = `${heading('시스템 관리', '시연 데이터와 구현 경계를 확인합니다.')}${notice('화면의 인사담당자는 고정 표시입니다. 로그인·인증·서버 권한 검증 기능은 없습니다.')}
            <section class="panel"><h2>데이터 저장</h2>${definitionList([['저장 위치', '현재 브라우저 localStorage'], ['저장 키', STORAGE_KEY], ['저장 상태', storageAvailable ? '브라우저 저장 사용 가능' : '메모리 모드'], ['데이터', '가상 직원·정산 메모·평가 의견·CSV 검증 이력']])}<div class="actions" style="margin-top:20px"><button class="button danger" data-action="reset-confirm">시연 데이터 초기화</button></div></section>
            <section class="panel"><h2>구현 경계</h2><p class="source-note">실제 개발 소스의 업무 처리·버전은 확인하지 못했습니다. 현재 디자인과 메뉴는 사용자 요구 및 확인 가능한 기능 구조에 따른 제안입니다. 급여·퇴직·세액 계산, 마감·소급, 권한, 실제 저장·API는 미구현입니다.</p></section>${footer()}`;
    }

    /* 11. ROUTING & EVENT DELEGATION — 화면별 중복 리스너 방지 */
    const renderers = { home: renderHome, people: () => renderPeople(false), talent: () => renderPeople(true), organization: renderOrganization, attendance: renderAttendance, payroll: renderPayroll, retirement: renderRetirement, yearend: renderYearend, evaluation: renderEvaluation, integration: renderIntegration, settings: renderSettings };
    function currentRoute() { return location.hash.slice(1).split('?')[0] || 'home'; }
    function setDrawer(open) {
        $('.sidebar').classList.toggle('open', open);
        $('#sidebar-backdrop').hidden = !open;
        $('#menu-toggle').setAttribute('aria-expanded', String(open));
        $('#menu-toggle').setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    }
    function renderRoute() {
        const route = currentRoute();
        $('#navigation').innerHTML = MENUS.map(menu => `<a href="#${menu.id}" class="nav-link ${menu.id === route ? 'active' : ''} ${menu.id === 'settings' ? 'settings' : ''}" ${menu.id === route ? 'aria-current="page"' : ''}>${icon(menu.icon)}<span>${menu.label}</span></a>`).join('');
        if (renderers[route]) renderers[route]();
        else main.innerHTML = `${heading('화면을 찾을 수 없습니다.')}<a href="#home" class="button primary">홈으로 이동</a>${footer()}`;
        setDrawer(false);
        document.title = `${MENUS.find(menu => menu.id === route)?.label || '화면 없음'} · TMAP U.STRA HR`;
    }
    document.addEventListener('click', event => {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const { action, id, group, value } = target.dataset;
        if (action === 'close') closeDialog();
        else if (action === 'scroll-tasks') $('#tasks').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
        else if (action === 'task-info') openDialog('담당 업무 · 예시', '<p>홈에는 고정 업무 예시 3건을 표시합니다. 실제 담당자별 집계·알림·평가 회차와 연결되지 않습니다.</p>');
        else if (action === 'register') registrationDialog();
        else if (action === 'employee-detail') employeeDetail(id);
        else if (action === 'settlement-detail') settlementDialog(id);
        else if (action === 'global-search') { focusPeopleSearch = true; activePeopleTab = '직원 조회'; if (currentRoute() === 'people') renderPeople(); else location.hash = 'people'; }
        else if (action === 'notifications') openDialog('시연 안내', '<p>현재 알림은 서버와 연결되지 않았습니다. 모든 데이터와 상태는 디자인 검토를 위한 예시입니다.</p>');
        else if (action === 'tab') {
            if (group === 'people') { activePeopleTab = value; renderPeople(); }
            else if (group === 'payroll') { activePayrollTab = value; renderPayroll(); }
            else { activeEvaluationTab = value; renderEvaluation(); }
        } else if (action === 'talent-columns') openDialog('조회 컬럼 · 시연', '<p>현재 컬럼: 사번·이름·소속·직급·재직상태·경력 분야.</p><p class="source-note">티맵 확장 컬럼과 개인정보·평가정보 조회 범위는 확인 필요합니다.</p>');
        else if (action === 'org-search') { activePeopleTab = '직원 조회'; pendingPeopleOrg = target.dataset.org; location.hash = 'people'; }
        else if (action === 'movement-info') openDialog('발령 처리 범위', '<p>발령 유형·적용일·취소·소급·겸직과 급여·평가 영향은 기존 서버 기능 및 고객 정책 확인 후 설계합니다. 현재 발령 실행 기능은 없습니다.</p>');
        else if (action === 'retirement-info') openDialog('퇴직정산 확인 범위', '<p>기존 중도정산 이력·기지급 내역·산입규칙의 서버 계약과 고객 정책 확인이 필요합니다. 계산 결과를 임의 생성하지 않습니다.</p>');
        else if (action === 'csv-template') saveFile('attendance-demo.csv', '\uFEFF사번,귀속월,근무시간\r\nA10001,2026-11,160\r\nA10002,2026-11,152\r\n', 'text/csv;charset=utf-8');
        else if (action === 'save-upload' && csvCandidate) {
            state.uploads.unshift({ filename: csvCandidate.filename, count: csvCandidate.count, errors: csvCandidate.errors.length, created: new Date().toLocaleString('ko-KR') });
            state.uploads = state.uploads.slice(0, 30);
            const saved = persist();
            csvCandidate = null;
            target.disabled = true;
            $('#upload-history').innerHTML = uploadHistory();
            if (saved) toast('검증 이력을 저장했습니다. 실제 근태·급여 반영은 없습니다.');
        } else if (action === 'submit-evaluation') {
            const comment = $('#evaluation-comment').value.trim();
            if (!comment) { toast('시연 제출을 위해 의견을 입력해 주세요.'); $('#evaluation-comment').focus(); return; }
            openDialog('평가 제출 시연', `<p>의견을 가상 제출 상태로 저장하고 입력을 잠급니다. 실제 평가 서버에는 제출하지 않습니다.</p><div class="actions" style="margin-top:20px"><button class="button primary" data-action="confirm-evaluation">제출 시연 확인</button><button class="button" data-action="close">취소</button></div>`);
        } else if (action === 'confirm-evaluation') {
            if (state.evaluation.status === '제출됨') return;
            state.evaluation = { status: '제출됨', comment: $('#evaluation-comment').value.trim() };
            const saved = persist(); closeDialog(); renderEvaluation();
            if (saved) toast('목업 제출 상태로 저장했습니다.');
        } else if (action === 'reset-confirm') openDialog('시연 데이터 초기화', '<p>이 목업에서 등록한 가상 직원·검토 메모·평가·CSV 이력을 지우고 기본 예시로 돌아갑니다. 다른 저장 키는 변경하지 않습니다.</p><div class="actions" style="margin-top:20px"><button class="button danger" data-action="reset-data">초기화 실행</button><button class="button" data-action="close">취소</button></div>');
        else if (action === 'reset-data') {
            try { localStorage.removeItem(STORAGE_KEY); storageAvailable = true; }
            catch { storageAvailable = false; }
            state = initialState(); closeDialog(); renderRoute();
            toast(storageAvailable ? '시연 데이터를 초기화했습니다.' : '메모리만 초기화했습니다. 브라우저 저장 데이터 삭제는 실패했습니다.');
        }
    });
    document.addEventListener('submit', event => {
        const form = event.target;
        event.preventDefault();
        if (form.getAttribute('id') === 'people-search') updatePeopleResults(currentRoute() === 'talent', activePeopleTab !== '직원 조회' && currentRoute() === 'people');
        else if (form.getAttribute('id') === 'employee-form') {
            const data = Object.fromEntries(new FormData(form));
            for (const key of Object.keys(data)) data[key] = data[key].trim();
            if (!data.id || !data.name) { $('#register-error').textContent = '사번과 이름을 입력해 주세요.'; return; }
            if (state.employees.some(p => p.id.toLowerCase() === data.id.toLowerCase())) { $('#register-error').textContent = '이미 등록된 사번입니다.'; return; }
            state.employees.push({ ...data, status: '재직', family: '없음', support: '없음', supportAmount: 0 });
            const saved = persist(); closeDialog(); renderPeople();
            if (saved) toast('가상 직원을 저장했습니다.');
        } else if (form.getAttribute('id') === 'review-form') {
            const note = new FormData(form).get('note').trim();
            if (!note) return;
            state.reviews[form.dataset.id] = note;
            const saved = persist(); closeDialog(); renderPayroll();
            if (saved) toast('검토 메모를 저장했습니다.');
        } else if (form.getAttribute('id') === 'evaluation-form' && state.evaluation.status !== '제출됨') {
            state.evaluation = { status: '임시저장', comment: new FormData(form).get('comment').trim() };
            const saved = persist(); renderEvaluation();
            if (saved) toast('평가 의견을 임시저장했습니다.');
        }
    });
    document.addEventListener('reset', event => {
        if (event.target.id === 'people-search') setTimeout(() => updatePeopleResults(currentRoute() === 'talent', activePeopleTab !== '직원 조회' && currentRoute() === 'people'), 0);
    });
    document.addEventListener('change', event => {
        if (event.target.id === 'csv-file') inspectCsv(event.target.files[0]);
        if (event.target.id === 'settlement-type') updateSettlementResults();
    });
    // 본문 바로가기는 해시 라우터를 변경하지 않고 포커스만 이동합니다.
    $('.skip-link').addEventListener('click', event => { event.preventDefault(); main.focus(); main.scrollIntoView(); });
    $('#close-dialog').addEventListener('click', closeDialog);
    $('#menu-toggle').addEventListener('click', () => setDrawer(!$('.sidebar').classList.contains('open')));
    $('#sidebar-backdrop').addEventListener('click', () => setDrawer(false));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setDrawer(false); });
    window.addEventListener('hashchange', () => { renderRoute(); main.focus({ preventScroll: true }); window.scrollTo(0, 0); });
    $('[data-action="global-search"]').innerHTML = icon('search');
    $('[data-action="notifications"]').innerHTML = icon('bell');
    renderRoute();
    if (loadWarning) toast(loadWarning);
})();
