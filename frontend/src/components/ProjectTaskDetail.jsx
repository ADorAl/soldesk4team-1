import { useEffect, useState } from 'react'
import { getTaskDetail, updateTask, updateTaskAssignee, releaseTask, claimTask, deleteTask } from '../services/taskApi.js'

/*
 * [4-4~4-5단계] TASK 상세·수정 및 담당자 관리
 *
 * projectId / taskId: 상세 조회 대상 식별자
 * canEditParent: 현재 사용자가 ACTIVE LEADER 또는 VICE_LEADER인지
 * onUpdated: 저장 후 부모 목록을 서버에서 재조회하는 콜백
 * onClose: 상세 화면 닫기
 *
 * 권한 정책: 소단원은 모든 ACTIVE 멤버가 내용 수정 가능하지만,
 * 대단원은 LEADER/VICE_LEADER만 수정 가능하다.
 * 화면의 버튼 노출은 편의 기능이며 실제 권한 검증은 TaskService가 수행한다.
 * 담당자/상태/진행률은 전송하거나 변경하지 않는다.
 */
export default function ProjectTaskDetail({
    projectId, taskId, canEditParent = false, onUpdated, onDeleted, onClose,
    members = [], currentUserId = null, currentPosition = null,
}) {
    const [task, setTask] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [editing, setEditing] = useState(false)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')

    // [4-5단계] 담당자 관리 상태. 제목/내용 수정 상태와 분리한다.
    const [newAssigneeId, setNewAssigneeId] = useState('')
    const [assigneeBusy, setAssigneeBusy] = useState(false)
    const [assigneeError, setAssigneeError] = useState('')
    const [assigneeNotice, setAssigneeNotice] = useState('')

    // [4-6단계] 삭제는 실제 DB 행을 제거하므로 수정/담당자 변경과 별도 상태를 사용한다.
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState('')
    const [remainingTasks, setRemainingTasks] = useState([])

    // 프로젝트 또는 선택 업무가 바뀌면 상세 정보를 새로 요청한다.
    // cleanup은 오래 걸린 이전 요청이 현재 화면을 덮어쓰지 않도록 한다.
    useEffect(() => {
        let ignore = false
        setLoading(true)
        setTask(null)
        setError('')
        setEditing(false)
        setSaveError('')
        setAssigneeError('')
        setAssigneeNotice('')
        setDeleteError('')
        setRemainingTasks([])
        setNewAssigneeId('')
        getTaskDetail(projectId, taskId)
            .then((result) => {
                if (!ignore) {
                    setTask(result)
                    setTitle(result.taskTitle ?? '')
                    setContent(result.taskContent ?? '')
                }
            })
            .catch((err) => { if (!ignore) setError(err instanceof Error ? err.message : '업무 상세 조회 실패') })
            .finally(() => { if (!ignore) setLoading(false) })
        return () => { ignore = true }
    }, [projectId, taskId])

    // 업무가 소단원이라면 현재 ACTIVE 멤버 전원이 수정할 수 있다.
    // ACTIVE 여부는 상위 페이지의 접근 통제와 백엔드에서 추가 검증한다.
    const canEdit = task && (task.parentTaskId != null || canEditParent)

    async function handleSave(event) {
        event.preventDefault()
        if (saving || deleting || !canEdit) return
        const nextTitle = title.trim()
        if (!nextTitle || nextTitle.length > 200) {
            setSaveError('업무 제목은 공백을 제외하고 1~200자로 입력해 주세요.')
            return
        }
        setSaving(true)
        setSaveError('')
        try {
            // TaskUpdateRequest에는 taskTitle, taskContent만 존재한다.
            // assigneeId, taskStatus, progress는 의도적으로 보내지 않는다.
            const updated = await updateTask(projectId, taskId, {
                taskTitle: nextTitle,
                taskContent: content || null,
            })
            setTask(updated)
            setTitle(updated.taskTitle ?? '')
            setContent(updated.taskContent ?? '')
            setEditing(false)
            onUpdated?.(updated)
        } catch (err) {
            // 권한 없음(HTTP 400) 등 기존 백엔드 오류 메시지를 그대로 안내한다.
            setSaveError(err instanceof Error ? err.message : '업무 수정 실패')
        } finally {
            setSaving(false)
        }
    }

    /*
     * [4-5단계] 담당자 관리 권한은 UI에서 편의상 구분한다.
     * - MEMBER: 자신의 담당 업무를 NULL로 내려놓을 수 있다.
     * - VICE_LEADER: LEADER 담당 업무는 변경/해제 불가.
     * - LEADER: 자신 포함 모든 업무에 대해 변경/해제 요청 가능.
     * - 기존 미배정 업무는 ACTIVE 멤버가 claim API로 가져올 수 있다.
     * - 새 담당자로 LEADER를 선택할 수 없다.
     * 실제 권한·동시성·ACTIVE 상태는 백엔드 TaskService에서 최종 검증한다.
     */
    const isLeader = currentPosition === 'LEADER'
    const isVice = currentPosition === 'VICE_LEADER'
    const isMyTask = task?.assigneeId != null && Number(task.assigneeId) === Number(currentUserId)
    const oldAssignee = members.find((m) => Number(m.userId) === Number(task?.assigneeId))
    const oldIsLeader = oldAssignee?.position === 'LEADER'
    const isUnassigned = task?.assigneeId == null
    const canManageAssigned = !isUnassigned && (isLeader || (isVice && !oldIsLeader))
    const canRelease = !isUnassigned && (isLeader || (isVice && !oldIsLeader) || isMyTask)

    // 목록에 있는 ACTIVE 멤버 중 LEADER를 제외해 배정 후보로 표시한다.
    // 멤버 목록이 비어 있더라도 백엔드에서 직접 요청할 수는 있으나,
    // 화면에서는 불명확한 사용자 ID를 임의로 선택시키지 않는다.
    /*
     * [4-6단계: 실제 TaskService.deleteTask() 정책]
     * - ACTIVE LEADER / VICE_LEADER: 담당자와 무관하게 삭제 가능
     * - ACTIVE MEMBER: 자신의 담당 업무만 삭제 가능
     * - 하위 소단원 존재 여부는 서버에서 검사하며, 있으면 HTTP 409.
     * 브라우저의 버튼 노출은 사용성 목적이고 서버가 최종 권한을 판정한다.
     */
    const isActiveMember = members.some((m) =>
        Number(m.userId) === Number(currentUserId) && m.memberStatus === 'ACTIVE'
    )
    const canDeleteTask = Boolean(task) && isActiveMember &&
        (isLeader || isVice || isMyTask)

    async function handleDelete() {
        if (!task || !canDeleteTask || deleting || saving || assigneeBusy) return

        // 삭제는 Soft Delete가 아니라 실제 DELETE이므로 사용자의 명시적 확인이 필요하다.
        const kind = task.parentTaskId == null ? '대단원' : '소단원'
        if (!window.confirm(
            `${kind} TASK ${task.taskId} (${task.taskTitle})을(를) 실제 삭제할까요?\n삭제한 업무는 복원되지 않습니다.`
        )) return

        setDeleting(true)
        setDeleteError('')
        setRemainingTasks([])
        try {
            await deleteTask(projectId, task.taskId)
            // 삭제된 업무는 더 이상 상세 조회할 수 없으므로 부모 컴포넌트에 알려 닫는다.
            onDeleted?.(task.taskId)
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : '업무 삭제에 실패했습니다.')
            // 백엔드가 하위 소단원을 반환하면 ID와 제목을 사용자가 확인할 수 있게 표시한다.
            if (err?.status === 409 && Array.isArray(err.remainingTasks)) {
                setRemainingTasks(err.remainingTasks)
            }
        } finally {
            setDeleting(false)
        }
    }

    const candidates = members.filter((m) =>
        m.memberStatus === 'ACTIVE' && ['MEMBER', 'VICE_LEADER'].includes(m.position)
    )

    async function runAssigneeAction(action, assigneeId = null) {
        if (assigneeBusy || deleting || !task) return
        setAssigneeBusy(true)
        setAssigneeError('')
        setAssigneeNotice('')
        try {
            let updated
            if (action === 'assign') updated = await updateTaskAssignee(projectId, taskId, assigneeId)
            else if (action === 'release') updated = await releaseTask(projectId, taskId)
            else updated = await claimTask(projectId, taskId)

            // 백엔드 응답을 다시 상세 화면에 반영하고 부모 목록을 재조회한다.
            setTask(updated)
            setNewAssigneeId('')
            setAssigneeNotice(action === 'assign' ? '담당자가 변경되었습니다.' :
                action === 'release' ? '담당자가 해제되었습니다.' : '업무를 담당하게 되었습니다.')
            onUpdated?.(updated, 'assignee')
        } catch (err) {
            // 백엔드의 HTTP 400 등 한글 오류 메시지를 사용자에게 보여 준다.
            setAssigneeError(err instanceof Error ? err.message : '담당자 관리 요청에 실패했습니다.')
        } finally {
            setAssigneeBusy(false)
        }
    }

    return (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 sm:p-5" aria-label="업무 상세">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">업무 상세 · TASK ID {taskId}</h3>
                <button type="button" onClick={onClose} disabled={saving || deleting} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">상세 닫기</button>
            </div>
            {loading && <p role="status" className="text-sm text-slate-600">업무 상세를 불러오는 중입니다...</p>}
            {!loading && error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {!loading && task && (
                <div className="space-y-4">
                    <p className="text-xs text-slate-600">{task.parentTaskId == null ? '대단원' : `소단원 · 상위 TASK ID ${task.parentTaskId}`} · 담당 사용자 ID {task.assigneeId ?? '미배정'}</p>
                    {editing ? (
                        <form onSubmit={handleSave} className="space-y-3">
                            <div>
                                <label htmlFor="task-edit-title" className="mb-1 block text-sm font-medium text-slate-700">업무 제목 (필수, 최대 200자)</label>
                                <input id="task-edit-title" required maxLength={200} disabled={saving} value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                                <p className="mt-1 text-right text-xs text-slate-500">{title.length}/200</p>
                            </div>
                            <div>
                                <label htmlFor="task-edit-content" className="mb-1 block text-sm font-medium text-slate-700">업무 내용 (선택)</label>
                                <textarea id="task-edit-content" rows={4} disabled={saving} value={content} onChange={(e) => setContent(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                            </div>
                            {saveError && <p role="alert" className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{saveError}</p>}
                            <div className="flex gap-2">
                                <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? '저장 중...' : '수정 저장'}</button>
                                <button type="button" disabled={saving} onClick={() => { setEditing(false); setSaveError(''); setTitle(task.taskTitle ?? ''); setContent(task.taskContent ?? '') }} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm">취소</button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            <div><p className="text-xs font-medium text-slate-500">제목</p><p className="break-words font-semibold text-slate-900">{task.taskTitle}</p></div>
                            <div><p className="text-xs font-medium text-slate-500">내용</p><p className="whitespace-pre-wrap break-words text-sm text-slate-700">{task.taskContent || '등록된 내용이 없습니다.'}</p></div>
                            <div className="text-xs text-slate-500">생성일: {task.createdAt ? new Date(task.createdAt).toLocaleString('ko-KR') : '-'} · 수정일: {task.updatedAt ? new Date(task.updatedAt).toLocaleString('ko-KR') : '-'}</div>
                            {/* [4-5단계] 담당자 변경은 제목·내용 수정과 별도로 수행한다. */}
                            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                                <h4 className="text-sm font-semibold text-slate-900">담당자 관리</h4>
                                <p className="text-sm text-slate-700">현재 담당: {task.assigneeId == null ? '미배정' : `사용자 ID ${task.assigneeId}`}</p>
                                {assigneeNotice && <p role="status" className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-700">{assigneeNotice}</p>}
                                {assigneeError && <p role="alert" className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{assigneeError}</p>}

                                {isUnassigned ? (
                                    <button type="button" disabled={assigneeBusy} onClick={() => runAssigneeAction('claim')}
                                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                                        {assigneeBusy ? '처리 중...' : '내가 담당하기'}
                                    </button>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {canRelease && (
                                            <button type="button" disabled={assigneeBusy}
                                                onClick={() => runAssigneeAction('release')}
                                                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
                                                {assigneeBusy ? '처리 중...' : isMyTask ? '내 업무 내려놓기' : '담당자 강제 해제'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* LEADER/VICE_LEADER의 재배정 UI. MEMBER에게는 보이지 않는다. */}
                                {(isLeader || isVice) && (isUnassigned || canManageAssigned) && (
                                    <div className="space-y-2">
                                        <label htmlFor={`task-assignee-${taskId}`} className="block text-sm font-medium text-slate-700">새 담당자 선택</label>
                                        <div className="flex flex-wrap gap-2">
                                            <select id={`task-assignee-${taskId}`} value={newAssigneeId}
                                                onChange={(event) => setNewAssigneeId(event.target.value)}
                                                disabled={assigneeBusy}
                                                className="min-w-48 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                                                <option value="">담당자 선택</option>
                                                {candidates.filter((m) => Number(m.userId) !== Number(task.assigneeId)).map((m) => (
                                                    <option key={m.userId} value={m.userId}>
                                                        {m.nickname || m.name || `사용자 ${m.userId}`} (ID {m.userId} · {m.position})
                                                    </option>
                                                ))}
                                            </select>
                                            <button type="button"
                                                disabled={assigneeBusy || !newAssigneeId}
                                                onClick={() => runAssigneeAction('assign', Number(newAssigneeId))}
                                                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                                                담당자 배정·변경
                                            </button>
                                        </div>
                                        {candidates.length === 0 && <p className="text-xs text-slate-500">배정 가능한 ACTIVE MEMBER 또는 VICE_LEADER가 없습니다.</p>}
                                    </div>
                                )}
                                <p className="text-xs text-slate-500">사용자 역할과 ACTIVE 참여 상태는 서버에서도 검사합니다. 업무 제목·내용은 변경하지 않습니다.</p>
                            </div>
                            {/*
                              [4-6단계] 삭제 영역은 제목·내용 수정 폼과 별도로 표시한다.
                              자식이 있는 대단원 삭제는 서버에서 HTTP 409로 거부한다.
                              권한 없이 API를 직접 호출해도 백엔드에서 재검사한다.
                            */}
                            {canDeleteTask && (
                                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 space-y-2">
                                    <h4 className="text-sm font-semibold text-rose-800">업무 삭제</h4>
                                    <p className="text-xs text-rose-700">
                                        실제 DB에서 업무가 삭제됩니다. 소단원이 있는 대단원은 삭제할 수 없습니다.
                                    </p>
                                    <button type="button" onClick={handleDelete}
                                        disabled={deleting || saving || assigneeBusy}
                                        className="rounded-md border border-rose-400 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                                        {deleting ? '삭제 중...' : '업무 삭제'}
                                    </button>
                                    {deleteError && <p role="alert" className="text-sm text-rose-800">{deleteError}</p>}
                                    {remainingTasks.length > 0 && (
                                        <div className="text-sm text-rose-800">
                                            <p className="font-medium">먼저 처리해야 할 소단원:</p>
                                            <ul className="mt-1 list-disc pl-5">
                                                {remainingTasks.map((child) => (
                                                    <li key={child.taskId}>TASK {child.taskId}: {child.taskTitle}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            {canEdit ? (
                                <button type="button" onClick={() => setEditing(true)} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">제목·내용 수정</button>
                            ) : (
                                <p className="text-xs text-slate-500">대단원 수정은 ACTIVE LEADER 또는 VICE_LEADER만 가능합니다.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
