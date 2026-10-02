
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { createConversationInFirestore } from "@/services/firestoreMessageService";
import { useAuth } from "@/contexts/AuthContext";

export function useChat() {
  const [isLoading, setIsLoading] = useState(false);
  const { authState } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const startChat = async (ownerId: string, itemId: string, initialMessage: string = "안녕하세요! 이 물품에 대해 문의드립니다.") => {

    if (!authState.isAuthenticated || !authState.user || !authState.token) {

      toast({
        title: "로그인이 필요합니다",
        description: "대화를 시작하려면 로그인해주세요.",
        variant: "destructive",
      });
      navigate("/login", { state: { from: `/items/${itemId}` } });
      return;
    }

    if (ownerId === authState.user.id) {
      toast({
        title: "내 아이템입니다",
        description: "자신의 아이템에 대해서는 대화를 시작할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const response = await createConversationInFirestore(ownerId, itemId, initialMessage);


      toast({
        title: "대화방 생성 완료",
        description: "대화를 시작할 수 있습니다.",
      });

      // 즉시 메시지 페이지로 이동

      navigate("/messages", {
        state: { roomId: response.conversationId },
        replace: true
      });
    } catch (error) {

      toast({
        title: "오류 발생",
        description: "대화방을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    startChat,
    isLoading,
  };
}
