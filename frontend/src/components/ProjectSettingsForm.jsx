
/*
 * ============================================================
 * 파일명: ProjectSettingsForm.jsx
 * 위치: src/components/ProjectSettingsForm.jsx
 * ============================================================
 *
 * [파일 목적]
 * 기존 프로젝트의 기본 정보를 수정하기 위한 폼.
 *
 * [수정 대상]
 * - projectName : 프로젝트명
 * - description : 프로젝트 설명
 * - crawlKeyword : 자료 수집 키워드
 *
 * [관련 파일]
 * - ProjectDetailPage.jsx : 프로젝트 상세 및 설정 탭
 * - projectApi.js : updateProject() 수정 API
 * - ProjectUpdateRequest.java : 백엔드 요청 DTO
 *
 * [Props]
 * project:
 *   현재 조회한 프로젝트 데이터
 *
 * canEditProject:
 *   현재 사용자에게 정보 수정 권한이 있는지 여부
 *
 * [현재 구현]
 * - 프로젝트 기본 정보 수정 폼
 * - 입력값 검증 및 변경 취소
 * - 역할에 따른 수정 권한 제어
 * - updateProject() PUT API 호출
 * - 저장 성공/실패 메시지 표시
 *
 * [다음 단계]
 * ProjectDetailPage.jsx에서 onUpdated를 연결해
 * 수정 성공 결과를 상세 화면 전체에 반영한다.
 *
 * [팀원 인계]
 * ownerId, status 등은 이 폼에서 변경하지 않는다.
 * 실제 수정 권한은 Spring Boot에서 다시 검사한다.
 * ============================================================
 */

import { useEffect, useState } from 'react'

// 프로젝트 수정 PUT API
// 실제 fetch 요청은 services/projectApi.js에서 처리한다.
import { updateProject } from '../services/projectApi'



// ------------------------------------------------------------
// 1. 수정 폼 컴포넌트
// ------------------------------------------------------------
/*
 * [추가 Props]
 *
 * onUpdated(updatedProject):
 * 프로젝트 수정 API 성공 후 부모에게 결과를 전달한다.
 *
 * [팀원 인계]
 * 자식은 API 요청과 수정 입력을 담당한다.
 * 부모는 성공한 프로젝트 정보를 화면 전체에 반영한다.
 */
