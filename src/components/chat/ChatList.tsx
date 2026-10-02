
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { User } from '@/types';
import { Conversation } from '@/services/firestoreMessageService';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface ChatListProps {
  onSelectRoom: (roomId: string, otherUser: Partial<User>) => void;
  selectedRoomId?: string | null;
  forceRefresh?: number;
}

const ChatList: React.FC<ChatListProps> = ({ onSelectRoom, selectedRoomId, forceRefresh }) => {
  const { authState } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // 프로토타입용 사용자 식별 토큰에서 userId 추출
  const getUserIdFromToken = (token: string): string | null => {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.userId || decoded.user_id || decoded.id || null;
    } catch (error) {

      return null;
    }
  };

  useEffect(() => {
    if (!authState.user?.id) return;

    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const userId = getUserIdFromToken(token);
    if (!userId) return;

    setLoading(true);

    // 실시간 대화방 목록 리스너 설정
    const chatRoomsRef = collection(db, "chatRooms");
    const q = query(
      chatRoomsRef,
      where("participants", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {

      try {
        const conversations = await Promise.all(
          snapshot.docs.map(async (chatDoc) => {
            const chatData = chatDoc.data();

            // 참여자 정보 조회
            const participants = await Promise.all(
              chatData.participants.map(async (participantId: string) => {
                const userDoc = await getDoc(doc(db, "users", participantId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  return {
                    id: participantId,
                    name: userData.name,
                    avatar: userData.avatar
                  };
                }
                return {
                  id: participantId,
                  name: "Unknown User",
                  avatar: "https://via.placeholder.com/48"
                };
              })
            );

            // 물품 정보 조회
            let item = {
              id: chatData.itemId || "",
              title: "Unknown Item",
              images: []
            };

            if (chatData.itemId) {
              const itemDoc = await getDoc(doc(db, "items", chatData.itemId));
              if (itemDoc.exists()) {
                const itemData = itemDoc.data();
                item = {
                  id: chatData.itemId,
                  title: itemData.title,
                  images: itemData.images
                };
              }
            }

            return {
              id: chatDoc.id,
              participants,
              lastMessage: chatData.lastMessage ? {
                id: chatData.lastMessage.id || "",
                senderId: chatData.lastMessage.senderId || "",
                content: chatData.lastMessage.content || "",
                read: chatData.lastMessage.read || false,
                createdAt: chatData.lastMessage.createdAt?.toDate()?.toISOString() || new Date().toISOString()
              } : {
                id: "",
                senderId: "",
                content: "대화를 시작해보세요",
                read: false,
                createdAt: new Date().toISOString()
              },
              itemId: chatData.itemId || "",
              item,
              unreadCount: 0
            } as Conversation;
          })
        );

        // 클라이언트 사이드에서 정렬 (createdAt 기준 내림차순)
        const sortedConversations = conversations.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        setConversations(sortedConversations);
        setLoading(false);
      } catch (error) {

        setLoading(false);
      }
    }, (error) => {

      setLoading(false);
    });

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {

      unsubscribe();
    };
  }, [authState.user?.id]);

  // selectedRoomId가 있는 경우 해당 대화방 찾기 및 선택
  useEffect(() => {
    if (selectedRoomId && conversations.length > 0) {
      const selectedConversation = conversations.find(conv => conv.id === selectedRoomId);
      if (selectedConversation) {
        const otherUser = getOtherUser(selectedConversation);

        onSelectRoom(selectedRoomId, otherUser);
      }
    }
  }, [selectedRoomId, conversations, onSelectRoom]);

  const getOtherUser = (conversation: Conversation): Partial<User> => {
    if (!authState.user?.id) return {};
    return conversation.participants.find(p => p.id !== authState.user?.id) || {};
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full border rounded-lg">
        <span className="text-muted-foreground">로딩중...</span>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full flex flex-col border rounded-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">대화 목록</h3>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="mb-2">아직 대화가 없습니다</p>
            <p className="text-sm">대여 아이템 상세 페이지에서<br />대화를 시작해보세요</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="font-semibold">대화 목록</h3>
      </div>

      <div className="flex-grow overflow-y-auto divide-y">
        {conversations.map((conversation) => {
          const otherUser = getOtherUser(conversation);
          const isSelected = conversation.id === selectedRoomId;

          return (
            <div
              key={conversation.id}
              onClick={() => onSelectRoom(conversation.id, otherUser)}
              className={cn(
                "p-4 cursor-pointer",
                isSelected
                  ? "bg-primary/5"
                  : "hover:bg-accent/50"
              )}
            >
              <div className="flex items-center">
                <div className="relative">
                  <img
                    src={otherUser.avatar || "https://via.placeholder.com/48"}
                    alt={otherUser.name || "User"}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </div>
                <div className="ml-3 flex-grow min-w-0">
                  <div className="flex justify-between">
                    <h3 className="font-medium">{otherUser.name || "알 수 없는 사용자"}</h3>
                    {conversation.lastMessage && conversation.lastMessage.createdAt && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conversation.lastMessage.createdAt), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                    {conversation.lastMessage?.content || "대화를 시작해보세요"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatList;
