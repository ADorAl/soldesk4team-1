
/*
 * ============================================================
 * 파일명: ProjectDeleteSection.jsx
 * 위치: src/components/ProjectDeleteSection.jsx
 * ============================================================
 *
 * [파일 목적]
 * 프로젝트 삭제에 대한 위험 안내와 확인 절차를 제공한다.
 *
 * [관련 백엔드]
 * DELETE /api/projects/{projectId}
 * ProjectController.deleteProject()
 * ProjectService.deleteProject()
 *
 * [삭제 정책]
 * - ACTIVE + LEADER만 삭제 가능
 * - VICE_LEADER와 MEMBER는 삭제 불가능
 * - 실제 DB 행 삭제가 아닌 Soft Delete
 * - PROJECT.status = DELETED
 * - PROJECT.updated_at 갱신
 *
 * [Props]
 * project:
 *   현재 프로젝트 정보
 *
 * canDeleteProject:
 *   현재 사용자에게 삭제 권한이 있는지 여부
 *
 * [이번 단계]
 * 1. 삭제 권한별 화면 표시
 * 2. 삭제 확인 영역 열기/닫기
 * 3. 프로젝트명 일치 여부 검증
 *
 * [다음 단계]
 * - deleteProject() API 연결
 * - 삭제 중 중복 클릭 방지
 * - 삭제 성공 후 프로젝트 목록으로 이동
 *
 * [팀원 인계]
 * 프로젝트 삭제와 업무(TASK) 개별 삭제는 서로 다르다.
 * 프로젝트 삭제는 기존 데이터를 보존하는 Soft Delete이다.
 * 이 컴포넌트는 삭제 권한을 최종 결정하지 않는다.
 * 실제 삭제 권한은 백엔드 Service가 검증한다.
 * ============================================================
 */

import { useEffect, useState } from 'react'
// 프로젝트 삭제(Soft Delete) API
// 실제 DELETE 요청은 services/projectApi.js에서 처리한다.
import { deleteProject } from '../services/projectApi'

/*
 * [추가 Props]
 *
 * onDeleted():
 * 백엔드 삭제 성공 후 부모 컴포넌트에 알려주는 콜백.
 *
 * [팀원 인계]
 * 자식은 삭제 요청을 담당하고,
 * 부모는 삭제된 상세 페이지에서 다른 화면으로 이동시킨다.
 */
