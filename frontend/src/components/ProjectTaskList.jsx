import { useEffect, useMemo, useState } from 'react'
import { getTasks } from '../services/taskApi.js'
import ProjectTaskCreateForm from './ProjectTaskCreateForm.jsx'
import ProjectTaskDetail from './ProjectTaskDetail.jsx'
import { getDevUserId } from '../config/devUser.js'

/*
 * ============================================================
 * 파일명: ProjectTaskList.jsx
 * 위치: frontend/src/components/ProjectTaskList.jsx
 * ============================================================
 * [역할]
 * - 기존 프로젝트 상세의 업무 관리 탭에 대단원/소단원 목록을 표시한다.
 * - 목록·생성 기능을 유지하면서 상세 조회와 제목·내용 수정(4-4단계)을 연결한다.
 * - 4-5단계 담당자 변경·내려놓기·내가 담당하기를 상세에서 연결한다. 삭제는 후속 단계.
 * - 상태(taskStatus), 진행률(progress)은 수정하지 않는다.
 *
 * [Props]
 * projectId   : 프로젝트 상세에서 전달한 프로젝트 ID
 * members     : 상위 ProjectDetailPage에서 이미 조회한 ACTIVE 멤버 목록
 * membersLoading : 멤버 조회 중 여부. 실패 시에도 업무 조회는 독립적으로 표시한다.
 *
 * [권한]
 * 화면 표시 여부는 보안 검사를 대신하지 않는다.
 * 실제 ACTIVE 참여 권한은 백엔드 TaskService가 판단한다.
 * ============================================================
 */

// 목록에서 담당자를 가독성 있게 표시한다.
// 미배정 업무는 NULL이며, 멤버 조회가 아직 끝나지 않았을 때는 ID를 보여 준다.
function getAssigneeLabel(assigneeId, members) {
    if (assigneeId == null) return '미배정'

    const member = members.find((item) => Number(item.userId) === Number(assigneeId))
    const nickname = member?.nickname ?? member?.name
    return nickname ? `${nickname} (ID ${assigneeId})` : `사용자 ID ${assigneeId}`
}

