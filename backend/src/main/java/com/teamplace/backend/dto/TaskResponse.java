
package com.teamplace.backend.dto;

import com.teamplace.backend.entity.ProjectTask;
import lombok.Getter;

import java.time.LocalDateTime;

/*
 * PROJECT_TASK의 업무 정보를
 * 프론트엔드에 반환하기 위한 응답 DTO.
 *
 * Entity를 그대로 반환하지 않고
 * 외부에 제공할 값만 선택해서 전달한다.
 *
 * TaskController
 *     → TaskService
 *     → ProjectTaskRepository
 *     → Oracle PROJECT_TASK
 *
 * DB 조회/저장 결과로 얻은 ProjectTask를
 * TaskResponse로 변환해 React에 반환한다.
 */
@Getter
public class TaskResponse {

    // DB에서 발급된 업무 고유 번호
    private final Long taskId;

    // 업무가 속한 프로젝트 번호
    private final Long projectId;

    // 업무 담당 사용자 ID (미배정이면 null)
    private final Long assigneeId;

    /*
     * 상위 업무 ID.
     *
     * null이면 대단원,
     * 값이 있으면 해당 대단원의 소단원이다.
     */
    private final Long parentTaskId;

    // 업무 제목 및 상세 내용
    private final String taskTitle;
    private final String taskContent;

    /*
     * 상태와 진행률.
     *
     * 이번 담당 범위에서는 변경 기능을
     * 구현하지 않지만 응답 정보로는 제공한다.
     */
    private final String taskStatus;
    private final Integer progress;

    // 업무 생성 및 최종 수정 시각
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    /*
     * ProjectTask Entity를 응답 DTO로 변환한다.
     *
     * Controller가 Entity의 DB 매핑 구조에
     * 직접 의존하지 않도록 분리한다.
     */
    public TaskResponse(ProjectTask task) {
        this.taskId = task.getTaskId();
        this.projectId = task.getProjectId();
        this.assigneeId = task.getAssigneeId();
        this.parentTaskId = task.getParentTaskId();
        this.taskTitle = task.getTaskTitle();
        this.taskContent = task.getTaskContent();
        this.taskStatus = task.getTaskStatus();
        this.progress = task.getProgress();
        this.createdAt = task.getCreatedAt();
        this.updatedAt = task.getUpdatedAt();
    }
}
