import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { uploadImagesToFirebaseStorage } from "./firebaseStorageService";
import { getUserReviewsFromFirestore } from "./firestoreReviewService";

export interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  location: string;
  ownerId: string;
  owner?: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    rating: number;
    reviewCount: number;
    createdAt: string;
  };
  available: boolean;
  availableDates: string[];
  createdAt: any;
  updatedAt?: any;
}

export interface ItemsResponse {
  items: Item[];
  total: number;
  hasMore: boolean;
}

export interface ItemCreateData {
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  availableDates: string[];
}

const AUTH_TOKEN_KEY = "auth_token";

const getUserIdFromToken = (token: string): string | null => {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }

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
      decoded.sub ||
      decoded.id ||
      decoded.user_id ||
      null
    );
  } catch {
    return null;
  }
};

const requireUserId = (): string => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (!token) {
    throw new Error("로그인이 필요합니다. 다시 로그인해주세요.");
  }

  const userId = getUserIdFromToken(token);

  if (!userId) {
    throw new Error("유효하지 않은 토큰입니다. 다시 로그인해주세요.");
  }

  return userId;
};

export async function getItemsFromFirestore(
  params: {
    category?: string;
    location?: string;
    limit?: number;
    lastDoc?: any;
  } = {}
): Promise<ItemsResponse> {
  try {
    const itemsRef = collection(db, "items");
    let q;

    if (params.category) {
      q = query(itemsRef, where("category", "==", params.category));

      if (params.location) {
        q = query(q, where("location", "==", params.location));
      }

      if (params.limit) {
        q = query(q, limit(params.limit));
      }
    } else {
      q = query(itemsRef, orderBy("createdAt", "desc"));

      if (params.location) {
        q = query(q, where("location", "==", params.location));
      }

      if (params.limit) {
        q = query(q, limit(params.limit));
      }
    }

    if (params.lastDoc) {
      q = query(q, startAfter(params.lastDoc));
    }

    const snapshot = await getDocs(q);

    const items = snapshot.docs.map((snapshotDoc) => {
      const data = snapshotDoc.data() as Omit<Item, "id">;

      return {
        id: snapshotDoc.id,
        ...data,
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
      } as Item;
    });

    if (params.category && items.length > 0) {
      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
    }

    return {
      items,
      total: items.length,
      hasMore: snapshot.docs.length === (params.limit || 10),
    };
  } catch {
    throw new Error("물품 목록을 불러오는데 실패했습니다.");
  }
}

export async function getItemDetailFromFirestore(
  itemId: string
): Promise<Item> {
  try {
    const itemSnapshot = await getDoc(doc(db, "items", itemId));

    if (!itemSnapshot.exists()) {
      throw new Error("물품을 찾을 수 없습니다.");
    }

    const itemData = itemSnapshot.data();
    let owner = undefined;

    if (itemData.ownerId) {
      try {
        const ownerSnapshot = await getDoc(
          doc(db, "users", itemData.ownerId)
        );

        if (ownerSnapshot.exists()) {
          const ownerData = ownerSnapshot.data();
          let rating = 0;
          let reviewCount = 0;

          try {
            const reviewsResponse =
              await getUserReviewsFromFirestore(itemData.ownerId);
            rating = reviewsResponse.averageRating || 0;
            reviewCount = reviewsResponse.reviewCount || 0;
          } catch {
            rating = 0;
            reviewCount = 0;
          }

          owner = {
            id: ownerData.id || itemData.ownerId,
            name: ownerData.name || "사용자",
            email: ownerData.email || "",
            avatar: ownerData.avatar || "https://via.placeholder.com/48",
            rating,
            reviewCount,
            createdAt:
              ownerData.createdAt?.toDate?.()?.toISOString() || "",
          };
        }
      } catch {
        owner = undefined;
      }
    }

    return {
      id: itemSnapshot.id,
      ...itemData,
      owner,
      createdAt:
        itemData.createdAt?.toDate?.()?.toISOString() ||
        new Date().toISOString(),
    } as Item;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "물품 정보를 불러오는데 실패했습니다."
    );
  }
}

export async function createItemInFirestore(
  data: ItemCreateData,
  images?: File[]
): Promise<{ message: string; itemId: string }> {
  try {
    const userId = requireUserId();

    const itemData = {
      ...data,
      ownerId: userId,
      available: true,
      images: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "items"), itemData);

    if (images && images.length > 0) {
      try {
        const imageUrls = await uploadImagesToFirebaseStorage(
          docRef.id,
          images
        );

        await updateDoc(doc(db, "items", docRef.id), {
          images: imageUrls,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        throw new Error(
          `물품은 등록되었지만 이미지 업로드에 실패했습니다: ${
            error instanceof Error ? error.message : "알 수 없는 오류"
          }`
        );
      }
    }

    return {
      message: "물품이 성공적으로 등록되었습니다.",
      itemId: docRef.id,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("물품 등록에 실패했습니다.");
  }
}

export async function updateItemInFirestore(
  itemId: string,
  data: Partial<
    ItemCreateData & { available: boolean; images: string[] }
  >
): Promise<{ message: string; item: Partial<Item> }> {
  try {
    const itemRef = doc(db, "items", itemId);

    await updateDoc(itemRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    return {
      message: "물품 정보가 성공적으로 수정되었습니다.",
      item: { id: itemId, ...data },
    };
  } catch {
    throw new Error("물품 정보 수정에 실패했습니다.");
  }
}

export async function deleteItemFromFirestore(
  itemId: string
): Promise<{ message: string }> {
  try {
    await deleteDoc(doc(db, "items", itemId));

    return {
      message: "물품이 성공적으로 삭제되었습니다.",
    };
  } catch {
    throw new Error("물품 삭제에 실패했습니다.");
  }
}

export async function uploadItemImagesToFirestore(
  itemId: string,
  images: File[]
): Promise<{ message: string; imageUrls: string[] }> {
  try {
    const imageUrls = await uploadImagesToFirebaseStorage(itemId, images);

    await updateDoc(doc(db, "items", itemId), {
      images: imageUrls,
      updatedAt: serverTimestamp(),
    });

    return {
      message: "이미지가 성공적으로 업로드되었습니다.",
      imageUrls,
    };
  } catch {
    throw new Error("이미지 업로드에 실패했습니다.");
  }
}
