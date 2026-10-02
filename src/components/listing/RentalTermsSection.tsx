
import React from "react";
import { Textarea } from "@/components/ui/textarea";

interface RentalTermsSectionProps {
  terms: string;
  setTerms: (value: string) => void;
}

const RentalTermsSection: React.FC<RentalTermsSectionProps> = ({
  terms,
  setTerms,
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">대여 조건</h2>
      <Textarea
        placeholder="대여 시 주의사항이나 조건을 작성하세요 (선택사항)"
        className="min-h-[100px]"
        value={terms}
        onChange={(e) => setTerms(e.target.value)}
      />
    </div>
  );
};

export default RentalTermsSection;
