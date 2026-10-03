# RentMate Contribution

## 1\. 문서 목적

이 문서는 팀 프로젝트 **RentMate - P2P 중고 물품 대여 웹 서비스**에서 직접 담당하거나 구현한 기능을 정리한 개인 기여 문서입니다.

전체 팀 프로젝트의 모든 기능을 본인 구현으로 설명하지 않고, 실제 확인된 소스 코드와 구현 범위를 기준으로 작성했습니다.

---

## 2\. 담당 역할

* 비즈니스 기능 기획 참여
* Firestore 기반 데이터 처리 로직 구현
* 물품 등록·수정 기능 구현
* Firebase Storage 기반 이미지 업로드 연계
* 실시간 채팅 기능 구현
* 구매·결제 상태 처리
* 리뷰 및 평점 처리
* Kakao Maps 기반 위치 선택 기능 연계
* 인증 상태 관리 로직 구현

---

## 3\. 주요 기여 영역

### 3.1 Firestore 기반 데이터 처리

Firestore를 주요 데이터 저장소로 사용하고 기능별 Service 모듈을 분리했습니다.

주요 구현 파일:

```text
src/services/
├─ firestoreItemService.ts
├─ firestoreMessageService.ts
├─ firestorePurchaseService.ts
├─ firestorePaymentService.ts
├─ firestoreReviewService.ts
├─ firestoreUserService.ts
├─ firestoreOnlyAuthService.ts
└─ firebaseStorageService.ts
```

담당 기능별 데이터 접근 로직을 화면 컴포넌트와 분리하여 물품, 채팅, 구매, 결제, 리뷰, 사용자 데이터 처리를 관리했습니다.

---

## 4\. 물품 등록 및 수정

### 주요 구현 파일

```text
src/hooks/useCreateListing.ts
src/pages/CreateListing.tsx
src/pages/EditItem.tsx
src/services/firestoreItemService.ts
src/services/firebaseStorageService.ts
```

### 구현 내용

* 제목, 설명, 카테고리, 위치, 가격, 대여 가능 기간을 입력받아 물품 등록
* 날짜 범위를 `availableDates` 배열로 변환
* 인증 토큰에서 사용자 ID를 추출해 `ownerId`와 연계
* Firestore `items` 컬렉션에 물품 정보 저장
* 수정 화면에서 현재 사용자 ID와 물품 ownerId 일치 여부 확인
* 기존 이미지와 신규 이미지를 분리해 수정 처리
* 신규 이미지 업로드 후 기존 이미지 URL과 병합해 Firestore 갱신

### 구현 의도

물품 등록 화면에 기능 로직이 집중되지 않도록 입력 상태와 제출 로직을 `useCreateListing` Custom Hook으로 분리했습니다.

---

## 5\. Firebase Storage 이미지 업로드

### 주요 구현 파일

```text
src/services/firebaseStorageService.ts
src/services/firestoreItemService.ts
```

### 구현 내용

* 여러 이미지 파일을 입력받아 Firebase Storage에 업로드
* 파일 크기 10MB 제한
* `image/\*` MIME Type 검증
* `itemId`, timestamp, random ID를 조합해 고유 파일명 생성
* `public/items/{itemId}/` 경로에 파일 저장
* `Promise.all()`을 사용해 다중 이미지 병렬 업로드
* 업로드 완료 후 다운로드 URL을 Firestore `items.images`에 저장

### 구현 범위

이미지 자동 리사이징, 압축, 화질 최적화 기능은 구현하지 않았습니다.

---

## 6\. 실시간 채팅

### 주요 구현 파일

```text
src/hooks/useChat.ts
src/pages/Messages.tsx
src/components/chat/ChatList.tsx
src/components/chat/ChatRoom.tsx
src/services/firestoreMessageService.ts
```

### 구현 내용

* 물품 상세 화면에서 판매자와 대화 시작
* 로그인 여부 및 본인 물품 여부 확인
* 현재 사용자, 상대 사용자, 물품 ID를 기준으로 기존 대화방 조회
* 기존 대화방이 없으면 신규 `chatRooms` 문서 생성
* 메시지를 `chatRooms/{roomId}/messages` 서브컬렉션에 저장
* 메시지 전송 시 채팅방의 `lastMessage` 갱신
* Firestore `onSnapshot`으로 대화방 목록 실시간 구독
* Firestore `onSnapshot`으로 메시지 목록 실시간 구독
* 대화방 진입 시 상대방의 미읽음 메시지 `read` 상태 갱신
* 컴포넌트 언마운트 시 `unsubscribe()`로 실시간 리스너 정리

### 읽음 처리

읽지 않은 메시지를 조회한 후 각각 `updateDoc()`을 실행하고 `Promise.all()`로 완료를 기다리는 방식으로 처리했습니다.