// 현재 단계에서는 읽기 전용 업무 행을 렌더링한다.
function TaskRow({ task, members, isChild = false, onDetail }) {
    return (
        <li className={`rounded-lg border border-slate-200 bg-white p-4 ${isChild ? 'ml-4 border-l-4 border-l-sky-200 sm:ml-8' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-semibold text-slate-500">
                        {isChild ? '소단원' : '대단원'} · TASK ID {task.taskId}
                    </p>
                    <h3 className="break-words text-base font-semibold text-slate-800">
                        {task.taskTitle}
                    </h3>
                    <button type="button" onClick={() => onDetail(task.taskId)} className="mt-2 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50">상세 보기</button>
                    {task.taskContent && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                            {task.taskContent}
                        </p>
                    )}
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    담당: {getAssigneeLabel(task.assigneeId, members)}
                </span>
            </div>
        </li>
    )
}

export default function ProjectTaskList({ projectId, members = [], membersLoading = false }) {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [reloadKey, setReloadKey] = useState(0)
    // null: 생성 폼 닫힘 / 'parent': 대단원 생성 / 양의 TASK ID: 해당 대단원의 소단원 생성
    const [createTarget, setCreateTarget] = useState(null)
    const [notice, setNotice] = useState('')
    // 동시에 여러 상세 폼을 열지 않고 선택된 업무 1개만 보여 준다.
    const [selectedTaskId, setSelectedTaskId] = useState(null)

    // 목록 응답에 역할은 없으므로 상위 페이지에서 전달한 멤버 데이터와
    // devUser.js의 사용자 ID를 비교해 대단원 수정 버튼의 노출 여부를 판단한다.
    // 실제 수정 요청 권한은 반드시 TaskService에서 재검사한다.
    const currentMember = members.find((member) => Number(member.userId) === Number(getDevUserId()))
    const canEditParent = currentMember?.memberStatus === 'ACTIVE' &&
        ['LEADER', 'VICE_LEADER'].includes(currentMember?.position)

    function showDetail(taskId) {
        setSelectedTaskId((current) => Number(current) === Number(taskId) ? null : Number(taskId))
    }

    // 저장 후 기존 목록 재조회. 상세 컴포넌트의 수정 데이터도 이미 갱신된다.
    function handleTaskUpdated(updated, action = 'content') {
        setNotice(`${action === 'assignee' ? '담당자가 변경되었습니다.' : '업무가 수정되었습니다.'} (TASK ID ${updated.taskId})`)
        setReloadKey((value) => value + 1)
    }

    // [4-6단계] 204 삭제 성공 시 상세를 닫고 기존 업무 목록을 다시 요청한다.
    // 삭제 대상이 자식 소단원이면 부모 목록의 개수도 자동 갱신된다.
    function handleTaskDeleted(deletedTaskId) {
        setSelectedTaskId(null)
        setNotice(`업무가 삭제되었습니다. (TASK ID ${deletedTaskId})`)
        setReloadKey((value) => value + 1)
    }

    /* 생성 성공 시: 기존 TASK를 변경하지 않고 서버 목록을 재조회한다. */
    function handleTaskCreated(createdTask) {
        setCreateTarget(null)
        setNotice(`업무가 생성되었습니다. (TASK ID ${createdTask.taskId})`)
        setReloadKey((value) => value + 1)
    }

    /*
     * 업무 관리 탭이 렌더링되거나 projectId가 달라지면 조회한다.
     * - ignore는 느리게 도착한 이전 프로젝트 응답의 상태 갱신을 방지한다.
     * - 재시도 버튼은 reloadKey를 증가시켜 새 GET 요청을 보낸다.
     * - 개발용 X-Dev-User-Id 헤더는 taskApi.js에서 자동 첨부한다.
     */
    useEffect(() => {
        let ignore = false

        async function loadTasks() {
            setLoading(true)
            setError(null)
            setTasks([])

            try {
                const result = await getTasks(projectId)
                if (!ignore) setTasks(result)
            } catch (err) {
                if (!ignore) {
                    setError(err instanceof Error ? err.message : '업무 목록 조회에 실패했습니다.')
                }
            } finally {
                if (!ignore) setLoading(false)
            }
        }

        loadTasks()
        return () => { ignore = true }
    }, [projectId, reloadKey])

    /*
     * PROJECT_TASK 한 테이블의 자기참조 구조를 화면 표시용으로 정리한다.
     * - parentTaskId === null: 대단원
     * - parentTaskId에 값이 있음: 해당 대단원의 소단원
     * - 부모가 누락된 데이터는 숨기지 않고 '상위 업무 확인 필요'로 별도 표시한다.
     * DB 값은 변경하지 않는다.
     */
    const { parents, childrenByParent, orphans } = useMemo(() => {
        const parents = tasks.filter((task) => task.parentTaskId == null)
        const parentIds = new Set(parents.map((task) => Number(task.taskId)))
        const childrenByParent = new Map()
        const orphans = []

        tasks.filter((task) => task.parentTaskId != null).forEach((task) => {
            const parentId = Number(task.parentTaskId)
            if (!parentIds.has(parentId)) {
                orphans.push(task)
                return
            }
            const siblings = childrenByParent.get(parentId) ?? []
            siblings.push(task)
            childrenByParent.set(parentId, siblings)
        })
        return { parents, childrenByParent, orphans }
    }, [tasks])

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">업무 관리</h2>
                    <p className="mt-2 text-sm text-slate-500">대단원과 소단원을 조회·생성하고 제목·내용을 수정할 수 있습니다. 담당자 관리 및 기존 백엔드 권한에 따른 업무 삭제 기능을 이용할 수 있습니다.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setNotice(''); setCreateTarget((current) => current === 'parent' ? null : 'parent') }} className="cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    {createTarget === 'parent' ? '대단원 추가 닫기' : '+ 대단원 추가'}
                </button>
                <button
                    type="button"
                    onClick={() => setReloadKey((value) => value + 1)}
                    disabled={loading}
                    className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    새로고침
                </button>
                </div>
            </div>

            {notice && <p role="status" className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
            {createTarget === 'parent' && (
                <div className="mb-5">
                    <ProjectTaskCreateForm projectId={projectId} onCreated={handleTaskCreated} onCancel={() => setCreateTarget(null)} />
                </div>
            )}

            {loading && <p role="status" className="text-sm text-slate-600">업무 목록을 불러오는 중입니다...</p>}

            {!loading && error && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <p>업무 조회 실패: {error}</p>
                    <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-3 cursor-pointer rounded-md border border-rose-300 px-3 py-1.5 font-medium hover:bg-rose-100">
                        다시 시도
                    </button>
                </div>
            )}

            {!loading && !error && (
                tasks.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">등록된 업무가 없습니다.</p>
                ) : (
                    <div className="space-y-5">
                        <p className="text-sm text-slate-500">대단원 {parents.length}개 · 소단원 {tasks.length - parents.length}개</p>
                        {membersLoading && <p className="text-xs text-slate-500">담당자 이름을 불러오는 중입니다. 사용자 ID는 먼저 표시할 수 있습니다.</p>}
                        {parents.map((parent) => (
                            <div key={parent.taskId} className="space-y-2">
                                <ul><TaskRow task={parent} members={members} onDetail={showDetail} /></ul>
                                {Number(selectedTaskId) === Number(parent.taskId) && (
                                    <ProjectTaskDetail projectId={projectId} taskId={parent.taskId} canEditParent={canEditParent} members={members} currentUserId={getDevUserId()} currentPosition={currentMember?.memberStatus === 'ACTIVE' ? currentMember.position : null} onUpdated={handleTaskUpdated} onDeleted={handleTaskDeleted} onClose={() => setSelectedTaskId(null)} />
                                )}
                                <div className="ml-4 sm:ml-8">
                                    <button type="button" onClick={() => { setNotice(''); setCreateTarget((current) => current === Number(parent.taskId) ? null : Number(parent.taskId)) }} className="rounded-md border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50">
                                        {createTarget === Number(parent.taskId) ? '소단원 추가 닫기' : '+ 소단원 추가'}
                                    </button>
                                    {createTarget === Number(parent.taskId) && (
                                        <div className="mt-3"><ProjectTaskCreateForm projectId={projectId} parentTaskId={parent.taskId} parentTitle={parent.taskTitle} onCreated={handleTaskCreated} onCancel={() => setCreateTarget(null)} /></div>
                                    )}
                                </div>
                                {(childrenByParent.get(Number(parent.taskId)) ?? []).length > 0 && (
                                    <ul className="space-y-2">
                                        {childrenByParent.get(Number(parent.taskId)).map((child) => (
                                            <li key={child.taskId} className="list-none space-y-2">
                                                <ul><TaskRow task={child} members={members} isChild onDetail={showDetail} /></ul>
                                                {Number(selectedTaskId) === Number(child.taskId) && (
                                                    <div className="ml-4 sm:ml-8"><ProjectTaskDetail projectId={projectId} taskId={child.taskId} canEditParent={canEditParent} members={members} currentUserId={getDevUserId()} currentPosition={currentMember?.memberStatus === 'ACTIVE' ? currentMember.position : null} onUpdated={handleTaskUpdated} onDeleted={handleTaskDeleted} onClose={() => setSelectedTaskId(null)} /></div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                        {orphans.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-amber-700">상위 업무를 확인할 수 없는 소단원</p>
                                <ul className="space-y-2">
                                    {orphans.map((task) => (
                                        <li key={task.taskId} className="list-none space-y-2">
                                            <ul><TaskRow task={task} members={members} isChild onDetail={showDetail} /></ul>
                                            {Number(selectedTaskId) === Number(task.taskId) && (
                                                <ProjectTaskDetail projectId={projectId} taskId={task.taskId} canEditParent={canEditParent} members={members} currentUserId={getDevUserId()} currentPosition={currentMember?.memberStatus === 'ACTIVE' ? currentMember.position : null} onUpdated={handleTaskUpdated} onDeleted={handleTaskDeleted} onClose={() => setSelectedTaskId(null)} />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )
            )}
        </section>
    )
}
