
package com.teamplace.backend.repository;

import com.teamplace.backend.entity.ProjectTask;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/*
 * PROJECT_TASK 테이블에 접근하는 Repository.
 *
 * ProjectTask Entity를 기준으로
 * 업무 저장, 조회, 수정, 삭제에 필요한
 * 기본 DB 접근 기능을 제공한다.
 *
 * 권한 검증과 대단원/소단원 구조 검증은
 * Repository가 아니라 Service에서 처리한다.
 */
public interface ProjectTaskRepository
        extends JpaRepository<ProjectTask, Long> {

    /*
     * 특정 프로젝트에 속한 모든 업무 조회.
     *
     * projectId는 Service에서 전달받는다.
     *
     * PROJECT_TASK.project_id가 일치하는
     * 업무들을 taskId 오름차순으로 반환한다.
     *
     * 대단원과 소단원이 모두 포함된다.
     *
     * 실제 사용자에게 반환하기 전에
     * Service에서 프로젝트 ACTIVE 멤버인지
     * 확인해야 한다.
     */
    List<ProjectTask> findByProjectIdOrderByTaskIdAsc(
            Long projectId);

    /*
     * 특정 프로젝트의 대단원만 조회.
     *
     * parentTaskId가 NULL인 업무만 가져온다.
     *
     * 소단원은 이 조회 결과에 포함되지 않는다.
     */
    List<ProjectTask> findByProjectIdAndParentTaskIdIsNullOrderByTaskIdAsc(
            Long projectId);

    /*
     * 특정 대단원에 속한 소단원 목록 조회.
     *
     * projectId : 업무가 속한 프로젝트
     * parentTaskId : 소단원들이 참조하는 대단원 ID
     *
     * Service에서 대단원이 실제로 존재하는지
     * 확인한 후 사용한다.
     */
    List<ProjectTask> findByProjectIdAndParentTaskIdOrderByTaskIdAsc(
            Long projectId,
            Long parentTaskId);

    /*
     * 미배정 업무를 현재 사용자에게 배정한다.
     *
     * 내가 담당하기(claim) 기능에서 사용한다.
     *
     * 조건:
     * - 요청한 프로젝트에 속한 업무
     * - 현재 담당자가 NULL인 업무
     *
     * UPDATE 실행 시점에도 ASSIGNEE_ID가 NULL이어야
     * 변경되므로, 동시에 여러 사용자가 요청하더라도
     * 같은 업무를 중복으로 가져가는 것을 방지한다.
     *
     * 반환값:
     * 1 = 담당자 배정 성공
     * 0 = 조건을 만족하는 업무 없음
     *
     * 사용자 ACTIVE 여부와 프로젝트 권한 검증은
     * TaskService에서 먼저 처리한다.
     */
    @Modifying
    @Query(value = """
            UPDATE PROJECT_TASK
               SET ASSIGNEE_ID = :userId,
                   UPDATED_AT = SYSTIMESTAMP
             WHERE TASK_ID = :taskId
               AND PROJECT_ID = :projectId
               AND ASSIGNEE_ID IS NULL
            """, nativeQuery = true)
    int claimUnassignedTask(
            @Param("projectId") Long projectId,
            @Param("taskId") Long taskId,
            @Param("userId") Long userId);

    /*
     * 업무 수정 시 사용할 비관적 쓰기 잠금 조회.
     *
     * 일반 findById()와 달리
     * 업무를 조회하면서 DB 행에 쓰기 잠금을 요청한다.
     *
     * PESSIMISTIC_WRITE:
     * 다른 트랜잭션이 같은 업무 행을 잠금 수정하려면
     * 현재 트랜잭션이 종료될 때까지 기다리게 된다.
     *
     * Oracle에서는 일반적으로 SELECT FOR UPDATE에
     * 해당하는 잠금 SQL이 사용된다.
     *
     * 반드시 @Transactional이 적용된
     * Service 메서드 안에서 호출해야 한다.
     *
     * 사용 중:
     * - updateTask(): 제목과 내용 수정
     * - updateTaskAssignee(): 담당자 변경 및 내려놓기
     * - claimTask(): 미배정 업무 가져오기
     *
     * 삭제 기능 구현 시에도 잠금 조회를 재사용할 예정이다.
     *
     * GET 조회에서는 불필요한 잠금을 사용하지 않는다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT t
              FROM ProjectTask t
             WHERE t.taskId = :taskId
            """)
    Optional<ProjectTask> findByIdForUpdate(
            @Param("taskId") Long taskId);

}
