import { getDevUserHeaders } from '../config/devUser.js'


/*
 * ============================================================
 * 파일명: projectApi.js
 * 위치: src/services/projectApi.js
 * ============================================================
 *
 * [파일 목적]
 * TeamPlace의 PROJECT 관련 Spring Boot API 요청을 관리한다.
 *
 * [현재 구현 기능]
 * - 프로젝트 CRUD 및 멤버 조회
 * - 멤버 초대, 받은 초대 조회, 수락/거절
 * - 멤버 역할 변경, 리더 양도
 * - 프로젝트 자진 탈퇴(72단계 API 함수 추가)
 *
 * [관련 백엔드]
 * - ProjectController.java
 * - ProjectCreateRequest.java
 * - ProjectResponse.java
 * - ProjectService.java
 *
 * [팀원 인계]
 * - API 호출은 이 파일에서 관리한다.
 * - 화면 구성과 Tailwind CSS는 pages 컴포넌트에서 관리한다.
 * - 인증 기능이 통합되면 요청 인증 방식을 함께 변경한다.
 * - Vite Proxy가 /api 요청을 Spring Boot로 전달한다.
 *
 * 주의:
 * X-Dev-User-Id는 개발 테스트용이며 실제 인증이 아니다.
 * ============================================================
 */


/*
 * 54단계: 모든 PROJECT API 요청에 동일한 개발용 사용자 헤더를 첨부한다.
 * dev 프로필에서만 백엔드가 이 헤더를 사용자 선택에 사용한다.
 * 프론트에서 이 값을 바꾼다고 실제 로그인/인증이 되는 것은 아니다.
 * 인증 기능 통합 시 이 import 및 헤더 전송 코드를 제거해야 한다.
 */

// PROJECT API의 공통 주소
const PROJECT_API_URL = '/api/projects'


// ------------------------------------------------------------
// 1. 내 프로젝트 목록 조회
// ------------------------------------------------------------

/*
 * GET /api/projects
 *
 * 현재 사용자가 ACTIVE 멤버로 참여 중인
 * 프로젝트 목록을 조회한다.
 *
 * 반환값:
 * ProjectResponse 객체들의 배열
 */
export async function getMyProjects() {

    const response = await fetch(PROJECT_API_URL, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            ...getDevUserHeaders(),
        },
    })

    /*
     * response.ok
     * HTTP 상태 코드가 200~299인지 확인한다.
     */
    if (!response.ok) {
        throw new Error(
            `프로젝트 목록 조회 실패 (HTTP ${response.status})`
        )
    }

    // JSON 응답을 JavaScript 데이터로 변환
    const projects = await response.json()

    // 목록 API는 배열을 반환해야 한다.
    if (!Array.isArray(projects)) {
        throw new Error(
            '프로젝트 목록 응답이 배열 형식이 아닙니다.'
        )
    }

    return projects
}


// ------------------------------------------------------------
// 2. 프로젝트 생성
// ------------------------------------------------------------

/*
 * [함수명]
 * createProject(projectData)
 *
 * [목적]
 * React에서 입력한 프로젝트 정보를
 * Spring Boot 서버에 전달하여 새 프로젝트를 생성한다.
 *
 * [HTTP 요청]
 * POST /api/projects
 *
 * [요청 JSON]
 * {
 *   "projectName": "프로젝트 이름",
 *   "description": "프로젝트 설명",
 *   "crawlKeyword": "수집 키워드"
 * }
 *
 * [프로젝트 생성 후 처리]
 * 백엔드 ProjectService에서:
 * - PROJECT 행 생성
 * - 현재 사용자를 LEADER + ACTIVE로 등록
 *
 * [반환값]
 * 생성된 프로젝트의 ProjectResponse 객체
 *
 * 주요 필드:
 * projectId, projectName, ownerId, status 등
 *
 * [팀원 인계]
 * 프로젝트 생성 페이지에서는 이 함수를 호출한다.
 * 생성 성공 후 반환된 projectId를 이용해
 * 프로젝트 상세 페이지로 이동할 예정이다.
 *
 * 현재 이 함수 자체는 페이지 이동을 하지 않는다.
 * API 요청과 화면 이동의 책임을 분리하기 위함이다.
 */
export async function createProject(projectData) {

    /*
     * [프론트엔드 기본 검증]
     *
     * 프로젝트 이름에서 양쪽 공백을 제거한다.
     * 이름을 입력하지 않았다면 서버 요청을 보내지 않는다.
     *
     * 백엔드에서도 동일한 유효성 검증이 필요하며,
     * 프론트엔드 검증만으로 데이터를 보호할 수는 없다.
     */
    const projectName = projectData.projectName?.trim()

    if (!projectName) {
        throw new Error('프로젝트명을 입력해 주세요.')
    }

    /*
     * [요청 데이터]
     *
     * DTO에서 지원하는 세 필드만 전달한다.
     *
     * projectId, ownerId, status를 전달하지 않는다.
     * 이 값은 백엔드가 결정한다.
     *
     * 선택 입력값이 비어 있으면 null을 전달한다.
     */
    const requestBody = {
        projectName,
        description: projectData.description?.trim() || null,
        crawlKeyword: projectData.crawlKeyword?.trim() || null,
    }

    /*
     * [HTTP POST 요청]
     *
     * method: 'POST'
     * → 새로운 리소스를 생성하는 요청
     *
     * Content-Type: application/json
     * → 요청 본문이 JSON임을 서버에 알린다.
     *
     * JSON.stringify()
     * → JavaScript 객체를 JSON 문자열로 변환한다.
     */
    const response = await fetch(PROJECT_API_URL, {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getDevUserHeaders(),
        },

        body: JSON.stringify(requestBody),
    })

    /*
     * [오류 처리]
     *
     * 요청 실패 시 Error를 발생시킨다.
     * 생성 페이지에서 catch로 받아 메시지를 표시한다.
     *
     * 실패했다고 무조건 재요청하면 안 된다.
     * 네트워크 오류에서는 서버에 생성되었지만
     * 응답만 받지 못했을 가능성도 있기 때문이다.
     */
    if (!response.ok) {
        throw new Error(
            `프로젝트 생성 실패 (HTTP ${response.status})`
        )
    }

    /*
     * [생성 성공]
     *
     * 백엔드에서 반환된 ProjectResponse를 읽는다.
     *
     * 반환된 projectId는 이후 상세 페이지 이동에 사용한다.
     */
    const createdProject = await response.json()

    /*
     * 정상 생성 응답에는 projectId가 있어야 한다.
     *
     * 단, 이 검사는 응답 구조 확인용이다.
     * 서버에 실제 저장되었는지 여부를 결정하는 검사가 아니다.
     */
    if (createdProject?.projectId == null) {
        throw new Error(
            '프로젝트 생성 응답에 projectId가 없습니다. 목록을 확인해 주세요.'
        )
    }

    return createdProject
}


