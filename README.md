# RentMate Contribution

개인 간 중고 물품 대여 웹 서비스에서 **Firestore 기반 데이터 처리와 실시간 채팅, 이미지 저장, 거래·리뷰 흐름**을 담당했습니다. 화면과 데이터 접근 로직을 Service 모듈·Custom Hook으로 나누어 연결했습니다.

| 항목 | 내용 |
|---|---|
| 기간 | 2025.03 ~ 2025.06 |
| 담당 | 비즈니스 기능 기획, 물품·거래·리뷰 데이터 처리, 실시간 채팅, 이미지 업로드, 지도 위치 선택, 로그인 상태 관리 |
| 구조 | React·TypeScript에서 Firestore·Firebase Storage를 직접 사용하는 구성 |
| 공개 범위 | 팀 프로젝트의 개인 기여 코드 발췌. 일부 공통 모듈·타입·앱 진입점이 제외되어 전체 앱을 독립 실행하는 구성은 아닙니다. |

## 서비스 화면

<table>
  <tr>
    <td align="center">
      <b>메인 화면</b><br />
      <img src="./docs/images/rentmate-home.png" width="400" />
    </td>
    <td align="center">
      <b>물품 목록</b><br />
      <img src="./docs/images/rentmate-item-list.png" width="400" />
    </td>
  </tr>
  <tr>
    <td align="center">
      <b>물품 상세</b><br />
      <img src="./docs/images/rentmate-item-detail.png" width="400" />
    </td>
    <td align="center">
      <b>실시간 채팅</b><br />
      <img src="./docs/images/rentmate-realtime-chat.png" width="400" />
    </td>
  </tr>
</table>

## 핵심 기여

- **데이터와 거래 흐름:** 물품 존재·`available` 상태를 검사하고 `itemId·buyerId·sellerId`로 구매 데이터를 연결했습니다. 구매는 생성 시 `completed`로 저장하는 프로토타입이며, 상태 변경 함수에서 완료·취소에 따라 물품 상태를 갱신합니다. 일반 구매 리뷰는 `itemId + buyerId + completed` 조건으로 작성 가능 여부를 확인합니다.
- **실시간 채팅:** `onSnapshot`으로 대화방·메시지를 구독하고 최근 메시지와 읽음 상태를 갱신했습니다. 컴포넌트 언마운트 시 리스너를 해제했습니다.
- **물품과 이미지 연결:** 물품 문서를 먼저 생성하고 반환된 `itemId`로 이미지 저장 경로를 구성했습니다. 파일별 크기·MIME Type 검사 후 업로드·URL 조회를 병렬로 실행하고, `Promise.all()`이 성공하면 URL 배열을 `items.images`에 반영했습니다.
- **프로필 복합 조회:** 물품·리뷰·구매 내역을 `Promise.allSettled()`로 조회해 일부 실패 시에도 성공한 결과를 표시했습니다.

Kakao Maps로 선택한 위치를 물품 데이터와 연계하고, Context API와 `useReducer`로 로그인 상태를 관리했습니다.

## 대표 문제 해결

| 문제 | 조치 | 구현 결과 |
|---|---|---|
| 일부 Firestore 복합 조회의 인덱스 오류 | 서버 `orderBy`를 제거하고 조회 결과를 클라이언트에서 정렬 | 대화방·리뷰·물품 목록의 조회 흐름 유지 |
| 메시지와 최근 대화 내용의 화면 동기화 | `onSnapshot` 구독과 `lastMessage` 갱신 | Firestore 변경을 기준으로 채팅 UI 갱신 |
| 프로필 조회 하나의 실패가 전체 화면에 영향 | 독립 요청을 `Promise.allSettled()`로 처리 | 성공한 데이터는 계속 표시 |

클라이언트 정렬은 당시 조회 오류를 피하기 위한 대응이며, 복합 인덱스 최적화나 대규모 조회 성능 개선으로 설명하지 않습니다.

## 핵심 코드

| 확인할 구현 | 파일 |
|---|---|
| 물품 등록 상태·제출 로직 | [useCreateListing.ts](src/hooks/useCreateListing.ts) |
| Firestore 물품 데이터 처리 | [firestoreItemService.ts](src/services/firestoreItemService.ts) |
| 다중 이미지 검증·병렬 업로드 | [firebaseStorageService.ts](src/services/firebaseStorageService.ts) |
| 채팅 데이터 / 메시지 구독·리스너 해제 | [firestoreMessageService.ts](src/services/firestoreMessageService.ts) / [ChatRoom.tsx](src/components/chat/ChatRoom.tsx) |
| 구매 상태·물품 상태 연계 | [firestorePurchaseService.ts](src/services/firestorePurchaseService.ts) |
| 리뷰 저장·평점 처리 | [firestoreReviewService.ts](src/services/firestoreReviewService.ts) |
| 복합 데이터 병렬 조회 | [Profile.tsx](src/pages/Profile.tsx) |

## 사용 기술

- **화면:** React · TypeScript · Vite · Tailwind CSS · Shadcn/UI
- **데이터:** Firebase Firestore · Firebase Storage
- **상태·입력:** Context API · Custom Hooks · React Hook Form · Zod
- **외부 API:** Kakao Maps JavaScript API

## 상세 문서와 구현 범위

- [개인 기여 상세와 문제 해결](docs/contribution.md)
- [시스템 구조와 데이터 흐름](docs/architecture.md)
- [프로토타입 한계와 보안 범위](docs/scope-and-security.md)
- [환경변수 이름](.env.example)

결제는 거래 흐름을 표현하는 **상태 관리**이며 실제 PG 승인·자금 정산은 포함하지 않습니다. 로그인은 프로토타입용 사용자 식별 토큰 기반으로, 클라이언트의 로그인·소유자 확인은 서버 측 권한 통제를 대신하지 않습니다. 전체 공개 범위는 위 문서에서 확인할 수 있습니다.
