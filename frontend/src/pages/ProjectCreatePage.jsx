
/*
 * ============================================================
 * 파일명: ProjectCreatePage.jsx
 * 위치: src/pages/ProjectCreatePage.jsx
 * ============================================================
 *
 * [파일 목적]
 * 사용자가 새 TeamPlace 프로젝트를 생성하는 페이지.
 *
 * [현재 구현 기능]
 * 1. 프로젝트명 입력 및 필수값 검증
 * 2. 프로젝트 설명 입력
 * 3. 자료 수집 키워드 상태/API 호환성 유지 (입력 UI 숨김)
 * 4. POST /api/projects API 호출
 * 5. 제출 중 중복 클릭 방지
 * 6. 생성 성공 / 실패 처리
 *
 * [관련 파일]
 * - projectApi.js : createProject() API 요청
 * - App.jsx : 화면 전환 및 생성 성공 시 이동
 * - ProjectListPage.jsx : 프로젝트 목록 화면
 *
 * [Props]
 * onCancel()
 * - 취소 버튼을 누르면 호출
 * - 부모 컴포넌트에서 프로젝트 목록으로 이동 처리
 *
 * onCreated(projectId)
 * - 프로젝트 생성에 성공하면 호출
 * - 생성된 프로젝트 ID를 부모에게 전달
 *
 * [팀원 인계]
 * - 서버에서 ownerId와 LEADER 등록을 처리한다.
 * - 프론트엔드는 사용자 역할을 직접 지정하지 않는다.
 * - 로그인 기능 통합 후 projectApi.js의 인증 처리를 확인한다.
 * - onCreated는 부모 App.jsx에서 연결해야 한다.
 *
 * [주의]
 * App.jsx에 연결하기 전까지 이 페이지는 화면에 나타나지 않는다.
 * ============================================================
 */

import { useState } from 'react'
import { createProject } from '../services/projectApi'