/*
 * ============================================================
 * 3. 프로젝트 상세 조회
 * ============================================================
 *
 * [함수명]
 * getProjectDetail(projectId)
 *
 * [목적]
 * 사용자가 선택한 프로젝트의 상세 정보를
 * Spring Boot API를 통해 조회한다.
 *
 * [관련 백엔드]
 * ProjectController.getProject()
 * ProjectService.getProject()
 * ProjectResponse
 *
 * [HTTP 요청]
 * GET /api/projects/{projectId}
 *
 * 예:
 * GET /api/projects/5
 *
 * [매개변수]
 * projectId:
 * - 조회할 프로젝트의 고유 ID
 * - PROJECT 테이블의 PROJECT_ID에 해당
 *
 * [반환 데이터]
 * ProjectResponse 객체
 *
 * 주요 필드:
 * - projectId
 * - projectName
 * - description
 * - ownerId
 * - crawlKeyword
 * - status
 * - createdAt
 * - updatedAt
 *
 * [권한 관련 주의]
 * 프로젝트 상세 조회 권한은 백엔드 Service에서 검사한다.
 *
 * 프론트엔드에서 projectId를 알고 있더라도
 * 해당 프로젝트의 접근 권한이 생기는 것은 아니다.
 *
 * [팀원 인계 / TODO]
 * - ProjectDetailPage.jsx에서 이 함수를 호출한다.
 * - 추후 React Router를 사용하면 URL의 projectId를
 *   읽어서 이 함수에 전달한다.
 * - 로그인 통합 시 projectApi.js의 인증 처리 방식을
 *   팀원과 함께 수정한다.
 *
 * 이 함수는 API 호출만 담당하며
 * 페이지 이동이나 Tailwind CSS는 담당하지 않는다.
 * ============================================================
 */
export async function getProjectDetail(projectId) {

    /*
     * [프로젝트 ID 기본 검증]
     *
     * Number():
     * 전달받은 값을 숫자로 변환한다.
     *
     * Number.isSafeInteger():
     * JavaScript에서 안전하게 다룰 수 있는 정수인지 확인한다.
     *
     * 프로젝트 ID는 양의 정수여야 한다.
     *
     * 주의:
     * 이 검사는 잘못된 요청을 줄이기 위한 것이며
     * 실제 접근 권한은 백엔드에서 판단한다.
     */
    const id = Number(projectId)

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error('올바른 프로젝트 ID가 아닙니다.')
    }

    /*
     * [HTTP GET 요청]
     *
     * PROJECT_API_URL = '/api/projects'
     *
     * `${PROJECT_API_URL}/${id}`
     * → 예: /api/projects/5
     *
     * Vite Proxy가 해당 요청을
     * Spring Boot 서버로 전달한다.
     */
    const response = await fetch(
        `${PROJECT_API_URL}/${id}`,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...getDevUserHeaders(),
            },
        }
    )

    /*
     * [HTTP 오류 확인]
     *
     * 200: 상세 조회 성공
     * 400: 잘못된 요청 등
     * 403: 조회 권한 없음
     * 404: 프로젝트 없음
     * 500: 서버 오류
     *
     * 위 코드는 일반적인 HTTP 오류 예시이며
     * 실제 상태 코드는 백엔드 예외 처리 정책에 따른다.
     *
     * fetch()는 4xx/5xx 응답만으로 예외가 발생하지
     * 않으므로 response.ok를 직접 확인한다.
     */
    if (!response.ok) {
        throw new Error(
            `프로젝트 상세 조회 실패 (HTTP ${response.status})`
        )
    }

    /*
     * [응답 JSON 변환]
     *
     * ProjectResponse는 목록과 달리
     * 단일 프로젝트 객체를 반환한다.
     */
    const project = await response.json()

    /*
     * [응답 구조 검증]
     *
     * 응답에 프로젝트 ID가 있는지 확인한다.
     * 요청한 프로젝트와 응답 ID도 비교한다.
     *
     * 이 검사는 화면에 잘못된 프로젝트가 표시되는
     * 상황을 발견하기 위한 기본 방어 코드이다.
     */
    if (
        !project ||
        typeof project !== 'object' ||
        Array.isArray(project) ||
        Number(project.projectId) !== id
    ) {
        throw new Error(
            '프로젝트 상세 응답 형식이 올바르지 않습니다.'
        )
    }

    // 조회한 프로젝트 정보를 호출한 페이지에 반환한다.
    return project
}


