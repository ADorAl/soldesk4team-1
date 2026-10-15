import { useState } from 'react'
import { createTask } from '../services/taskApi.js'

/*
 * [4-3단계] PROJECT_TASK 생성 폼
 * - parentTaskId === null: 대단원 생성
 * - parentTaskId가 숫자: 해당 대단원 아래 소단원 생성
 * - 기존 TaskCreateRequest와 동일한 JSON만 전송한다.
 * - assigneeId, taskStatus, progress는 이 폼에서 보내지 않는다.
 * - 생성자 자동 담당 및 ACTIVE 참여 권한 검사는 백엔드 TaskService에서 처리한다.
 *
 * Props:
 * projectId: 업무가 속한 프로젝트 ID
 * parentTaskId: 상위 대단원 ID. 대단원 생성 시 null
 * parentTitle: 소단원 생성 폼에 상위 업무 제목을 안내할 때 사용
 * onCreated: 생성 성공 후 목록을 다시 조회하도록 부모 컴포넌트에 통지
 * onCancel: 취소 버튼을 눌렀을 때 폼을 닫는 함수
 */
export default function ProjectTaskCreateForm({
    projectId,
    parentTaskId = null,
    parentTitle = '',
    onCreated,
    onCancel,
}) {
    const [taskTitle, setTaskTitle] = useState('')
    const [taskContent, setTaskContent] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const isChild = parentTaskId != null

    async function handleSubmit(event) {
        event.preventDefault()
        if (saving) return // 빠른 연속 클릭에 따른 중복 생성 방지

        const trimmedTitle = taskTitle.trim()
        if (!trimmedTitle || trimmedTitle.length > 200) {
            setError('업무 제목은 공백을 제외하고 1~200자로 입력해 주세요.')
            return
        }

        setSaving(true)
        setError('')
        try {
            // taskApi.js가 UTF-8 JSON 요청과 X-Dev-User-Id 헤더를 처리한다.
            // 실제 저장은 Service -> Repository -> Oracle PROJECT_TASK 순서로 수행된다.
            const createdTask = await createTask(projectId, {
                taskTitle: trimmedTitle,
                taskContent: taskContent || null,
                parentTaskId: isChild ? parentTaskId : null,
            })
            onCreated?.(createdTask)
        } catch (err) {
            // 실패하면 작성 중인 제목과 내용은 남겨 두어 다시 제출할 수 있게 한다.
            setError(err instanceof Error ? err.message : '업무 생성 중 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-sky-200 bg-sky-50 p-4" aria-label={isChild ? '소단원 생성' : '대단원 생성'}>
            <div>
                <h3 className="font-semibold text-slate-800">{isChild ? '소단원 추가' : '대단원 추가'}</h3>
                {isChild && (
                    <p className="mt-1 text-xs text-slate-600">상위 대단원: {parentTitle || `TASK ID ${parentTaskId}`}</p>
                )}
                <p className="mt-1 text-xs text-slate-600">새 업무의 담당자는 생성한 사용자로 자동 지정됩니다.</p>
            </div>
            <div>
                <label htmlFor="task-create-title" className="mb-1 block text-sm font-medium text-slate-700">업무 제목 (필수, 최대 200자)</label>
                <input
                    id="task-create-title"
                    autoFocus
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    maxLength={200}
                    required
                    disabled={saving}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-60"
                    placeholder={isChild ? '예: 회원가입 화면 구현' : '예: 회원 관리 기능'}
                />
                <p className="mt-1 text-right text-xs text-slate-500">{taskTitle.length}/200</p>
            </div>
            <div>
                <label htmlFor="task-create-content" className="mb-1 block text-sm font-medium text-slate-700">업무 내용 (선택)</label>
                <textarea
                    id="task-create-content"
                    rows={4}
                    value={taskContent}
                    onChange={(event) => setTaskContent(event.target.value)}
                    disabled={saving}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-60"
                    placeholder="필요한 작업 내용을 입력해 주세요."
                />
            </div>
            {error && <p role="alert" className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? '저장 중...' : isChild ? '소단원 저장' : '대단원 저장'}
                </button>
                <button type="button" onClick={onCancel} disabled={saving} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60">취소</button>
            </div>
        </form>
    )
}
