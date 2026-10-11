package com.teamplace.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/*
 * 프로젝트 멤버의 역할(position)을 변경할 때 사용하는 요청 DTO.
 *
 * 이번 기능에서는 일반 역할 변경만 처리한다.
 *
 * 허용 범위:
 * MEMBER <-> VICE_LEADER
 *
 * LEADER 변경은 별도의 "리더 양도" 기능으로 분리한다.
 */
@Getter
@Setter
@NoArgsConstructor
public class ProjectMemberRoleUpdateRequest {

    /*
     * 변경하려는 역할.
     *
     * 현재 허용 예정 값:
     * - MEMBER
     * - VICE_LEADER
     *
     * LEADER는 이 API에서 허용하지 않는다.
     */
    private String position;
}