function ProjectCreatePage({ onCancel, onCreated }) {

    /*
     * [입력값 상태]
     *
     * projectName : 프로젝트명
     * description : 프로젝트 설명
     * crawlKeyword: 자료 수집 키워드
     *
     * 각 input의 value와 onChange를 연결하여
     * React가 입력값을 관리하도록 한다.
     */
    const [projectName, setProjectName] = useState('')
    const [description, setDescription] = useState('')
    const [crawlKeyword, setCrawlKeyword] = useState('')

    /*
     * [요청 상태]
     *
     * isSubmitting:
     * - true  : 생성 API 요청 진행 중
     * - false : 제출 가능
     *
     * error:
     * - 생성 실패 시 사용자에게 보여줄 오류 메시지
     */
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)

    /*
     * [프로젝트 생성 처리]
     *
     * 흐름:
     * 1. 브라우저 기본 form 제출 차단
     * 2. 입력값 검증
     * 3. API 요청 중 상태 설정
     * 4. createProject() 호출
     * 5. 성공 시 onCreated(projectId) 호출
     * 6. 실패 시 오류 표시
     *
     * [주의]
     * POST 요청은 DB 데이터를 생성한다.
     * 응답을 받지 못했다고 즉시 재요청하면
     * 중복 프로젝트가 만들어질 수 있다.
     */
    async function handleSubmit(event) {
        event.preventDefault()

        // 이미 제출 중이면 중복 실행하지 않는다.
        if (isSubmitting) return

        setError(null)

        // 프로젝트명은 필수 입력이다.
        if (!projectName.trim()) {
            setError('프로젝트명을 입력해 주세요.')
            return
        }

        // Oracle PROJECT.project_name은 VARCHAR2(100)이다.
        // 한글 등 멀티바이트 문자에 대한 최종 길이 검사는 서버 기준을 따른다.
        if (projectName.trim().length > 100) {
            setError('프로젝트명은 100자 이하로 입력해 주세요.')
            return
        }

        if (crawlKeyword.trim().length > 500) {
            setError('자료 수집 키워드는 500자 이하로 입력해 주세요.')
            return
        }

        setIsSubmitting(true)

        try {
            /*
             * API 요청 객체.
             *
             * ownerId, projectId, status는 보내지 않는다.
             * 프로젝트 생성 및 리더 등록은 백엔드가 담당한다.
             */
            const createdProject = await createProject({
                projectName,
                description,
                crawlKeyword,
            })

            /*
             * 생성 성공 후 부모 App.jsx에 프로젝트 ID 전달.
             *
             * TODO:
             * App.jsx에서 프로젝트 상세 페이지 이동과 연결한다.
             */
            onCreated?.(createdProject.projectId)

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : '프로젝트 생성 중 오류가 발생했습니다.'
            )

        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        /*
         * [페이지 전체 영역]
         *
         * min-w-0 : 콘텐츠가 가로 공간을 밀어내지 않도록 함
         * flex-1  : 사이드바를 제외한 나머지 공간 사용
         * p-8     : 내부 여백 32px
         */
        <main className="min-w-0 flex-1 p-8">

            {/* ======================================================
          1. 페이지 제목

          max-w-3xl : 폼 너비를 최대 768px로 제한
          mx-auto   : 화면 중앙 정렬
         ====================================================== */}
            <div className="mx-auto max-w-3xl">

                <header className="mb-8">
                    <p className="mb-2 text-sm font-medium text-blue-600">
                        CREATE PROJECT
                    </p>

                    <h1 className="text-3xl font-bold text-slate-800">
                        새 프로젝트 생성
                    </h1>

                    <p className="mt-3 text-sm text-slate-500">
                        프로젝트의 기본 정보를 입력하고 새 프로젝트를 만드세요.
                    </p>
                </header>

                {/*
          [폼 전체]

          onSubmit:
          생성 버튼을 누르거나 입력창에서 Enter를 누르면
          handleSubmit 함수가 실행된다.
        */}
                <form
                    onSubmit={handleSubmit}
                    className="
            rounded-xl border border-slate-200
            bg-white p-8 shadow-sm
          "
                >

                    {/* ==================================================
              2. 기본 정보 영역

              GitHub의 General 구역을 참고한 구성.

              space-y-6 : 입력 항목 사이 간격 24px
             ================================================== */}
                    <section className="space-y-6">

                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                1. 기본 정보
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                프로젝트의 이름과 설명을 설정합니다.
                            </p>
                        </div>

                        {/* 프로젝트명 입력 */}
                        <div>
                            <label
                                htmlFor="projectName"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                프로젝트명 <span className="text-red-600">*</span>
                            </label>

                            <input
                                id="projectName"
                                type="text"
                                value={projectName}
                                onChange={(event) => setProjectName(event.target.value)}
                                maxLength={100}
                                required
                                disabled={isSubmitting}
                                placeholder="예: TeamPlace 프로젝트"
                                className="
                  w-full rounded-lg border border-slate-300
                  bg-white px-4 py-3 text-sm text-slate-800
                  outline-none transition-colors
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                  disabled:bg-slate-100
                "
                            />

                            <p className="mt-2 text-xs text-slate-500">
                                필수 항목 · 최대 100자 ({projectName.length}/100)
                            </p>
                        </div>

                        {/* 프로젝트 설명 입력 */}
                        <div>
                            <label
                                htmlFor="description"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                프로젝트 설명
                                <span className="ml-2 font-normal text-slate-400">
                                    선택
                                </span>
                            </label>

                            <textarea
                                id="description"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                disabled={isSubmitting}
                                rows={5}
                                placeholder="프로젝트의 목표와 주요 내용을 입력하세요."
                                className="
                  w-full resize-y rounded-lg border border-slate-300
                  bg-white px-4 py-3 text-sm text-slate-800
                  outline-none transition-colors
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                  disabled:bg-slate-100
                "
                            />
                        </div>

                    </section>

                    {/* 구역 구분선 */}
                    <hr className="my-8 border-slate-200" />

                    {/*
                     * [2026-10-16 UI 변경]
                     * 자료 수집 키워드는 별도 페이지에서 관리하기로 협의하여
                     * 기존 '2. 추가 설정' 입력 섹션을 화면에서만 제외했다.
                     * 기존 crawlKeyword 상태 및 생성 API 전달 구조는 그대로 유지한다.
                     * 복구용 JSX는 frontend/KEYWORD_UI_RESTORE_NOTES.md 참고.
                     */}

                    {/* ==================================================
              4. 생성 시 안내

              프로젝트 생성 후 현재 사용자가
              LEADER + ACTIVE 멤버로 등록되는 것은
              백엔드 ProjectService의 책임이다.
             ================================================== */}
                    <div
                        className="
              mt-8 rounded-lg border border-blue-100
              bg-blue-50 p-4
            "
                    >
                        <p className="text-sm font-semibold text-blue-800">
                            프로젝트 생성 안내
                        </p>

                        <p className="mt-2 text-sm text-blue-700">
                            프로젝트를 생성하면 생성자가 리더로 등록됩니다.
                            생성 후 프로젝트에 다른 사용자를 초대할 수 있습니다.
                        </p>
                    </div>

                    {/* ==================================================
              5. API 오류 메시지

              role="alert":
              화면 읽기 도구에 오류를 알리는 접근성 속성
             ================================================== */}
                    {error && (
                        <div
                            role="alert"
                            className="
                mt-6 rounded-lg border border-red-200
                bg-red-50 p-4 text-sm text-red-700
              "
                        >
                            {error}
                        </div>
                    )}

                    {/* ==================================================
              6. 하단 버튼

              [취소]
              onCancel을 호출해 프로젝트 목록으로 돌아간다.

              [생성하기]
              POST /api/projects 호출
              요청 중에는 버튼을 비활성화한다.

              [Tailwind]
              flex justify-end : 버튼 오른쪽 배치
              gap-3            : 버튼 사이 간격 12px
             ================================================== */}
                    <div
                        className="
              mt-8 flex flex-wrap items-center justify-end
              gap-3 border-t border-slate-200 pt-6
            "
                    >

                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="
                cursor-pointer rounded-lg border border-slate-300
                bg-white px-5 py-3 text-sm font-semibold
                text-slate-700 hover:bg-slate-50
                disabled:cursor-not-allowed disabled:opacity-50
              "
                        >
                            취소
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="
                cursor-pointer rounded-lg bg-blue-600
                px-6 py-3 text-sm font-semibold text-white
                hover:bg-blue-700
                disabled:cursor-not-allowed disabled:opacity-60
              "
                        >
                            {isSubmitting ? '생성 중...' : '프로젝트 생성하기'}
                        </button>

                    </div>

                </form>

            </div>

        </main>
    )
}

export default ProjectCreatePage
