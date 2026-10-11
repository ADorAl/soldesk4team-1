
/*
 * ============================================================
 * 파일명: ProjectDetailPage.jsx
 * 위치: src/pages/ProjectDetailPage.jsx
 * ============================================================
 *
 * [파일 목적]
 * 사용자가 선택한 프로젝트의 상세 정보를 조회하고,
 * 프로젝트 업무/멤버/설정 기능으로 연결하는 화면이다.
 *
 * [현재 구현]
 * - GET /api/projects/{projectId} 호출
 * - 프로젝트 상세 정보 표시
 * - 로딩, 오류, 재시도 처리
 * - 개요 / 업무 관리 / 멤버 관리 / 프로젝트 설정 탭
 *
 * [관련 파일]
 * - App.jsx : 선택된 projectId 전달 및 화면 이동
 * - projectApi.js : getProjectDetail()
 * - ProjectListPage.jsx : 프로젝트 선택
 *
 * [Props]
 * projectId : 조회할 프로젝트 ID
 * onBack    : 프로젝트 목록으로 돌아가는 함수
 *
 * [팀원 인계 / TODO]
 * - 업무 관리 탭에 PROJECT_TASK API 연결
 * - 멤버 관리 탭에 PROJECT_MEMBER API 연결
 * - 프로젝트 설정 탭에 수정/삭제 API 연결
 * - 로그인 기능 통합 시 사용자 인증 방식 확인
 *
 * [주의]
 * 프론트엔드의 탭 표시와 서버 접근 권한은 별개다.
 * 프로젝트 조회/수정/삭제 권한은 백엔드에서 검증한다.
 * ============================================================
 */
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
// 프로젝트 상세 조회 및 ACTIVE 멤버 목록 조회 API
// API 요청은 services/projectApi.js에 모아 관리한다.
import {
    getProjectDetail,
    getProjectMembers,
} from '../services/projectApi'

// 프로젝트별 현재 사용자 역할을 조회하고 표시하는 공통 컴포넌트
// 내부에서 getProjectMembers()를 호출한다.
//
// [팀원 인계]
// 현재는 개발용 USER_ID = 1을 기준으로 표시한다.
// 팀원의 로그인 기능과 통합하면 실제 인증 사용자 ID로 변경해야 한다.
import ProjectRoleInfo from '../components/ProjectRoleInfo'


/*
 * [프로젝트 설정 수정 폼]
 *
 * 프로젝트명, 설명, 자료 수집 키워드를 수정하는 컴포넌트.
 *
 * [Props]
 * project        : 현재 조회한 프로젝트 정보
 * canEditProject : 현재 사용자의 프로젝트 수정 권한
 *
 * [팀원 인계]
 * - 부모인 ProjectDetailPage가 프로젝트 데이터와 권한을 관리한다.
 * - 자식인 ProjectSettingsForm은 수정 입력 화면을 담당한다.
 * - 실제 PUT API 연결은 다음 단계에서 진행한다.
 */
import ProjectSettingsForm from '../components/ProjectSettingsForm'


/*
 * [프로젝트 삭제 확인 컴포넌트]
 *
 * 프로젝트 설정 탭의 위험 구역을 담당한다.
 *
 * [관련 파일]
 * components/ProjectDeleteSection.jsx
 *
 * [Props]
 * project:
 *   삭제 대상 프로젝트의 정보
 *
 * canDeleteProject:
 *   현재 사용자가 ACTIVE LEADER인지 여부
 *
 * [이번 단계]
 * 삭제 확인 UI만 연결한다.
 * 실제 DELETE API 연결은 다음 단계에서 진행한다.
 */
import ProjectDeleteSection from '../components/ProjectDeleteSection'


// ------------------------------------------------------------
// 날짜 표시용 함수
// ------------------------------------------------------------

/*
 * Oracle TIMESTAMP가 JSON으로 전달된 값을 표시한다.
 *
 * 날짜가 비어 있으면 '-'를 반환한다.
 * 정상적으로 해석 가능한 날짜면 한국어 형식으로 변환한다.
 *
 * [팀원 인계]
 * 날짜에 시간대 정보가 없는 경우에는
 * 브라우저 환경에 따라 해석이 달라질 수 있다.
 * 실제 API의 날짜 형식을 확인해 필요 시 통일한다.
 */


function formatDate(dateValue) {
    if (!dateValue) return '-'

    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) {
        return String(dateValue)
    }

    return date.toLocaleString('ko-KR')
}


