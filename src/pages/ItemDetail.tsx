
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, ShoppingCart, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { getItemDetailFromFirestore } from "@/services/firestoreItemService";
import { createPurchase } from "@/services/purchaseService";
import { getUserPurchasesFromFirestore } from "@/services/firestorePurchaseService";
import { useChat } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Item } from "@/types";
import { getCategoryKoreanName } from "@/utils/categoryUtils";

const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { startChat, isLoading: chatLoading } = useChat();
  const { toast } = useToast();
  const { authState } = useAuth();

  // 현재 사용자가 물품 소유자인지 확인
  const isMyItem = item && authState.user && item.ownerId === authState.user.id;

  // 물품 정보 새로고침 함수
  const refreshItemData = async () => {
    if (!id) return;

    try {

      const itemData = await getItemDetailFromFirestore(id);
      setItem(itemData);

    } catch (error) {

    }
  };

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const itemData = await getItemDetailFromFirestore(id);
        setItem(itemData);
      } catch (error) {

      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  // 구매 내역 확인
  useEffect(() => {
    const checkPurchaseHistory = async () => {
      if (!id) return;

      try {
        setCheckingPurchase(true);
        const token = localStorage.getItem("auth_token");

        if (!token) {
          setAlreadyPurchased(false);
          return;
        }

        const purchasesResponse = await getUserPurchasesFromFirestore();
        const hasPurchased = purchasesResponse.purchases.some(
          purchase => purchase.itemId === id && purchase.status === "completed"
        );

        setAlreadyPurchased(hasPurchased);
      } catch (error) {

        setAlreadyPurchased(false);
      } finally {
        setCheckingPurchase(false);
      }
    };

    checkPurchaseHistory();
  }, [id]);

  // 페이지 포커스 시 물품 정보 새로고침 (리뷰 작성 후 돌아왔을 때)
  useEffect(() => {
    const handleFocus = () => {

      refreshItemData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [id]);

  const handleStartChat = () => {
    if (!item || !item.owner || !id) return;
    startChat(item.owner.id, id);
  };

  const handlePurchase = async () => {
    if (!item || !id || alreadyPurchased) return;

    try {
      setPurchasing(true);

      // Firestore에 구매 정보 저장
      await createPurchase(id, item.price);

      // 구매 완료 후 구매 상태 업데이트
      setAlreadyPurchased(true);

      toast({
        title: "구매가 완료되었습니다!",
        description: "구매해주셔서 감사합니다. 구매 내역은 마이페이지에서 확인하실 수 있습니다.",
      });
    } catch (error) {

      toast({
        title: "구매 실패",
        description: error instanceof Error ? error.message : "구매 처리 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setPurchasing(false);
    }
  };

  const nextImage = () => {
    if (item?.images && item.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % item.images.length);
    }
  };

  const prevImage = () => {
    if (item?.images && item.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + item.images.length) % item.images.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow py-8">
          <div className="container-custom">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow py-8">
          <div className="container-custom">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">물품을 찾을 수 없습니다</h1>
              <p className="text-gray-600">요청하신 물품이 존재하지 않거나 삭제되었습니다.</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Helper function to get user initials
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow py-8">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Images */}
              <div>
                {item.images && item.images.length > 0 ? (
                  <div className="relative">
                    <img
                      src={item.images[currentImageIndex]}
                      alt={`${item.title} - ${currentImageIndex + 1}`}
                      className="w-full h-80 object-cover rounded-lg"
                    />

                    {/* 이미지가 2장 이상일 때만 네비게이션 버튼 표시 */}
                    {item.images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>

                        {/* 이미지 인디케이터 */}
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                          {item.images.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-2 h-2 rounded-full ${
                                index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>

                        {/* 이미지 카운터 */}
                        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                          {currentImageIndex + 1} / {item.images.length}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">이미지 없음</span>
                  </div>
                )}

                {/* 썸네일 이미지들 (이미지가 2장 이상일 때만 표시) */}
                {item.images && item.images.length > 1 && (
                  <div className="flex space-x-2 mt-4 overflow-x-auto">
                    {item.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                          index === currentImageIndex ? 'border-primary' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`썸네일 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div>
                <h1 className="text-3xl font-bold mb-4">{item.title}</h1>
                <p className="text-2xl font-semibold text-primary mb-4">
                  {item.price.toLocaleString()}원
                </p>
                <p className="text-gray-600 mb-6">{item.description}</p>

                <div className="space-y-2 mb-6">
                  <p><span className="font-semibold">카테고리:</span> {getCategoryKoreanName(item.category)}</p>
                  <p><span className="font-semibold">위치:</span> {item.location}</p>
                  <p><span className="font-semibold">상태:</span> {item.available ? "판매 가능" : "판매 완료"}</p>
                </div>

                {/* 내가 올린 상품인 경우 수정 버튼 표시 */}
                {isMyItem && (
                  <div className="mb-4">
                    <Link to={`/items/${id}/edit`}>
                      <Button
                        className="w-full flex items-center justify-center space-x-2"
                        size="lg"
                      >
                        <Edit className="h-5 w-5" />
                        <span>물품 정보 수정</span>
                      </Button>
                    </Link>
                  </div>
                )}

                {/* 내가 올린 상품이 아닌 경우에만 버튼들 표시 */}
                {!isMyItem && (
                  <>
                    {/* 대여 문의하기 버튼 */}
                    <div className="mb-4">
                      <Button
                        onClick={handleStartChat}
                        disabled={chatLoading || !item.available}
                        className="w-full flex items-center justify-center space-x-2"
                        size="lg"
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span>
                          {chatLoading ? "대화방 생성 중..." : "판매자와 대화하기"}
                        </span>
                      </Button>
                    </div>

                    {/* 구매하기 버튼 */}
                    <div className="mb-6">
                      {checkingPurchase ? (
                        <Button
                          disabled
                          className="w-full flex items-center justify-center space-x-2"
                          size="lg"
                          variant="secondary"
                        >
                          <span>구매 내역 확인 중...</span>
                        </Button>
                      ) : alreadyPurchased ? (
                        <div className="w-full text-center p-3 bg-gray-100 rounded-lg">
                          <span className="text-gray-600 font-medium">이미 구매한 상품입니다</span>
                        </div>
                      ) : (
                        <Button
                          onClick={handlePurchase}
                          disabled={!item.available || purchasing}
                          className="w-full flex items-center justify-center space-x-2"
                          size="lg"
                          variant="secondary"
                        >
                          <ShoppingCart className="h-5 w-5" />
                          <span>{purchasing ? "구매 처리 중..." : "구매하기"}</span>
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {/* 내가 올린 상품인 경우 메시지 표시 */}
                {isMyItem && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-blue-800 font-medium text-center">
                      내가 등록한 상품입니다
                    </p>
                  </div>
                )}

                {item.owner && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">판매자 정보</h3>
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                          {getUserInitials(item.owner.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{item.owner.name}</p>
                        {item.owner.reviewCount > 0 ? (
                          <p className="text-sm text-gray-600">
                            평점: {item.owner.rating}/5 ({item.owner.reviewCount}개 리뷰)
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600">
                            아직 리뷰가 없습니다
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ItemDetail;
