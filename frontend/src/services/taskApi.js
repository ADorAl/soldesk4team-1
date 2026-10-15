
import { getDevUserHeaders } from '../config/devUser.js'

/*
 * ============================================================
 * 파일명: taskApi.js
 * 위치: frontend/src/services/taskApi.js
 * ============================================================
 *
 * [목적]
 * React에서 PROJECT_TASK 관련 백엔드 API를 호출한다.
 *
 * [기존 코드와의 호환성]
 * 1. projectApi.js처럼 fetch()와 /api 상대 경로 사용
 * 2. devUser.js의 개발용 사용자 헤더 적용
 * 3. TASK 권한 검사는 기존 TaskService에서 처리
 * 4. DB, 프로젝트 API, 멤버 API는 수정하지 않음
 *
 * [UTF-8]
 * - 파일은 UTF-8로 저장한다.
 * - JSON 요청에 charset=UTF-8을 명시한다.
 * - 한글 제목과 내용을 JSON.stringify()로 전송한다.
 *
 * [주의]
 * 업무 상태(taskStatus)와 진행률(progress)은
 * 이번 담당 기능에 포함하지 않는다.
 * ============================================================
 */

// 프로젝트 API의 기본 주소
const PROJECT_API_URL = '/api/projects'

/*
 * 프로젝트 ID와 업무 ID의 유효성을 확인한다.
 * 숫자가 아니거나 0 이하이면 요청을 보내지 않는다.
 */
function requireId(value, label) {
    const id = Number(value)

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error(`올바른 ${label}가 아닙니다.`)
    }

    return id
}

/*
 * 프로젝트 전체 업무 목록 API 주소 생성
 *
 * 예시:
 * tasksUrl(12)
 * → /api/projects/12/tasks
 */
function tasksUrl(projectId) {
    return `${PROJECT_API_URL}/${requireId(projectId, '프로젝트 ID')}/tasks`
}

/*
 * 개별 업무 API 주소 생성
 *
 * 예시:
 * taskUrl(12, 19)
 * → /api/projects/12/tasks/19
 */
function taskUrl(projectId, taskId) {
    return `${tasksUrl(projectId)}/${requireId(taskId, '업무 ID')}`
}

/*
 * ============================================================
 * 공통 HTTP 요청 함수
 * ============================================================
 *
 * 모든 TASK API에서 공통으로 사용한다.
 *
 * [주요 역할]
 * 1. fetch()로 백엔드에 HTTP 요청
 * 2. devUser.js에서 개발용 사용자 헤더 가져오기
 * 3. 요청 데이터가 있으면 JSON으로 변환
 * 4. 응답 JSON 파싱
 * 5. 백엔드 오류 메시지 처리
 *
 * [중요]
 * fetch()는 HTTP 400, 409, 500이 발생해도
 * 자동으로 JavaScript 예외를 발생시키지 않는다.
 *
 * 따라서 response.ok를 검사하여
 * 오류를 직접 발생시켜야 한다.
 *
 * [DELETE]
 * 삭제 성공 시 HTTP 204는 응답 본문이 없다.
 *
 * [409]
 * 하위 업무가 있어 삭제할 수 없는 경우
 * remainingTasks 정보를 보존한다.
 */
async function requestTask(
    url,
    { method = 'GET', body, action = '업무 요청' } = {}
) {
    // 전송할 JSON 본문이 있는지 확인한다.
    const hasBody = body !== undefined

    // 백엔드에 HTTP 요청을 전송한다.
    const response = await fetch(url, {
        method,

        headers: {
            Accept: 'application/json',

            // JSON 본문이 있는 경우 UTF-8 명시
            ...(hasBody
                ? { 'Content-Type': 'application/json; charset=UTF-8' }
                : {}),

            // 개발용 사용자 전환 헤더
            // 예: X-Dev-User-Id: 1
            ...getDevUserHeaders(),
        },

        // 본문이 있는 경우만 JSON으로 변환
        ...(hasBody
            ? { body: JSON.stringify(body) }
            : {}),
    })

    // DELETE 성공 등 HTTP 204 응답 처리
    if (response.status === 204) {
        return null
    }

    // 오류 본문이 JSON이 아니어도 처리할 수 있도록 한다.
    const responseData = await response.json().catch(() => null)

    // HTTP 오류 여부 검사
    if (!response.ok) {
        const serverMessage = responseData?.message

        const error = new Error(
            typeof serverMessage === 'string' && serverMessage.trim()
                ? serverMessage
                : `${action} 실패 (HTTP ${response.status})`
        )

        // 추후 UI에서 사용할 HTTP 상태 코드
        error.status = response.status

        // 하위 업무 삭제 제한 시 사용할 정보
        error.remainingTasks = responseData?.remainingTasks ?? []

        throw error
    }

    // 정상적인 JSON 응답 반환
    return responseData
}