/*
 * ============================================================
 * 4. 프로젝트 정보 수정
 * ============================================================
 *
 * [함수명]
 * updateProject(projectId, projectData)
 *
 * [파일 위치]
 * src/services/projectApi.js
 *
 * [목적]
 * 기존 프로젝트의 이름, 설명, 자료 수집 키워드를 수정한다.
 *
 * [관련 백엔드]
 * - ProjectController.updateProject()
 * - ProjectUpdateRequest.java
 * - ProjectService.updateProject()
 *
 * [HTTP 요청]
 * PUT /api/projects/{projectId}
 *
 * [요청 JSON]
 * {
 *   "projectName": "수정한 프로젝트명",
 *   "description": "수정한 설명",
 *   "crawlKeyword": "수정한 키워드"
 * }
 *
 * [수정 권한]
 * - ACTIVE + LEADER
 * - ACTIVE + VICE_LEADER
 *
 * 일반 MEMBER는 프로젝트 정보를 수정할 수 없다.
 *
 * [팀원 인계]
 * - 권한 검사는 백엔드에서 최종 수행한다.
 * - 프론트엔드에서는 수정 버튼 표시를 별도로 제어한다.
 * - ownerId, projectId, status는 수정 요청에 포함하지 않는다.
 * - 로그인 기능 통합 시 인증 처리 방식을 확인한다.
 *
 * [주의]
 * 이 함수는 실제 DB 데이터를 변경하는 PUT 요청이다.
 * 프로젝트 설정 화면에서 사용자가 저장 버튼을
 * 누를 때만 호출해야 한다.
 * ============================================================
 */
export async function updateProject(projectId, projectData) {

    /*
     * [프로젝트 ID 검증]
     *
     * Number() : 전달받은 값을 숫자로 변환
     * Number.isSafeInteger() : 안전한 정수인지 확인
     *
     * 유효하지 않은 ID에 대해 API 요청을 보내지 않는다.
     */
    const id = Number(projectId)

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error('올바른 프로젝트 ID가 아닙니다.')
    }

    /*
     * [수정할 프로젝트명]
     *
     * 앞뒤 공백을 제거한다.
     * 프로젝트명은 필수 입력값이다.
     *
     * 백엔드에서도 빈 이름 및 100자 초과를 검증한다.
     */
    const projectName = projectData?.projectName?.trim()

    if (!projectName) {
        throw new Error('프로젝트명을 입력해 주세요.')
    }

    if (projectName.length > 100) {
        throw new Error('프로젝트명은 100자 이하로 입력해 주세요.')
    }

    /*
     * [요청 데이터 구성]
     *
     * ProjectUpdateRequest에 정의된 세 필드만 사용한다.
     *
     * 입력값이 비어 있는 선택 항목은 null로 전달한다.
     *
     * [주의]
     * updateProject()는 전체 수정 방식이다.
     * 기존 값을 유지하려면 폼에 기존 데이터를
     * 미리 채워 넣고 그 값을 함께 전달해야 한다.
     */
    const requestBody = {
        projectName,
        description: projectData.description?.trim() || null,
        crawlKeyword: projectData.crawlKeyword?.trim() || null,
    }

    /*
     * [PUT 요청]
     *
     * PUT은 지정한 프로젝트 리소스의 정보를 수정한다.
     *
     * Content-Type:
     * 서버에 JSON 데이터를 전달한다는 의미
     *
     * JSON.stringify():
     * JavaScript 객체를 JSON 문자열로 변환
     *
     * Vite Proxy가 /api 요청을 백엔드로 전달한다.
     */
    const response = await fetch(
        `${PROJECT_API_URL}/${id}`,
        {
            method: 'PUT',

            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...getDevUserHeaders(),
            },

            body: JSON.stringify(requestBody),
        }
    )

    /*
     * [HTTP 오류 처리]
     *
     * 서버 응답이 성공 범위(200~299)가 아니면
     * 오류를 발생시킨다.
     *
     * 권한 부족, 유효성 검증 실패, 서버 오류 등이
     * 발생할 수 있다.
     *
     * 실제 HTTP 상태 코드는 백엔드 예외 처리 정책에 따른다.
     *
     * [팀원 인계 / TODO]
     * 추후 공통 API 오류 처리 방식을 도입하면
     * 서버가 반환하는 오류 메시지도 표시하도록 개선한다.
     */
    if (!response.ok) {
        throw new Error(
            `프로젝트 수정 실패 (HTTP ${response.status})`
        )
    }

    /*
     * [수정 성공 응답]
     *
     * ProjectController는 수정된 ProjectResponse를 반환한다.
     *
     * 해당 데이터를 ProjectDetailPage.jsx에서 사용해
     * 화면의 프로젝트 정보를 갱신할 수 있다.
     */
    const updatedProject = await response.json()

    /*
     * [응답 검증]
     *
     * 요청한 프로젝트 ID와 응답 프로젝트 ID가
     * 동일한지 확인한다.
     */
    if (
        !updatedProject ||
        typeof updatedProject !== 'object' ||
        Array.isArray(updatedProject) ||
        Number(updatedProject.projectId) !== id
    ) {
        throw new Error(
            '수정 응답을 확인할 수 없습니다. 프로젝트 정보를 다시 조회해 주세요.'
        )
    }

    // 수정된 프로젝트 정보를 호출한 컴포넌트에 반환한다.
    return updatedProject
}

