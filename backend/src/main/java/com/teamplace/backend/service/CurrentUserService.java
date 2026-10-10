package com.teamplace.backend.service;

import com.teamplace.backend.entity.User;
import com.teamplace.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

/*
 * 현재 요청을 수행하는 사용자 정보를 관리하는 Service.
 *
 * 아직 로그인 기능을 구현하지 않았기 때문에
 * 개발 단계에서는 USER_ID = 1 사용자를 현재 사용자로 간주한다.
 *
 * 중요한 점:
 * 다른 Service에서 1L을 직접 작성하지 않고
 * 반드시 이 CurrentUserService를 통해 현재 사용자 정보를 얻는다.
 *
 * 나중에 Spring Security 로그인 기능을 구현하면
 * 이 클래스 내부만 수정하면 된다.
 */
@Service
public class CurrentUserService {

    /*
     * 개발 단계에서 사용할 사용자 ID.
     *
     * 앞으로 ProjectService, TaskService 등에서는
     * 1L을 직접 사용하지 않는다.
     */
    private static final Long DEVELOPMENT_USER_ID = 1L;

    private final UserRepository userRepository;

    /*
     * Spring이 UserRepository 객체를 자동으로 넣어준다.
     *
     * 즉:
     *
     * CurrentUserService
     * ↓
     * UserRepository
     * ↓
     * USERS 테이블
     *
     * 로 연결된다.
     */
    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /*
     * 현재 사용자의 ID만 필요한 경우 사용한다.
     *
     * 예:
     * 프로젝트 목록 조회
     * 작업 담당자 비교
     * 권한 검사
     */
    public Long getCurrentUserId() {
        return DEVELOPMENT_USER_ID;
    }

    /*
     * 현재 사용자의 USERS 데이터를 실제 DB에서 조회한다.
     *
     * findById(1L)
     * ↓
     * USERS 테이블에서 USER_ID = 1 조회
     *
     * 사용자가 존재하면 User 객체 반환
     * 존재하지 않으면 예외 발생
     *
     * 프로젝트 생성 시 owner 등을 연결할 때
     * 앞으로 이 메서드를 사용할 수 있다.
     */
    public User getCurrentUser() {

        return userRepository.findById(DEVELOPMENT_USER_ID)
                .orElseThrow(() -> new IllegalStateException(
                        "개발용 사용자 ID "
                                + DEVELOPMENT_USER_ID
                                + "가 USERS 테이블에 존재하지 않습니다."));
    }
}