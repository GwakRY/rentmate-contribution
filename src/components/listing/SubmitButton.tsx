
import React from "react";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
  isSubmitting: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ isSubmitting }) => {
  return (
    <div className="pt-6">
      <Button
        type="submit"
        className="w-full py-6 bg-accent hover:opacity-90 text-lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? "등록 중..." : "물품 등록하기"}
      </Button>
    </div>
  );
};

export default SubmitButton;
