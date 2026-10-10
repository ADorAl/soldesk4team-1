package com.teamplace.backend.repository;

import com.teamplace.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

/*
[이 인터페이스의 역할]

UserRepository는
Oracle의 USERS 테이블과 연결된 User Entity를
조회하고 저장하는 통로 역할을 한다.

데이터 흐름은 다음과 같다.

Service
   ↓
UserRepository
   ↓
JPA / Hibernate
   ↓
Oracle USERS


[중요]

JpaRepository<User, Long>에서

User
- 어떤 Entity를 다룰 것인지 의미한다.
- 여기서는 USERS 테이블과 연결된 User Entity이다.

Long
- User Entity의 PK 타입이다.
- USER_ID가 Long이므로 Long을 사용한다.


JpaRepository를 상속하면
기본적인 CRUD 메서드를 직접 만들지 않아도 사용할 수 있다.

예:
findAll()
findById()
save()
delete()
count()
*/
public interface UserRepository extends JpaRepository<User, Long> {

}