/*
 * ============================================================
 * 1. 업무 목록 조회
 * ============================================================
 *
 * GET /api/projects/{projectId}/tasks
 *
 * 프로젝트에 속한 대단원과 소단원을 모두 조회한다.
 *
 * 대단원:
 * parentTaskId === null
 *
 * 소단원:
 * parentTaskId === 대단원 taskId
 *
 * ACTIVE 멤버 여부는 백엔드에서 검증한다.
 */
export async function getTasks(projectId) {
    const tasks = await requestTask(tasksUrl(projectId), {
        action: '업무 목록 조회',
    })

    // 목록 응답은 배열이어야 한다.
    if (!Array.isArray(tasks)) {
        throw new Error('업무 목록 응답이 배열 형식이 아닙니다.')
    }

    return tasks
}

/*
 * ============================================================
 * 2. 업무 상세 조회
 * ============================================================
 *
 * GET /api/projects/{projectId}/tasks/{taskId}
 *
 * 특정 업무의 상세 정보를 조회한다.
 */
export async function getTaskDetail(projectId, taskId) {
    const id = requireId(taskId, '업무 ID')

    const task = await requestTask(taskUrl(projectId, id), {
        action: '업무 상세 조회',
    })

    // 요청한 업무 ID와 응답 ID 비교
    if (!task || Number(task.taskId) !== id) {
        throw new Error('업무 상세 응답 형식이 올바르지 않습니다.')
    }

    return task
}

/*
 * ============================================================
 * 3. 대단원 / 소단원 생성
 * ============================================================
 *
 * POST /api/projects/{projectId}/tasks
 *
 * [요청 데이터]
 * taskTitle
 * taskContent
 * parentTaskId
 *
 * 대단원 생성:
 * parentTaskId = null
 *
 * 소단원 생성:
 * parentTaskId = 대단원 ID
 *
 * [중요]
 * assigneeId를 요청에 포함하지 않는다.
 *
 * 현재 백엔드는 생성자를 자동 담당자로 등록한다.
 */
export async function createTask(projectId, taskData) {
    const taskTitle = taskData?.taskTitle?.trim()

    // 업무 제목은 1~200자
    if (!taskTitle || taskTitle.length > 200) {
        throw new Error('업무 제목은 1~200자로 입력해 주세요.')
    }

    // 상위 업무 ID가 없으면 대단원 생성
    const parentTaskId = taskData?.parentTaskId == null
        ? null
        : requireId(taskData.parentTaskId, '상위 업무 ID')

    const task = await requestTask(tasksUrl(projectId), {
        method: 'POST',

        body: {
            taskTitle,
            taskContent: taskData?.taskContent ?? null,
            parentTaskId,
        },

        action: '업무 생성',
    })

    // 생성 성공 응답에 taskId가 있는지 확인
    if (task?.taskId == null) {
        throw new Error(
            '업무 생성 응답에 taskId가 없습니다. 목록을 확인해 주세요.'
        )
    }

    return task
}

/*
 * ============================================================
 * 4. 업무 제목 / 내용 수정
 * ============================================================
 *
 * PUT /api/projects/{projectId}/tasks/{taskId}
 *
 * 대단원:
 * LEADER / VICE_LEADER만 수정 가능
 *
 * 소단원:
 * 모든 ACTIVE 멤버 수정 가능
 *
 * 담당자 변경 권한과 내용 수정 권한은 별도이다.
 *
 * 담당자, 상태, 진행률은 전송하지 않는다.
 */
