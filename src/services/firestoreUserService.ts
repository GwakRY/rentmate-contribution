import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  phoneVerified?: boolean;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
  items?: {
    id: string;
    title: string;
    images: string[];
    price: number;
  }[];
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

export async function getUserProfileFromFirestore(
  userId: string
): Promise<User> {
  try {
    const userSnapshot = await getDoc(doc(db, "users", userId));

    if (!userSnapshot.exists()) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    const userData = userSnapshot.data();

    return {
      id: userData.id || userId,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      avatar: "",
      phoneVerified: false,
      rating: 4.5,
      reviewCount: 0,
      createdAt:
        userData.createdAt?.toDate?.()?.toISOString() ||
        new Date().toISOString(),
    } as User;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "사용자 정보를 불러오는데 실패했습니다."
    );
  }
}

export async function getMyProfileFromFirestore(): Promise<User> {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
      throw new Error("로그인이 필요합니다.");
    }

    const userId = getUserIdFromToken(token);

    if (!userId) {
      throw new Error("유효하지 않은 토큰입니다.");
    }

    return await getUserProfileFromFirestore(userId);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "프로필 정보를 불러오는데 실패했습니다."
    );
  }
}

export async function updateUserProfileInFirestore(
  data: Partial<{ name: string; email: string; phone: string }>
): Promise<{ message: string; user: Partial<User> }> {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
      throw new Error("로그인이 필요합니다.");
    }

    const userId = getUserIdFromToken(token);

    if (!userId) {
      throw new Error("유효하지 않은 토큰입니다.");
    }

    await updateDoc(doc(db, "users", userId), {
      ...data,
      updatedAt: serverTimestamp(),
    });

    return {
      message: "프로필이 성공적으로 수정되었습니다.",
      user: { id: userId, ...data },
    };
  } catch {
    throw new Error("프로필 수정에 실패했습니다.");
  }
}

export async function uploadProfileImageToFirestore(
  _image: File
): Promise<{ message: string; avatar: string }> {
  throw new Error("프로필 이미지 업로드는 현재 지원되지 않습니다.");
}