/*
 * ============================================================
 * 5. 프로젝트 ACTIVE 멤버 목록 조회
 * ============================================================
 *
 * [함수명]
 * getProjectMembers(projectId)
 *
 * [파일 위치]
 * src/services/projectApi.js
 *
 * [목적]
 * 특정 프로젝트에 ACTIVE 상태로 참여 중인
 * 사용자 목록과 프로젝트 내 역할을 조회한다.
 *
 * [HTTP 요청]
 * GET /api/projects/{projectId}/members
 *
 * [관련 백엔드]
 * - ProjectController.getActiveProjectMembers()
 * - ProjectService.getActiveProjectMembers()
 * - ProjectMember.java
 *
 * [응답 데이터]
 * ProjectMember 객체 배열.
 *
 * 주요 필드:
 * - projectMemberId : 참여 기록 ID
 * - projectId       : 프로젝트 ID
 * - userId          : 사용자 ID
 * - position        : LEADER / VICE_LEADER / MEMBER
 * - memberStatus    : ACTIVE 등
 *
 * [활용 예정]
 *
 * 1. 프로젝트 설정
 *    - 현재 사용자의 position 확인
 *    - 수정 권한이 있는지 판단
 *
 * 2. 프로젝트 멤버 관리
 *    - 참여 멤버 목록 표시
 *    - 사용자 역할 표시
 *
 * 3. 업무 관리
 *    - 담당자로 지정할 수 있는 ACTIVE 멤버 목록 제공
 *
 * [권한 관련 주의]
 * - API는 ACTIVE 프로젝트 멤버가 조회할 수 있다.
 * - 버튼 표시 여부는 사용자 편의를 위한 것이다.
 * - 실제 수정/삭제 권한은 백엔드 Service가 검사한다.
 *
 * [팀원 인계 / TODO]
 * - 로그인 기능 통합 후 현재 userId를 인증 상태에서 가져온다.
 * - 현재 사용자 ID와 멤버 목록의 userId를 비교한다.
 * - 운영 환경에서 사용자 ID를 임의로 지정하지 않는다.
 *
 * 주의:
 * 이 API는 ProjectMember Entity를 직접 반환한다.
 * 사용자 닉네임 등의 정보가 응답에 포함된다고
 * 가정해서는 안 된다.
 * ============================================================
 */
export async function getProjectMembers(projectId) {

    /*
     * [프로젝트 ID 검사]
     *
     * Number.isSafeInteger():
     * 안전한 JavaScript 정수인지 확인한다.
     *
     * projectId는 1 이상의 정수여야 한다.
     */
    const id = Number(projectId)

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error('올바른 프로젝트 ID가 아닙니다.')
    }

    /*
     * [HTTP GET 요청]
     *
     * 예:
     * GET /api/projects/5/members
     *
     * Vite Proxy를 통해 Spring Boot로 전달한다.
     *
     * 현재는 별도의 사용자 헤더를 전달하지 않는다.
     * 사용자 식별 방식은 백엔드 CurrentUserService에 따른다.
     */
    const response = await fetch(
        `${PROJECT_API_URL}/${id}/members`,
        {
            method: 'GET',

            headers: {
                Accept: 'application/json',
                ...getDevUserHeaders(),
            },
        }
    )

    /*
     * [HTTP 응답 검사]
     *
     * HTTP 200~299는 성공으로 처리한다.
     *
     * 접근 권한이 없거나 프로젝트가 삭제된 경우
     * 백엔드 예외 처리 정책에 따라 오류가 반환될 수 있다.
     */
    if (!response.ok) {
        throw new Error(
            `프로젝트 멤버 조회 실패 (HTTP ${response.status})`
        )
    }

    /*
     * [JSON 변환]
     *
     * 응답은 멤버 객체들이 들어 있는 배열이다.
     *
     * ProjectMember Entity가 직접 반환되므로
     * 실제 JSON 필드는 백엔드 Entity 구조를 따른다.
     */
    const members = await response.json()

    /*
     * [응답 형식 확인]
     *
     * 멤버 목록은 배열이어야 한다.
     * 배열이 아니면 예상하지 못한 서버 응답으로 처리한다.
     */
    if (!Array.isArray(members)) {
        throw new Error(
            '프로젝트 멤버 응답이 배열 형식이 아닙니다.'
        )
    }

    /*
     * [프로젝트 ID 일치 확인]
     *
     * 다른 프로젝트 멤버 데이터가 섞여 있으면
     * 정상적인 응답으로 취급하지 않는다.
     *
     * 서버의 권한 검증을 대신하는 코드는 아니다.
     */
    const hasInvalidMember = members.some(
        (member) =>
            !member ||
            Number(member.projectId) !== id
    )

    if (hasInvalidMember) {
        throw new Error(
            '프로젝트 멤버 응답에 잘못된 데이터가 포함되어 있습니다.'
        )
    }

    // 조회한 프로젝트 멤버 목록 반환
    return members
}