Firestore `writeBatch()` 기반 Atomic Batch Write는 사용하지 않았습니다.

### Optimistic Update

메시지 전송 후 로컬 상태를 먼저 갱신하는 Optimistic Update는 사용하지 않았습니다.

메시지 UI는 Firestore `onSnapshot` 결과를 통해 갱신됩니다.

---

## 7\. Firestore 인덱스 제약 대응

일부 Firestore 조회에서 `where`와 `orderBy` 조합으로 인덱스 오류가 발생할 수 있어 서버 측 `orderBy`를 제거하고 조회 후 클라이언트에서 정렬하도록 변경했습니다.

적용 사례:

* 대화방 목록 최신순 정렬
* 사용자 리뷰 최신순 정렬
* 카테고리 물품 최신순 정렬

이 프로젝트에서는 Firestore 복합 인덱스를 직접 정의·적용한 것으로 설명하지 않습니다.

---

## 8\. Kakao Maps 위치 기능

### 주요 구현 파일

```text
src/hooks/useKakaoMap.ts
src/components/listing/BasicInfoSection.tsx
src/components/location/KakaoLocationPicker.tsx
```

### 구현 내용

* Kakao Maps JavaScript SDK 로드
* Places 키워드 검색
* 검색 결과 마커 표시
* 검색 결과에 맞춘 지도 범위 조정
* 지도 클릭 위치 선택
* 좌표 기반 Reverse Geocoding
* 선택 위치를 물품 등록·수정 폼의 `location` 값과 연계

### 구현 범위

거리 기반 물품 검색, 좌표 기반 근접 검색, 위치 기반 추천 기능은 구현하지 않았습니다.

---

## 9\. 구매 및 거래 상태 처리

### 주요 구현 파일

```text
src/services/firestorePurchaseService.ts
src/services/purchaseService.ts
src/pages/ItemDetail.tsx
src/pages/Profile.tsx
```

### 구현 내용

* 구매 생성 시 `purchases` 컬렉션에 거래 정보 저장
* 구매 완료 시 물품의 `available` 값을 `false`로 변경
* 구매 취소 시 물품의 `available` 값을 `true`로 복원
* 사용자별 구매 내역 조회
* 구매 완료 여부를 기준으로 리뷰 작성 가능 여부 확인
* 구매 내역과 리뷰 작성 여부 연계

현재 구매 생성 로직에서는 구매 문서를 바로 `completed` 상태로 생성합니다.

---

## 10\. 결제 상태 관리

### 주요 구현 파일

```text
src/services/firestorePaymentService.ts
src/services/paymentService.ts
src/pages/Payments.tsx
```

### 구현 내용

다음 결제 상태를 Firestore에서 관리했습니다.

```text
pending
held
completed
failed
refunded
released
```

구현된 주요 흐름:

* 결제 생성 시 `held`
* 결제 취소 시 `refunded`
* 결제 확정 시 `completed`
* 거래 완료 시 `released`

이는 에스크로 거래 흐름을 반영한 상태 관리입니다.

### 구현 범위

* 실제 PG사 API 연동 없음
* 실제 카드 승인 없음
* 실제 자금 보관·정산 없음

따라서 개인 기여 설명에서는 **실제 에스크로 결제 시스템 구축**이 아니라 **에스크로 거래 흐름을 반영한 결제 상태 관리**로 표현합니다.

---

## 11\. 리뷰 및 평점

### 주요 구현 파일

```text
src/services/firestoreReviewService.ts
src/services/firestorePurchaseService.ts
src/pages/Profile.tsx
```

### 구현 내용

* 구매 완료 여부 확인 후 리뷰 작성 허용
* 리뷰에 `itemId`, `purchaseId`, `reviewerId`, `revieweeId` 연계
* 평점 및 리뷰 내용 저장
* 사용자별 리뷰 조회
* 리뷰 작성자 및 물품 정보 추가 조회
* 클라이언트에서 최신순 정렬
* 사용자별 평균 평점 및 리뷰 수 계산
* 프로필 및 물품 상세 정보에 평점 데이터 반영

---

## 12\. 인증 상태 관리

### 주요 구현 파일

```text
src/contexts/AuthContext.tsx
src/services/firestoreOnlyAuthService.ts
src/pages/Login.tsx
src/pages/Register.tsx
```

### 구현 내용

* Context API + `useReducer` 기반 인증 전역 상태 관리
* 로그인
* 회원가입
* 로그아웃
* 인증 로딩 및 오류 상태 관리
* 로그인 성공 시 사용자 식별 토큰을 `localStorage`에 저장
* 앱 재접속 시 저장된 토큰을 확인하고 사용자 정보 복원
* React Hook Form + Zod 기반 로그인·회원가입 입력값 검증

Firebase Authentication 기반 인증 구조는 아닙니다.

---

