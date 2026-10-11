package com.teamplace.backend.repository;

import com.teamplace.backend.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

import java.util.List;

/*
 * PROJECT_MEMBER 테이블에 접근하기 위한 Repository.
 *
 * 주요 역할:
 *
 * - 프로젝트 멤버 저장
 * - 프로젝트 멤버 조회
 * - 프로젝트 참여 상태 확인
 * - 프로젝트 내 역할 확인
 *
 *
 * 데이터 흐름:
 *
 * ProjectService
 *      ↓
 * ProjectMemberRepository
 *      ↓
 * JPA / Hibernate
 *      ↓
 * Oracle PROJECT_MEMBER
 */
public interface ProjectMemberRepository
                extends JpaRepository<ProjectMember, Long> {

        /*
         * 특정 사용자가 특정 프로젝트에
         * 주어진 member_status 상태로 존재하는지 확인한다.
         *
         * 현재는 프로젝트 상세 조회 권한 확인에 사용한다.
         *
         *
         * 예:
         *
         * projectId = 4
         * userId = 1
         * memberStatus = "ACTIVE"
         *
         * 결과:
         *
         * ACTIVE 멤버가 존재함
         * → true
         *
         * 존재하지 않음
         * → false
         *
         *
         * 이 메서드는 "조회 가능한가?"처럼
         * 존재 여부만 필요할 때 사용한다.
         */
        boolean existsByProjectIdAndUserIdAndMemberStatus(
                        Long projectId,
                        Long userId,
                        String memberStatus);

        /*
         * 특정 프로젝트에서 현재 사용자의
         * PROJECT_MEMBER 행 자체를 조회한다.
         *
         * existsBy... 메서드와 다른 점은
         * 단순히 true / false만 확인하는 것이 아니라
         * ProjectMember 객체를 가져온다는 것이다.
         *
         * 따라서 다음 정보까지 확인할 수 있다.
         *
         * - memberStatus
         * - position
         * - invitedBy
         * - joinedAt
         * 등
         *
         *
         * 프로젝트 수정 권한에서는
         * 단순 ACTIVE 여부뿐 아니라
         * position 값도 확인해야 하므로
         * 이 메서드가 필요하다.
         *
         *
         * 예:
         *
         * PROJECT_MEMBER
         *
         * project_id = 4
         * user_id = 1
         * member_status = ACTIVE
         * position = LEADER
         *
         * ↓
         *
         * ProjectMember 객체 반환
         *
         *
         * 반대로 해당 조건의 멤버가 없다면
         * Optional.empty()가 반환된다.
         */
        Optional<ProjectMember> findByProjectIdAndUserIdAndMemberStatus(
                        Long projectId,
                        Long userId,
                        String memberStatus);

        /*
         * 특정 프로젝트와 사용자 조합의
         * PROJECT_MEMBER 행을 상태와 관계없이 조회한다.
         *
         * 프로젝트 초대 기능에서는 새 PROJECT_MEMBER를 INSERT하기 전에
         * 같은 project_id + user_id 조합이 이미 존재하는지 확인해야 한다.
         *
         * DB에는 UNIQUE(project_id, user_id) 제약이 있기 때문에
         * 기존 행이 있는데 새 행을 INSERT하면 DB 오류가 발생한다.
         *
         * 따라서 이 메서드로 먼저 기존 행을 조회한 뒤,
         *
         * - PENDING
         * - ACTIVE
         * - REJECTED
         * - LEFT
         *
         * 상태에 따라 Service에서 처리 방법을 결정한다.
         */
        Optional<ProjectMember> findByProjectIdAndUserId(
                        Long projectId,
                        Long userId);

        /*
         * 특정 사용자가 받은 PROJECT_MEMBER 행 중에서
         * 원하는 member_status 상태의 목록을 조회한다.
         *
         * 초대 조회에서는:
         *
         * userId = 현재 사용자
         * memberStatus = "PENDING"
         *
         * 조건으로 사용한다.
         *
         * 즉 현재 사용자가 아직 수락/거절하지 않은
         * 프로젝트 초대 목록을 가져오는 데 사용한다.
         */
        List<ProjectMember> findByUserIdAndMemberStatus(
                        Long userId,
                        String memberStatus);

        /*
         * 특정 프로젝트에 현재 참여 중인 ACTIVE 멤버 목록을 조회한다.
         *
         * 프로젝트 상세 화면이나 멤버 관리 화면에서
         * 실제 참여 중인 사용자 목록을 가져오는 데 사용한다.
         *
         * PENDING / REJECTED / LEFT 상태의 사용자는
         * 현재 프로젝트 참여자가 아니므로 조회 대상에서 제외한다.
         */
        List<ProjectMember> findByProjectIdAndMemberStatus(
                        Long projectId,
                        String memberStatus);
}