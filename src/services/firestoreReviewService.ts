import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { checkPurchaseCompletedInFirestore } from "./firestorePurchaseService";

export interface Review {
  id: string;
  reservationId?: string;
  purchaseId?: string;
  itemId: string;
  item?: {
    title: string;
    images: string[];
  };
  reviewerId: string;
  revieweeId: string;
  reviewer?: {
    name: string;
    avatar: string;
  };
  rating: number;
  content: string;
  createdAt: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
}

export async function createReviewInFirestore(
  itemId: string,
  userId: string,
  rating: number,
  content: string,
  reservationId?: string
): Promise<{ message: string; reviewId: string }> {
  try {
    if (!reservationId) {
      const purchaseCheck =
        await checkPurchaseCompletedInFirestore(itemId, userId);

      if (!purchaseCheck.canReview) {
        throw new Error("구매 완료된 상품만 후기를 작성할 수 있습니다.");
      }
    }

    const itemSnapshot = await getDoc(doc(db, "items", itemId));

    if (!itemSnapshot.exists()) {
      throw new Error("물품을 찾을 수 없습니다.");
    }

    const itemData = itemSnapshot.data();
    let revieweeId = itemData.ownerId;

    if (reservationId) {
      const reservationSnapshot = await getDoc(
        doc(db, "reservations", reservationId)
      );

      if (!reservationSnapshot.exists()) {
        throw new Error("예약을 찾을 수 없습니다.");
      }

      revieweeId = reservationSnapshot.data().ownerId;
    }

    const purchaseCheck =
      await checkPurchaseCompletedInFirestore(itemId, userId);

    const reviewData = {
      ...(reservationId && { reservationId }),
      ...(purchaseCheck.purchaseId && {
        purchaseId: purchaseCheck.purchaseId,
      }),
      itemId,
      reviewerId: userId,
      revieweeId,
      rating,
      content,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "reviews"), reviewData);

    return {
      message: "리뷰가 성공적으로 작성되었습니다.",
      reviewId: docRef.id,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "리뷰 작성에 실패했습니다."
    );
  }
}

export async function getUserReviewsFromFirestore(
  userId: string
): Promise<ReviewsResponse> {
  try {
    // Firestore 인덱스 제약을 고려해 서버 orderBy 대신 조회 후 정렬합니다.
    const snapshot = await getDocs(
      query(
        collection(db, "reviews"),
        where("revieweeId", "==", userId)
      )
    );

    if (snapshot.empty) {
      return {
        reviews: [],
        averageRating: 0,
        reviewCount: 0,
      };
    }

    const reviews = await Promise.all(
      snapshot.docs.map(async (reviewDoc) => {
        try {
          const reviewData = reviewDoc.data();
          let reviewer = undefined;
          let item = undefined;

          if (reviewData.reviewerId) {
            try {
              const reviewerSnapshot = await getDoc(
                doc(db, "users", reviewData.reviewerId)
              );

              if (reviewerSnapshot.exists()) {
                const reviewerData = reviewerSnapshot.data();

                reviewer = {
                  name: reviewerData.name,
                  avatar:
                    reviewerData.avatar ||
                    "https://via.placeholder.com/48",
                };
              }
            } catch {
              reviewer = undefined;
            }
          }

          if (reviewData.itemId) {
            try {
              const itemSnapshot = await getDoc(
                doc(db, "items", reviewData.itemId)
              );

              if (itemSnapshot.exists()) {
                const itemData = itemSnapshot.data();

                item = {
                  title: itemData.title,
                  images: itemData.images || [],
                };
              }
            } catch {
              item = undefined;
            }
          }

          return {
            id: reviewDoc.id,
            reservationId: reviewData.reservationId,
            purchaseId: reviewData.purchaseId,
            itemId: reviewData.itemId,
            reviewerId: reviewData.reviewerId,
            revieweeId: reviewData.revieweeId,
            rating: reviewData.rating || 5,
            content: reviewData.content || "",
            reviewer,
            item,
            createdAt:
              reviewData.createdAt?.toDate?.()?.toISOString() ||
              new Date().toISOString(),
          } as Review;
        } catch {
          return null;
        }
      })
    );

    const validReviews = reviews.filter(
      (review): review is Review => review !== null
    );

    validReviews.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    const averageRating =
      validReviews.length > 0
        ? validReviews.reduce(
            (sum, review) => sum + review.rating,
            0
          ) / validReviews.length
        : 0;

    return {
      reviews: validReviews,
      averageRating: Number(averageRating.toFixed(1)),
      reviewCount: validReviews.length,
    };
  } catch {
    return {
      reviews: [],
      averageRating: 0,
      reviewCount: 0,
    };
  }
}
