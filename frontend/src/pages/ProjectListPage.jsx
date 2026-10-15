
/*
 * ============================================================
 * 파일명: ProjectListPage.jsx
 * 위치: src/pages/ProjectListPage.jsx
 * ============================================================
 *
 * [파일 목적]
 * 현재 사용자가 ACTIVE 멤버로 참여 중인 프로젝트를
 * Spring Boot API에서 조회하고 카드 형태로 표시한다.
 *
 * [이번 단계 구현]
 * 1. GET /api/projects 호출
 * 2. 로딩 / 성공 / 빈 목록 / 오류 상태 구분
 * 3. 프로젝트명, 설명, 상태 등 표시
 * 4. 조회 실패 시 다시 시도
 *
 * [관련 파일]
 * - projectApi.js : HTTP 요청
 * - App.jsx : 페이지 선택
 * - ProjectController.java : 백엔드 API
 * - ProjectResponse.java : 응답 데이터 구조
 *
 * [팀원 인계 / TODO]
 * - 프로젝트 생성 기능 연결
 * - 프로젝트 상세 페이지 이동
 * - 프로젝트 수정 및 삭제 연결
 * - 로그인 통합 후 실제 사용자 인증 정보 적용
 *
 * 주의:
 * 프로젝트 권한 검사는 백엔드에서 수행한다.
 * 화면에 보이는 프로젝트만으로 권한을 판단하지 않는다.
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react'

// API 요청 로직을 별도 파일에서 가져온다.
// 화면 컴포넌트에 fetch 주소를 중복 작성하지 않기 위함.
import { getMyProjects } from '../services/projectApi'

/*
 * [Props - 프로젝트 생성 페이지 이동]
 *
 * onCreate:
 * App.jsx에서 전달받은 함수.
 *
 * 사용자가 '+ 프로젝트 생성' 버튼을 누르면
 * App.jsx의 handleMenuClick('project-create')가 실행되고,
 * 프로젝트 생성 페이지로 전환된다.
 *
 * 실제 DB INSERT는 이 버튼에서 실행되지 않는다.
 * 프로젝트 생성 페이지의 제출 버튼이
 * createProject() API를 호출한다.
 *
 * [팀원 인계]
 * React Router 도입 시 이 콜백을
 * navigate('/projects/new') 형태로 변경할 수 있다.
 */

/*
 * [Props]
 *
 * onCreate:
 * - 프로젝트 생성 페이지로 이동할 때 사용하는 함수
 * - App.jsx에서 전달받는다.
 *
 * onSelectProject:
 * - 프로젝트 목록에서 특정 프로젝트를 선택할 때 사용하는 함수
 * - 선택한 projectId를 App.jsx에 전달한다.
 *
 * [데이터 흐름]
 * ProjectListPage.jsx
 *   ↓ onSelectProject(project.projectId)
 * App.jsx
 *   ↓ handleProjectSelect(projectId)
 * selectedProjectId 변경
 *   ↓
 * ProjectDetailPage.jsx
 *   ↓
 * GET /api/projects/{projectId}
 *
 * [팀원 인계]
 * 현재는 useState 기반 화면 전환 방식을 사용한다.
 * React Router 도입 시 URL 기반 이동으로 변경할 예정이다.
 */
