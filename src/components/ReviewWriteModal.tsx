
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { createReviewInFirestore } from "@/services/firestoreReviewService";
import { useAuth } from "@/contexts/AuthContext";

interface ReviewWriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: {
    id: string;
    itemId: string;
    item?: {
      title: string;
      images: string[];
    };
    sellerId: string;
  };
  onReviewSubmitted: () => void;
}

const ReviewWriteModal = ({ isOpen, onClose, purchase, onReviewSubmitted }: ReviewWriteModalProps) => {
  const { authState } = useAuth();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!authState.user?.id) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    if (content.trim().length < 10) {
      toast.error("후기는 최소 10자 이상 작성해주세요.");
      return;
    }

    try {
      setSubmitting(true);
      await createReviewInFirestore(
        purchase.itemId,
        authState.user.id,
        rating,
        content.trim()
      );
      
      toast.success("후기가 성공적으로 작성되었습니다.");
      onReviewSubmitted();
      onClose();
      setContent("");
      setRating(5);
    } catch (error) {
      console.error("후기 작성 실패:", error);
      toast.error(error instanceof Error ? error.message : "후기 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>후기 작성</DialogTitle>
          <DialogDescription>
            구매하신 상품에 대한 후기를 작성해주세요.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 상품 정보 */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {purchase.item?.images?.[0] && (
              <img 
                src={purchase.item.images[0]} 
                alt={purchase.item.title}
                className="w-12 h-12 rounded object-cover"
              />
            )}
            <div>
              <p className="font-medium">{purchase.item?.title || "상품"}</p>
            </div>
          </div>

          {/* 평점 선택 */}
          <div className="space-y-2">
            <Label>평점</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating 
                        ? "fill-yellow-400 text-yellow-400" 
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">({rating}점)</span>
            </div>
          </div>

          {/* 후기 내용 */}
          <div className="space-y-2">
            <Label htmlFor="review-content">후기 내용</Label>
            <Textarea
              id="review-content"
              placeholder="상품에 대한 후기를 작성해주세요. (최소 10자)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {content.length}/500자
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={submitting}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={submitting || content.trim().length < 10}
            >
              {submitting ? "작성 중..." : "후기 작성"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewWriteModal;
