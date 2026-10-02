
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatList from "@/components/chat/ChatList";
import ChatRoom from "@/components/chat/ChatRoom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types";

const Messages = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);

  useEffect(() => {
    if (!authState.isAuthenticated) {
      toast({
        title: "로그인이 필요합니다",
        description: "메시지 기능을 이용하려면 로그인해주세요.",
        variant: "destructive",
      });
      navigate("/login", { state: { from: "/messages" } });
      return;
    }

    // URL state에서 roomId가 전달된 경우 해당 룸을 선택
    const stateRoomId = location.state?.roomId;
    if (stateRoomId) {

      setSelectedRoom(stateRoomId);
      // ChatList 강제 새로고침
      setForceRefresh(prev => prev + 1);
      // state 초기화 (뒤로가기 시 중복 처리 방지)
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [authState.isAuthenticated, navigate, toast, location.state, location.pathname]);

  const handleSelectRoom = (roomId: string, otherUser: Partial<User>) => {

    setSelectedRoom(roomId);
    setSelectedUser(otherUser);
  };

  if (!authState.isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow py-6">
        <div className="container-custom">
          <h1 className="text-2xl font-bold mb-6">메시지</h1>

          <div className="grid md:grid-cols-3 gap-6" style={{ height: '600px' }}>
            <div className="md:col-span-1 overflow-hidden">
              <ChatList
                onSelectRoom={handleSelectRoom}
                selectedRoomId={selectedRoom}
                forceRefresh={forceRefresh}
              />
            </div>

            <div className="md:col-span-2 overflow-hidden">
              {selectedRoom && selectedUser ? (
                <ChatRoom roomId={selectedRoom} otherUser={selectedUser} />
              ) : selectedRoom ? (
                <div className="flex items-center justify-center h-full border rounded-lg bg-gray-50">
                  <div className="text-center text-gray-500">
                    <p className="mb-2">대화 정보를 불러오는 중...</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full border rounded-lg bg-gray-50">
                  <div className="text-center text-gray-500">
                    <p className="mb-2">대화를 선택해주세요</p>
                    <p className="text-sm">왼쪽 목록에서 대화를 선택하거나<br />아이템 상세 페이지에서 새 대화를 시작하세요</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Messages;