// ------------------------------------------------------------
// 프로젝트 상세 페이지
// ------------------------------------------------------------

function ProjectDetailPage({ projectId, onBack }) {

    /*
     * project:
     * 서버에서 조회한 단일 프로젝트 데이터
     *
     * loading:
     * 서버 요청 처리 중인지 여부
     *
     * error:
     * 조회 오류 메시지
     *
     * activeTab:
     * 현재 선택된 프로젝트 상세 탭
     */
    const [project, setProject] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('overview')

    /*
 * ============================================================
 * [현재 프로젝트의 멤버 정보]
 *
 * members:
 * - 프로젝트에 ACTIVE 상태로 참여 중인 멤버 배열
 *
 * membersLoading:
 * - 멤버 목록 API 요청 진행 여부
 *
 * membersError:
 * - 멤버 조회 실패 시 발생한 메시지
 *
 * [팀원 인계]
 * 이 데이터는 앞으로 다음 기능에서 공유한다.
 *
 * 1. 현재 사용자 역할 표시
 * 2. 프로젝트 수정 버튼 권한 제어
 * 3. 멤버 관리 탭의 참여자 목록
 * 4. 업무 담당자 선택 목록
 *
 * 서버에서 검증하는 실제 권한을 대체하지 않는다.
 * ============================================================
 */
    const [members, setMembers] = useState([])
    const [membersLoading, setMembersLoading] = useState(true)
    const [membersError, setMembersError] = useState(null)

    /*
     * [프로젝트 상세 API 호출]
     *
     * projectId가 변경되면 해당 프로젝트를 새로 조회한다.
     *
     * ignore:
     * 화면 이탈 이후 완료된 이전 요청이
     * 현재 화면 상태를 덮어쓰지 않도록 방지한다.
     *
     * 이 방식은 이전 네트워크 요청 자체를 취소하지는 않는다.
     */

    /*
 * ============================================================
 * [프로젝트 삭제 성공 후 페이지 이동]
 * ============================================================
 *
 * useNavigate:
 * React Router가 제공하는 페이지 이동 함수.
 *
 * [사용 목적]
 * 프로젝트 삭제 성공 후 삭제된 상세 페이지에
 * 계속 머무르지 않도록 프로젝트 목록으로 이동한다.
 *
 * [팀원 인계]
 * 삭제 성공 여부는 ProjectDeleteSection에서 확인한다.
 * 이 컴포넌트는 삭제 성공 통보를 받은 후 이동만 담당한다.
 */
    const navigate = useNavigate()
    useEffect(() => {
        let ignore = false

        async function loadProject() {
            setLoading(true)
            setError(null)
            setProject(null)

            try {
                const result = await getProjectDetail(projectId)

                if (!ignore) {
                    setProject(result)
                }
            } catch (err) {
                if (!ignore) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : '프로젝트 정보를 불러오지 못했습니다.'
                    )
                }
            } finally {
                if (!ignore) {
                    setLoading(false)
                }
            }
        }

        loadProject()


        /*
         * ============================================================
         * [현재 사용자 정보 — 개발 단계]
         *
         * 현재 백엔드의 기본 사용자 ID가 1인 환경을 기준으로 한다.
         *
         * [팀원 인계 / TODO]
         * 실제 로그인 기능이 통합되면 이 임시 값을 제거한다.
         *
         * 반드시 API 요청에 사용되는 인증 사용자와
         * 프론트엔드에서 표시하는 사용자 ID가 같아야 한다.
         *
         * 보안 주의:
         * 이 ID는 표시용 비교에 사용하며 인증 수단이 아니다.
         * ============================================================
         */


        return () => {
            ignore = true
        }
    }, [projectId])

    /*
     * [재시도]
     *
     * 페이지를 새로 마운트하지 않고 동일 프로젝트를 다시 조회한다.
     * 실패한 요청을 복구하기 위한 기능이다.
     */
    async function handleRetry() {
        setLoading(true)
        setError(null)

        try {
            const result = await getProjectDetail(projectId)
            setProject(result)
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : '프로젝트 조회에 실패했습니다.'
            )
        } finally {
            setLoading(false)
        }
    }

    /*
     * ============================================================
     * [프로젝트 ACTIVE 멤버 목록 조회]
     *
     * 프로젝트 ID가 변경될 때 실행한다.
     *
     * API:
     * GET /api/projects/{projectId}/members
     *
     * [데이터 흐름]
     * ProjectDetailPage.jsx
     *   ↓
     * getProjectMembers(projectId)
     *   ↓
     * projectApi.js
     *   ↓
     * Spring Boot
     *   ↓
     * Oracle PROJECT_MEMBER
     *   ↓
     * members 상태 저장
     *
     * [ignore 사용 이유]
     * 프로젝트 이동 중 이전 API 응답이 늦게 도착하더라도
     * 현재 프로젝트의 멤버 목록을 덮어쓰지 않도록 한다.
     *
     * [팀원 인계]
     * 프로젝트 멤버 초대·탈퇴·역할 변경 후에는
     * 이 목록을 다시 조회해 최신 상태를 반영해야 한다.
     * ============================================================
     */
    useEffect(() => {
        let ignore = false

        async function loadMembers() {
            setMembersLoading(true)
            setMembersError(null)
            setMembers([])

            try {
                const result = await getProjectMembers(projectId)

                if (!ignore) {
                    setMembers(result)
                }
            } catch (err) {
                if (!ignore) {
                    setMembersError(
                        err instanceof Error
                            ? err.message
                            : '프로젝트 멤버 정보를 불러오지 못했습니다.'
                    )
                }
            } finally {
                if (!ignore) {
                    setMembersLoading(false)
                }
            }
        }

        loadMembers()

        return () => {
            ignore = true
        }
    }, [projectId])


    /*
     * ============================================================
     * [현재 사용자 역할 계산]
     * ============================================================
     *
     * [현재 개발 환경]
     * 백엔드가 기본 사용자 ID 1을 사용하는 환경에 맞춘 값.
     *
     * [팀원 인계 / TODO]
     * 로그인 기능을 통합할 때 currentUserId를
     * 실제 인증된 사용자의 ID로 교체해야 한다.
     *
     * 이 값은 화면 표시 및 버튼 제어용이며
     * 실제 사용자 인증이나 서버 권한 검증을 대신하지 않는다.
     */
    const currentUserId = 1

    /*
     * [현재 사용자의 ACTIVE 멤버 정보 찾기]
     *
     * members:
     * 앞의 useEffect에서 API로 가져온 멤버 배열
     *
     * find():
     * 현재 사용자 ID와 일치하는 ACTIVE 멤버를 찾는다.
     *
     * ?? null:
     * 일치하는 멤버가 없으면 null을 사용한다.
     *
     * 프로젝트가 바뀌면 members도 갱신되므로
     * 현재 사용자의 프로젝트별 역할도 다시 계산된다.
     */
    const myMembership = members.find(
        (member) =>
            Number(member.userId) === currentUserId &&
            member.memberStatus === 'ACTIVE'
    ) ?? null

    /*
     * [프로젝트 정보 수정 권한]
     *
     * ACTIVE LEADER 또는 ACTIVE VICE_LEADER만
     * 프로젝트 정보 수정 UI를 사용할 수 있다.
     *
     * 멤버 조회가 끝나지 않았거나 실패했다면
     * 수정 가능 상태로 판단하지 않는다.
     *
     * [팀원 인계]
     * 프로젝트 설정 폼 구현 시 이 값을 사용한다.
     * 실제 수정 권한은 Spring Boot Service에서 검사한다.
     */
    const canEditProject =
        !membersLoading &&
        !membersError &&
        myMembership != null &&
        ['LEADER', 'VICE_LEADER'].includes(myMembership.position)


    /*
     * ============================================================
     * [프로젝트 삭제 권한]
     * ============================================================
     *
     * [수정 권한과 삭제 권한의 차이]
     *
     * 수정(Update):
     *   ACTIVE LEADER / ACTIVE VICE_LEADER
     *
     * 삭제(Delete):
     *   ACTIVE LEADER만 가능
     *
     * [관련 백엔드]
     * ProjectService.deleteProject()
     *
     * [권한 확인 과정]
     * 1. 멤버 목록 조회가 완료되었는가?
     * 2. 멤버 조회 오류가 없는가?
     * 3. 현재 사용자의 ACTIVE 참여 정보가 존재하는가?
     * 4. 현재 역할이 LEADER인가?
     *
     * [팀원 인계]
     * UI의 canDeleteProject는 삭제 버튼 표시용이다.
     * 실제 DELETE 요청 권한은 Spring Boot에서 재검증한다.
     *
     * ownerId만 비교해 삭제 권한을 판단하지 않는다.
     * 리더 양도 시 ownerId와 역할 정보가 변경될 수 있기 때문이다.
     * ============================================================
     */
    const canDeleteProject =
        !membersLoading &&
        !membersError &&
        myMembership != null &&
        myMembership.position === 'LEADER'




    /*
     * [상세 페이지 탭 목록]
     *
     * id: 내부에서 사용할 탭 식별자
     * label: 사용자에게 표시할 이름
     *
     * 업무/멤버/설정 탭은 현재 연결 전 안내만 표시한다.
     */
    const tabs = [
        { id: 'overview', label: '개요' },
        { id: 'tasks', label: '업무 관리' },
        { id: 'members', label: '멤버 관리' },
        { id: 'settings', label: '프로젝트 설정' },
    ]

    return (
        <main className="min-w-0 flex-1 p-8">

            <div className="mx-auto max-w-6xl">

                {/* ====================================================
            1. 목록으로 돌아가기

            [Tailwind]
            text-blue-600 : 파란색 글자
            hover:underline : 마우스를 올리면 밑줄 표시
           ==================================================== */}
                <button
                    type="button"
                    onClick={onBack}
                    className="
            mb-6 cursor-pointer text-sm font-medium
            text-blue-600 hover:underline
          "
                >
                    ← 내 프로젝트로 돌아가기
                </button>

                {/* ====================================================
            2. 로딩 중
           ==================================================== */}
                {loading && (
                    <div
                        role="status"
                        className="
              rounded-xl border border-slate-200
              bg-white p-10 text-center text-slate-600
            "
                    >
                        프로젝트 상세 정보를 불러오는 중입니다...
                    </div>
                )}

                {/* ====================================================
            3. 오류 화면
           ==================================================== */}
                {!loading && error && (
                    <div
                        role="alert"
                        className="
              rounded-xl border border-red-200
              bg-red-50 p-8 text-center
            "
                    >
                        <p className="font-semibold text-red-700">
                            프로젝트 상세 조회 실패
                        </p>

                        <p className="mt-2 text-sm text-red-600">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={handleRetry}
                            className="
                mt-5 cursor-pointer rounded-lg bg-red-600
                px-5 py-2 text-sm font-semibold text-white
                hover:bg-red-700
              "
                        >
                            다시 시도
                        </button>
                    </div>
                )}

                {/* ====================================================
            4. 프로젝트 상세 화면

            로딩이 끝났고 조회에 성공한 경우에만 표시한다.
           ==================================================== */}
                {!loading && !error && project && (
                    <>
                        {/* 프로젝트 기본 정보 헤더 */}
                        <header className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="mb-2 text-sm font-medium text-blue-600">
                                PROJECT DETAIL
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <h1 className="text-3xl font-bold text-slate-800">
                                    {project.projectName}
                                </h1>

                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                    {project.status}
                                </span>
                            </div>

                            <p className="mt-3 text-sm text-slate-500">
                                프로젝트 ID: {project.projectId}
                            </p>
                        </header>


                        {/*
  ============================================================
  [현재 사용자의 프로젝트 역할 표시]
  ============================================================

  [목적]
  현재 사용자가 해당 프로젝트에서
  LEADER / VICE_LEADER / MEMBER 중 어떤 역할인지 표시한다.

  [데이터 흐름]
  ProjectDetailPage.jsx
    ↓ projectId 전달
  ProjectRoleInfo.jsx
    ↓ getProjectMembers(projectId)
  GET /api/projects/{projectId}/members
    ↓
  현재 사용자(USER_ID = 1)의 ACTIVE 멤버 정보 찾기
    ↓
  역할 및 프로젝트 수정 가능 여부 표시

  [Tailwind CSS]
  mb-6 : 역할 카드와 아래 탭 사이에 24px 여백

  [팀원 인계 / TODO]
  - 현재 개발 사용자 ID는 ProjectRoleInfo.jsx에 정의되어 있다.
  - 로그인 통합 후 실제 사용자 정보로 교체한다.
  - 수정 버튼에 권한을 적용할 때 역할 정보 조회가
    중복되지 않도록 상위 컴포넌트와 상태를 공유한다.

  [보안 주의]
  역할 표시 또는 버튼 숨김은 사용자 인터페이스 처리다.
  실제 수정 권한은 Spring Boot Service에서 검증한다.
*/}

                        {/*
 * [프로젝트 역할 정보 표시]
 *
 * 멤버 조회는 부모인 ProjectDetailPage에서 수행한다.
 *
 * myMembership : 현재 사용자 멤버 정보
 * loading      : 멤버 API 조회 중 여부
 * error        : 멤버 조회 오류
 *
 * [팀원 인계]
 * ProjectRoleInfo에서는 API를 다시 호출하지 않는다.
 * 부모에서 조회한 역할 정보를 화면에 표시한다.
 */}
                        <div className="mb-6">
                            <ProjectRoleInfo
                                myMembership={myMembership}
                                loading={membersLoading}
                                error={membersError}
                            />

                        </div>


                        {/* ==================================================
                5. 상세 기능 탭

                [Tailwind]
                flex flex-wrap : 가로 정렬, 공간 부족 시 줄바꿈
                border-b : 아래 구분선
                transition-colors : 색상 전환 효과

                [팀원 인계]
                새 탭을 추가하려면 tabs 배열과
                아래 조건부 렌더링을 함께 수정한다.
               ================================================== */}
                        <nav
                            className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3"
                            aria-label="프로젝트 상세 메뉴"
                        >
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    aria-current={activeTab === tab.id ? 'page' : undefined}
                                    className={`cursor-pointer rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>

                        {/* ==================================================
                6. 개요 탭

                [API]
                GET /api/projects/{projectId}

                현재 응답의 ProjectResponse 필드를 표시한다.
               ================================================== */}
                        {activeTab === 'overview' && (
                            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="mb-6 text-xl font-bold text-slate-800">
                                    프로젝트 개요
                                </h2>

                                <dl className="grid grid-cols-1 gap-6 md:grid-cols-2">

                                    <div>
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            프로젝트명
                                        </dt>
                                        <dd className="text-slate-800">
                                            {project.projectName}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            프로젝트 상태
                                        </dt>
                                        <dd className="text-slate-800">
                                            {project.status}
                                        </dd>
                                    </div>

                                    <div className="md:col-span-2">
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            프로젝트 설명
                                        </dt>
                                        <dd className="whitespace-pre-wrap text-slate-800">
                                            {project.description || '설명이 없습니다.'}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            생성자 ID
                                        </dt>
                                        <dd className="text-slate-800">
                                            {project.ownerId}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            자료 수집 키워드
                                        </dt>
                                        <dd className="text-slate-800">
                                            {project.crawlKeyword || '미설정'}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            생성일
                                        </dt>
                                        <dd className="text-slate-800">
                                            {formatDate(project.createdAt)}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            수정일
                                        </dt>
                                        <dd className="text-slate-800">
                                            {formatDate(project.updatedAt)}
                                        </dd>
                                    </div>

                                </dl>
                            </section>
                        )}

                        {/* 업무 관리: 추후 PROJECT_TASK 연결 */}
                        {activeTab === 'tasks' && (
                            <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                                <h2 className="text-xl font-bold">업무 관리</h2>
                                <p className="mt-3 text-sm text-slate-500">
                                    대단원/소단원 목록, 생성, 수정, 삭제 및
                                    담당자 관리 기능을 연결할 예정입니다.
                                </p>
                            </section>
                        )}

                        {/* 멤버 관리: 추후 PROJECT_MEMBER 연결 */}
                        {activeTab === 'members' && (
                            <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                                <h2 className="text-xl font-bold">멤버 관리</h2>
                                <p className="mt-3 text-sm text-slate-500">
                                    프로젝트 멤버 목록, 초대, 역할 변경,
                                    리더 양도 및 탈퇴 기능을 연결할 예정입니다.
                                </p>
                            </section>
                        )}


                        {/*
  ============================================================
  [프로젝트 설정 탭]
  ============================================================

  [목적]
  프로젝트 기본 정보 수정 화면을 표시한다.

  [컴포넌트]
  ProjectSettingsForm.jsx

  [Props]
  project:
    GET /api/projects/{projectId}에서 조회한 데이터

  canEditProject:
    프로젝트 멤버 목록에서 계산한 수정 가능 여부

  [권한]
  ACTIVE + LEADER      : 수정 가능
  ACTIVE + VICE_LEADER : 수정 가능
  ACTIVE + MEMBER      : 수정 불가능

  [데이터 흐름]
  ProjectDetailPage
    ↓ project, canEditProject
  ProjectSettingsForm
    ↓ 사용자 입력
  변경사항 저장 버튼
    ↓ 다음 단계에서 연결
  updateProject()
    ↓
  PUT /api/projects/{projectId}

  [팀원 인계 / TODO]
  - 저장 API 연결 시 성공 응답을 부모에게 전달한다.
  - 부모에서 setProject()로 상세 정보를 갱신한다.
  - 서버에서 권한을 최종 검증해야 한다.
  - 프로젝트 삭제는 별도 위험 구역으로 구현한다.
  ============================================================
*/}

                        {/*
  ============================================================
  [프로젝트 설정 탭 — 수정 결과 반영]
  ============================================================

  [관련 컴포넌트]
  ProjectSettingsForm.jsx

  [Props]
  project:
    현재 서버에서 조회한 프로젝트 상세 데이터

  canEditProject:
    현재 사용자의 프로젝트 수정 가능 여부

  onUpdated:
    자식 컴포넌트에서 수정 API가 성공하면 호출하는 함수

  [데이터 흐름]
  1. 설정 폼에서 사용자가 변경사항 저장 클릭
  2. ProjectSettingsForm에서 updateProject() 호출
  3. Spring Boot가 프로젝트 수정
  4. 수정된 ProjectResponse 응답
  5. onUpdated(updatedProject) 실행
  6. setProject(updatedProject)로 부모 상태 갱신
  7. 상세 헤더, 개요 탭, 설정 폼에 변경 내용 반영

  [React 개념]
  자식 → 부모 데이터 전달은 콜백 Props를 사용한다.

  [팀원 인계]
  - 자식 컴포넌트는 수정 요청을 수행한다.
  - 부모 컴포넌트는 수정 성공 결과를 보관한다.
  - 별도의 상세 GET 요청 없이 서버 응답으로 갱신한다.
  - 수정 가능 여부는 Spring Boot가 최종 검증한다.
  ============================================================
*/}

                        {/*
  ============================================================
  [프로젝트 설정 탭]
  ============================================================

  [구성]
  1. ProjectSettingsForm
     - 프로젝트명, 설명, 자료 수집 키워드 수정
     - LEADER / VICE_LEADER 사용 가능

  2. ProjectDeleteSection
     - 프로젝트 삭제 위험 안내 및 확인 절차
     - LEADER만 사용 가능

  [공통 Props]
  project:
    GET /api/projects/{projectId}에서 조회한 프로젝트 정보

  [수정 기능]
  - onUpdated()로 수정된 ProjectResponse를 받는다.
  - setProject()로 상세 헤더와 개요 화면을 갱신한다.

  [삭제 기능]
  - 현재는 삭제 확인 UI만 표시한다.
  - 삭제 API 호출은 다음 단계에서 연결한다.

  [팀원 인계]
  프로젝트 수정과 삭제는 권한 조건이 다르다.
  삭제 권한에 canEditProject를 재사용하지 않는다.
  ============================================================
*/}
                        {activeTab === 'settings' && (
                            <>
                                {/*
      [프로젝트 기본 정보 수정]

      기존에 완성한 수정 API 연결을 그대로 유지한다.
    */}
                                <ProjectSettingsForm
                                    project={project}
                                    canEditProject={canEditProject}
                                    onUpdated={(updatedProject) => {
                                        setProject(updatedProject)
                                    }}
                                />

                                {/*
      [프로젝트 삭제 위험 구역]

      기존 myMembership을 사용해 판단한
      canDeleteProject를 전달한다.

      프로젝트 멤버 API를 중복 호출하지 않는다.
    */}

                                {/*
  ============================================================
  [프로젝트 삭제 성공 후 이동]
  ============================================================

  [실행 순서]
  1. ProjectDeleteSection에서 삭제 확인
  2. deleteProject() 실행
  3. 백엔드가 Soft Delete 성공 응답 반환
  4. 자식 컴포넌트가 onDeleted() 호출
  5. 부모가 navigate('/projects') 실행

  [replace: true]
  삭제된 프로젝트의 상세 페이지를 브라우저 방문 기록에서
  현재 항목 대신 프로젝트 목록으로 대체한다.

  따라서 삭제 직후 뒤로가기로 해당 상세 페이지에
  다시 진입하는 상황을 줄일 수 있다.

  [팀원 인계]
  실제 삭제 권한은 백엔드에서 검사한다.
  프론트엔드의 canDeleteProject는 UI 제어용이다.
*/}
                                <ProjectDeleteSection
                                    project={project}
                                    canDeleteProject={canDeleteProject}
                                    onDeleted={() => {
                                        navigate('/projects', { replace: true })
                                    }}
                                />

                            </>
                        )}




                    </>
                )}

            </div>
        </main>
    )

}

export default ProjectDetailPage
