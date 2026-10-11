
package com.teamplace.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/*
 * Oracle PROJECT_TASK 테이블과 연결되는 JPA Entity.
 *
 * 프로젝트의 대단원(상위 업무)과
 * 소단원(세부 업무)을 하나의 테이블에서 관리한다.
 *
 * parentTaskId가 NULL이면 대단원,
 * 상위 업무의 taskId가 들어 있으면 소단원이다.
 *
 * Entity는 DB 컬럼을 Java 객체로 표현한다.
 * 2단계 구조 제한이나 권한 검증은
 * 이후 TaskService에서 처리한다.
 */
@Entity
@Table(name = "PROJECT_TASK")
@Getter
@Setter
@NoArgsConstructor
public class ProjectTask {

    /*
     * PROJECT_TASK의 기본키.
     *
     * Oracle SEQ_PROJECT_TASK 시퀀스 사용.
     *
     * JPA가 INSERT 전에 번호를 발급받으므로
     * PK가 NULL일 때만 동작하는 DB 트리거와
     * 충돌하지 않는다.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "project_task_seq_generator")
    @SequenceGenerator(name = "project_task_seq_generator", sequenceName = "SEQ_PROJECT_TASK", allocationSize = 1)
    @Column(name = "TASK_ID")
    private Long taskId;

    /*
     * 이 업무가 속한 프로젝트 ID.
     *
     * PROJECT.project_id를 참조한다.
     *
     * 업무 생성 요청의 URL에서 전달받은
     * projectId를 Service가 검증한 뒤 저장한다.
     */
    @Column(name = "PROJECT_ID", nullable = false)
    private Long projectId;

    /*
     * 업무 담당자의 사용자 ID.
     *
     * USERS.user_id를 참조한다.
     *
     * NULL이면 담당자가 지정되지 않은 상태다.
     *
     * 담당자는 해당 프로젝트의 ACTIVE 멤버인지
     * Service에서 검증할 예정이다.
     *
     * 담당자 ID는 조회 권한과는 별개다.
     */
    @Column(name = "ASSIGNEE_ID")
    private Long assigneeId;

    /*
     * 상위 업무 ID.
     *
     * PROJECT_TASK.task_id를 자기참조한다.
     *
     * NULL: 대단원
     * 값 존재: 해당 대단원의 소단원
     *
     * 소단원 아래 소단원을 생성하지 못하도록
     * Service에서 2단계 제한을 검사할 예정이다.
     */
    @Column(name = "PARENT_TASK_ID")
    private Long parentTaskId;

    /*
     * 업무 제목.
     *
     * DB에서 NOT NULL이며 최대 200자다.
     * 빈 제목이나 길이 초과 검사는 Service에서 처리한다.
     */
    @Column(name = "TASK_TITLE", nullable = false, length = 200)
    private String taskTitle;

    /*
     * 업무 상세 내용.
     *
     * Oracle CLOB과 연결한다.
     * NULL을 허용하므로 설명 없이 생성할 수도 있다.
     */
    @Lob
    @Column(name = "TASK_CONTENT")
    private String taskContent;

    /*
     * 업무 상태.
     *
     * TODO / IN_PROGRESS / DONE / HOLD
     *
     * 이번 담당 범위에서는 상태 변경을 구현하지 않는다.
     * 업무 최초 생성 시 TODO로 설정할 예정이다.
     */
    @Column(name = "TASK_STATUS", nullable = false, length = 20)
    private String taskStatus;

    /*
     * 업무 진행률. 0~100 범위.
     *
     * 이번 담당 범위에서는 진행률 변경이나
     * 상위 업무의 평균 진행률 계산을 구현하지 않는다.
     *
     * 최초 생성 시 0으로 설정할 예정이다.
     */
    @Column(name = "PROGRESS", nullable = false)
    private Integer progress;

    /*
     * 업무 생성 시각.
     *
     * INSERT 시 Oracle의 DEFAULT SYSTIMESTAMP를
     * 사용하도록 JPA INSERT 대상에서 제외한다.
     */
    @Column(name = "CREATED_AT", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    /*
     * 업무 마지막 수정 시각.
     *
     * 최초 INSERT에서는 Oracle 기본값을 사용한다.
     * 수정 시에는 Service에서 갱신할 예정이다.
     */
    @Column(name = "UPDATED_AT", insertable = false)
    private LocalDateTime updatedAt;
}
