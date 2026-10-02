import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import {
  AuthResponse,
  LoginData,
  RegisterData,
  User,
} from "@/types/auth";

// 프로토타입용 비밀번호 해싱.
// 운영 환경에서는 전용 인증 시스템과 salt 기반 비밀번호 해싱 사용을 권장합니다.
const hashPassword = async (password: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    throw new Error("비밀번호 처리 중 오류가 발생했습니다.");
  }
};

// 프로토타입용 사용자 식별 토큰.
// 실제 JWT 서명/검증 구조가 아니므로 운영 환경 인증 용도로 사용하지 않습니다.
const generateToken = (userId: string): string => {
  const header = btoa(JSON.stringify({ typ: "TOKEN" }));
  const payload = btoa(
    JSON.stringify({
      userId,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    })
  );
  const signature = btoa(`${header}.${payload}`);

  return `${header}.${payload}.${signature}`;
};

export async function registerWithFirestoreOnly(
  data: RegisterData
): Promise<AuthResponse> {
  try {
    const usersRef = collection(db, "users");
    const emailQuery = query(usersRef, where("email", "==", data.email));
    const emailSnapshot = await getDocs(emailQuery);

    if (!emailSnapshot.empty) {
      throw new Error("이미 등록된 이메일입니다.");
    }

    const hashedPassword = await hashPassword(data.password);
    const userId = `user_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 11)}`;

    const userData = {
      id: userId,
      email: data.email,
      name: data.name,
      phone: data.phone || "",
      password: hashedPassword,
      avatar: "https://via.placeholder.com/40",
      createdAt: new Date(),
      lastLoginAt: null,
    };

    await setDoc(doc(db, "users", userId), userData);

    return {
      message: "회원가입이 완료되었습니다.",
      token: generateToken(userId),
      userId,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "회원가입에 실패했습니다."
    );
  }
}

export async function loginWithFirestoreOnly(
  data: LoginData
): Promise<AuthResponse> {
  try {
    const usersRef = collection(db, "users");
    const emailQuery = query(usersRef, where("email", "==", data.email));
    const emailSnapshot = await getDocs(emailQuery);

    if (emailSnapshot.empty) {
      throw new Error("등록되지 않은 이메일입니다.");
    }

    const userData = emailSnapshot.docs[0].data();
    const hashedInputPassword = await hashPassword(data.password);

    if (userData.password !== hashedInputPassword) {
      throw new Error("비밀번호가 일치하지 않습니다.");
    }

    await setDoc(
      doc(db, "users", userData.id),
      { lastLoginAt: new Date() },
      { merge: true }
    );

    return {
      message: "로그인 성공",
      token: generateToken(userData.id),
      userId: userData.id,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "로그인에 실패했습니다."
    );
  }
}

export async function getUserFromFirestoreOnly(
  userId: string
): Promise<User | null> {
  try {
    const userSnapshot = await getDoc(doc(db, "users", userId));

    if (!userSnapshot.exists()) {
      return null;
    }

    const userData = userSnapshot.data();

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      phone: userData.phone,
      avatar: userData.avatar,
    } as User;
  } catch {
    return null;
  }
}
