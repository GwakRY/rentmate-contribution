
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useKakaoMap } from "@/hooks/useKakaoMap";
import LocationSearchBar from "./LocationSearchBar";
import SearchResultsList from "./SearchResultsList";
import KakaoMapDisplay from "./KakaoMapDisplay";

interface KakaoLocationPickerProps {
  value: string;
  onChange: (location: string) => void;
}

const KakaoLocationPicker: React.FC<KakaoLocationPickerProps> = ({ 
  value, 
  onChange 
}) => {
  const [open, setOpen] = useState(false);
  
  const {
    mapContainerRef,
    isMapLoaded,
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedLocation,
    setSelectedLocation,
    handleSearch,
    selectLocation
  } = useKakaoMap({ isDialogOpen: open });
  
  // Set initial selected location from value prop
  useEffect(() => {
    if (value) {
      setSelectedLocation(value);
    }
  }, [value, setSelectedLocation]);
  
  // Confirm selection and close dialog
  const confirmLocation = () => {
    onChange(selectedLocation);
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative w-full">
          <Input 
            value={value}
            placeholder="위치를 선택하세요" 
            readOnly 
            className="pr-10 cursor-pointer"
          />
          <MapPin className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>위치 선택</DialogTitle>
          <DialogDescription>
            검색하거나 지도에서 직접 위치를 선택하세요.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <LocationSearchBar 
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
          />
          
          <div className="grid grid-cols-3 gap-4">
            <div className="overflow-y-auto h-[300px] border rounded-md p-2 col-span-1">
              <SearchResultsList 
                searchResults={searchResults}
                onSelectLocation={selectLocation}
              />
            </div>
            
            <KakaoMapDisplay 
              mapRef={mapContainerRef}
              isMapLoaded={isMapLoaded}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm">
              <span className="font-medium">선택된 위치:</span> {selectedLocation || "위치를 선택하세요"}
            </div>
            <Button 
              type="button" 
              onClick={confirmLocation}
              disabled={!selectedLocation}
            >
              선택 완료
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KakaoLocationPicker;