## 13\. 병렬 데이터 처리

### `Promise.all()`

다중 이미지 업로드와 메시지 읽음 상태 갱신 등에 사용했습니다.

### `Promise.allSettled()`

프로필 화면에서 다음 데이터를 병렬로 조회했습니다.

* 등록 물품
* 사용자 리뷰
* 구매 내역

개별 데이터 요청 실패가 나머지 조회 결과까지 실패시키지 않도록 각각 독립적으로 처리했습니다.

---

## 14\. 주요 문제 해결 경험

### 14.1 Firestore 인덱스 제약

**문제**

일부 Firestore 복합 조회에서 인덱스 제약으로 인해 `where`와 `orderBy`를 동시에 사용하는 데 문제가 발생했습니다.

**조치**

서버 측 `orderBy`를 제거하고 필요한 조건으로 데이터를 조회한 뒤 클라이언트에서 최신순으로 정렬했습니다.

**결과**

대화방, 리뷰, 물품 목록의 조회 흐름을 유지하면서 인덱스 오류가 발생하는 쿼리 구조를 피했습니다.

---

### 14.2 실시간 채팅 상태 동기화

**문제**

대화방과 메시지 화면에서 Firestore 변경 내용을 UI에 지속적으로 반영해야 했습니다.

**조치**

`ChatList`와 `ChatRoom`에서 `onSnapshot` 리스너를 구성하고, 메시지 전송 시 `lastMessage`를 함께 갱신했습니다.

**결과**

새 메시지와 대화방 최근 메시지가 Firestore 변경을 기준으로 화면에 반영되도록 구현했습니다.

또한 컴포넌트 언마운트 시 `unsubscribe()`를 호출하여 사용이 끝난 실시간 리스너를 정리했습니다.

---

### 14.3 다중 이미지 처리

**문제**

물품 하나에 여러 이미지를 등록하고 각 업로드 결과를 Firestore 물품 데이터와 연결해야 했습니다.

**조치**

업로드 전 파일 크기와 MIME Type을 검증하고, 각 이미지 업로드 작업을 Promise로 생성한 뒤 `Promise.all()`로 처리했습니다.

**결과**

여러 이미지의 다운로드 URL을 한 번에 수집해 `items.images` 배열과 연계했습니다.

---

### 14.4 프로필 복합 데이터 조회

**문제**

프로필 화면에서 등록 물품, 리뷰, 구매 내역 등 서로 독립적인 여러 데이터를 함께 조회해야 했으며, 한 요청의 실패가 전체 화면 실패로 이어질 가능성이 있었습니다.

**조치**

각 조회를 `Promise.allSettled()`로 병렬 실행하고 결과를 개별적으로 처리했습니다.

**결과**

일부 데이터 요청이 실패하더라도 성공한 데이터는 계속 화면에 표시할 수 있도록 구성했습니다.

---

## 15\. 개인 기여 핵심 요약

RentMate 프로젝트에서는 Firestore와 Firebase Storage를 중심으로 실제 서비스 기능과 데이터 흐름을 연결하는 개발을 담당했습니다.

주요 기여는 다음과 같습니다.

* Firestore 기반 물품·구매·결제·리뷰·채팅 데이터 처리
* 도메인별 Service 모듈 분리
* `onSnapshot` 기반 실시간 대화방·메시지 구현
* 실시간 Listener Cleanup
* Firebase Storage 다중 이미지 병렬 업로드
* 물품 등록·수정 및 이미지 URL 연계
* Kakao Maps 기반 위치 선택 기능
* 구매 상태와 물품 대여 가능 상태 연계
* 구매 완료 여부 기반 리뷰 작성 흐름
* 평균 평점 및 리뷰 수 계산
* Context API 기반 인증 상태 관리
* `Promise.all` / `Promise.allSettled` 기반 병렬 데이터 처리

---

## 16\. 저장소 범위 안내

본 저장소는 팀 프로젝트 전체 소스의 소유권을 주장하기 위한 목적이 아니라, **RentMate 프로젝트에서 직접 기여한 기능과 구현 내용을 포트폴리오 목적으로 정리한 저장소**입니다.

README와 본 문서에서는 팀 전체 결과와 개인 구현 범위를 구분하여 설명합니다.

## Security / Scope Note

본 저장소는 팀 프로젝트에서 직접 구현한 기능을 포트폴리오 목적으로 정리한 코드입니다.

인증은 프로토타입용 사용자 식별 토큰을 기반으로 하며, 실제 JWT 서명 검증이나 Firebase Authentication을 사용하지 않습니다.

또한 Firestore Security Rules 구현은 본 저장소의 개인 기여 범위로 설명하지 않습니다. 따라서 클라이언트의 로그인·소유자 확인 로직은 운영 환경의 서버 측 권한 통제를 대체하지 않습니다.
