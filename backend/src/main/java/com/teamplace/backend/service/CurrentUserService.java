
package com.teamplace.backend.service;

import com.teamplace.backend.entity.User;
import com.teamplace.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/*
 * 현재 요청을 수행하는 사용자 정보를 관리하는 Service.
 *
 * 아직 로그인 기능을 구현하지 않았기 때문에
 * 기본 개발 사용자는 USER_ID = 1이다.
 *
 * dev 프로필에서는 테스트를 위해
 * X-Dev-User-Id HTTP 헤더로 사용자 ID를 지정할 수 있다.
 *
 * 주의:
 * 이 헤더는 사용자 인증 수단이 아니다.
 * 실제 서비스 환경에서는 절대 사용하면 안 된다.
 *
 * 다른 Service에서 1L을 직접 작성하지 않고
 * 반드시 CurrentUserService를 통해 현재 사용자 정보를 얻는다.
 *
 * 나중에 Spring Security 로그인 기능을 구현하면
 * 이 클래스 내부를 실제 인증 정보 기준으로 변경한다.
 */
@Service
public class CurrentUserService {

    /*
     * 헤더가 없거나 dev 프로필이 아닐 때 사용하는 기본 사용자.
     */
    private static final Long DEVELOPMENT_USER_ID = 1L;

    /*
     * 개발 테스트에서만 사용하는 HTTP 헤더 이름.
     */
    private static final String DEV_USER_HEADER = "X-Dev-User-Id";

    private final UserRepository userRepository;
    private final Environment environment;

    /*
     * Spring이 필요한 객체를 자동으로 넣어준다.
     *
     * CurrentUserService
     * ↓
     * UserRepository
     * ↓
     * USERS 테이블
     *
     * Environment는 현재 활성화된 Spring 프로필을 확인한다.
     */
    public CurrentUserService(
            UserRepository userRepository,
            Environment environment) {

        this.userRepository = userRepository;
        this.environment = environment;
    }

    /*
     * 현재 요청의 사용자 ID를 가져온다.
     *
     * dev 프로필:
     * X-Dev-User-Id 헤더가 있으면 해당 ID 사용
     * 헤더가 없으면 USER_ID = 1 사용
     *
     * dev 프로필 이외:
     * 항상 USER_ID = 1 사용
     *
     * 잘못된 헤더 값은 예외로 차단한다.
     */
    public Long getCurrentUserId() {

        boolean isDevProfile = false;

        for (String profile : environment.getActiveProfiles()) {
            if ("dev".equals(profile)) {
                isDevProfile = true;
                break;
            }
        }

        if (!isDevProfile) {
            return DEVELOPMENT_USER_ID;
        }

        /*
         * 현재 HTTP 요청의 정보를 가져온다.
         *
         * 컨트롤러에서 호출되는 일반적인 HTTP 요청이라면
         * ServletRequestAttributes를 사용할 수 있다.
         */
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) {
            return DEVELOPMENT_USER_ID;
        }

        HttpServletRequest request = attributes.getRequest();

        String headerValue = request.getHeader(DEV_USER_HEADER);

        if (headerValue == null || headerValue.isBlank()) {
            return DEVELOPMENT_USER_ID;
        }

        try {
            long userId = Long.parseLong(headerValue.trim());

            if (userId <= 0) {
                throw new IllegalArgumentException(
                        "개발용 사용자 ID는 양수여야 합니다.");
            }

            return userId;

        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                    "X-Dev-User-Id 헤더에는 숫자 사용자 ID를 입력해야 합니다.");
        }
    }

    /*
     * 현재 사용자의 USERS 데이터를 실제 DB에서 조회한다.
     *
     * getCurrentUserId()
     * ↓
     * UserRepository.findById()
     * ↓
     * USERS 테이블
     *
     * 사용자 ID와 실제 사용자 객체가
     * 항상 동일한 기준으로 처리되도록 한다.
     */
    public User getCurrentUser() {

        Long currentUserId = getCurrentUserId();

        return userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException(
                        "현재 사용자 ID "
                                + currentUserId
                                + "가 USERS 테이블에 존재하지 않습니다."));
    }
}
