/* ======================================================================
 * 01. DEMO DATA / 메뉴·샘플·화면 계약
 * 모든 인명·조직·금액·일정은 가상입니다. 실제 U.STRA 응답 스키마가 아닙니다.
 * 서버 연결 시 이 파일을 API 어댑터로 대체하고 화면 렌더러는 유지하세요.
 * ====================================================================== */
window.HR_DEMO = (() => {
    'use strict';

    const MENUS = [
        { id: 'home', label: '홈', icon: 'home' },
        { id: 'people', label: '인사정보', icon: 'person' },
        { id: 'organization', label: '조직·발령', icon: 'org' },
        { id: 'attendance', label: '근태 연계', icon: 'calendar' },
        { id: 'payroll', label: '급여·정산', icon: 'database' },
        { id: 'retirement', label: '퇴직정산', icon: 'document' },
        { id: 'yearend', label: '연말정산', icon: 'document' },
        { id: 'evaluation', label: '평가관리', icon: 'chart' },
        { id: 'talent', label: '인재검색', icon: 'search' },
        { id: 'integration', label: '연계·이관 관리', icon: 'link' },
        { id: 'settings', label: '시스템 관리', icon: 'settings' }
    ];

    const EMPLOYEES = [
        { id: 'A10001', name: '김하린', org: '플랫폼기획팀', grade: '매니저', status: '재직', joined: '2023-03-02', career: '서비스 기획', family: '배우자', support: '교육지원', supportAmount: 300000 },
        { id: 'A10002', name: '이도윤', org: '서비스운영팀', grade: '매니저', status: '재직', joined: '2022-07-11', career: '서비스 운영', family: '자녀', support: '교육지원', supportAmount: 200000 },
        { id: 'A10003', name: '박서준', org: '경영지원팀', grade: '리더', status: '재직', joined: '2021-01-04', career: '인사 운영', family: '배우자', support: '건강지원', supportAmount: 150000 },
        { id: 'A10004', name: '정유진', org: '데이터분석팀', grade: '매니저', status: '재직', joined: '2024-02-01', career: '데이터 분석', family: '없음', support: '없음', supportAmount: 0 },
        { id: 'A10005', name: '최민서', org: '서비스운영팀', grade: '매니저', status: '휴직', joined: '2020-09-01', career: '고객 경험', family: '자녀', support: '교육지원', supportAmount: 250000 },
        { id: 'A10006', name: '한지우', org: '경영지원팀', grade: '매니저', status: '퇴직', joined: '2021-05-10', career: '급여 운영', family: '없음', support: '없음', supportAmount: 0 }
    ];

    const SETTLEMENTS = [
        { id: 'S001', employeeId: 'A10001', name: '김하린', type: '퇴사월 차액', paid: 3200000, status: '검토 대기', note: '퇴사월 차액 검토를 위한 가상 사례입니다. 실제 재직상태와 연동되지 않습니다.' },
        { id: 'S002', employeeId: 'A10002', name: '이도윤', type: '기지급 환수', paid: 1500000, status: '자료 확인', note: '기지급 내역과 대사하는 시연 자료입니다. 환수 금액·방식은 미확정입니다.' }
    ];

    const TASKS = [
        { title: '근태 업로드 검증', target: '11월 집계파일', status: '확인 필요', route: 'attendance' },
        { title: '퇴사월 차액 검토', target: '정산 대상 2명', status: '검토 대기', route: 'payroll' },
        { title: '평가 진행현황', target: '성과평가', status: '진행 중', route: 'evaluation' }
    ];

    // 각 값은 목업 전용입니다. 기존 목업의 tmap-hr-demo-v1 데이터와 충돌하지 않습니다.
    const STORAGE_KEY = 'tmap-hr-design-v03';
    const initialState = () => ({
        schemaVersion: 1,
        employees: EMPLOYEES.map(item => ({ ...item })),
        reviews: {},
        evaluation: { status: '임시저장 전', comment: '' },
        uploads: []
    });

    return { MENUS, SETTLEMENTS, TASKS, STORAGE_KEY, initialState };
})();
