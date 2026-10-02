import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from "react";

import {
  AuthState,
  LoginData,
  RegisterData,
  User,
} from "@/types/auth";

import {
  getUserFromFirestoreOnly,
  loginWithFirestoreOnly,
  registerWithFirestoreOnly,
} from "@/services/firestoreOnlyAuthService";

type AuthContextType = {
  authState: AuthState;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: "LOGIN_REQUEST" }
  | {
      type: "LOGIN_SUCCESS";
      payload: {
        user: User;
        token: string;
      };
    }
  | { type: "LOGIN_FAILURE"; payload: string }
  | { type: "REGISTER_REQUEST" }
  | { type: "REGISTER_SUCCESS" }
  | { type: "REGISTER_FAILURE"; payload: string }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_AUTHENTICATED"; payload: boolean };

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem("auth_token"),
  isLoading: true,
  error: null,
  isAuthenticated: false,
};

const authReducer = (
  state: AuthState,
  action: AuthAction
): AuthState => {
  switch (action.type) {
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    case "SET_AUTHENTICATED":
      return {
        ...state,
        isAuthenticated: action.payload,
      };

    case "LOGIN_REQUEST":
    case "REGISTER_REQUEST":
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case "LOGIN_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };

    case "LOGIN_FAILURE":
    case "REGISTER_FAILURE":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload,
      };

    case "REGISTER_SUCCESS":
      return {
        ...state,
        isLoading: false,
        error: null,
      };

    case "LOGOUT":
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// 프로토타입용 사용자 식별 토큰에서 userId 추출
// 실제 JWT 서명 검증을 수행하는 구조는 아님
const getUserIdFromToken = (token: string): string | null => {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));

    if (
      typeof decoded.exp === "number" &&
      decoded.exp < Date.now()
    ) {
      return null;
    }

    return typeof decoded.userId === "string"
      ? decoded.userId
      : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [authState, dispatch] = useReducer(
    authReducer,
    initialState
  );

  const login = async (data: LoginData) => {
    dispatch({ type: "LOGIN_REQUEST" });

    try {
      const response = await loginWithFirestoreOnly(data);

      if (!response.token) {
        throw new Error("인증 토큰을 생성할 수 없습니다.");
      }

      const userData = await getUserFromFirestoreOnly(
        response.userId
      );

      if (!userData) {
        throw new Error(
          "사용자 정보를 가져올 수 없습니다."
        );
      }

      localStorage.setItem(
        "auth_token",
        response.token
      );

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: {
          user: userData,
          token: response.token,
        },
      });
    } catch (error) {
      localStorage.removeItem("auth_token");

      dispatch({
        type: "LOGIN_FAILURE",
        payload:
          error instanceof Error
            ? error.message
            : "로그인에 실패했습니다.",
      });

      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    dispatch({ type: "REGISTER_REQUEST" });

    try {
      await registerWithFirestoreOnly(data);

      dispatch({ type: "REGISTER_SUCCESS" });

      await login({
        email: data.email,
        password: data.password,
      });
    } catch (error) {
      dispatch({
        type: "REGISTER_FAILURE",
        payload:
          error instanceof Error
            ? error.message
            : "회원가입에 실패했습니다.",
      });

      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    dispatch({ type: "LOGOUT" });
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  useEffect(() => {
    const restoreAuthState = async () => {
      const token =
        localStorage.getItem("auth_token");

      if (!token) {
        dispatch({
          type: "SET_AUTHENTICATED",
          payload: false,
        });
        dispatch({
          type: "SET_LOADING",
          payload: false,
        });
        return;
      }

      const userId = getUserIdFromToken(token);

      if (!userId) {
        localStorage.removeItem("auth_token");

        dispatch({
          type: "SET_AUTHENTICATED",
          payload: false,
        });

        dispatch({
          type: "SET_LOADING",
          payload: false,
        });

        return;
      }

      try {
        const userData =
          await getUserFromFirestoreOnly(userId);

        if (!userData) {
          localStorage.removeItem(
            "auth_token"
          );

          dispatch({
            type: "SET_AUTHENTICATED",
            payload: false,
          });

          dispatch({
            type: "SET_LOADING",
            payload: false,
          });

          return;
        }

        dispatch({
          type: "LOGIN_SUCCESS",
          payload: {
            user: userData,
            token,
          },
        });
      } catch {
        localStorage.removeItem("auth_token");

        dispatch({
          type: "SET_AUTHENTICATED",
          payload: false,
        });

        dispatch({
          type: "SET_LOADING",
          payload: false,
        });
      }
    };

    restoreAuthState();
  }, []);

  const contextValue: AuthContextType = {
    authState,
    login,
    register,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};
