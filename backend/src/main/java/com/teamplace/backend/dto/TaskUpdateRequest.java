
package com.teamplace.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/*
 * PROJECT_TASK 업무 제목과 내용 수정 요청 DTO.
 *
 * React에서 수정한 업무 정보를 JSON으로 보내면
 * Controller가 이 DTO로 변환하여 받는다.
 *
 * 요청 예시:
 *
 * PUT /api/projects/1/tasks/5
 *
 * {
 *   "taskTitle": "로그인 화면 개발 수정",
 *   "taskContent": "React 로그인 화면 및 입력 검증 구현"
 * }
 *
 * projectId와 taskId는 URL에서 전달받는다.
 *
 * 담당자 변경은 별도의 API에서 처리하므로
 * assigneeId를 이 DTO에 포함하지 않는다.
 *
 * taskStatus와 progress도 이번 수정 범위에서
 * 제외하므로 입력받지 않는다.
 *
 * 실제 수정 권한 검증은 TaskService에서 처리한다.
 */
@Getter
@Setter
@NoArgsConstructor
public class TaskUpdateRequest {

    /*
     * 수정할 업무 제목.
     *
     * PROJECT_TASK.task_title에 반영한다.
     *
     * DB 기준:
     * NOT NULL
     * VARCHAR2(200)
     *
     * 제목 누락, 공백 및 길이 초과 여부는
     * TaskService에서 검증한다.
     */
    private String taskTitle;

    /*
     * 수정할 업무 상세 내용.
     *
     * PROJECT_TASK.task_content에 반영한다.
     *
     * Oracle CLOB 컬럼이며 NULL을 허용한다.
     * 따라서 상세 내용 없이 제목만 있는
     * 업무도 저장할 수 있다.
     */
    private String taskContent;
}
