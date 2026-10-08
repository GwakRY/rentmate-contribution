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
* Firestore `items` 문서를 `images: []` 상태로 먼저 생성하고, 반환된 `itemId`를 이미지 업로드 및 URL 저장에 사용
* 수정 화면에서 현재 사용자 ID와 물품 ownerId 일치 여부 확인
* 기존 이미지와 신규 이미지를 분리해 수정 처리
* 신규 이미지 업로드 후 기존 이미지 URL과 병합해 Firestore 갱신

### 구현 의도

물품 등록 화면에 기능 로직이 집중되지 않도록 입력 상태와 제출 로직을 `useCreateListing` Custom Hook으로 분리했습니다.

---

## 5\. Firebase Storage 이미지 업로드

### 주요 구현 파일

- [firebaseStorageService.ts](../src/services/firebaseStorageService.ts)
- [firestoreItemService.ts](../src/services/firestoreItemService.ts)

### 구현 순서

1. `createItemInFirestore()`에서 `images: []`인 물품 문서를 `addDoc()`으로 생성합니다.
2. 생성된 `docRef.id`를 `uploadImagesToFirebaseStorage(itemId, images)`에 전달합니다.
3. 파일마다 크기와 MIME Type을 검사한 뒤 `uploadBytes()`와 `getDownloadURL()`을 실행합니다.
4. `Promise.all()`로 업로드·URL 조회 결과를 수집합니다.
5. 모든 작업이 성공하면 URL 배열로 해당 물품의 `images`와 `updatedAt`을 갱신합니다.

### 문서와 파일을 연결한 방법

- 저장 경로: `public/items/{itemId}/{fileName}`
- 파일명: 물품 ID·현재 시각·난수·확장자를 조합하여 파일명 충돌 가능성을 줄입니다.
- 파일별 제한: `10 * 1024 * 1024`바이트 이하이며, `File.type`이 `image/`로 시작해야 합니다.

문서 생성으로 확보한 물품 ID를 파일 저장 경로와 문서 갱신에 공통으로 사용하여 물품 정보와 이미지 파일을 연결했습니다. 현재 구현에서는 이 ID를 전달하기 위해 문서 생성이 업로드보다 먼저 실행됩니다.

이미지별 작업은 병렬로 실행하고, 전체 다운로드 URL 배열이 준비된 뒤 `items.images`를 한 번 갱신합니다. 일부 이미지의 URL을 얻을 때마다 물품 문서를 갱신하는 흐름은 아닙니다.

### 실패 시 상태와 구현 범위

- 업로드 또는 URL 조회가 실패하면 `items.images` 갱신 단계로 진행하지 않고 오류를 전달합니다. 이미 생성한 물품 문서는 남습니다.
- `Promise.all()`의 실패는 다른 업로드를 취소하지 않으며, 성공한 파일을 자동 삭제하는 처리는 없습니다.
- 업로드 이후 문서 갱신이 실패해도 동일한 이미지 업로드 실패 메시지로 처리합니다. 두 실패 원인을 별도로 구분하지 않습니다.
- 문서·파일의 자동 롤백, 자동 재시도, 이미지 리사이징·압축은 구현하지 않았습니다.
- 병렬 업로드의 시간 단축 수치나 파일명 충돌의 완전한 방지를 성과로 주장하지 않습니다.

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

- [firestorePurchaseService.ts](../src/services/firestorePurchaseService.ts)
- [purchaseService.ts](../src/services/purchaseService.ts)
- [ItemDetail.tsx](../src/pages/ItemDetail.tsx)
- [Profile.tsx](../src/pages/Profile.tsx)

### 구매 생성 조건과 데이터 연결

`createPurchaseInFirestore()`는 사용자 ID를 확인하고 물품 문서를 조회합니다. 물품이 없거나 `available`이 거짓이면 오류를 반환합니다.

구매 문서에는 다음 정보를 저장합니다.

| 필드 | 연결하는 정보 |
|---|---|
| `itemId` | 요청한 물품의 문서 ID |
| `buyerId` | 사용자 식별 토큰에서 얻은 구매자 ID |
| `sellerId` | 물품 문서의 `ownerId` |
| `amount` | 함수에 전달된 구매 금액 |
| `status` | 생성 시 `completed` |
| `createdAt·completedAt` | 생성 시 서버 타임스탬프 |

구매 문서를 생성한 뒤 해당 물품의 `available`을 `false`로 변경합니다. 구매 생성 시 바로 완료 상태를 저장하는 프로토타입이며, 실제 결제 승인이나 대여 종료를 확인하는 동작으로 설명하지 않습니다.

### 완료·취소 상태 변경

`updatePurchaseStatusInFirestore()`는 구매 문서에서 `itemId`를 얻어 물품 상태를 먼저 변경하고, 이후 구매 문서의 상태를 갱신합니다.

| 구매 상태 | 물품 상태 | 구매 문서 갱신 |
|---|---|---|
| `completed` | `available: false` | 상태·완료 시각·수정 시각 |
| `cancelled` | `available: true` | 상태·수정 시각 |

### 구현 목적과 범위

