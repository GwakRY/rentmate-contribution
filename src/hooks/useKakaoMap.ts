import { useState, useEffect, useRef } from "react";

const kakaoKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;

declare global {
  interface Window {
    kakao: any;
  }
}

interface UseKakaoMapProps {
  isDialogOpen: boolean;
}

export const useKakaoMap = ({ isDialogOpen }: UseKakaoMapProps) => {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const placesServiceRef = useRef<any>(null);

  // Initialize Kakao Maps
  useEffect(() => {
    if (!isDialogOpen) return;

    const script = document.querySelector('script[src*="dapi.kakao.com"]');

    if (!script && !window.kakao) {
      if (!kakaoKey) {
        return;
      }

      const mapScript = document.createElement('script');
      mapScript.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&libraries=services&autoload=false`;
      mapScript.async = true;
      mapScript.onload = () => {
        window.kakao.maps.load(() => {

          setIsMapLoaded(true);
        });
      };
      document.head.appendChild(mapScript);
    } else if (window.kakao && window.kakao.maps) {

      setIsMapLoaded(true);
    }
  }, [isDialogOpen]);

  // Initialize map when loaded
  useEffect(() => {
    if (!isMapLoaded || !mapContainerRef.current || !isDialogOpen) return;


    // Default center (Seoul City Hall)
    const defaultCenter = new window.kakao.maps.LatLng(37.566826, 126.9786567);

    const options = {
      center: defaultCenter,
      level: 3,
    };

    const map = new window.kakao.maps.Map(mapContainerRef.current, options);
    mapRef.current = map;

    // Initialize places service
    placesServiceRef.current = new window.kakao.maps.services.Places();

    // Add click event listener
    window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
      const latlng = mouseEvent.latLng;

      // Get address from coordinates (reverse geocoding)
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const address = result[0].address.address_name;
          setSelectedLocation(address);

          clearMarkers();
          displayMarker(latlng, address);
        }
      });
    });

    return () => {
      // Cleanup if needed
    };
  }, [isMapLoaded, isDialogOpen]);

  // Clear all markers on the map
  const clearMarkers = () => {
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    }
  };

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim() || !isMapLoaded || !mapRef.current) {

      return;
    }


    if (!placesServiceRef.current) {

      placesServiceRef.current = new window.kakao.maps.services.Places();
    }

    placesServiceRef.current.keywordSearch(searchQuery, (result: any, status: any) => {

      if (status === window.kakao.maps.services.Status.OK) {

        setSearchResults(result);

        // Clear existing markers
        clearMarkers();

        // Update map bounds to fit all results
        const bounds = new window.kakao.maps.LatLngBounds();

        // Add markers for all results
        result.forEach((place: any) => {

          const position = new window.kakao.maps.LatLng(place.y, place.x);
          bounds.extend(position);

          const marker = new window.kakao.maps.Marker({
            map: mapRef.current,
            position: position
          });

          markersRef.current.push(marker);

          // Add infowindow
          const infowindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:5px;font-size:12px;">${place.place_name}</div>`
          });

          // Show infowindow on mouseover
          window.kakao.maps.event.addListener(marker, 'mouseover', function() {
            infowindow.open(mapRef.current, marker);
          });

          // Hide infowindow on mouseout
          window.kakao.maps.event.addListener(marker, 'mouseout', function() {
            infowindow.close();
          });
        });

        // Adjust map to show all markers
        if (result.length > 0) {
          mapRef.current.setBounds(bounds);
        }
      } else {

        setSearchResults([]);
      }
    });
  };

  // Display marker on map
  const displayMarker = (position: any, placeName: string) => {
    // Add marker
    if (mapRef.current) {
      const marker = new window.kakao.maps.Marker({
        map: mapRef.current,
        position: position
      });

      // Add infowindow
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:5px;font-size:12px;">${placeName}</div>`
      });

      infowindow.open(mapRef.current, marker);

      // Center map on marker
      mapRef.current.setCenter(position);

      return marker;
    }
    return null;
  };

  // Handle location selection
  const selectLocation = (place: any) => {
    setSelectedLocation(place.place_name);

    if (mapRef.current) {
      const position = new window.kakao.maps.LatLng(place.y, place.x);

      // Clear existing markers
      clearMarkers();

      // Add new marker
      const marker = displayMarker(position, place.place_name);
      if (marker) markersRef.current.push(marker);
    }
  };

  return {
    mapContainerRef,
    isMapLoaded,
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedLocation,
    setSelectedLocation,
    handleSearch,
    selectLocation
  };
};