/*
 * ============================================================
 * 6. 프로젝트 삭제 (Soft Delete)
 * ============================================================
 *
 * [함수명]
 * deleteProject(projectId)
 *
 * [HTTP 요청]
 * DELETE /api/projects/{projectId}
 *
 * [관련 백엔드]
 * - ProjectController.deleteProject()
 * - ProjectService.deleteProject()
 *
 * [삭제 방식]
 * Oracle PROJECT 행을 실제로 DELETE하지 않는다.
 *
 * 대신 다음처럼 변경한다.
 * PROJECT.status = 'DELETED'
 * PROJECT.updated_at = 현재 시각
 *
 * [삭제 권한]
 * ACTIVE + LEADER만 가능하다.
 *
 * VICE_LEADER와 MEMBER는 삭제할 수 없다.
 *
 * [성공 응답]
 * Controller 메서드의 반환형은 void이다.
 * 따라서 JSON 응답이 있다고 가정하지 않는다.
 *
 * [팀원 인계]
 * - 이 함수는 실제 DB 상태를 변경할 수 있다.
 * - 사용자의 삭제 확인 이후에만 호출해야 한다.
 * - 삭제 성공 후에는 프로젝트 목록으로 이동한다.
 * - 삭제 권한은 백엔드에서 최종 검증한다.
 * - 삭제된 프로젝트 복구 기능은 별도 구현 대상이다.
 * ============================================================
 */
export async function deleteProject(projectId) {

    /*
     * [1. 프로젝트 ID 검증]
     *
     * 잘못된 ID로 서버에 DELETE 요청을 보내지 않는다.
     */
    const id = Number(projectId)

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error('올바른 프로젝트 ID가 아닙니다.')
    }

    /*
     * [2. DELETE 요청]
     *
     * 삭제할 프로젝트는 URL의 projectId로 지정한다.
     *
     * 요청 Body는 필요하지 않다.
     *
     * [주의]
     * 이 코드는 호출되는 순간 실제 삭제 요청을 보낸다.
     * 삭제 확인창 자체는 다음 단계에서 구현한다.
     */
    const response = await fetch(
        `${PROJECT_API_URL}/${id}`,
        {
            method: 'DELETE',

            headers: {
                Accept: 'application/json',
                ...getDevUserHeaders(),
            },
        }
    )

    /*
     * [3. 응답 검사]
     *
     * HTTP 200~299 범위면 성공으로 판단한다.
     *
     * 권한 부족, 존재하지 않는 프로젝트,
     * 이미 삭제된 프로젝트 등의 경우
     * 백엔드의 예외 처리 정책에 따라 실패할 수 있다.
     */
    if (!response.ok) {
        throw new Error(
            `프로젝트 삭제 실패 (HTTP ${response.status})`
        )
    }

    /*
     * [4. 성공 처리]
     *
     * 백엔드 Controller는 void를 반환하므로
     * response.json()을 호출하지 않는다.
     *
     * 삭제 성공 여부만 호출한 컴포넌트에 전달한다.
     */
    return true
}


/*
 * ============================================================
 * 7. 프로젝트 멤버 초대 요청 (45단계)
 * ============================================================
 *
 * [함수 목적]
 * 프로젝트에 사용자를 초대하는 HTTP 요청만 담당한다.
 * 화면의 입력값 관리, 버튼 비활성화, 성공 안내는 React 컴포넌트의 책임이다.
 *
 * [백엔드 계약]
 * - POST /api/projects/{projectId}/invitations
 * - JSON 요청: { "userId": 숫자 }
 * - ProjectInviteRequest DTO에는 userId만 있다.
 * - 응답: 생성 또는 갱신된 ProjectMember 객체(JSON)
 *
 * [권한 및 상태]
 * - 초대하는 사람: 해당 프로젝트의 ACTIVE LEADER 또는 VICE_LEADER
 * - 초대받는 사람: USERS에 존재해야 함
 * - 초대 시 멤버 상태: PENDING (바로 ACTIVE가 아님)
 * - 중복 초대, 본인 초대, 삭제된 프로젝트 등은 서버가 검증한다.
 *
 * 프론트엔드 입력 검증은 잘못된 요청을 줄일 뿐이며,
 * 실제 권한 검사는 반드시 Spring Boot ProjectService가 수행한다.
 *
 * [후속 연결]
 * 추후 초대 폼에서 버튼을 명시적으로 누른 경우에만 호출한다.
 * 이 함수만 추가하는 45단계에서는 실제 서버에 요청을 보내지 않는다.
 * ============================================================
 */
