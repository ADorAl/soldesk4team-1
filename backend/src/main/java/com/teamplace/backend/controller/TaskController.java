
package com.teamplace.backend.controller;

import com.teamplace.backend.dto.TaskCreateRequest;
import com.teamplace.backend.dto.TaskResponse;
import com.teamplace.backend.dto.TaskUpdateRequest;
import com.teamplace.backend.entity.ProjectTask;
import com.teamplace.backend.service.TaskService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.teamplace.backend.dto.TaskAssigneeUpdateRequest;

/*
 * PROJECT_TASK 관련 REST API의 진입점.
 *
 * React 또는 PowerShell이 업무 생성 요청을 보내면
 * 이 Controller가 요청을 받아 TaskService에 전달한다.
 *
 * 데이터 흐름:
 *
 * React / PowerShell
 *     ↓ HTTP POST 요청
 * TaskController
 *     ↓ projectId + TaskCreateRequest
 * TaskService
 *     ↓ 권한 및 업무 구조 검증
 * ProjectTaskRepository
 *     ↓
 * Oracle PROJECT_TASK
 *
 * 응답 흐름:
 *
 * ProjectTask Entity
 *     ↓
 * TaskResponse DTO
 *     ↓
 * TaskController
 *     ↓ JSON
 * React / PowerShell
 *
 * Controller에서는 DB에 직접 접근하거나
 * 프로젝트 참여 권한을 검증하지 않는다.
 *
 * 업무 관련 검증은 TaskService가 담당한다.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/tasks")
public class TaskController {

    private final TaskService taskService;

    /*
     * Spring이 TaskService 객체를 생성자에 주입한다.
     *
     * 기존 ProjectController와 동일한 방식이다.
     */
    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    /*
     * 새로운 대단원 또는 소단원을 생성하는 API.
     *
     * 요청 주소:
     *
     * POST /api/projects/{projectId}/tasks
     *
     * 예시:
     * POST /api/projects/1/tasks
     *
     * @PathVariable:
     * URL의 projectId를 Long으로 받는다.
     *
     * @RequestBody:
     * JSON 요청 데이터를 TaskCreateRequest로 변환한다.
     *
     * @ResponseStatus:
     * 생성 성공 시 HTTP 201 Created를 반환한다.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse createTask(
            @PathVariable Long projectId,
            @RequestBody TaskCreateRequest request) {

        /*
         * URL에서 받은 projectId와
         * JSON에서 받은 request를 Service에 전달한다.
         *
         * Service에서는:
         *
         * 1. 프로젝트 존재 여부
         * 2. 현재 사용자 ACTIVE 멤버 여부
         * 3. 업무 제목
         * 4. 대단원 / 소단원 구조
         * 5. 생성자를 최초 담당자로 자동 지정
         *
         * 등을 검증하고 DB에 저장한다.
         */
        ProjectTask savedTask = taskService.createTask(projectId, request);

        /*
         * Service가 반환한 Entity를
         * 응답 전용 TaskResponse DTO로 변환한다.
         *
         * Spring이 TaskResponse를 JSON으로
         * 직렬화해 요청한 사용자에게 전달한다.
         */
        return new TaskResponse(savedTask);
    }

    /*
     * 특정 프로젝트의 전체 업무 목록 조회.
     *
     * 요청:
     * GET /api/projects/{projectId}/tasks
     *
     * 예시:
     * GET /api/projects/1/tasks
     *
     * Controller는 URL의 projectId를 받아
     * TaskService에 전달한다.
     *
     * TaskService에서는:
     * 1. 프로젝트 존재 여부 확인
     * 2. DELETED 프로젝트 차단
     * 3. 현재 사용자의 ACTIVE 멤버 여부 확인
     * 4. 해당 프로젝트의 대단원/소단원 전체 조회
     *
     * 조회 결과는 Entity를 직접 반환하지 않고
     * TaskResponse DTO로 변환해서 반환한다.
     */
    @GetMapping
    public List<TaskResponse> getTasks(
            @PathVariable Long projectId) {

        /*
         * Service에서 조회한 ProjectTask 목록을
         * TaskResponse 목록으로 변환한다.
         *
         * 업무 담당자가 누구인지와 관계없이
         * 프로젝트 ACTIVE 멤버라면 조회할 수 있다.
         */
        return taskService.getTasks(projectId)
                .stream()
                .map(TaskResponse::new)
                .toList();
    }

    /*
     * 특정 업무 하나를 상세 조회하는 API.
     *
     * 요청:
     * GET /api/projects/{projectId}/tasks/{taskId}
     *
     * 예시:
     * GET /api/projects/1/tasks/5
     *
     * @PathVariable:
     * URL에 포함된 projectId와 taskId를 전달받는다.
     *
     * Controller는 요청을 Service로 전달하고,
     * DB 조회나 권한 검증을 직접 수행하지 않는다.
     */
    @GetMapping("/{taskId}")
    public TaskResponse getTask(
            @PathVariable Long projectId,
            @PathVariable Long taskId) {

        /*
         * Service에서 다음 항목을 검증한다.
         *
         * 1. 프로젝트 존재 여부
         * 2. 프로젝트가 DELETED 상태인지
         * 3. 현재 사용자가 ACTIVE 멤버인지
         * 4. 업무가 실제로 존재하는지
         * 5. 해당 업무가 요청한 프로젝트에 속하는지
         *
         * assigneeId는 조회 권한 판단에 사용하지 않는다.
         */
        ProjectTask task = taskService.getTask(projectId, taskId);

        /*
         * 조회한 Entity를 응답 DTO로 변환한다.
         *
         * DB Entity를 직접 반환하지 않고
         * TaskResponse에서 정의한 필드만 JSON으로 반환한다.
         */
        return new TaskResponse(task);
    }

    /*
     * 기존 업무의 제목과 내용을 수정하는 API.
     *
     * 요청:
     * PUT /api/projects/{projectId}/tasks/{taskId}
     *
     * 예시:
     * PUT /api/projects/1/tasks/5
     *
     * URL:
     * - projectId: 업무가 속한 프로젝트 ID
     * - taskId: 수정할 업무 ID
     *
     * Body:
     * - taskTitle: 수정할 업무 제목
     * - taskContent: 수정할 상세 내용
     *
     * Controller는 HTTP 요청을 받아 Service로 전달한다.
     * 업무 수정 권한 검증과 DB 저장은 TaskService가 담당한다.
     *
     * 담당자 변경, 업무 상태, 진행률 변경은
     * 이 API에서 처리하지 않는다.
     */
    @PutMapping("/{taskId}")
    public TaskResponse updateTask(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @RequestBody TaskUpdateRequest request) {

        /*
         * TaskService에서 검증하는 내용:
         *
         * 1. 프로젝트가 존재하고 DELETED 상태가 아닌지
         * 2. 현재 사용자가 프로젝트 ACTIVE 멤버인지
         * 3. 수정할 업무가 존재하는지
         * 4. 업무가 요청한 프로젝트에 속하는지
         * 5. LEADER/VICE_LEADER 또는 현재 담당자인지
         * 6. 제목이 비어 있거나 200자를 초과하지 않는지
         *
         * 검증이 통과하면 TASK_TITLE, TASK_CONTENT,
         * UPDATED_AT을 변경한다.
         */
        ProjectTask updatedTask = taskService.updateTask(projectId, taskId, request);

        /*
         * 수정된 ProjectTask Entity를 TaskResponse로 변환한다.
         *
         * Entity를 외부에 직접 반환하지 않고
         * 필요한 업무 정보만 JSON으로 응답한다.
         */
        return new TaskResponse(updatedTask);
    }

    /*
     * 업무 담당자 변경 및 업무 내려놓기 API.
     *
     * 요청:
     * PATCH /api/projects/{projectId}/tasks/{taskId}/assignee
     *
     * 예시:
     * PATCH /api/projects/1/tasks/7/assignee
     *
     * 요청 Body 예시:
     *
     * 담당자를 USER_ID 1로 변경:
     * { "assigneeId": 1 }
     *
     * 담당자를 미배정으로 변경:
     * { "assigneeId": null }
     *
     * URL의 projectId, taskId는 @PathVariable로 받는다.
     * Body의 assigneeId는 TaskAssigneeUpdateRequest로 받는다.
     *
     * Controller에서는 권한을 직접 판단하지 않는다.
     * 모든 권한 검증과 DB 저장은 TaskService에서 수행한다.
     */
    @PatchMapping("/{taskId}/assignee")
    public TaskResponse updateTaskAssignee(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @RequestBody TaskAssigneeUpdateRequest request) {

        /*
         * Service에서는 다음 항목을 검증한다.
         *
         * 1. 프로젝트 존재 여부 및 DELETED 상태
         * 2. 요청자가 해당 프로젝트의 ACTIVE 멤버인지
         * 3. 업무 존재 여부 및 프로젝트 소속
         * 4. LEADER/VICE_LEADER 또는 현재 담당자인지
         * 5. 새 담당자가 프로젝트의 ACTIVE 멤버인지
         * 6. 기존 담당자와 새 담당자가 다른지
         *
         * 모든 검증을 통과하면 ASSIGNEE_ID와
         * UPDATED_AT을 변경한다.
         */
        ProjectTask updatedTask = taskService.updateTaskAssignee(
                projectId,
                taskId,
                request);

        /*
         * 저장된 Entity를 응답 DTO로 변환한다.
         *
         * 새로운 담당자, 업무 제목, 상위 업무,
         * 수정 시각 등을 JSON으로 반환한다.
         */
        return new TaskResponse(updatedTask);
    }

    /*
     * 미배정 업무를 현재 사용자가 직접 가져오는 API.
     *
     * 요청:
     * POST /api/projects/{projectId}/tasks/{taskId}/claim
     *
     * 예시:
     * POST /api/projects/1/tasks/7/claim
     *
     * 요청 Body는 필요하지 않다.
     *
     * Controller는 URL의 projectId와 taskId를
     * TaskService에 전달하는 역할만 수행한다.
     *
     * 현재 사용자의 ID와 권한은
     * TaskService에서 확인한다.
     */
    @PostMapping("/{taskId}/claim")
    public TaskResponse claimTask(
            @PathVariable Long projectId,
            @PathVariable Long taskId) {

        /*
         * Service에서 다음 사항을 검증한다.
         *
         * 1. 프로젝트 존재 여부 및 DELETED 상태
         * 2. 현재 사용자의 프로젝트 ACTIVE 참여 여부
         * 3. 업무 존재 여부 및 프로젝트 소속
         * 4. 업무가 현재 미배정 상태인지
         *
         * Repository의 조건부 UPDATE를 통해
         * ASSIGNEE_ID가 NULL인 경우에만
         * 현재 사용자를 담당자로 설정한다.
         */
        ProjectTask claimedTask = taskService.claimTask(projectId, taskId);

        /*
         * 실제 DB에 저장된 결과를
         * TaskResponse DTO로 변환하여 반환한다.
         *
         * 업무 ID, 담당자 ID, 수정 시각 등을
         * JSON 응답에서 확인할 수 있다.
         */
        return new TaskResponse(claimedTask);
    }

    /*
     * 기존 대단원 또는 소단원을 실제 삭제하는 API.
     *
     * 요청:
     * DELETE /api/projects/{projectId}/tasks/{taskId}
     *
     * 예시:
     * DELETE /api/projects/1/tasks/7
     *
     * URL:
     * - projectId: 업무가 속한 프로젝트 ID
     * - taskId: 삭제할 업무 ID
     *
     * 요청 Body는 필요하지 않다.
     *
     * Controller에서는 삭제 권한이나
     * 하위 소단원 존재 여부를 직접 검사하지 않는다.
     *
     * 모든 검증과 DB 삭제는 TaskService가 담당한다.
     */
    @DeleteMapping("/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(
            @PathVariable Long projectId,
            @PathVariable Long taskId) {

        /*
         * TaskService에서 확인하는 항목:
         *
         * 1. 프로젝트 존재 여부 및 DELETED 상태
         * 2. 현재 사용자의 ACTIVE 참여 여부
         * 3. 삭제할 업무의 존재 여부
         * 4. 업무의 프로젝트 소속
         * 5. LEADER / VICE_LEADER 또는 현재 담당자 여부
         * 6. 삭제되지 않은 소단원 존재 여부
         *
         * 소단원이 남아 있으면:
         * TaskDeletionBlockedException 발생
         * → GlobalExceptionHandler
         * → HTTP 409 + remainingTasks 반환
         *
         * 소단원이 없고 삭제 권한이 있다면:
         * 실제 Oracle DELETE 실행
         * → HTTP 204 No Content 반환
         */
        taskService.deleteTask(projectId, taskId);
    }

}