function ProjectListPage({ onCreate, onSelectProject }) {


    /*
     * [React 상태 관리]
     *
     * projects : 백엔드에서 받은 프로젝트 목록
     * loading  : 서버 응답을 기다리는 중인지 여부
     * error    : 조회 실패 시 표시할 오류 메시지
     *
     * setProjects, setLoading, setError를 실행하면
     * React가 변경된 데이터를 화면에 다시 반영한다.
     */
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    /*
     * [프로젝트 목록 조회 함수]
     *
     * 1. 로딩 상태를 true로 변경
     * 2. 기존 오류 메시지 초기화
     * 3. getMyProjects() 실행
     * 4. 성공하면 프로젝트 배열 저장
     * 5. 실패하면 오류 메시지 저장
     * 6. 요청 완료 후 로딩 종료
     *
     * useCallback:
     * 함수 참조를 유지해 useEffect의 의존성을 관리한다.
     */
    const loadProjects = useCallback(async (signal) => {
        setLoading(true)
        setError(null)

        try {
            const projectList = await getMyProjects()

            // 화면이 이동되어 요청 결과가 더 이상 필요 없다면
            // 응답을 React 상태에 반영하지 않는다.
            if (signal?.aborted) return

            setProjects(projectList)

        } catch (err) {
            if (signal?.aborted) return

            setError(
                err instanceof Error
                    ? err.message
                    : '프로젝트 목록을 불러오지 못했습니다.'
            )

        } finally {
            if (!signal?.aborted) {
                setLoading(false)
            }
        }
    }, [])

    /*
     * [useEffect]
     *
     * 프로젝트 목록 페이지가 화면에 나타나면
     * 프로젝트 목록을 한 번 조회한다.
     *
     * AbortController를 사용해 화면 이탈 후
     * 응답이 도착하는 경우 상태 변경을 방지한다.
     *
     * 참고:
     * React 개발 환경의 StrictMode에서는
     * Effect가 추가로 실행될 수 있다.
     * GET 요청이 개발 중 두 번 나타날 수 있으며,
     * 그것만으로 백엔드 오류라고 판단하지 않는다.
     */
    useEffect(() => {
        const controller = new AbortController()

        loadProjects(controller.signal)

        return () => {
            controller.abort()
        }
    }, [loadProjects])

    return (
        /*
         * [페이지 레이아웃]
         *
         * min-w-0 : 가로 공간이 넘치는 현상 방지
         * flex-1  : 사이드바를 제외한 남은 너비 사용
         * p-8     : 페이지 내부 여백 32px
         */
        <main className="min-w-0 flex-1 p-8">

            {/* ======================================================
          1. 페이지 헤더
         ====================================================== */}
            <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="mb-2 text-sm font-medium text-blue-600">
                        MY PROJECTS
                    </p>

                    <h1 className="text-3xl font-bold text-slate-800">
                        내 프로젝트
                    </h1>

                    <p className="mt-3 text-sm text-slate-500">
                        현재 참여 중인 프로젝트를 확인하고 관리합니다.
                    </p>
                </div>

                {/*
          [프로젝트 생성 버튼]

          다음 단계에서 POST /api/projects를 연결한다.

          현재는 기능이 없으므로 disabled 상태로 둔다.
        */}

                {/*
  [프로젝트 생성 페이지 이동 버튼]

  onClick={onCreate}
  - 부모 App.jsx에서 전달받은 함수를 실행한다.
  - activeMenu를 'project-create'로 변경한다.
  - ProjectCreatePage.jsx가 렌더링된다.

  [주의]
  이 버튼 자체는 백엔드 API를 호출하지 않는다.
  단순히 프로젝트 생성 화면으로 이동한다.

  [Tailwind CSS]
  cursor-pointer      : 마우스 커서를 손 모양으로 표시
  rounded-lg          : 버튼 모서리를 둥글게
  bg-blue-600         : 파란색 배경
  px-5 py-3           : 내부 여백
  text-sm             : 작은 글자 크기
  font-semibold       : 약간 굵은 글씨
  text-white          : 흰색 글씨
  hover:bg-blue-700   : 마우스를 올리면 진한 파란색
  transition-colors   : 색상 변경을 부드럽게 처리

  [팀원 인계]
  생성 권한 정책이 변경되면 버튼 표시 여부를 조정한다.
  단, 실제 생성 권한은 백엔드에서 검사해야 한다.
*/}
                <button
                    type="button"
                    onClick={onCreate}
                    className="
    cursor-pointer rounded-lg bg-blue-600
    px-5 py-3 text-sm font-semibold text-white
    transition-colors hover:bg-blue-700
  "
                >
                    + 프로젝트 생성
                </button>

            </header>

            {/* ======================================================
          2. 프로젝트 목록 영역

          rounded-xl : 모서리를 둥글게
          border     : 테두리 표시
          bg-white   : 흰색 배경
          p-6        : 내부 여백 24px
          shadow-sm  : 약한 그림자
         ====================================================== */}
            <section
                className="
          rounded-xl border border-slate-200
          bg-white p-6 shadow-sm
        "
                aria-labelledby="project-list-heading"
            >

                <div className="mb-6 flex items-center justify-between gap-3">
                    <h2
                        id="project-list-heading"
                        className="text-xl font-bold text-slate-800"
                    >
                        프로젝트 목록
                    </h2>

                    {/*
            로딩이나 오류가 없는 경우에만
            실제 조회된 프로젝트 개수를 표시한다.
          */}
                    {!loading && !error && (
                        <span className="text-sm text-slate-500">
                            총 {projects.length}개
                        </span>
                    )}
                </div>

                {/* ====================================================
            3. 로딩 중 화면

            API 응답을 기다리는 동안 표시한다.
           ==================================================== */}
                {loading && (
                    <div
                        role="status"
                        className="
              flex min-h-64 items-center justify-center
              rounded-lg bg-slate-50 text-slate-600
            "
                    >
                        프로젝트 목록을 불러오는 중입니다...
                    </div>
                )}

                {/* ====================================================
            4. API 오류 화면

            예:
            - Spring Boot 서버 미실행
            - 네트워크 연결 실패
            - 사용자 권한 문제
            - 서버 내부 오류

            오류가 나면 빈 목록으로 위장하지 않고
            실제 오류 상태를 사용자에게 알려준다.
           ==================================================== */}
                {!loading && error && (
                    <div
                        role="alert"
                        className="
              rounded-lg border border-red-200
              bg-red-50 p-6 text-center
            "
                    >
                        <p className="font-semibold text-red-700">
                            프로젝트 조회에 실패했습니다.
                        </p>

                        <p className="mt-2 text-sm text-red-600">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={() => loadProjects()}
                            className="
                mt-4 cursor-pointer rounded-lg bg-red-600
                px-4 py-2 text-sm font-semibold text-white
                hover:bg-red-700
              "
                        >
                            다시 시도
                        </button>
                    </div>
                )}

                {/* ====================================================
            5. 프로젝트가 없는 경우

            API 요청은 성공했지만 배열이 비어 있는 경우다.

            프로젝트가 없는 상태와 API 오류는 구분한다.
           ==================================================== */}
                {!loading && !error && projects.length === 0 && (
                    <div
                        className="
              flex min-h-64 flex-col items-center justify-center
              rounded-lg border-2 border-dashed border-slate-200
              bg-slate-50 px-4 text-center
            "
                    >
                        <p className="text-lg font-semibold text-slate-700">
                            참여 중인 프로젝트가 없습니다.
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                            프로젝트를 생성하거나 초대를 수락하면
                            이곳에서 확인할 수 있습니다.
                        </p>
                    </div>
                )}

                {/* ====================================================
            6. 프로젝트 카드 목록

            [API 응답]
            ProjectResponse의 필드를 그대로 사용한다.

            - projectId
            - projectName
            - description
            - ownerId
            - crawlKeyword
            - status
            - createdAt
            - updatedAt

            [Tailwind CSS]
            grid            : 카드 격자 배치
            grid-cols-1     : 기본 1열
            lg:grid-cols-2  : 큰 화면에서는 2열
            gap-5           : 카드 간 간격 20px

            [팀원 인계 / TODO]
            프로젝트 상세 페이지가 준비되면
            카드에 상세 이동 기능을 연결한다.
           ==================================================== */}
                {!loading && !error && projects.length > 0 && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                        {projects.map((project) => (
                            <article
                                key={project.projectId}
                                className="
                  rounded-xl border border-slate-200
                  bg-slate-50 p-5
                "
                            >

                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {project.projectName}
                                    </h3>

                                    {/* 프로젝트 상태: ACTIVE / COMPLETED 등 */}
                                    <span
                                        className="
                      shrink-0 rounded-full bg-blue-100
                      px-3 py-1 text-xs font-semibold text-blue-700
                    "
                                    >
                                        {project.status}
                                    </span>
                                </div>

                                <p className="mb-5 whitespace-pre-wrap text-sm text-slate-600">
                                    {project.description || '프로젝트 설명이 없습니다.'}
                                </p>

                                <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">

                                    <p className="text-slate-600">
                                        <span className="font-semibold">프로젝트 ID:</span>
                                        {' '}{project.projectId}
                                    </p>

                                    <p className="text-slate-600">
                                        <span className="font-semibold">생성자 ID:</span>
                                        {' '}{project.ownerId}
                                    </p>

                                    {/* [2026-10-16] 목록 카드의 키워드 표시를 숨김. 복구 코드는 KEYWORD_UI_RESTORE_NOTES.md 참고. */}

                                </div>


                                {/*
  ============================================================
  [프로젝트 상세 페이지 이동 버튼]
  ============================================================

  [기능]
  사용자가 '프로젝트 상세 보기' 버튼을 클릭하면
  현재 카드의 projectId를 부모 App.jsx에 전달한다.

  [실행 흐름]
  1. 버튼 클릭
  2. onSelectProject(project.projectId) 호출
  3. App.jsx의 handleProjectSelect() 실행
  4. selectedProjectId 상태 변경
  5. ProjectDetailPage.jsx 렌더링
  6. GET /api/projects/{projectId} 호출

  [중요]
  이 버튼 자체는 서버 API를 호출하지 않는다.
  상세 페이지가 나타나면서 useEffect를 통해
  getProjectDetail()을 호출한다.

  [Tailwind CSS]
  mt-5             : 위쪽 여백 20px
  inline-flex      : 버튼 내부 요소를 가로 배치
  items-center     : 세로 가운데 정렬
  gap-2            : 텍스트와 화살표 사이 간격 8px
  rounded-lg       : 모서리를 둥글게 처리
  bg-blue-600      : 파란색 배경
  px-4 py-2        : 내부 여백
  text-sm          : 작은 글자 크기
  font-semibold    : 글자 굵게 표시
  text-white       : 흰색 글씨
  hover:bg-blue-700: 마우스를 올리면 진한 파란색

  [팀원 인계]
  React Router 도입 시 이 버튼을 Link로 변경하거나
  navigate(`/projects/${project.projectId}`)로 교체할 수 있다.

  실제 프로젝트 접근 권한은 Spring Boot에서 확인한다.
  프론트엔드 버튼 표시가 권한 검증을 대신하지 않는다.
*/}
                                <button
                                    type="button"
                                    onClick={() => onSelectProject(project.projectId)}
                                    className="
    mt-5 inline-flex cursor-pointer items-center gap-2
    rounded-lg bg-blue-600 px-4 py-2
    text-sm font-semibold text-white
    transition-colors hover:bg-blue-700
  "
                                >
                                    프로젝트 상세 보기
                                    <span aria-hidden="true">→</span>
                                </button>


                            </article>
                        ))}

                    </div>
                )}

            </section>
        </main>
    )
}

export default ProjectListPage
