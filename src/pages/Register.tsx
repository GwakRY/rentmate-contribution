
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RegisterData } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import EmailPasswordForm, { registerSchema, RegisterFormValues } from "@/components/register/EmailPasswordForm";

const Register = () => {
  const { authState, register, clearError } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (authState.isAuthenticated) {
      navigate("/");
    }
  }, [authState.isAuthenticated, navigate]);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setError(null);

      const { email, password, name } = values;
      const registerData: RegisterData = {
        email,
        password,
        name,
        phone: "" // 현재는 빈 문자열로 설정
      };

      // AuthContext의 register 함수 사용
      await register(registerData);

      toast({
        title: "회원가입 성공",
        description: "환영합니다! 회원가입이 완료되었습니다.",
      });

      // register 함수에서 자동으로 로그인까지 처리되므로 홈으로 이동
      navigate("/");
    } catch (err) {

      const errorMessage = err instanceof Error ? err.message : "회원가입에 실패했습니다.";
      setError(errorMessage);
      toast({
        title: "회원가입 실패",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">회원가입</h2>
            <p className="mt-2 text-sm text-gray-600">
              이미 계정이 있으신가요?{" "}
              <Link to="/login" className="font-medium text-primary hover:text-primary/90">
                로그인
              </Link>
            </p>
          </div>

          {(authState.error || error) && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{authState.error || error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
              <EmailPasswordForm
                control={form.control}
                clearError={clearError}
                setError={setError}
              />

              <Button
                type="submit"
                className="w-full py-6"
                disabled={authState.isLoading}
              >
                {authState.isLoading ? "가입 중..." : "회원가입"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Register;
