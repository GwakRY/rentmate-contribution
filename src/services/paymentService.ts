
// 기존 백엔드 API 대신 Firestore 함수들을 사용하도록 변경
export * from './firestorePaymentService';

// 하위 호환성을 위해 기존 함수명을 새 함수로 매핑
export { 
  createPaymentInFirestore as createPayment,
  getPaymentHistoryFromFirestore as getPaymentHistory,
  cancelPaymentInFirestore as cancelPayment,
  confirmPaymentInFirestore as confirmPayment,
  releasePaymentInFirestore as releasePayment
} from './firestorePaymentService';
