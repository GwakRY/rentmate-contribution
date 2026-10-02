
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import {
  getPaymentHistory,
  cancelPayment,
  confirmPayment,
  releasePayment,
  Payment
} from "@/services/paymentService";
import PaymentList from "@/components/payments/PaymentList";
import "@/components/payments/PaymentStyles.css";

const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await getPaymentHistory();
      // Ensure we set an empty array if the response is invalid
      setPayments(response?.payments || []);
    } catch (error) {

      toast.error("결제 내역을 불러오는데 실패했습니다.");
      // Set empty array on error to prevent undefined
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    try {
      setProcessingId(paymentId);
      await cancelPayment(paymentId, "사용자 요청으로 취소됨");
      toast.success("결제가 취소되었습니다.");
      fetchPayments();
    } catch (error) {

      toast.error("결제 취소에 실패했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      setProcessingId(paymentId);
      await confirmPayment(paymentId);
      toast.success("결제가 확정되었습니다.");
      fetchPayments();
    } catch (error) {

      toast.error("결제 확정에 실패했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReleasePayment = async (paymentId: string) => {
    try {
      setProcessingId(paymentId);
      await releasePayment(paymentId);
      toast.success("대금이 판매자에게 지급되었습니다.");
      fetchPayments();
    } catch (error) {

      toast.error("대금 지급에 실패했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow py-10">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">결제 내역</h1>

            <PaymentList
              payments={payments}
              loading={loading}
              processingId={processingId}
              onCancel={handleCancelPayment}
              onConfirm={handleConfirmPayment}
              onRelease={handleReleasePayment}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Payments;
