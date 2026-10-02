
import React, { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { sendMessageToFirestore, markMessagesAsReadInFirestore } from '@/services/firestoreMessageService';
import { Message } from '@/services/firestoreMessageService';
import { User } from '@/types';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface ChatRoomProps {
  roomId: string;
  otherUser: Partial<User>;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, otherUser }) => {
  const { authState } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId || !authState.user?.id) return;

    setMessagesLoading(true);

    // 실시간 메시지 리스너 설정
    const messagesRef = collection(db, "chatRooms", roomId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const updatedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
      })) as Message[];

      setMessages(updatedMessages);
      setMessagesLoading(false);

      // 새 메시지가 있으면 스크롤 아래로
      setTimeout(scrollToBottom, 100);
    }, (error) => {

      setMessagesLoading(false);
    });

    // 읽음 처리
    markMessagesAsReadInFirestore(roomId).catch(() => {
      // 읽음 처리 실패는 메시지 표시 흐름을 중단하지 않음
    });

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {

      unsubscribe();
    };
  }, [roomId, authState.user?.id]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !authState.user?.id || !roomId) return;

    try {
      setIsLoading(true);
      await sendMessageToFirestore(roomId, newMessage.trim());
      setNewMessage('');

      // onSnapshot에서 자동으로 UI 업데이트됨
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-lg border h-full max-h-[600px]">
      <div className="flex items-center p-4 border-b bg-gray-50 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img
              src={otherUser.avatar || "https://via.placeholder.com/40"}
              alt={otherUser.name || "User"}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-medium">{otherUser.name || "사용자"}</h3>
          </div>
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-muted-foreground">메시지를 불러오는 중...</span>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === authState.user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] break-words ${
                      message.senderId === authState.user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    } px-4 py-2 rounded-lg`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className={`text-xs mt-1 ${
                      message.senderId === authState.user?.id
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    }`}>
                      {format(new Date(message.createdAt), 'HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4 flex-shrink-0 bg-white">
        <form onSubmit={handleSendMessage}>
          <div className="flex gap-2">
            <Input
              placeholder="메시지를 입력하세요..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-grow"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;
