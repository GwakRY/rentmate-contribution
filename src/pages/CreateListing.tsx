
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRequireAuth } from "@/utils/authUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateListing } from "@/hooks/useCreateListing";

// Import refactored components
import ListingFormHeader from "@/components/listing/ListingFormHeader";
import BasicInfoSection from "@/components/listing/BasicInfoSection";
import PhotoUploadSection from "@/components/listing/PhotoUploadSection";
import DateRangeSection from "@/components/listing/DateRangeSection";
import RentalTermsSection from "@/components/listing/RentalTermsSection";
import SubmitButton from "@/components/listing/SubmitButton";

const CreateListing = () => {
  const { authState } = useAuth();
  const requireAuth = useRequireAuth();
  const {
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
    photoUrls,
    dateRange,
    setDateRange,
    isSubmitting,
    handlePhotoUpload,
    removePhoto,
    handleSubmit
  } = useCreateListing();

  useEffect(() => {

    // 인증 상태가 로딩 중이 아닐 때만 체크
    if (!authState.isLoading) {

      requireAuth();
    } else {

    }
  }, [authState.isLoading, authState.isAuthenticated, requireAuth]);

  // 인증 상태가 로딩 중이면 로딩 화면 표시
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="spinner mb-4"></div>
            <p className="text-gray-500">인증 상태를 확인하는 중...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow py-10">
        <div className="container-custom">
          <ListingFormHeader />

          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-8">
              <BasicInfoSection
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                category={category}
                setCategory={setCategory}
                location={location}
                setLocation={setLocation}
                price={price}
                setPrice={setPrice}
              />

              <PhotoUploadSection
                photoUrls={photoUrls}
                handlePhotoUpload={handlePhotoUpload}
                removePhoto={removePhoto}
              />

              <DateRangeSection
                dateRange={dateRange}
                setDateRange={setDateRange}
              />

              <RentalTermsSection
                terms={terms}
                setTerms={setTerms}
              />

              <SubmitButton isSubmitting={isSubmitting} />
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateListing;