function ProjectDeleteSection({
    project,
    canDeleteProject = false,
    onDeleted,
}) {

    /*
     * [화면 상태]
     *
     * isConfirmOpen:
     * 삭제 확인 영역이 열려 있는지 여부
     *
     * confirmName:
     * 사용자가 직접 입력한 프로젝트명
     */
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [confirmName, setConfirmName] = useState('')


    /*
     * ============================================================
     * [삭제 요청 진행 상태]
     * ============================================================
     *
     * deleting:
     * DELETE 요청 진행 중 여부.
     * 중복 요청을 막고 입력창과 버튼을 잠그는 데 사용한다.
     *
     * deleteError:
     * 서버에서 삭제 요청에 실패했을 때의 오류 메시지.
     *
     * [팀원 인계]
     * 삭제 성공 시 현재 프로젝트는 일반 상세 조회가
     * 불가능해지므로 부모의 onDeleted()를 호출한다.
     */
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState('')


    /*
     * [프로젝트 변경 시 초기화]
     *
     * 다른 프로젝트의 상세 화면으로 이동하면
     * 이전 프로젝트에서 입력했던 삭제 확인 값을 제거한다.
     *
     * 프로젝트명이 변경된 경우에도 확인을 다시 요구한다.
     */
    useEffect(() => {
        setIsConfirmOpen(false)
        setConfirmName('')
    }, [project?.projectId, project?.projectName])

    /*
     * [삭제 확인 조건]
     *
     * 프로젝트 삭제 권한이 있고,
     * 실제 프로젝트명과 입력값이 완전히 동일해야 한다.
     *
     * 공백과 대소문자도 그대로 비교한다.
     *
     * 이 조건은 실수 방지용 화면 검증이다.
     * 최종 권한 검사는 백엔드에서 처리한다.
     */
    const isNameMatched =
        canDeleteProject &&
        typeof project?.projectName === 'string' &&
        project.projectName.length > 0 &&
        confirmName === project.projectName

    /*
     * [삭제 확인 열기]
     *
     * 아직 실제 API를 호출하지 않는다.
     */
    function handleOpenConfirm() {
        if (!canDeleteProject) return

        setConfirmName('')
        setIsConfirmOpen(true)
    }

    /*
     * [삭제 확인 취소]
     *
     * 입력한 이름을 지우고 확인 영역을 닫는다.
     * DB에는 영향을 주지 않는다.
     */
    function handleCancelConfirm() {
        setConfirmName('')
        setIsConfirmOpen(false)
    }

    /*
     * [최종 확인]
     *
     * 현재 단계에서는 실제 삭제 요청을 보내지 않는다.
     *
     * 다음 단계에서 deleteProject() API를
     * 이 함수 안에 연결할 예정이다.
     */

    /*
     * ============================================================
     * [프로젝트 삭제 최종 확인]
     * ============================================================
     *
     * [실행 흐름]
     * 사용자가 프로젝트명을 정확히 입력
     *   ↓
     * 삭제 최종 확인 버튼 클릭
     *   ↓
     * LEADER 권한 및 프로젝트명 일치 여부 검사
     *   ↓
     * deleteProject(project.projectId)
     *   ↓
     * DELETE /api/projects/{projectId}
     *   ↓
     * Spring Boot에서 ACTIVE LEADER 권한 확인
     *   ↓
     * PROJECT.status = 'DELETED'
     *   ↓
     * onDeleted() 호출
     *
     * [보안]
     * 프론트엔드의 권한 검사는 UI 보호용이다.
     * 실제 권한은 ProjectService.deleteProject()에서 검사한다.
     *
     * [주의]
     * 삭제 성공 후에는 해당 프로젝트의 일반 상세 조회가
     * 차단되므로 삭제된 페이지에 계속 머물지 않아야 한다.
     */
    async function handleDeleteConfirm() {

        // 프로젝트명 불일치 / 삭제 권한 없음 / 요청 중
        if (!isNameMatched || deleting) return

        /*
         * 부모의 삭제 완료 처리 함수가 연결되지 않았다면
         * 실제 삭제 요청을 보내지 않는다.
         *
         * [이유]
         * 삭제 성공 후 현재 페이지에 남는 문제를 방지한다.
         */
        if (typeof onDeleted !== 'function') {
            setDeleteError(
                '삭제 완료 후 이동 기능이 아직 연결되지 않았습니다.'
            )
            return
        }

        setDeleteError('')
        setDeleting(true)

        try {
            /*
             * [실제 DELETE 요청]
             *
             * 성공하면 백엔드의 PROJECT.status가 DELETED가 된다.
             *
             * 반환값 true는 HTTP 성공 여부를 나타내며
             * 삭제된 프로젝트 객체를 반환하는 것은 아니다.
             */
            await deleteProject(project.projectId)

            /*
             * [삭제 완료 안내]
             *
             * 부모 ProjectDetailPage에서 onDeleted()를 전달하면
             * 삭제 후 프로젝트 목록으로 이동하도록 처리한다.
             */
            onDeleted()

        } catch (err) {
            /*
             * [삭제 실패]
             *
             * 오류가 발생하면 현재 화면에 머물며
             * 삭제 실패 메시지를 표시한다.
             */
            setDeleteError(
                err instanceof Error
                    ? err.message
                    : '프로젝트 삭제 중 오류가 발생했습니다.'
            )

        } finally {
            setDeleting(false)
        }
    }


    return (
        <section
            className="
        mt-8 rounded-xl border border-red-200
        bg-white p-6 shadow-sm
      "
            aria-labelledby="project-delete-title"
        >

            {/* ====================================================
          위험 구역 제목

          [Tailwind]
          border-red-200 : 위험 구역을 구분하는 연한 테두리
          text-red-700   : 위험 작업임을 알려주는 글자색
         ==================================================== */}
            <header className="mb-5">
                <h2
                    id="project-delete-title"
                    className="text-xl font-bold text-red-700"
                >
                    위험 구역
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                    프로젝트를 삭제하면 일반 프로젝트 목록과 상세
                    화면에서 더 이상 접근할 수 없습니다.
                </p>

                <p className="mt-2 text-sm text-slate-500">
                    프로젝트와 연결된 기록은 DB에 보존되지만,
                    현재 복구 기능은 제공하지 않습니다.
                </p>
            </header>

            {/* ====================================================
          삭제 권한 없는 사용자 안내

          현재 역할이 VICE_LEADER 또는 MEMBER라면
          삭제 확인 버튼을 제공하지 않는다.
         ==================================================== */}
            {!canDeleteProject && (
                <div
                    className="
            rounded-lg border border-slate-200
            bg-slate-50 p-4 text-sm text-slate-600
          "
                >
                    프로젝트 삭제는 현재 리더(LEADER)만 가능합니다.
                </div>
            )}

            {/* ====================================================
          삭제 권한이 있는 리더에게만 버튼 표시
         ==================================================== */}
            {canDeleteProject && (
                <div className="space-y-4">

                    {!isConfirmOpen && (
                        <button
                            type="button"
                            onClick={handleOpenConfirm}
                            className="
                cursor-pointer rounded-lg
                border border-red-300 bg-white
                px-5 py-2.5 text-sm font-semibold
                text-red-700 hover:bg-red-50
              "
                        >
                            프로젝트 삭제
                        </button>
                    )}

                    {isConfirmOpen && (
                        <div
                            className="
                rounded-lg border border-red-200
                bg-red-50 p-5
              "
                        >
                            <h3 className="text-base font-bold text-red-800">
                                프로젝트 삭제 확인
                            </h3>

                            <p className="mt-3 text-sm text-red-800">
                                아래 프로젝트명을 정확히 입력해야
                                삭제를 진행할 수 있습니다.
                            </p>

                            {/* 사용자가 확인해야 할 실제 프로젝트명 */}
                            <p
                                className="
                  mt-3 break-all rounded-md
                  border border-red-200 bg-white
                  px-4 py-3 font-semibold text-slate-800
                "
                            >
                                {project?.projectName}
                            </p>

                            {/*
                [삭제 확인 입력창]

                value와 onChange를 사용하여
                React 상태로 입력값을 관리한다.

                autoComplete="off":
                이전 입력값 자동 완성을 방지한다.

                [주의]
                프로젝트명이 정확하게 일치해야 한다.
              */}
                            <label
                                htmlFor="project-delete-confirm-name"
                                className="mt-4 block text-sm font-semibold text-red-800"
                            >
                                프로젝트명 다시 입력
                            </label>

                            <input
                                id="project-delete-confirm-name"
                                type="text"
                                value={confirmName}
                                disabled={deleting}
                                onChange={(event) => {
                                    setConfirmName(event.target.value)
                                    setDeleteError('')
                                }}
                                autoComplete="off"
                                spellCheck={false}
                                placeholder="프로젝트명 입력"
                                className="
                  mt-2 w-full rounded-lg
                  border border-red-300 bg-white
                  px-4 py-3 text-sm text-slate-800
                  outline-none focus:border-red-500
                  focus:ring-2 focus:ring-red-100
                "
                            />

                            {/* ================================================
                  확인 영역 하단 버튼

                  취소:
                  입력 내용을 지우고 확인 영역 닫기

                  최종 삭제:
                  현재 단계에서는 API 연결 전이므로
                  실제 삭제를 실행하지 않음
                 ================================================ */}
                            <div className="mt-5 flex flex-wrap justify-end gap-3">

                                <button
                                    type="button"
                                    onClick={handleCancelConfirm}
                                    disabled={deleting}
                                    className="
                    cursor-pointer rounded-lg
                    border border-slate-300 bg-white
                    px-5 py-2.5 text-sm font-semibold
                    text-slate-700 hover:bg-slate-50
                  "
                                >
                                    취소
                                </button>


                                {/*
                  [삭제 최종 확인 버튼]

                  이번 단계에서는 버튼이 비활성화되어 있다.
                  다음 단계에서 DELETE API가 연결되면,
                  프로젝트명 일치 여부를 기준으로 활성화한다.
                */}

                                {/*
  [삭제 최종 확인 버튼]

  활성화 조건:
  1. 현재 사용자가 ACTIVE LEADER
  2. 입력한 이름과 실제 프로젝트명이 정확히 일치
  3. DELETE 요청이 진행 중이지 않음

  [중요]
  이 버튼을 누르면 실제 Soft Delete 요청이 실행된다.

  [팀원 인계]
  onDeleted가 부모에 연결되지 않았다면 handleDeleteConfirm에서
  DELETE 요청을 차단한다.
*/}
                                <button
                                    type="button"
                                    onClick={handleDeleteConfirm}
                                    disabled={!isNameMatched || deleting}
                                    className="
    cursor-pointer rounded-lg
    bg-red-600 px-5 py-2.5
    text-sm font-semibold text-white
    hover:bg-red-700
    disabled:cursor-not-allowed disabled:opacity-50
  "
                                >
                                    {deleting ? '삭제 처리 중...' : '프로젝트 삭제 최종 확인'}
                                </button>


                            </div>


                            {/*
  [삭제 요청 오류 안내]

  삭제 실패 시에만 메시지를 표시한다.
  실패한 요청이 DB를 변경했는지는 HTTP 오류 유형과
  백엔드 처리 결과를 함께 확인해야 한다.
*/}
                            {deleteError && (
                                <p
                                    role="alert"
                                    className="
      mt-4 rounded-lg border border-red-300
      bg-white p-3 text-sm text-red-700
    "
                                >
                                    {deleteError}
                                </p>
                            )}

                            <p className="mt-3 text-xs text-red-700">
                                삭제를 완료하면 이 프로젝트는 일반 목록과 상세 화면에서
                                접근할 수 없으며, 현재 복구 기능은 제공되지 않습니다.
                            </p>


                        </div>
                    )}

                </div>
            )}

        </section>
    )
}

export default ProjectDeleteSection