function ProjectSettingsForm({
    project,
    canEditProject = false,
    onUpdated,
}) {

    /*
     * [입력 상태]
     *
     * React의 useState를 사용해
     * 사용자가 수정한 내용을 보관한다.
     *
     * 서버에서 가져온 프로젝트 정보와
     * 아직 저장하지 않은 입력값은 구분한다.
     */
    const [projectName, setProjectName] = useState(
        project?.projectName ?? ''
    )

    const [description, setDescription] = useState(
        project?.description ?? ''
    )

    const [crawlKeyword, setCrawlKeyword] = useState(
        project?.crawlKeyword ?? ''
    )

    const [validationError, setValidationError] = useState('')


    /*
     * ============================================================
     * [프로젝트 수정 요청 상태]
     * ============================================================
     *
     * saving:
     * PUT 요청이 진행 중인지 나타낸다.
     *
     * saveError:
     * 서버 요청 실패 또는 응답 처리 오류를 표시한다.
     *
     * saveSuccess:
     * 서버가 수정에 성공했을 때 안내 문구를 표시한다.
     *
     * [팀원 인계]
     * saving 상태를 사용해 버튼 중복 클릭을 막는다.
     * 수정 성공과 실패를 구분해 사용자에게 안내한다.
     */
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [saveSuccess, setSaveSuccess] = useState('')


    /*
     * [프로젝트 정보 변경 시 입력값 갱신]
     *
     * 프로젝트 ID가 변경되거나,
     * 부모가 새로운 프로젝트 정보를 전달하면
     * 폼에 표시된 값도 해당 데이터로 초기화한다.
     *
     * [주의]
     * 저장되지 않은 편집 내용이 있을 때
     * 부모의 project 값이 변경되면 다시 초기화된다.
     */
    useEffect(() => {
        setProjectName(project?.projectName ?? '')
        setDescription(project?.description ?? '')
        setCrawlKeyword(project?.crawlKeyword ?? '')
        setValidationError('')
    }, [
        project?.projectId,
        project?.projectName,
        project?.description,
        project?.crawlKeyword,
    ])

    /*
     * [변경사항 존재 여부]
     *
     * 원래 프로젝트 데이터와 입력값을 비교한다.
     *
     * trim():
     * 문자열 앞뒤의 공백을 제거한다.
     *
     * 변경사항이 없다면 저장할 필요가 없다.
     */
    const hasChanges =
        projectName.trim() !== (project?.projectName ?? '').trim() ||
        description.trim() !== (project?.description ?? '').trim() ||
        crawlKeyword.trim() !== (project?.crawlKeyword ?? '').trim()

    /*
     * [입력값 검사 및 실제 수정 요청]
     *
     * 저장 버튼을 누르면 입력값을 검사한 후
     * updateProject()를 통해 실제 PUT 요청을 보낸다.
     *
     * [주의]
     * 서버 요청에 성공하면 Oracle PROJECT 데이터가
     * 실제로 변경된다.
     */

    /*
     * ============================================================
     * [프로젝트 수정 요청]
     * ============================================================
     *
     * [실행 흐름]
     * 사용자 저장 버튼 클릭
     *   ↓
     * 입력값 및 수정 권한 검사
     *   ↓
     * updateProject(projectId, 수정 데이터)
     *   ↓
     * PUT /api/projects/{projectId}
     *   ↓
     * Spring Boot에서 수정 권한 검사
     *   ↓
     * Oracle PROJECT 정보 수정
     *   ↓
     * 수정된 ProjectResponse 반환
     *   ↓
     * onUpdated(updatedProject) 호출
     *   ↓
     * 부모의 프로젝트 상세 정보 갱신
     *
     * [팀원 인계]
     * 서버 요청에 성공한 경우에만 부모 데이터를 갱신한다.
     * 저장 중에는 추가 요청을 차단한다.
     */
    async function handleSubmit(event) {
        event.preventDefault()

        // 저장 중 중복 요청 방지
        if (saving) return

        setValidationError('')
        setSaveError('')
        setSaveSuccess('')

        /*
         * [1. 수정 권한 확인]
         *
         * 이 검사는 프론트엔드의 UI 검증이다.
         * 실제 권한은 Spring Boot에서 다시 확인한다.
         */
        if (!canEditProject) {
            setValidationError('프로젝트 수정 권한이 없습니다.')
            return
        }

        /*
         * [2. 변경사항 확인]
         *
         * 입력값이 기존 프로젝트와 동일하면
         * 불필요한 PUT 요청을 보내지 않는다.
         */
        if (!hasChanges) {
            setValidationError('변경된 내용이 없습니다.')
            return
        }

        /*
         * [3. 필수 입력 검사]
         */
        if (!projectName.trim()) {
            setValidationError('프로젝트명을 입력해 주세요.')
            return
        }

        if (projectName.trim().length > 100) {
            setValidationError('프로젝트명은 100자 이하로 입력해 주세요.')
            return
        }

        if (crawlKeyword.trim().length > 500) {
            setValidationError(
                '자료 수집 키워드는 500자 이하로 입력해 주세요.'
            )
            return
        }

        /*
         * [4. 서버 요청]
         *
         * 기존 updateProject()가 다음 필드를 JSON으로 전달한다.
         *
         * projectName
         * description
         * crawlKeyword
         *
         * 프로젝트 생성자(ownerId), 프로젝트 상태(status)는
         * 수정 요청에 포함되지 않는다.
         */
        setSaving(true)

        try {
            const updatedProject = await updateProject(
                project.projectId,
                {
                    projectName,
                    description,
                    crawlKeyword,
                }
            )

            /*
             * [5. 부모에 수정 결과 전달]
             *
             * 서버가 반환한 데이터를 부모에게 전달한다.
             *
 * [프로젝트 수정 결과 반영]
 *
 * updateProject() 성공 시 서버에서 받은 ProjectResponse를
 * onUpdated(updatedProject)로 부모에게 전달한다.
 *
 * ProjectDetailPage.jsx는 setProject(updatedProject)를
 * 호출하여 프로젝트 상세 헤더와 개요 화면을 갱신한다.
            }

            setSaveSuccess('프로젝트 정보가 저장되었습니다.')

        } catch (err) {
            /*
             * [6. 오류 처리]
             *
             * 서버가 오류 응답을 보내면
             * 성공 메시지를 표시하지 않는다.
             */
            setSaveError(
                err instanceof Error
                    ? err.message
                    : '프로젝트 수정 중 오류가 발생했습니다.'
            )

        } finally {
            setSaving(false)
        }
    }


    /*
     * [변경 취소]
     *
     * 입력 상태를 마지막으로 조회한 프로젝트 정보로
     * 복구한다.
     *
     * React 상태만 변경하므로 DB에는 영향이 없다.
     */
    function handleReset() {
        setProjectName(project?.projectName ?? '')
        setDescription(project?.description ?? '')
        setCrawlKeyword(project?.crawlKeyword ?? '')

        setValidationError('')
        setSaveError('')
        setSaveSuccess('')
    }

    return (
        <section
            className="
        rounded-xl border border-slate-200
        bg-white p-6 shadow-sm
      "
            aria-labelledby="project-settings-title"
        >

            {/* ====================================================
          설정 화면 제목
         ==================================================== */}
            <header className="mb-6">
                <h2
                    id="project-settings-title"
                    className="text-xl font-bold text-slate-800"
                >
                    프로젝트 기본 설정
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                    프로젝트명, 설명, 자료 수집 키워드를 관리합니다.
                </p>
            </header>

            {/*
        [권한 없음]
        MEMBER는 조회할 수 있지만 수정할 수 없다.
        입력 필드에는 disabled 속성을 적용한다.
      */}
            {!canEditProject && (
                <p
                    className="
            mb-5 rounded-lg border border-amber-200
            bg-amber-50 p-3 text-sm text-amber-800
          "
                >
                    프로젝트 정보 수정은 리더 또는 부리더만 가능합니다.
                </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* ==================================================
            프로젝트명

            required  : 필수 입력
            maxLength : 최대 100자
            disabled  : 수정 권한이 없으면 입력 차단
           ================================================== */}
                <div>
                    <label
                        htmlFor="project-settings-name"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                        프로젝트명 <span className="text-red-600">*</span>
                    </label>

                    <input
                        id="project-settings-name"
                        type="text"
                        required
                        maxLength={100}
                        disabled={!canEditProject || saving}
                        value={projectName}

                        onChange={(event) => {
                            // 이 줄은 입력 필드마다 기존 setter를 유지한다.
                            setProjectName(event.target.value)

                            // 새로운 편집을 시작하면 이전 결과 메시지를 초기화한다.
                            setValidationError('')
                            setSaveError('')
                            setSaveSuccess('')
                        }}

                        className="
              w-full rounded-lg border border-slate-300
              bg-white px-4 py-3 text-sm text-slate-800
              outline-none focus:border-blue-500
              focus:ring-2 focus:ring-blue-100
              disabled:cursor-not-allowed disabled:bg-slate-100
            "
                    />

                    <p className="mt-2 text-xs text-slate-500">
                        {projectName.length} / 100자
                    </p>
                </div>

                {/* ==================================================
            프로젝트 설명

            textarea:
            여러 줄의 문자열을 입력하는 HTML 요소.

            resize-y:
            사용자가 세로 크기를 조절할 수 있다.

            whitespace-pre-wrap:
            개행 및 공백이 필요한 표시 화면에서 활용.
           ================================================== */}
                <div>
                    <label
                        htmlFor="project-settings-description"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                        프로젝트 설명
                    </label>

                    <textarea
                        id="project-settings-description"
                        rows={5}
                        disabled={!canEditProject || saving}
                        value={description}


                        onChange={(event) => {
                            /*
                             * [프로젝트 설명 입력]
                             *
                             * textarea의 입력값을 description 상태에 저장한다.
                             * 프로젝트명(projectName)은 변경하지 않는다.
                             */
                            setDescription(event.target.value)

                            // 새로운 편집을 시작하면 이전 결과 메시지 초기화
                            setValidationError('')
                            setSaveError('')
                            setSaveSuccess('')
                        }}


                        className="
              w-full resize-y rounded-lg
              border border-slate-300 bg-white
              px-4 py-3 text-sm text-slate-800
              outline-none focus:border-blue-500
              focus:ring-2 focus:ring-blue-100
              disabled:cursor-not-allowed disabled:bg-slate-100
            "
                    />
                </div>

                {/* ==================================================
            자료 수집 키워드

            해당 값은 PROJECT.crawl_keyword와 연결된다.
            실제 크롤링 실행 기능과는 별개다.
           ================================================== */}
                <div>
                    <label
                        htmlFor="project-settings-keyword"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                        자료 수집 키워드
                    </label>

                    <input
                        id="project-settings-keyword"
                        type="text"
                        maxLength={500}
                        disabled={!canEditProject || saving}
                        value={crawlKeyword}


                        onChange={(event) => {
                            /*
                             * [자료 수집 키워드 입력]
                             *
                             * 키워드 입력값을 crawlKeyword 상태에 저장한다.
                             * 다른 입력 항목의 상태에는 영향을 주지 않는다.
                             */
                            setCrawlKeyword(event.target.value)

                            // 새로운 편집을 시작하면 이전 결과 메시지 초기화
                            setValidationError('')
                            setSaveError('')
                            setSaveSuccess('')
                        }}


                        placeholder="예: React, Spring Boot"
                        className="
              w-full rounded-lg border border-slate-300
              bg-white px-4 py-3 text-sm text-slate-800
              outline-none focus:border-blue-500
              focus:ring-2 focus:ring-blue-100
              disabled:cursor-not-allowed disabled:bg-slate-100
            "
                    />

                    <p className="mt-2 text-xs text-slate-500">
                        {crawlKeyword.length} / 500자
                    </p>
                </div>


                {/* ============================================================
    [입력값 검증 및 API 요청 결과 메시지]

    validationError:
    - 프로젝트명 누락 또는 글자 수 초과
    - 수정 권한 없음
    - 변경사항 없음

    saveError:
    - PUT 요청 실패
    - 서버 오류 또는 수정 권한 거부

    saveSuccess:
    - PUT 요청 성공

    [중요]
    세 메시지는 서로 독립된 조건으로 표시한다.
    validationError가 없어도 API 결과를 표시해야 한다.

    [팀원 인계]
    저장 결과 메시지는 백엔드 요청 결과를 기준으로 한다.
    ============================================================ */}

                {/* 1. 입력값 검증 오류 */}
                {validationError && (
                    <p
                        role="alert"
                        className="
      rounded-lg border border-red-200
      bg-red-50 p-3 text-sm text-red-700
    "
                    >
                        {validationError}
                    </p>
                )}

                {/* 2. 서버 수정 요청 실패 */}
                {saveError && (
                    <p
                        role="alert"
                        className="
      rounded-lg border border-red-200
      bg-red-50 p-3 text-sm text-red-700
    "
                    >
                        {saveError}
                    </p>
                )}

                {/* 3. 서버 수정 요청 성공 */}
                {saveSuccess && (
                    <p
                        role="status"
                        className="
      rounded-lg border border-green-200
      bg-green-50 p-3 text-sm text-green-700
    "
                    >
                        {saveSuccess}
                    </p>
                )}



                {/*
  ============================================================
  [폼 하단 버튼]
  ============================================================

  변경 취소:
  입력값을 기존 프로젝트 정보로 복원한다.
  DB에는 영향을 주지 않는다.

  변경사항 저장:
  수정 권한과 변경사항을 검사한 뒤
  updateProject()로 실제 PUT 요청을 전송한다.

  [팀원 인계]
  프로젝트 수정 성공 후 상세 화면까지 갱신하려면
  부모의 onUpdated 연결이 필요하다.
  ============================================================
*/}

                <div
                    className="
            flex flex-wrap justify-end gap-3
            border-t border-slate-200 pt-5
          "
                >
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={!canEditProject || !hasChanges || saving}
                        className="
              cursor-pointer rounded-lg border border-slate-300
              bg-white px-5 py-2.5 text-sm font-semibold
              text-slate-700 hover:bg-slate-50
              disabled:cursor-not-allowed disabled:opacity-50
            "
                    >
                        변경 취소
                    </button>


                    {/*
  [프로젝트 정보 저장 버튼]

  수정 권한이 있고 변경사항이 있으며,
  현재 저장 중이 아닐 때만 활성화한다.

  [동작]
  버튼 클릭 → handleSubmit()
  → updateProject() → Spring Boot PUT API

  [주의]
  버튼을 누르면 실제 Oracle DB가 변경될 수 있다.

  [팀원 인계]
  저장 성공 결과를 부모 화면에 반영하려면
  ProjectDetailPage에서 onUpdated를 전달해야 한다.
*/}
                    <button
                        type="submit"
                        disabled={!canEditProject || !hasChanges || saving}
                        className="
    cursor-pointer rounded-lg bg-blue-600
    px-5 py-2.5 text-sm font-semibold text-white
    hover:bg-blue-700
    disabled:cursor-not-allowed disabled:opacity-50
  "
                    >
                        {saving ? '저장 중...' : '변경사항 저장'}
                    </button>

                </div>

            </form>
        </section>
    )
}

export default ProjectSettingsForm
