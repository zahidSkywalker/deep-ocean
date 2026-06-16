'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/useAuthStore';
import AuthForm from '@/components/auth/AuthForm';
import Breadcrumb from '@/components/shared/Breadcrumb';
import type { LoginFormValues } from '@/types';

const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError('');
    setIsLoading(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    const success = login(data.email, data.password);
    if (success) {
      router.push('/account');
    } else {
      setError('Invalid email or password. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-fw-500">
      <main className="flex-1 flex items-center justify-center py-16 px-5">
        <div className="w-full max-w-lg">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Login' },
            ]}
          />
          <div className="mt-6">
            <AuthForm
              title="Welcome Back"
              description="Sign in to your ArtisanMarket account"
              footer={
                <p className="text-center text-sm md:text-base font-body text-ag-300">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/register"
                    className="text-fw-200 hover:text-fw-300 font-semibold transition-colors"
                  >
                    Register
                  </Link>
                </p>
              }
            >
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-body rounded-xl p-4">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-body text-sm text-ag-200">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register('email')}
                    className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm font-body mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-body text-sm text-ag-200">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      {...register('password')}
                      className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm pr-10 focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ag-400 hover:text-ag-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm font-body mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" className="rounded-[4px] border-ag-500/40 size-4" />
                    <Label htmlFor="remember" className="text-sm font-body text-ag-300 cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                  <Link
                    href="#"
                    className="text-sm font-body text-fw-200 hover:text-fw-300 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 md:h-13 bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-medium text-base transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </AuthForm>
          </div>
        </div>
      </main>
    </div>
  );
}