export async function inviteProjectMember(projectId, targetUserId) {
    // URL과 요청 본문에 사용할 ID를 각각 검증한다.
    // 빈 문자열이나 null이 Number()로 0이 되는 경우도 함께 차단한다.
    const id = Number(projectId)
    const userId = Number(targetUserId)

    if (projectId == null || String(projectId).trim() === '' ||
        !Number.isSafeInteger(id) || id <= 0) {
        throw new Error('올바른 프로젝트 ID가 아닙니다.')
    }

    if (targetUserId == null || String(targetUserId).trim() === '' ||
        !Number.isSafeInteger(userId) || userId <= 0) {
        throw new Error('초대할 사용자 ID는 1 이상의 정수여야 합니다.')
    }

    // userId 이외에 invitedBy, position, memberStatus 등은 전송하지 않는다.
    // 해당 값은 로그인 사용자와 초대 정책에 따라 서버가 결정한다.
    const response = await fetch(`${PROJECT_API_URL}/${id}/invitations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getDevUserHeaders(),
        },
        body: JSON.stringify({ userId }),
    })

    // fetch는 HTTP 4xx/5xx에 대해 자동으로 throw하지 않으므로 직접 검사한다.
    // 상태 코드를 포함해 화면 쪽에서 오류 원인을 구분할 단서를 제공한다.
    if (!response.ok) {
        throw new Error(`프로젝트 멤버 초대 실패 (HTTP ${response.status})`)
    }

    // Controller는 ProjectMember를 반환한다.
    // 화면 연결 시 memberStatus(PENDING 등)를 확인하는 데 사용할 수 있다.
    return await response.json()
}


/*
 * ============================================================
 * 8. 내가 받은 프로젝트 초대 조회 (49단계)
 * ============================================================
 *
 * [함수 목적]
 * 현재 요청 사용자에게 도착한 PENDING 초대 목록을 조회한다.
 * 받은 초대 페이지의 UI 구현과 API 호출을 분리하기 위해
 * 이 파일에서 HTTP 요청 및 응답 데이터 형식만 처리한다.
 *
 * [백엔드 계약]
 * GET /api/projects/invitations
 * 응답: List<ProjectMember> (JSON 배열)
 * 주요 필드: projectId, userId, position, memberStatus 등
 *
 * [권한과 사용자 식별]
 * 어떤 사용자의 초대를 조회할지는 백엔드 CurrentUserService가
 * 결정한다. 클라이언트가 userId를 URL이나 본문으로 보내지 않는다.
 * 기본 개발 사용자 ID는 1이며 dev 프로필에서만
 * X-Dev-User-Id 요청 헤더를 사용할 수 있다.
 * 이 조회 함수는 공통 개발용 헤더(getDevUserHeaders)를 함께 보낸다.
 * 실제 사용자 선택은 dev 프로필의 백엔드 CurrentUserService가 수행한다.
 *
 * [주의]
 * - 프론트엔드가 다른 사용자의 초대를 필터링하는 방식이 아니다.
 * - 받은 초대에는 아직 ACTIVE가 아닌 PENDING 기록만 포함된다.
 * - 이 함수는 GET 요청이므로 초대 수락/거절 등 DB 변경을 하지 않는다.
 * - ProjectMember 응답에 프로젝트 이름이 있다는 가정은 하지 않는다.
 * - 로그인/인증 통합 시 실제 인증 사용자를 백엔드에서 확인해야 한다.
 *
 * [추후 연결]
 * 받은 초대 페이지가 마운트되면 이 함수를 호출해 목록을 출력한다.
 * 수락/거절 처리는 별도의 POST API로 구현한다.
 * ============================================================
 */
export async function getMyPendingInvitations() {
    const response = await fetch(`${PROJECT_API_URL}/invitations`, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            ...getDevUserHeaders(),
        },
    })

    // HTTP 4xx/5xx는 fetch 자체에서 오류로 취급하지 않으므로 검사한다.
    if (!response.ok) {
        throw new Error(`받은 프로젝트 초대 조회 실패 (HTTP ${response.status})`)
    }

    const invitations = await response.json()

    // 백엔드 Controller는 List<ProjectMember>를 반환해야 한다.
    if (!Array.isArray(invitations)) {
        throw new Error('받은 프로젝트 초대 응답이 배열 형식이 아닙니다.')
    }

    return invitations
}


/*
 * ============================================================
 * 9. 받은 프로젝트 초대 수락 / 거절 (56단계)
 * ============================================================
 *
 * [호출 주체 및 권한]
 * - 현재 로그인(개발) 사용자에게 도착한 PENDING 초대만 처리한다.
 * - 프로젝트 ID만 URL로 전달하며, 대상 사용자 ID는 전달하지 않는다.
 * - Spring Boot CurrentUserService가 X-Dev-User-Id 헤더로 사용자를 식별한다.
 * - 최종 권한, 초대 상태, 프로젝트 유효성 검사는 ProjectService가 수행한다.
 *
 * [상태 변경 — 실제 버튼 연결 전 주의]
 * - 수락: PENDING -> ACTIVE, respondedAt / joinedAt 기록
 * - 거절: PENDING -> REJECTED, respondedAt 기록
 * - 둘 다 DB 상태를 변경하는 POST 요청이다.
 * - 이 단계는 함수를 정의만 하며 자동 요청하거나 실행하지 않는다.
 *
 * [응답]
 * - 백엔드 ProjectController가 ProjectMember JSON 객체를 반환한다.
 * - UI 단계에서 호출 후 받은 초대 목록을 다시 조회해 최신 상태를 보여준다.
 * - fetch는 HTTP 4xx/5xx에 대해 자동으로 예외를 발생시키지 않아 직접 확인한다.
 * ============================================================
 */

// URL 경로에 사용할 프로젝트 ID를 안전하게 검증한다.
function validateInvitationProjectId(projectId) {
    if (projectId == null || String(projectId).trim() === '') {
        throw new Error('프로젝트 ID를 입력해야 합니다.')
    }

    const id = Number(projectId)
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error('프로젝트 ID는 1 이상의 정수여야 합니다.')
    }

    return id
}

// 초대 수락: POST /api/projects/{projectId}/invitations/accept
export async function acceptProjectInvitation(projectId) {
    const id = validateInvitationProjectId(projectId)
    const response = await fetch(`${PROJECT_API_URL}/${id}/invitations/accept`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            ...getDevUserHeaders(),
        },
    })

    if (!response.ok) {
        throw new Error(`프로젝트 초대 수락 실패 (HTTP ${response.status})`)
    }

    return await response.json()
}

// 초대 거절: POST /api/projects/{projectId}/invitations/reject
export async function rejectProjectInvitation(projectId) {
    const id = validateInvitationProjectId(projectId)
    const response = await fetch(`${PROJECT_API_URL}/${id}/invitations/reject`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            ...getDevUserHeaders(),
        },
    })

    if (!response.ok) {
        throw new Error(`프로젝트 초대 거절 실패 (HTTP ${response.status})`)
    }

    return await response.json()
}


/*
 * ============================================================
 * 10. 프로젝트 멤버 역할 변경 (63단계)
 * ============================================================
 *
 * [목적]
 * 프로젝트의 ACTIVE LEADER가 다른 ACTIVE 멤버의 역할을
 * MEMBER <-> VICE_LEADER 사이에서 변경할 때 사용할 API 함수다.
 * 이번 단계는 API 함수 준비만 하며 실제 PUT 요청은 호출 시에만 발생한다.
 *
 * [백엔드 계약]
 * PUT /api/projects/{projectId}/members/{userId}/role
 * Content-Type: application/json
 * 본문: { "position": "MEMBER" } 또는 { "position": "VICE_LEADER" }
 * 응답: 변경된 ProjectMember JSON 객체
 *
 * [권한과 역할 구분]
 * - 요청자: 해당 프로젝트의 ACTIVE LEADER만 가능
 * - 대상자: 해당 프로젝트의 ACTIVE 멤버만 가능
 * - LEADER 역할 자체는 이 API로 변경할 수 없다.
 * - 리더 양도는 별도 엔드포인트에서 처리한다.
 * - 클라이언트 검증은 잘못된 요청을 줄이기 위한 것으로,
 *   실제 권한과 멤버 상태는 Spring Boot ProjectService가 검사한다.
 *
 * [개발 환경]
 * - getDevUserHeaders()는 53단계의 공통 devUser 설정을 사용한다.
 * - X-Dev-User-Id는 백엔드 dev 프로필 테스트 전용이다.
 * - 실제 인증 연동 시 공통 API 인증 정책에 맞게 전환해야 한다.
 *
 * [후속 UI 연결]
 * - 멤버 관리 UI에서 리더가 역할 변경을 확정할 때만 호출한다.
 * - 성공 후 부모의 members를 다시 조회하여 역할 표시와 권한 UI를 갱신한다.
 * ============================================================
 */
export async function updateProjectMemberRole(projectId, targetUserId, newPosition) {
    // URL에 들어갈 두 ID는 안전한 양의 정수인지 확인한다.
    // Number(null), Number('')가 0이 되는 상황도 명시적으로 차단한다.
    const validatePositiveId = (value, label) => {
        if (value == null || String(value).trim() === '') {
            throw new Error(`${label}를 입력해야 합니다.`)
        }
        const id = Number(value)
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new Error(`${label}는 1 이상의 정수여야 합니다.`)
        }
        return id
    }

    const id = validatePositiveId(projectId, '프로젝트 ID')
    const userId = validatePositiveId(targetUserId, '대상 사용자 ID')

    // 일반 역할 변경은 MEMBER와 VICE_LEADER만 지원한다.
    // LEADER 양도는 별도의 요청으로 처리해야 한다.
    if (newPosition !== 'MEMBER' && newPosition !== 'VICE_LEADER') {
        throw new Error('변경할 역할은 MEMBER 또는 VICE_LEADER여야 합니다.')
    }

    const response = await fetch(`${PROJECT_API_URL}/${id}/members/${userId}/role`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getDevUserHeaders(),
        },
        body: JSON.stringify({ position: newPosition }),
    })

    // fetch는 4xx/5xx에도 자동으로 throw하지 않으므로 상태를 검사한다.
    if (!response.ok) {
        throw new Error(`프로젝트 멤버 역할 변경 실패 (HTTP ${response.status})`)
    }

    // Controller가 업데이트된 ProjectMember 객체를 반환한다.
    return await response.json()
}


/*
 * ============================================================
 * 11. 프로젝트 리더 양도 (67단계)
 * ============================================================
 *
 * [목적]
 * 현재 프로젝트의 ACTIVE LEADER가 다른 ACTIVE 멤버에게
 * LEADER 역할을 넘길 때 사용할 요청 함수다.
 *
 * [Spring Boot API]
 * POST /api/projects/{projectId}/leader/{userId}
 * - 별도의 JSON 요청 본문은 사용하지 않는다.
 * - 성공 시 새 리더의 ProjectMember 객체를 JSON으로 반환한다.
 *
 * [백엔드에서 수행되는 주요 검증 및 변경]
 * - 요청자가 프로젝트의 ACTIVE LEADER인지 확인한다.
 * - 대상자가 다른 ACTIVE 멤버인지 확인한다.
 * - DELETED 프로젝트에서는 양도하지 못한다.
 * - 기존 리더의 position을 MEMBER로 변경한다.
 * - 대상 멤버의 position을 LEADER로 변경한다.
 * - PROJECT.owner_id도 새 리더의 userId로 변경한다.
 * - 변경들은 @Transactional로 묶여 있다.
 *
 * [주의]
 * - getDevUserHeaders()는 Spring Boot dev 프로필에서만 사용하는
 *   X-Dev-User-Id 헤더를 추가한다. 실제 로그인 인증이 아니다.
 * - 이 함수는 호출하는 순간 실제 DB 변경을 요청한다.
 *   이번 67단계에서는 함수를 추가만 하고 호출하지 않는다.
 * - 후속 화면에서는 명시적인 최종 확인 후 호출하고,
 *   성공 시 프로젝트 및 멤버 목록을 모두 다시 조회해야 한다.
 * ============================================================
 */
export async function transferProjectLeader(projectId, targetUserId) {
    // null, 빈 문자열, 소수, 음수, 안전 정수 범위를 벗어난 ID를 차단한다.
    const validateId = (value, label) => {
        if (value == null || String(value).trim() === '') {
            throw new Error(`${label}를 입력해야 합니다.`)
        }

        const parsed = Number(value)
        if (!Number.isSafeInteger(parsed) || parsed <= 0) {
            throw new Error(`${label}는 1 이상의 정수여야 합니다.`)
        }
        return parsed
    }

    const id = validateId(projectId, '프로젝트 ID')
    const userId = validateId(targetUserId, '새 리더 사용자 ID')

    // 프론트에서 잘못된 요청을 예방하지만, 실제 권한 검증은 백엔드가 수행한다.
    const response = await fetch(`${PROJECT_API_URL}/${id}/leader/${userId}`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            ...getDevUserHeaders(),
        },
    })

    // fetch는 HTTP 4xx/5xx 응답을 자동 예외 처리하지 않는다.
    if (!response.ok) {
        throw new Error(`프로젝트 리더 양도 실패 (HTTP ${response.status})`)
    }

    return await response.json()
}


/*
 * ============================================================
 * 72단계: 프로젝트 자진 탈퇴 API
 * ============================================================
 *
 * [요청]
 * POST /api/projects/{projectId}/leave
 * - 현재 요청 사용자 자신이 프로젝트에서 나간다.
 * - 별도의 JSON 요청 본문은 보내지 않는다.
 * - 성공 시 변경된 ProjectMember 데이터를 JSON으로 받는다.
 *
 * [백엔드 ProjectService.leaveProject()의 정책]
 * - 해당 프로젝트에서 현재 사용자가 ACTIVE 멤버여야 한다.
 * - MEMBER와 VICE_LEADER만 자진 탈퇴할 수 있다.
 * - LEADER는 다른 ACTIVE 멤버에게 리더를 양도한 뒤 탈퇴할 수 있다.
 * - PROJECT가 DELETED 상태이면 탈퇴를 차단한다.
 * - 실제 행 삭제 대신 position=MEMBER, memberStatus=LEFT로 변경한다.
 *
 * [개발 사용자 테스트 주의]
 * - getDevUserHeaders()는 dev 프로필에서 테스트용 사용자 헤더를 보낸다.
 * - 이 API는 호출 시 DB에 변경이 발생한다. 72단계에서는 함수만 추가하며
 *   브라우저 버튼/화면 연결과 실제 탈퇴 테스트는 다음 단계로 미룬다.
 * - 성공 후 호출 화면은 프로젝트 목록 등으로 이동하거나 목록을 재조회해야 한다.
 * - 실제 로그인 기능 연동 후에는 개발 사용자 헤더 방식을 제거해야 한다.
 * ============================================================
 */
export async function leaveProject(projectId) {
    // 숫자 변환 과정에서 빈 문자열이 0이 되는 사례 등을 막는다.
    if (projectId == null || String(projectId).trim() === '') {
        throw new Error('프로젝트 ID를 입력해야 합니다.')
    }

    const id = Number(projectId)
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error('프로젝트 ID는 1 이상의 정수여야 합니다.')
    }

    const response = await fetch(`${PROJECT_API_URL}/${id}/leave`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            ...getDevUserHeaders(),
        },
    })

    // fetch는 4xx/5xx에서 자동으로 예외를 던지지 않으므로 명시적으로 검사한다.
    if (!response.ok) {
        throw new Error(`프로젝트 탈퇴 실패 (HTTP ${response.status})`)
    }

    return await response.json()
}


/*
 * ============================================================
 * 76단계: 프로젝트 멤버 강제 제외 API
 * ============================================================
 *
 * [요청]
 * POST /api/projects/{projectId}/members/{userId}/remove
 * - 현재 프로젝트의 LEADER가 다른 ACTIVE 멤버를 제외한다.
 * - 요청 본문은 필요하지 않으며, 성공 시 변경된 ProjectMember JSON을 반환한다.
 *
 * [백엔드 ProjectService.removeMember() 정책]
 * - 요청자는 해당 프로젝트에서 ACTIVE LEADER여야 한다.
 * - 제외 대상은 다른 ACTIVE MEMBER 또는 VICE_LEADER여야 한다.
 * - 리더 자신 및 이미 탈퇴/거절/대기 중인 멤버는 제외할 수 없다.
 * - 삭제된 프로젝트에서 제외할 수 없다.
 * - 대상의 position은 MEMBER, memberStatus는 LEFT로 변경된다.
 * - 자진 탈퇴도 LEFT를 사용하므로 DB 상태만으로 두 기능은 구분하지 않는다.
 *
 * [개발/연동 주의]
 * - getDevUserHeaders()는 개발용 X-Dev-User-Id 헤더를 추가한다.
 * - 프론트 버튼 노출과 실제 권한 검사는 별개이며 최종 검사는 Spring Boot가 수행한다.
 * - 이 함수가 호출되면 실제 DB가 변경된다. 76단계에서는 추가만 한다.
 * - 화면 연결 후 성공 시 멤버 목록과 현재 역할 정보를 다시 조회한다.
 * ============================================================
 */
export async function removeProjectMember(projectId, targetUserId) {
    // Number('')는 0이 될 수 있으므로 빈 값부터 명시적으로 막는다.
    const validateId = (value, label) => {
        if (value == null || String(value).trim() === '') {
            throw new Error(`${label}를 입력해야 합니다.`)
        }

        const id = Number(value)
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new Error(`${label}는 1 이상의 정수여야 합니다.`)
        }
        return id
    }

    const id = validateId(projectId, '프로젝트 ID')
    const userId = validateId(targetUserId, '제외 대상 사용자 ID')

    const response = await fetch(`${PROJECT_API_URL}/${id}/members/${userId}/remove`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            ...getDevUserHeaders(),
        },
    })

    // fetch는 HTTP 오류 응답(4xx/5xx)만으로 예외를 발생시키지 않는다.
    if (!response.ok) {
        throw new Error(`프로젝트 멤버 제외 실패 (HTTP ${response.status})`)
    }

    return await response.json()
}
