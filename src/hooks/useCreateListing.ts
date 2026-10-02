import { useState } from "react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createItem } from "@/services/itemService";

export const useCreateListing = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [terms, setTerms] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);

    const newUrls = newFiles.map(file => URL.createObjectURL(file));

    setPhotos([...photos, ...newFiles]);
    setPhotoUrls([...photoUrls, ...newUrls]);


  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    const newPhotoUrls = [...photoUrls];

    URL.revokeObjectURL(newPhotoUrls[index]);

    newPhotos.splice(index, 1);
    newPhotoUrls.splice(index, 1);

    setPhotos(newPhotos);
    setPhotoUrls(newPhotoUrls);
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
    if (photos.length === 0) {

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


    if (!validateForm()) return;

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


      const itemData = {
        title,
        description,
        price,
        category,
        location: location || "위치 미지정",
        availableDates
      };

      // 이미지와 함께 물품 등록
      const response = await createItem(itemData, photos);


      toast.success("물품이 성공적으로 등록되었습니다.");
      navigate(`/items/${response.itemId}`);
    } catch (error) {

      if (error instanceof Error) {

        toast.error(`물품 등록 실패: ${error.message}`);
      } else {

        toast.error("물품 등록 중 알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    category,
    setCategory,
    location,
    setLocation,
    price,
    setPrice,
    terms,
    setTerms,
    photos,
    photoUrls,
    dateRange,
    setDateRange,
    isSubmitting,
    handlePhotoUpload,
    removePhoto,
    handleSubmit
  };
};
