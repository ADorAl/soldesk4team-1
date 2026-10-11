package com.teamplace.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/*
 * PROJECT_MEMBER 테이블과 연결되는 JPA Entity.
 *
 * 이 테이블은 단순히 "프로젝트에 어떤 사용자가 속해 있는지"만
 * 저장하는 것이 아니다.
 *
 * 다음 정보도 함께 관리한다.
 *
 * - 프로젝트
 * - 사용자
 * - 프로젝트 내 역할
 * - 초대 상태
 * - 누가 초대했는지
 * - 초대 시각
 * - 응답 시각
 * - 실제 참여 시각
 *
 *
 * USERS와 PROJECT의 관계는:
 *
 * USERS
 *   ↕
 * PROJECT_MEMBER
 *   ↕
 * PROJECT
 *
 * 구조가 된다.
 *
 * 즉 한 사용자는 여러 프로젝트에 참여할 수 있고,
 * 한 프로젝트에도 여러 사용자가 참여할 수 있다.
 */
@Entity
@Table(name = "PROJECT_MEMBER")
@Getter
@Setter
@NoArgsConstructor
public class ProjectMember {

    /*
     * PROJECT_MEMBER의 PK.
     *
     * Oracle에 이미 존재하는
     * SEQ_PROJECT_MEMBER 시퀀스를 사용한다.
     *
     * DB Trigger 역시 PK가 NULL일 때만 동작하므로,
     * JPA가 시퀀스 번호를 먼저 받아 INSERT하면
     * Trigger와 충돌하지 않는다.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "project_member_seq_generator")
    @SequenceGenerator(name = "project_member_seq_generator", sequenceName = "SEQ_PROJECT_MEMBER", allocationSize = 1)
    @Column(name = "PROJECT_MEMBER_ID")
    private Long projectMemberId;

    /*
     * 어떤 프로젝트의 멤버인지 나타낸다.
     *
     * PROJECT.project_id를 참조하는 FK이다.
     */
    @Column(name = "PROJECT_ID", nullable = false)
    private Long projectId;

    /*
     * 어떤 사용자가 프로젝트에 참여하는지 나타낸다.
     *
     * USERS.user_id를 참조한다.
     */
    @Column(name = "USER_ID", nullable = false)
    private Long userId;

    /*
     * 프로젝트 안에서의 역할.
     *
     * DB에서 허용되는 값:
     *
     * LEADER
     * VICE_LEADER
     * MEMBER
     *
     * 프로젝트를 만든 사용자는 LEADER가 된다.
     */
    @Column(name = "POSITION", nullable = false, length = 20)
    private String position;

    /*
     * 프로젝트 참여 상태.
     *
     * PENDING
     * → 초대를 받았지만 아직 응답하지 않음
     *
     * ACTIVE
     * → 프로젝트에 정상 참여 중
     *
     * REJECTED
     * → 초대 거절
     *
     * LEFT
     * → 참여 후 프로젝트에서 나감
     *
     * 프로젝트 생성자는 초대를 받을 필요가 없으므로
     * 프로젝트 생성 직후 ACTIVE로 저장한다.
     */
    @Column(name = "MEMBER_STATUS", nullable = false, length = 20)
    private String memberStatus;

    /*
     * 이 사용자를 누가 프로젝트에 초대했는지 저장한다.
     *
     * USERS.user_id를 참조한다.
     *
     * 프로젝트 생성자의 경우에는
     * 누군가에게 초대된 것이 아니므로 NULL로 둘 예정이다.
     */
    @Column(name = "INVITED_BY")
    private Long invitedBy;

    /*
     * 초대 정보가 만들어진 시간.
     *
     * DB에 DEFAULT SYSTIMESTAMP가 있으므로
     * INSERT할 때 Java에서 별도로 값을 전달하지 않고
     * Oracle이 시간을 기록하도록 한다.
     */
    /*
     * 초대가 생성되거나 다시 발송된 시간.
     *
     * 최초 INSERT에서는 값을 직접 넣지 않으면
     * DB의 DEFAULT SYSTIMESTAMP가 사용된다.
     *
     * REJECTED / LEFT 사용자를 재초대할 때는
     * Service에서 현재 시각으로 갱신할 수 있도록
     * updatable = false는 사용하지 않는다.
     */
    @Column(name = "INVITED_AT", insertable = false)
    private LocalDateTime invitedAt;

    /*
     * 초대에 수락 또는 거절로 응답한 시간.
     *
     * 아직 응답하지 않았다면 NULL일 수 있다.
     *
     * 이후 초대 수락/거절 기능을 구현할 때
     * Service에서 값을 넣는다.
     */
    @Column(name = "RESPONDED_AT")
    private LocalDateTime respondedAt;

    /*
     * 사용자가 실제 프로젝트 멤버가 된 시간.
     *
     * 초대가 PENDING인 동안에는 NULL일 수 있고,
     * ACTIVE가 되었을 때 시간을 저장하게 된다.
     *
     * 프로젝트 생성자는 처음부터 ACTIVE이므로
     * 프로젝트 생성 Service에서 값을 넣을 예정이다.
     */
    @Column(name = "JOINED_AT")
    private LocalDateTime joinedAt;
}