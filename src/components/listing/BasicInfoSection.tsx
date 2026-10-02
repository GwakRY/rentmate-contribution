
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import KakaoLocationPicker from "@/components/location/KakaoLocationPicker";

interface BasicInfoSectionProps {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  price: number;
  setPrice: (value: number) => void;
}

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
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
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">기본 정보</h2>

      <div className="grid gap-4">
        <div>
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            placeholder="대여할 물품의 제목을 입력하세요"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="description">설명</Label>
          <Textarea
            id="description"
            placeholder="물품에 대한 상세 설명을 작성하세요"
            required
            className="min-h-[150px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">카테고리</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronics">전자기기</SelectItem>
                <SelectItem value="outdoor">아웃도어</SelectItem>
                <SelectItem value="camping">캠핑용품</SelectItem>
                <SelectItem value="sports">스포츠</SelectItem>
                <SelectItem value="gaming">게임</SelectItem>
                <SelectItem value="others">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location">위치 (선택사항)</Label>
            <KakaoLocationPicker
              value={location}
              onChange={setLocation}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="price">일일 대여 가격 (원)</Label>
          <Input
            id="price"
            type="number"
            placeholder="일일 대여 가격을 입력하세요"
            min="1000"
            required
            value={price || ''}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};

export default BasicInfoSection;
