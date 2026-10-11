
package com.teamplace.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/*
 * PROJECT_TASK 담당자 변경 요청 DTO.
 *
 * React에서 담당자 변경 또는 업무 내려놓기를
 * 요청할 때 전달하는 데이터를 받는다.
 *
 * 요청 예시:
 *
 * PATCH /api/projects/1/tasks/7/assignee
 *
 * 담당자를 USER_ID = 1로 변경:
 * {
 *   "assigneeId": 1
 * }
 *
 * 담당자를 미배정으로 변경:
 * {
 *   "assigneeId": null
 * }
 *
 * projectId와 taskId는 URL에서 전달받는다.
 *
 * 요청자가 업무 담당자를 변경할 권한이 있는지,
 * 새 담당자가 프로젝트의 ACTIVE 멤버인지는
 * 이후 TaskService에서 검증한다.
 *
 * 미배정 업무를 스스로 가져오는 기능은
 * 별도의 claim API에서 구현한다.
 */
@Getter
@Setter
@NoArgsConstructor
public class TaskAssigneeUpdateRequest {

    /*
     * 변경할 담당자의 USER_ID.
     *
     * PROJECT_TASK.assignee_id에 저장된다.
     *
     * null:
     * 담당자 미배정(업무 내려놓기)
     *
     * 숫자:
     * 해당 사용자에게 업무 배정
     *
     * NULL을 허용하는 것은 기존 Oracle
     * PROJECT_TASK DDL 정책과 일치한다.
     *
     * 실제 담당자 변경 권한과 새 담당자의
     * ACTIVE 여부는 TaskService에서 검증한다.
     */
    private Long assigneeId;
}
