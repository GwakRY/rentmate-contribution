import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/firebase/config";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function uploadImagesToFirebaseStorage(
  itemId: string,
  images: File[]
): Promise<string[]> {
  if (!images || images.length === 0) {
    return [];
  }

  try {
    const uploadPromises = images.map(async (image) => {
      if (image.size > MAX_IMAGE_SIZE) {
        throw new Error(
          `이미지 파일이 너무 큽니다: ${image.name} (${Math.round(
            image.size / 1024 / 1024
          )}MB)`
        );
      }

      if (!image.type.startsWith("image/")) {
        throw new Error(`지원하지 않는 파일 형식입니다: ${image.name}`);
      }

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const fileExtension = image.name.split(".").pop() || "jpg";
      const fileName = `${itemId}_${timestamp}_${randomId}.${fileExtension}`;
      const storagePath = `public/items/${itemId}/${fileName}`;

      const imageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(imageRef, image);

      return getDownloadURL(snapshot.ref);
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    throw new Error(
      `이미지 업로드 실패: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`
    );
  }
}
