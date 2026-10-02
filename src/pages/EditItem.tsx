import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRequireAuth } from "@/utils/authUtils";
import { useAuth } from "@/contexts/AuthContext";
import { getItemDetailFromFirestore, updateItemInFirestore } from "@/services/firestoreItemService";
import { uploadImagesToFirebaseStorage } from "@/services/firebaseStorageService";
import { Item } from "@/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Import form components
import BasicInfoSection from "@/components/listing/BasicInfoSection";
import PhotoUploadSection from "@/components/listing/PhotoUploadSection";
import DateRangeSection from "@/components/listing/DateRangeSection";
import RentalTermsSection from "@/components/listing/RentalTermsSection";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";

const EditItem = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const requireAuth = useRequireAuth();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [terms, setTerms] = useState("");
  const [newPhotos, setNewPhotos] = useState<File[]>([]);  // 새로 추가된 사진들만
  const [displayPhotoUrls, setDisplayPhotoUrls] = useState<string[]>([]);  // 화면에 표시할 모든 URL들
  const [existingPhotoCount, setExistingPhotoCount] = useState(0);  // 기존 사진 개수
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined
  });

  useEffect(() => {
    if (!authState.isLoading) {
      requireAuth();
    }
  }, [authState.isLoading, authState.isAuthenticated, requireAuth]);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const itemData = await getItemDetailFromFirestore(id);

        // 현재 사용자가 물품 소유자인지 확인
        if (!authState.user || itemData.ownerId !== authState.user.id) {
          toast.error("본인의 물품만 수정할 수 있습니다.");
          navigate("/");
          return;
        }

        setItem(itemData);

        // Form data 설정
        setTitle(itemData.title);
        setDescription(itemData.description);
        setCategory(itemData.category);
        setLocation(itemData.location);
        setPrice(itemData.price);

        // 기존 이미지 설정
        const existingImages = itemData.images || [];
        setDisplayPhotoUrls([...existingImages]);
        setExistingPhotoCount(existingImages.length);

        // 대여 가능 날짜 설정
        if (itemData.availableDates && itemData.availableDates.length > 0) {
          const sortedDates = itemData.availableDates.sort();
          setDateRange({
            from: parseISO(sortedDates[0]),
            to: parseISO(sortedDates[sortedDates.length - 1])
          });
        }

      } catch (error) {

        toast.error("물품 정보를 불러오는데 실패했습니다.");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    if (authState.user && id) {
      fetchItem();
    }
  }, [id, authState.user, navigate]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);

    // 새 파일들의 미리보기 URL 생성
    const newUrls = newFiles.map(file => URL.createObjectURL(file));

    // 새로 추가된 파일들만 저장
    setNewPhotos([...newPhotos, ...newFiles]);

    // 화면에 표시할 URL들 업데이트 (기존 + 새로운)
    setDisplayPhotoUrls([...displayPhotoUrls, ...newUrls]);
  };

  const removePhoto = (index: number) => {

    const newDisplayUrls = [...displayPhotoUrls];

    if (index < existingPhotoCount) {
      // 기존 사진 삭제

      newDisplayUrls.splice(index, 1);
      setExistingPhotoCount(existingPhotoCount - 1);
    } else {
      // 새로 추가된 사진 삭제
      const newPhotoIndex = index - existingPhotoCount;

      // 미리보기 URL 해제
      URL.revokeObjectURL(newDisplayUrls[index]);

      // 새 사진 배열에서 제거
      const updatedNewPhotos = [...newPhotos];
      updatedNewPhotos.splice(newPhotoIndex, 1);
      setNewPhotos(updatedNewPhotos);

      // 표시 URL에서 제거
      newDisplayUrls.splice(index, 1);
    }

    setDisplayPhotoUrls(newDisplayUrls);
  };

  const validateForm = () => {
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return false;
    }
    if (!description.trim()) {
      toast.error("설명을 입력해주세요.");
      return false;
    }
    if (!category) {
      toast.error("카테고리를 선택해주세요.");
      return false;
    }
    if (!location.trim()) {
      toast.error("위치 정보를 입력해주세요.");
      return false;
    }
    if (displayPhotoUrls.length === 0) {
      toast.error("최소 1개의 사진을 업로드해주세요.");
      return false;
    }
    if (!price || price < 1000) {
      toast.error("가격을 1,000원 이상 입력해주세요.");
      return false;
    }
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("대여 가능한 기간을 선택해주세요.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !id) return;

    try {
      setIsSubmitting(true);

      const availableDates: string[] = [];
      if (dateRange.from && dateRange.to) {
        const from = new Date(dateRange.from);
        const to = new Date(dateRange.to);

        for (let day = new Date(from); day <= to; day.setDate(day.getDate() + 1)) {
          availableDates.push(format(day, 'yyyy-MM-dd'));
        }
      }

      // 최종 이미지 URL 배열 준비
      let finalImageUrls = displayPhotoUrls.slice(0, existingPhotoCount); // 기존 이미지들

      // 새로 추가된 이미지가 있으면 업로드
      if (newPhotos.length > 0) {

        const newImageUrls = await uploadImagesToFirebaseStorage(id, newPhotos);
        finalImageUrls = [...finalImageUrls, ...newImageUrls];

      }

      const updateData = {
        title,
        description,
        price,
        category,
        location,
        availableDates,
        images: finalImageUrls
      };

      await updateItemInFirestore(id, updateData);

      toast.success("물품 정보가 성공적으로 수정되었습니다.");
      navigate(`/items/${id}`);
    } catch (error) {

      toast.error(error instanceof Error ? error.message : "물품 수정 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authState.isLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="spinner mb-4"></div>
            <p className="text-gray-500">물품 정보를 불러오는 중...</p>
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
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">물품을 찾을 수 없습니다</h1>
            <p className="text-gray-600 mb-4">요청하신 물품이 존재하지 않거나 접근 권한이 없습니다.</p>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              홈으로 돌아가기
            </Button>
          </div>
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
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <Button
                onClick={() => navigate(`/items/${id}`)}
                variant="ghost"
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                물품으로 돌아가기
              </Button>
              <h1 className="text-3xl font-bold">물품 수정</h1>
              <p className="text-gray-600 mt-2">물품 정보를 수정하세요.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <BasicInfoSection
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                category={category}
                setCategory={setCategory}
                location={location}
                setLocation={setLocation}
                price={price}
                setPrice={setPrice}
              />

              <PhotoUploadSection
                photoUrls={displayPhotoUrls}
                handlePhotoUpload={handlePhotoUpload}
                removePhoto={removePhoto}
              />

              <DateRangeSection
                dateRange={dateRange}
                setDateRange={setDateRange}
              />

              <RentalTermsSection
                terms={terms}
                setTerms={setTerms}
              />

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/items/${id}`)}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "수정 중..." : "수정 완료"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EditItem;
