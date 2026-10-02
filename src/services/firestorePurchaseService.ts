import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";

export interface Purchase {
  id: string;
  itemId: string;
  item?: {
    id: string;
    title: string;
    images: string[];
    price: number;
  };
  buyerId: string;
  sellerId: string;
  amount: number;
  status: "pending" | "completed" | "cancelled";
  createdAt: string;
  completedAt?: string;
  hasReview?: boolean;
}

export interface PurchasesResponse {
  purchases: Purchase[];
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

    return (
      decoded.userId ||
      decoded.id ||
      decoded.sub ||
      decoded.user_id ||
      null
    );
  } catch {
    return null;
  }
};

const requireUserId = (): string => {
  const token = localStorage.getItem("auth_token");

  if (!token) {
    throw new Error("로그인이 필요합니다.");
  }

  const userId = getUserIdFromToken(token);

  if (!userId) {
    throw new Error("유효하지 않은 토큰입니다.");
  }

  return userId;
};

export async function createPurchaseInFirestore(
  itemId: string,
  amount: number
): Promise<{ purchase: Purchase }> {
  try {
    const buyerId = requireUserId();
    const itemSnapshot = await getDoc(doc(db, "items", itemId));

    if (!itemSnapshot.exists()) {
      throw new Error("물품을 찾을 수 없습니다.");
    }

    const itemData = itemSnapshot.data();

    if (!itemData.available) {
      throw new Error("이미 대여 중인 물품입니다.");
    }

    const purchaseData = {
      itemId,
      buyerId,
      sellerId: itemData.ownerId,
      amount,
      status: "completed" as const,
      createdAt: serverTimestamp(),
      completedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, "purchases"),
      purchaseData
    );

    await updateDoc(doc(db, "items", itemId), {
      available: false,
      updatedAt: serverTimestamp(),
    });

    return {
      purchase: {
        id: docRef.id,
        ...purchaseData,
        item: {
          id: itemId,
          title: itemData.title,
          images: itemData.images,
          price: itemData.price,
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "구매 생성에 실패했습니다."
    );
  }
}

export async function getUserPurchasesFromFirestore(): Promise<PurchasesResponse> {
  try {
    const userId = requireUserId();

    const snapshot = await getDocs(
      query(
        collection(db, "purchases"),
        where("buyerId", "==", userId)
      )
    );

    const purchases = await Promise.all(
      snapshot.docs.map(async (purchaseDoc) => {
        const purchaseData = purchaseDoc.data();
        let item = undefined;

        if (purchaseData.itemId) {
          try {
            const itemSnapshot = await getDoc(
              doc(db, "items", purchaseData.itemId)
            );

            if (itemSnapshot.exists()) {
              const itemData = itemSnapshot.data();

              item = {
                id: purchaseData.itemId,
                title: itemData.title,
                images: itemData.images,
                price: itemData.price,
              };
            }
          } catch {
            item = undefined;
          }
        }

        let hasReview = false;

        if (purchaseData.status === "completed") {
          try {
            const reviewSnapshot = await getDocs(
              query(
                collection(db, "reviews"),
                where("purchaseId", "==", purchaseDoc.id),
                where("reviewerId", "==", userId)
              )
            );

            hasReview = !reviewSnapshot.empty;
          } catch {
            hasReview = false;
          }
        }

        return {
          id: purchaseDoc.id,
          ...purchaseData,
          item,
          hasReview,
          createdAt:
            purchaseData.createdAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
          completedAt:
            purchaseData.completedAt?.toDate?.()?.toISOString(),
        } as Purchase;
      })
    );

    purchases.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    return { purchases };
  } catch {
    throw new Error("구매 내역을 불러오는데 실패했습니다.");
  }
}

export async function updatePurchaseStatusInFirestore(
  purchaseId: string,
  status: "completed" | "cancelled"
): Promise<{ message: string; purchase: Partial<Purchase> }> {
  try {
    const purchaseRef = doc(db, "purchases", purchaseId);
    const purchaseSnapshot = await getDoc(purchaseRef);

    if (!purchaseSnapshot.exists()) {
      throw new Error("구매를 찾을 수 없습니다.");
    }

    const purchaseData = purchaseSnapshot.data();
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (status === "completed") {
      updateData.completedAt = serverTimestamp();

      await updateDoc(doc(db, "items", purchaseData.itemId), {
        available: false,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, "items", purchaseData.itemId), {
        available: true,
        updatedAt: serverTimestamp(),
      });
    }

    await updateDoc(purchaseRef, updateData);

    return {
      message:
        status === "completed"
          ? "구매가 완료되었습니다."
          : "구매가 취소되었습니다.",
      purchase: {
        id: purchaseId,
        status,
      },
    };
  } catch {
    throw new Error("구매 상태 업데이트에 실패했습니다.");
  }
}

export async function checkPurchaseCompletedInFirestore(
  itemId: string,
  buyerId: string
): Promise<{ canReview: boolean; purchaseId?: string }> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "purchases"),
        where("itemId", "==", itemId),
        where("buyerId", "==", buyerId),
        where("status", "==", "completed")
      )
    );

    if (snapshot.empty) {
      return { canReview: false };
    }

    return {
      canReview: true,
      purchaseId: snapshot.docs[0].id,
    };
  } catch {
    return { canReview: false };
  }
}
