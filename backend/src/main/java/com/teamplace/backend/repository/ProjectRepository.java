package com.teamplace.backend.repository;

import com.teamplace.backend.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/*
 * PROJECT 테이블에 접근하기 위한 Repository.
 *
 * Project Entity
 *      ↓
 * ProjectRepository
 *      ↓
 * JPA / Hibernate
 *      ↓
 * Oracle PROJECT 테이블
 *
 * JpaRepository를 상속하면 기본적인 CRUD 기능을
 * 직접 SQL을 작성하지 않아도 사용할 수 있다.
 */
public interface ProjectRepository extends JpaRepository<Project, Long> {

    /*
     * 특정 사용자가 현재 ACTIVE 상태로 참여하고 있는
     * 프로젝트 목록을 조회한다.
     *
     * PROJECT_MEMBER.user_id
     * → 어떤 사용자인지 확인
     *
     * PROJECT_MEMBER.member_status = 'ACTIVE'
     * → 현재 실제로 참여 중인 프로젝트만 확인
     *
     * PROJECT.status <> 'DELETED'
     * → 삭제 처리된 프로젝트는 목록에서 제외
     *
     *
     * 중요한 점:
     *
     * PROJECT.owner_id만 기준으로 조회하면
     * 사용자가 직접 만든 프로젝트만 조회되고,
     * 다른 사람에게 초대되어 참여한 프로젝트는 조회되지 않는다.
     *
     * 따라서 "내가 참여 중인 프로젝트"를 구하려면
     * PROJECT_MEMBER를 기준으로 참여 여부를 확인해야 한다.
     *
     *
     * 예상 데이터 흐름:
     *
     * CurrentUserService
     * ↓
     * 현재 USER_ID
     * ↓
     * ProjectService
     * ↓
     * findActiveProjectsByUserId()
     * ↓
     * PROJECT_MEMBER에서 ACTIVE 참여 확인
     * ↓
     * PROJECT 조회
     */
    @Query("""
            SELECT p
            FROM Project p
            WHERE p.projectId IN (
                SELECT pm.projectId
                FROM ProjectMember pm
                WHERE pm.userId = :userId
                  AND pm.memberStatus = 'ACTIVE'
            )
              AND p.status <> 'DELETED'
            ORDER BY p.projectId DESC
            """)
    List<Project> findActiveProjectsByUserId(
            @Param("userId") Long userId);
}