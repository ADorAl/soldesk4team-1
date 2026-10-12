
package com.teamplace.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/*
 * 업무 생성 요청을 받기 위한 DTO.
 *
 * React가 Spring Boot로 보내는 JSON 데이터를
 * Java 객체로 변환해서 받는 역할을 한다.
 *
 * React에서 보내는 JSON 예시:
 *
 * {
 *   "taskTitle": "로그인 API 구현",
 *   "taskContent": "Spring Boot 로그인 기능 개발",
 *   "assigneeId": 2,
 *   "parentTaskId": 10
 * }
 *
 *           ↓
 *
 * TaskController
 *
 *           ↓
 *
 * TaskService
 *
 *           ↓
 *
 * ProjectTaskRepository
 *
 *           ↓
 *
 * Oracle PROJECT_TASK
 *
 * projectId는 요청 Body가 아니라 URL에서 받는다.
 *
 * taskId, taskStatus, progress, createdAt,
 * updatedAt은 사용자가 직접 지정하지 않는다.
 *
 * 이러한 값은 Service 또는 DB에서 관리한다.
 */
@Getter
@Setter
@NoArgsConstructor
public class TaskCreateRequest {

    /*
     * 사용자가 입력한 업무 제목.
     *
     * PROJECT_TASK.task_title에 저장된다.
     *
     * DB 기준 NOT NULL, 최대 200자.
     * 유효성 검사는 Service에서 처리한다.
     */
    private String taskTitle;

    /*
     * 업무의 상세 설명.
     *
     * PROJECT_TASK.task_content에 저장된다.
     * 입력하지 않아도 된다.
     */
    private String taskContent;

    /*
     * 업무를 담당할 사용자 ID.
     *
     * PROJECT_TASK.assignee_id에 저장된다.
     *
     * NULL이면 담당자가 지정되지 않은 상태다.
     *
     * Service에서 해당 사용자가 프로젝트의
     * ACTIVE 멤버인지 검증해야 한다.
     */
    private Long assigneeId;

    /*
     * 상위 업무의 taskId.
     *
     * NULL이면 대단원으로 생성한다.
     *
     * 값이 있으면 해당 대단원 아래에
     * 소단원으로 생성한다.
     *
     * Service에서는 다음을 검증해야 한다.
     *
     * 1. 상위 업무가 실제로 존재하는지
     * 2. 같은 프로젝트에 속하는지
     * 3. 상위 업무가 대단원인지
     *
     * 3단계 이상 중첩되는 구조는 허용하지 않는다.
     */
    private Long parentTaskId;
}
