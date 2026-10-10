package com.teamplace.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/*
 * 프로젝트 생성 요청을 받기 위한 DTO.
 *
 * DTO = Data Transfer Object
 *
 * React가 Spring Boot로 보내는 JSON 데이터를
 * 받아주는 역할을 한다.
 *
 *
 * React에서 보내는 JSON:
 *
 * {
 *   "projectName": "프로젝트 이름",
 *   "description": "프로젝트 설명",
 *   "crawlKeyword": "검색 키워드"
 * }
 *
 *           ↓
 *
 * ProjectCreateRequest
 *
 *           ↓
 *
 * ProjectController
 *
 *           ↓
 *
 * ProjectService
 *
 *
 * DB Entity인 Project와 분리하는 이유:
 *
 * Project Entity에는
 *
 * - projectId
 * - ownerId
 * - status
 * - createdAt
 * - updatedAt
 *
 * 처럼 사용자가 직접 결정하면 안 되는 값도 존재한다.
 *
 * 따라서 프로젝트 생성 API에서는
 * 실제로 사용자가 입력할 수 있는 데이터만
 * 별도의 DTO로 받는다.
 */
@Getter
@Setter
@NoArgsConstructor
public class ProjectCreateRequest {

    /*
     * 사용자가 입력하는 프로젝트 이름.
     */
    private String projectName;

    /*
     * 프로젝트 설명.
     */
    private String description;

    /*
     * 프로젝트 관련 자료를 수집할 때
     * 사용할 검색 키워드.
     */
    private String crawlKeyword;
}