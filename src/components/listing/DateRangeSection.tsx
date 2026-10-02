
import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface DateRangeSectionProps {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
}

const DateRangeSection: React.FC<DateRangeSectionProps> = ({
  dateRange,
  setDateRange,
}) => {
  const formatDateRange = () => {
    if (!dateRange?.from) return "대여 가능한 기간을 선택하세요";
    if (dateRange.to) {
      return `${format(dateRange.from, 'yyyy-MM-dd')} ~ ${format(dateRange.to, 'yyyy-MM-dd')}`;
    }
    return format(dateRange.from, 'yyyy-MM-dd');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">대여 가능 일정</h2>
      <div className="border rounded-md p-4">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={setDateRange}
          className="mx-auto"
          disabled={(date) =>
            date < new Date(new Date().setHours(0, 0, 0, 0))
          }
          numberOfMonths={2}
          modifiersStyles={{
            today: {
              fontWeight: 'bold'
            }
          }}
        />
      </div>
      <div className="mt-2 text-center font-medium">
        {formatDateRange()}
      </div>
      <p className="text-sm text-gray-500">한 번에 하나의 기간만 선택할 수 있습니다.</p>
    </div>
  );
};

export default DateRangeSection;
