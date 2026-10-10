package com.teamplace.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/*
 * 프로젝트 멤버 초대 요청을 받기 위한 DTO.
 *
 * 사용자가 프로젝트에 다른 사용자를 초대할 때
 * 초대 대상 사용자의 ID만 전달받는다.
 *
 *
 * 예:
 *
 * POST /api/projects/4/invitations
 *
 * React에서 보내는 JSON:
 *
 * {
 *   "userId": 2
 * }
 *
 *          ↓
 *
 * ProjectInviteRequest
 *
 *          ↓
 *
 * ProjectController
 *
 *          ↓
 *
 * ProjectService
 *
 *          ↓
 *
 * PROJECT_MEMBER에
 * MEMBER + PENDING 상태로 저장
 *
 *
 * projectId는 JSON으로 받지 않는다.
 *
 * 어느 프로젝트에 초대하는지는
 * URL의 /api/projects/{projectId}/... 에서 받는다.
 *
 *
 * invitedBy도 사용자가 직접 보내지 않는다.
 *
 * 초대한 사람은 현재 로그인 사용자이므로
 * Service에서 CurrentUserService를 통해 결정한다.
 *
 *
 * position 역시 사용자가 직접 정하지 않는다.
 *
 * 이번 기본 초대에서는 초대받은 사용자를
 * MEMBER로 등록할 예정이다.
 *
 *
 * memberStatus도 요청에서 받지 않는다.
 *
 * 새 초대는 서버에서 항상
 * PENDING 상태로 생성할 예정이다.
 */
@Getter
@Setter
@NoArgsConstructor
public class ProjectInviteRequest {

    /*
     * 프로젝트에 초대할 사용자의 USERS.user_id.
     *
     * 이 값은 이후 Service에서
     * 실제 USERS 테이블에 존재하는 사용자인지 확인한 뒤
     * PROJECT_MEMBER.user_id로 사용한다.
     */
    private Long userId;
}