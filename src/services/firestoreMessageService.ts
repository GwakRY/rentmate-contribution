import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";

export interface Conversation {
  id: string;
  participants: {
    id: string;
    name: string;
    avatar: string;
  }[];
  lastMessage: {
    id: string;
    senderId: string;
    content: string;
    read: boolean;
    createdAt: string;
  };
  itemId: string;
  item: {
    id: string;
    title: string;
    images: string[];
  };
  unreadCount: number;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
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
      decoded.user_id ||
      decoded.id ||
      decoded.sub ||
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

export async function getConversationsFromFirestore(): Promise<ConversationsResponse> {
  try {
    const userId = requireUserId();
    const chatRoomsRef = collection(db, "chatRooms");

    // Firestore 인덱스 제약을 고려해 서버 orderBy 대신 조회 후 정렬합니다.
    const q = query(
      chatRoomsRef,
      where("participants", "array-contains", userId)
    );

    const snapshot = await getDocs(q);

    const conversations = await Promise.all(
      snapshot.docs.map(async (chatDoc) => {
        const chatData = chatDoc.data();

        const participants = await Promise.all(
          chatData.participants.map(async (participantId: string) => {
            const userSnapshot = await getDoc(
              doc(db, "users", participantId)
            );

            if (userSnapshot.exists()) {
              const userData = userSnapshot.data();

              return {
                id: participantId,
                name: userData.name,
                avatar: userData.avatar,
              };
            }

            return {
              id: participantId,
              name: "Unknown User",
              avatar: "https://via.placeholder.com/48",
            };
          })
        );

        let item = {
          id: chatData.itemId || "",
          title: "Unknown Item",
          images: [] as string[],
        };

        if (chatData.itemId) {
          const itemSnapshot = await getDoc(
            doc(db, "items", chatData.itemId)
          );

          if (itemSnapshot.exists()) {
            const itemData = itemSnapshot.data();

            item = {
              id: chatData.itemId,
              title: itemData.title,
              images: itemData.images,
            };
          }
        }

        return {
          id: chatDoc.id,
          participants,
          lastMessage: chatData.lastMessage
            ? {
                id: chatData.lastMessage.id || "",
                senderId: chatData.lastMessage.senderId || "",
                content: chatData.lastMessage.content || "",
                read: chatData.lastMessage.read || false,
                createdAt:
                  chatData.lastMessage.createdAt
                    ?.toDate?.()
                    ?.toISOString() || new Date().toISOString(),
              }
            : {
                id: "",
                senderId: "",
                content: "대화를 시작해보세요",
                read: false,
                createdAt: new Date().toISOString(),
              },
          itemId: chatData.itemId || "",
          item,
          unreadCount: 0,
        } as Conversation;
      })
    );

    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : 0;
      const bTime = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : 0;

      return bTime - aTime;
    });

    return { conversations };
  } catch {
    throw new Error("대화 목록을 불러오는데 실패했습니다.");
  }
}

export async function getMessagesFromFirestore(
  conversationId: string,
  params: { before?: string; limit?: number } = {}
): Promise<MessagesResponse> {
  try {
    const messagesRef = collection(
      db,
      "chatRooms",
      conversationId,
      "messages"
    );

    let q = query(messagesRef, orderBy("createdAt", "asc"));

    if (params.limit) {
      q = query(q, limit(params.limit));
    }

    const snapshot = await getDocs(q);

    const messages = snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data(),
      createdAt:
        snapshotDoc.data().createdAt?.toDate?.()?.toISOString() ||
        new Date().toISOString(),
    })) as Message[];

    return {
      messages,
      hasMore: snapshot.docs.length === (params.limit || 50),
    };
  } catch {
    throw new Error("메시지를 불러오는데 실패했습니다.");
  }
}

export async function sendMessageToFirestore(
  conversationId: string,
  content: string
): Promise<{ message: Message }> {
  try {
    const userId = requireUserId();

    const messagesRef = collection(
      db,
      "chatRooms",
      conversationId,
      "messages"
    );

    const messageData = {
      senderId: userId,
      content,
      read: false,
      type: "text",
      createdAt: serverTimestamp(),
    };

    const messageDocRef = await addDoc(messagesRef, messageData);

    await updateDoc(doc(db, "chatRooms", conversationId), {
      lastMessage: {
        id: messageDocRef.id,
        senderId: userId,
        content,
        read: false,
        createdAt: serverTimestamp(),
      },
    });

    return {
      message: {
        id: messageDocRef.id,
        senderId: userId,
        content,
        read: false,
        createdAt: new Date().toISOString(),
      },
    };
  } catch {
    throw new Error("메시지 전송에 실패했습니다.");
  }
}

export async function createConversationInFirestore(
  receiverId: string,
  itemId: string,
  initialMessage: string
): Promise<{ conversationId: string; message: Message }> {
  try {
    const userId = requireUserId();
    const chatRoomsRef = collection(db, "chatRooms");

    const existingQuery = query(
      chatRoomsRef,
      where("participants", "array-contains", userId),
      where("itemId", "==", itemId)
    );

    const existingSnapshot = await getDocs(existingQuery);

    let conversationId = "";

    const existingRoom = existingSnapshot.docs.find((snapshotDoc) => {
      const participants = snapshotDoc.data().participants || [];
      return participants.includes(receiverId);
    });

    if (existingRoom) {
      conversationId = existingRoom.id;
    } else {
      const chatRoomRef = await addDoc(chatRoomsRef, {
        participants: [userId, receiverId],
        itemId,
        createdAt: serverTimestamp(),
        lastMessage: {
          id: "temp",
          senderId: userId,
          content: initialMessage,
          read: false,
          createdAt: serverTimestamp(),
        },
      });

      conversationId = chatRoomRef.id;
    }

    const messagesRef = collection(
      db,
      "chatRooms",
      conversationId,
      "messages"
    );

    const messageDocRef = await addDoc(messagesRef, {
      senderId: userId,
      content: initialMessage,
      read: false,
      type: "text",
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "chatRooms", conversationId), {
      lastMessage: {
        id: messageDocRef.id,
        senderId: userId,
        content: initialMessage,
        read: false,
        createdAt: serverTimestamp(),
      },
    });

    return {
      conversationId,
      message: {
        id: messageDocRef.id,
        senderId: userId,
        content: initialMessage,
        read: false,
        createdAt: new Date().toISOString(),
      },
    };
  } catch {
    throw new Error("대화 생성에 실패했습니다.");
  }
}

export async function markMessagesAsReadInFirestore(
  conversationId: string
): Promise<{ message: string; updatedCount: number }> {
  try {
    const userId = requireUserId();

    const messagesRef = collection(
      db,
      "chatRooms",
      conversationId,
      "messages"
    );

    const unreadQuery = query(
      messagesRef,
      where("senderId", "!=", userId),
      where("read", "==", false)
    );

    const snapshot = await getDocs(unreadQuery);

    await Promise.all(
      snapshot.docs.map((snapshotDoc) =>
        updateDoc(snapshotDoc.ref, { read: true })
      )
    );

    return {
      message: "메시지가 읽음 처리되었습니다.",
      updatedCount: snapshot.docs.length,
    };
  } catch {
    throw new Error("읽음 처리에 실패했습니다.");
  }
}