export async function updateTask(projectId, taskId, taskData) {
    const taskTitle = taskData?.taskTitle?.trim()

    if (!taskTitle || taskTitle.length > 200) {
        throw new Error('업무 제목은 1~200자로 입력해 주세요.')
    }

    return requestTask(taskUrl(projectId, taskId), {
        method: 'PUT',

        body: {
            taskTitle,
            taskContent: taskData?.taskContent ?? null,
        },

        action: '업무 수정',
    })
}

/*
 * ============================================================
 * 5. 업무 삭제
 * ============================================================
 *
 * DELETE /api/projects/{projectId}/tasks/{taskId}
 *
 * 기존 백엔드의 삭제 권한 정책을 유지한다.
 *
 * 하위 소단원이 있는 대단원은 삭제할 수 없다.
 * 이 경우 HTTP 409 오류가 발생할 수 있다.
 *
 * 실제 DB 데이터를 삭제하는 API이므로
 * 추후 UI에서 삭제 확인창을 표시해야 한다.
 *
 * 성공 시 null 반환 (HTTP 204)
 */
export async function deleteTask(projectId, taskId) {
    return requestTask(taskUrl(projectId, taskId), {
        method: 'DELETE',
        action: '업무 삭제',
    })
}

/*
 * ============================================================
 * 6. 담당자 배정 / 변경
 * ============================================================
 *
 * PATCH /api/projects/{projectId}/tasks/{taskId}/assignee
 *
 * 요청:
 * { assigneeId: 사용자ID }
 *
 * LEADER:
 * 다른 사람의 담당 업무 변경 가능
 *
 * VICE_LEADER:
 * LEADER 담당 업무를 제외하고 변경 가능
 *
 * MEMBER:
 * 다른 사람에게 직접 재배정 불가
 *
 * 배정 대상과 요청자 권한은 TaskService에서 검사한다.
 */
export async function updateTaskAssignee(
    projectId,
    taskId,
    assigneeId
) {
    // null로 해제하려면 releaseTask()를 사용한다.
    if (assigneeId == null) {
        throw new Error(
            '담당자 배정에는 사용자 ID가 필요합니다. 내려놓기는 releaseTask를 사용하세요.'
        )
    }

    const id = requireId(assigneeId, '담당자 ID')

    return requestTask(`${taskUrl(projectId, taskId)}/assignee`, {
        method: 'PATCH',

        body: {
            assigneeId: id,
        },

        action: '담당자 변경',
    })
}

/*
 * ============================================================
 * 7. 담당 업무 내려놓기
 * ============================================================
 *
 * PATCH /api/projects/{projectId}/tasks/{taskId}/assignee
 *
 * 요청:
 * { assigneeId: null }
 *
 * MEMBER:
 * 자신이 담당한 업무만 내려놓기 가능
 *
 * VICE_LEADER / LEADER:
 * 기존 TaskService 권한 정책에 따라 해제 가능
 *
 * 주의:
 * DELETE 요청이 아니다.
 * 업무는 남아 있고 담당자만 NULL로 변경된다.
 */
export async function releaseTask(projectId, taskId) {
    return requestTask(`${taskUrl(projectId, taskId)}/assignee`, {
        method: 'PATCH',

        body: {
            assigneeId: null,
        },

        action: '담당 업무 내려놓기',
    })
}

/*
 * ============================================================
 * 8. 내가 담당하기
 * ============================================================
 *
 * POST /api/projects/{projectId}/tasks/{taskId}/claim
 *
 * 별도의 JSON 본문은 보내지 않는다.
 *
 * 미배정 상태인 업무를 ACTIVE 멤버가 가져올 수 있다.
 *
 * 이미 담당자가 지정된 업무는
 * 백엔드에서 요청을 차단한다.
 */
export async function claimTask(projectId, taskId) {
    return requestTask(`${taskUrl(projectId, taskId)}/claim`, {
        method: 'POST',
        action: '내가 담당하기',
    })
}
