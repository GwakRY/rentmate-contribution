import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyItemCard from "@/components/MyItemCard";
import { Button } from "@/components/ui/button";
import { LogOut, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfileFromFirestore } from "@/services/firestoreUserService";
import { getItemsFromFirestore } from "@/services/firestoreItemService";
import { getUserReviewsFromFirestore } from "@/services/firestoreReviewService";
import { getUserPurchasesFromFirestore } from "@/services/firestorePurchaseService";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ReviewWriteModal from "@/components/ReviewWriteModal";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface LocalUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
}

interface LocalItem {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  location: string;
  ownerId: string;
  available: boolean;
  createdAt: string;
  owner?: any;
  availableDates?: string[];
}

interface LocalReview {
  id: string;
  rating: number;
  content: string;
  reviewerId: string;
  reviewer?: {
    name: string;
    avatar: string;
  };
  createdAt: string;
}

const Profile = () => {
  const { authState, logout } = useAuth();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [userItems, setUserItems] = useState<LocalItem[]>([]);
  const [userReviews, setUserReviews] = useState<LocalReview[]>([]);
  const [userPurchases, setUserPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [actualRating, setActualRating] = useState<number | null>(null);

  // 인증 상태 확인 및 리다이렉트 처리
  useEffect(() => {

    // 인증 상태 로딩이 완료된 후에만 체크
    if (!authState.isLoading) {
      if (!authState.isAuthenticated || !authState.user) {

        toast.error("로그인이 필요합니다.");
        navigate("/login");
        return;
      }
    }
  }, [authState.isLoading, authState.isAuthenticated, authState.user, navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      // 인증 상태가 아직 로딩 중이거나 사용자 정보가 없으면 대기
      if (authState.isLoading || !authState.user?.id || !authState.isAuthenticated) {

        return;
      }

      try {
        setLoading(true);

        // 사용자 프로필 정보 가져오기

        const userProfile = await getUserProfileFromFirestore(authState.user.id);

        setCurrentUser({
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          avatar: userProfile.avatar || "https://via.placeholder.com/112",
          createdAt: userProfile.createdAt
        });

        // 병렬로 데이터 조회하되 각각 독립적으로 에러 처리

        const [itemsResult, reviewsResult, purchasesResult] = await Promise.allSettled([
          // 사용자가 등록한 물품들 가져오기
          (async () => {
            try {

              const itemsResponse = await getItemsFromFirestore();
              const myItems = itemsResponse.items.filter(item => item.ownerId === authState.user.id);

              const transformedItems = myItems.map(item => ({
                ...item,
                owner: undefined,
                availableDates: item.availableDates || []
              }));
              return transformedItems;
            } catch (error) {

              return [];
            }
          })(),

          // 사용자에 대한 리뷰들 가져오기
          (async () => {
            try {

              const reviewsResponse = await getUserReviewsFromFirestore(authState.user.id);

              // 실제 계산된 평점 설정
              setActualRating(reviewsResponse.averageRating > 0 ? reviewsResponse.averageRating : null);

              const transformedReviews = reviewsResponse.reviews.map(review => ({
                id: review.id,
                rating: review.rating,
                content: review.content,
                reviewerId: review.reviewerId,
                reviewer: review.reviewer,
                createdAt: review.createdAt
              }));
              return transformedReviews;
            } catch (error) {

              setActualRating(null);
              return [];
            }
          })(),

          // 구매 내역 가져오기 - 추가 디버깅
          (async () => {
            try {

              const purchasesResponse = await getUserPurchasesFromFirestore();

              return purchasesResponse.purchases;
            } catch (error) {

              return [];
            }
          })()
        ]);

        // 각 결과 처리
        if (itemsResult.status === 'fulfilled') {
          setUserItems(itemsResult.value);

        } else {

          setUserItems([]);
        }

        if (reviewsResult.status === 'fulfilled') {
          setUserReviews(reviewsResult.value);

        } else {

          setUserReviews([]);
        }

        if (purchasesResult.status === 'fulfilled') {
          setUserPurchases(purchasesResult.value);

        } else {

          setUserPurchases([]);
        }

      } catch (error) {

        toast.error("프로필 정보를 불러오는데 실패했습니다: " + (error instanceof Error ? error.message : "알 수 없는 에러"));
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [authState.user?.id, authState.isAuthenticated, authState.isLoading]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("로그아웃되었습니다.");
      navigate("/");
    } catch (error) {

      toast.error("로그아웃에 실패했습니다.");
    }
  };

  const handleWriteReview = (purchase: any) => {
    setSelectedPurchase(purchase);
    setReviewModalOpen(true);
  };

  const handleReviewSubmitted = () => {
    // 후기 작성 완료 후 구매 내역 새로고침
    const fetchUserData = async () => {
      if (authState.isLoading || !authState.user?.id || !authState.isAuthenticated) {
        return;
      }

      try {
        setLoading(true);

        // 구매 내역만 새로고침
        const purchasesResponse = await getUserPurchasesFromFirestore();
        setUserPurchases(purchasesResponse.purchases);

      } catch (error) {

        toast.error("구매 내역을 새로고침하는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    toast.success("후기가 작성되었습니다!");
  };

  const handleItemDeleted = (itemId: string) => {
    setUserItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  // 사용자 이니셜 생성 함수
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // 인증 상태가 아직 로딩 중이면 로딩 화면 표시
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="spinner mb-4"></div>
            <p className="text-gray-500">인증 상태를 확인하는 중...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 인증되지 않은 경우 null 반환 (리다이렉트 처리됨)
  if (!authState.isAuthenticated || !authState.user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="spinner mb-4"></div>
            <p className="text-gray-500">프로필을 불러오는 중...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <p className="text-gray-500">프로필 정보를 찾을 수 없습니다.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow py-10">
        <div className="container-custom">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
            <div className="relative">
              <Avatar className="w-28 h-28">
                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                  {getUserInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
            </div>

            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold">{currentUser.name}</h1>
              </div>
              <div className="flex items-center mt-2 text-gray-600">
                {actualRating !== null ? (
                  <span className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-yellow-400 fill-yellow-400"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    <span className="ml-1">{actualRating}</span>
                  </span>
                ) : (
                  <span className="text-gray-500">평점 없음</span>
                )}
                <span className="mx-2">•</span>
                <span>후기 {userReviews.length}개</span>
                <span className="mx-2">•</span>
                <span>가입일: {new Date(currentUser.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-2 text-gray-600">
                안녕하세요! 필요하지 않은 물건을 대여해드립니다.
              </p>
            </div>

            <div className="md:ml-auto">
              <Button
                variant="outline"
                className="flex items-center gap-2 text-red-500 border-red-200"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" /> 로그아웃
              </Button>
            </div>
          </div>

          {/* Profile Tabs */}
          <Tabs defaultValue="my-items" className="space-y-8">
            <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto">
              <TabsTrigger
                value="my-items"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 text-base"
              >
                내 물품 ({userItems.length})
              </TabsTrigger>
              <TabsTrigger
                value="purchases"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 text-base"
              >
                구매 내역 ({userPurchases.length})
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 text-base"
              >
                후기 ({userReviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-items">
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">내가 등록한 물품</h2>
                  <Button asChild>
                    <Link to="/create-listing" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      새 물품 등록
                    </Link>
                  </Button>
                </div>

                {userItems.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-4">등록한 물품이 없습니다.</p>
                    <Button asChild>
                      <Link to="/create-listing">첫 물품 등록하기</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {userItems.map(item => (
                      <MyItemCard
                        key={item.id}
                        item={item}
                        onItemDeleted={handleItemDeleted}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="purchases">
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">구매 내역</h2>
                </div>

                {userPurchases.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">구매한 상품이 없습니다.</p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">상품</TableHead>
                          <TableHead className="text-center">금액</TableHead>
                          <TableHead className="text-center">상태</TableHead>
                          <TableHead className="text-center">구매일</TableHead>
                          <TableHead className="text-center">액션</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userPurchases.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-3">
                                <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    {purchase.item?.title?.charAt(0) || "?"}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{purchase.item?.title || "상품 정보 없음"}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-medium">{purchase.amount.toLocaleString()}원</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                purchase.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : purchase.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {purchase.status === "completed" ? "완료됨" :
                                 purchase.status === "pending" ? "대기중" : "취소됨"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm text-gray-500">
                                {new Date(purchase.createdAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {purchase.status === "completed" && (
                                purchase.hasReview ? (
                                  <span className="text-sm text-gray-500 font-medium">
                                    후기 작성 완료
                                  </span>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleWriteReview(purchase)}
                                  >
                                    후기 작성
                                  </Button>
                                )
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-8">
                <h2 className="text-xl font-semibold">후기</h2>

                {userReviews.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">아직 받은 후기가 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {userReviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-5">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gray-200 text-gray-600 font-medium">
                              {getUserInitials(review.reviewer?.name || "익명")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-grow">
                            <div className="flex justify-between">
                              <h3 className="font-semibold">{review.reviewer?.name || "익명"}</h3>
                              <span className="text-sm text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center mt-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  xmlns="http://www.w3.org/2000/svg"
                                  className={`h-4 w-4 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 fill-gray-300"}`}
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                </svg>
                              ))}
                            </div>
                            <p className="text-gray-700">{review.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      {/* 후기 작성 모달 */}
      {selectedPurchase && (
        <ReviewWriteModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedPurchase(null);
          }}
          purchase={selectedPurchase}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
};

export default Profile;
