import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";

export interface Payment {
  id: string;
  reservationId: string;
  itemId: string;
  item?: {
    id: string;
    title: string;
  };
  amount: number;
  status:
    | "pending"
    | "completed"
    | "failed"
    | "refunded"
    | "held"
    | "released";
  paymentMethod: string;
  transactionId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentsResponse {
  payments: Payment[];
}

const getUserIdFromToken = (token: string): string | null => {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const decoded = JSON.parse(atob(parts[1]));

    if (typeof decoded.exp === "number" && decoded.exp < Date.now()) {
      return null;
    }

    return decoded.userId || null;
  } catch {
    return null;
  }
};

export async function createPaymentInFirestore(
  reservationId: string,
  paymentMethod: string
): Promise<{ payment: Payment }> {
  try {
    const reservationSnapshot = await getDoc(
      doc(db, "reservations", reservationId)
    );

    if (!reservationSnapshot.exists()) {
      throw new Error("예약을 찾을 수 없습니다.");
    }

    const reservationData = reservationSnapshot.data();
    const itemSnapshot = await getDoc(
      doc(db, "items", reservationData.itemId)
    );
    const itemData = itemSnapshot.exists() ? itemSnapshot.data() : null;

    const paymentData = {
      reservationId,
      itemId: reservationData.itemId,
      amount: reservationData.totalPrice,
      status: "held" as const,
      paymentMethod,
      transactionId: `tx_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "payments"), paymentData);

    return {
      payment: {
        id: docRef.id,
        ...paymentData,
        item: itemData
          ? {
              id: reservationData.itemId,
              title: itemData.title,
            }
          : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "결제 생성에 실패했습니다."
    );
  }
}

export async function getPaymentHistoryFromFirestore(): Promise<PaymentsResponse> {
  try {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      throw new Error("로그인이 필요합니다.");
    }

    const userId = getUserIdFromToken(token);

    if (!userId) {
      throw new Error("유효하지 않은 토큰입니다.");
    }

    const reservationsSnapshot = await getDocs(
      query(
        collection(db, "reservations"),
        where("renterId", "==", userId)
      )
    );

    const reservationIds = reservationsSnapshot.docs.map(
      (snapshotDoc) => snapshotDoc.id
    );

    if (reservationIds.length === 0) {
      return { payments: [] };
    }

    const paymentsSnapshot = await getDocs(
      query(
        collection(db, "payments"),
        where("reservationId", "in", reservationIds),
        orderBy("createdAt", "desc")
      )
    );

    const payments = await Promise.all(
      paymentsSnapshot.docs.map(async (paymentDoc) => {
        const paymentData = paymentDoc.data();
        let item = undefined;

        if (paymentData.itemId) {
          const itemSnapshot = await getDoc(
            doc(db, "items", paymentData.itemId)
          );

          if (itemSnapshot.exists()) {
            const itemData = itemSnapshot.data();

            item = {
              id: paymentData.itemId,
              title: itemData.title,
            };
          }
        }

        return {
          id: paymentDoc.id,
          ...paymentData,
          item,
          createdAt:
            paymentData.createdAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
          updatedAt:
            paymentData.updatedAt?.toDate?.()?.toISOString(),
        } as Payment;
      })
    );

    return { payments };
  } catch {
    throw new Error("결제 내역을 불러오는데 실패했습니다.");
  }
}

export async function cancelPaymentInFirestore(
  paymentId: string,
  _reason: string
): Promise<{ message: string; payment: Partial<Payment> }> {
  try {
    const paymentRef = doc(db, "payments", paymentId);
    const paymentSnapshot = await getDoc(paymentRef);

    if (!paymentSnapshot.exists()) {
      throw new Error("결제를 찾을 수 없습니다.");
    }

    await updateDoc(paymentRef, {
      status: "refunded",
      updatedAt: serverTimestamp(),
    });

    return {
      message: "결제가 취소되었습니다.",
      payment: {
        id: paymentId,
        status: "refunded",
      },
    };
  } catch {
    throw new Error("결제 취소에 실패했습니다.");
  }
}

export async function confirmPaymentInFirestore(
  paymentId: string
): Promise<{ message: string; payment: Partial<Payment> }> {
  try {
    const paymentRef = doc(db, "payments", paymentId);
    const paymentSnapshot = await getDoc(paymentRef);

    if (!paymentSnapshot.exists()) {
      throw new Error("결제를 찾을 수 없습니다.");
    }

    await updateDoc(paymentRef, {
      status: "completed",
      updatedAt: serverTimestamp(),
    });

    return {
      message: "결제가 확정되었습니다.",
      payment: {
        id: paymentId,
        status: "completed",
      },
    };
  } catch {
    throw new Error("결제 확정에 실패했습니다.");
  }
}

export async function releasePaymentInFirestore(
  paymentId: string
): Promise<{ message: string; payment: Partial<Payment> }> {
  try {
    const paymentRef = doc(db, "payments", paymentId);
    const paymentSnapshot = await getDoc(paymentRef);

    if (!paymentSnapshot.exists()) {
      throw new Error("결제를 찾을 수 없습니다.");
    }

    await updateDoc(paymentRef, {
      status: "released",
      updatedAt: serverTimestamp(),
    });

    return {
      message: "대금이 판매자에게 지급되었습니다.",
      payment: {
        id: paymentId,
        status: "released",
      },
    };
  } catch {
    throw new Error("대금 지급에 실패했습니다.");
  }
}