대여 가능한 물품인지 판단하는 규칙을 `available` 검사로 표현하고, 완료·취소에 따른 대여 가능 여부를 물품 상태 변경으로 연결했습니다. 사용자별 구매 내역은 `buyerId`로 조회하며 관련 물품 정보와 리뷰 작성 여부를 함께 구성합니다.

구매 생성과 물품 갱신, 상태 변경 함수의 물품·구매 갱신은 각각 순차 작업입니다. Firestore 트랜잭션이나 Atomic Batch Write를 사용하지 않으므로 원자성이나 동시 요청의 중복 거래 방지를 보장하는 구현으로 설명하지 않습니다.

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

- [firestoreReviewService.ts](../src/services/firestoreReviewService.ts)
- [firestorePurchaseService.ts](../src/services/firestorePurchaseService.ts)
- [ReviewWriteModal.tsx](../src/components/ReviewWriteModal.tsx)
- [Profile.tsx](../src/pages/Profile.tsx)

### 일반 구매 리뷰의 작성 조건

예약 ID가 없는 일반 구매 리뷰에서는 `checkPurchaseCompletedInFirestore()`로 다음 조건을 모두 만족하는 구매 문서를 조회합니다.

- `itemId == 리뷰 대상 물품 ID`
- `buyerId == 작성자 ID`
- `status == completed`

일치하는 구매가 없거나 조회에 실패하면 `canReview: false`를 반환하고, 리뷰 생성 함수는 작성을 거부합니다. 거래 완료 여부라는 서비스 규칙을 물품·구매자·상태의 조회 조건으로 구현했습니다.

리뷰에는 `itemId·reviewerId·revieweeId·rating·content·createdAt`을 저장하고, 완료 구매 조회에서 얻은 `purchaseId`가 있으면 함께 기록합니다.

### 기존 리뷰와 구매 내역 화면 연계

1. 완료 구매마다 `purchaseId == 구매 문서 ID`, `reviewerId == 현재 사용자 ID`로 기존 리뷰를 조회합니다.
2. 조회 결과로 `hasReview`를 구성합니다.
3. 프로필 화면에서 `hasReview`에 따라 후기 작성 버튼 또는 작성 완료 표시를 제공합니다.
4. 후기 제출 후 구매 내역을 다시 조회하여 화면의 후기 작성 상태를 갱신합니다.

### 리뷰 조회와 평점 계산

- `revieweeId`로 사용자에게 작성된 리뷰 조회
- 리뷰 작성자 및 물품 정보 추가 조회
- 클라이언트에서 최신순 정렬
- 조회·구성한 리뷰를 기준으로 평균 평점 및 리뷰 수 계산
- 프로필 및 물품 상세 정보에 평점 데이터 반영

### 구현 범위

- 예약 ID가 있는 분기는 물품·예약 존재 여부를 확인하지만, 예약 완료 상태를 검사해 작성을 차단하는 로직은 없습니다.
- 기존 리뷰에 따른 버튼 표시와 별개로, 리뷰 생성 함수에는 중복 작성 검사가 없습니다.
- 후기 모달은 선택한 구매의 ID를 리뷰 생성 함수에 전달하지 않습니다. `purchaseId`는 물품·구매자·완료 조건으로 조회한 첫 구매 문서에서 얻으므로, 선택한 구매 ID를 기준으로 리뷰를 연결한다고 설명하지 않습니다.

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

물품 문서를 먼저 생성하고 반환된 `itemId`를 파일 저장 경로에 사용했습니다. 파일별 크기·MIME Type 검사 후 업로드·URL 조회를 병렬로 실행하고, `Promise.all()`로 결과를 수집했습니다.

**결과**

모든 작업이 성공하면 다운로드 URL 배열을 해당 물품의 `images`에 한 번 반영했습니다. 이미지 처리 실패 시에는 이미 생성한 문서를 유지한 채 오류를 전달하며, 문서·파일을 자동으로 되돌리는 처리는 없습니다.

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
* 생성된 물품 ID 기반 이미지 저장 경로 구성 및 다중 이미지 병렬 업로드
* 전체 업로드·URL 조회 성공 후 물품 문서의 이미지 URL 갱신
* Kakao Maps 기반 위치 선택 기능
* 구매 상태와 물품 대여 가능 상태 연계
* 일반 구매 리뷰의 `itemId·buyerId·completed` 조건 검사 및 기존 리뷰에 따른 구매 내역 화면 연계
* 평균 평점 및 리뷰 수 계산
* Context API 기반 인증 상태 관리
* `Promise.all` / `Promise.allSettled` 기반 병렬 데이터 처리

---

## 16\. 저장소 범위 안내

본 저장소는 팀 프로젝트 전체 소스의 소유권을 주장하기 위한 목적이 아니라, **RentMate 프로젝트에서 직접 기여한 기능과 구현 내용을 포트폴리오 목적으로 정리한 저장소**입니다.

README와 본 문서에서는 팀 전체 결과와 개인 구현 범위를 구분하여 설명합니다.

## 공개 범위와 보안

[프로토타입 한계와 보안 범위](scope-and-security.md)에서 로그인·권한 통제·결제·기능 범위를 함께 설명합니다.
