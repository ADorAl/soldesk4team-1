package com.teamplace.backend;

import com.teamplace.backend.entity.User;
import com.teamplace.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/*
[이 클래스의 목적]

Spring Boot가 정상적으로 시작된 직후
UserRepository를 이용해서 Oracle의 USERS 테이블을 조회한다.

이번 테스트의 목적은 다음 연결이 실제로 동작하는지 확인하는 것이다.

Spring Boot
    ↓
UserRepository
    ↓
Spring Data JPA
    ↓
Hibernate
    ↓
Oracle USERS
    ↓
User 객체
    ↓
콘솔 출력


[사용 변수 설명]

userRepository
- Spring이 만들어 주는 UserRepository 객체
- USERS 테이블을 조회하는 데 사용한다.

users
- DB에서 조회한 사용자 목록
- USERS 테이블의 각 행이 User 객체로 변환되어 들어온다.
*/

@Component
public class DbConnectionTestRunner implements CommandLineRunner {

    private final UserRepository userRepository;

    /*
     * Spring이 UserRepository 객체를 생성한 뒤
     * 이 생성자를 통해 DbConnectionTestRunner에 전달한다.
     * 
     * 즉 우리가 직접
     * 
     * new UserRepository()
     * 
     * 를 만드는 것이 아니다.
     */
    public DbConnectionTestRunner(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /*
     * [목적]
     * Spring Boot 실행 직후 USERS 테이블을 실제로 조회한다.
     * 
     * [처리 결과]
     * - DB 연결이 정상이라면 USERS의 전체 행을 가져온다.
     * - 사용자가 없다면 0명이 출력된다.
     * - 사용자가 있다면 userId, loginId, name을 콘솔에서 확인할 수 있다.
     */
    @Override
    public void run(String... args) {

        System.out.println();
        System.out.println("========================================");
        System.out.println("USERS 테이블 조회 테스트 시작");
        System.out.println("========================================");

        // findAll()을 호출하는 순간 JPA/Hibernate가
        // 실제 Oracle USERS 테이블에 SELECT를 실행한다.
        List<User> users = userRepository.findAll();

        // 조회된 행 개수와 동일하다.
        System.out.println("조회된 사용자 수: " + users.size());

        // DB의 각 USERS 행은 User 객체 하나로 변환된다.
        for (User user : users) {
            System.out.println(
                    "userId = " + user.getUserId()
                            + ", loginId = " + user.getLoginId()
                            + ", name = " + user.getName());
        }

        System.out.println("========================================");
        System.out.println("USERS 테이블 조회 테스트 종료");
        System.out.println("========================================");
        System.out.println();
    }
}