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
import type { RegisterFormValues } from '@/types';

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: z.literal(true, { error: 'You must accept the terms and conditions' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormWithTerms = RegisterFormValues & { terms: boolean };

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useAuthStore((s) => s.register);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormWithTerms>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false as unknown as true,
    },
  });

  const onSubmit = async (data: RegisterFormWithTerms) => {
    setError('');
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 600));

    const success = registerUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });

    if (success) {
      router.push('/account');
    } else {
      setError('Registration failed. Please try again.');
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
              { label: 'Register' },
            ]}
          />
          <div className="mt-6">
            <AuthForm
              title="Create Account"
              description="Join ArtisanMarket and start shopping"
              footer={
                <p className="text-center text-sm md:text-base font-body text-ag-300">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-fw-200 hover:text-fw-300 font-semibold transition-colors"
                  >
                    Sign in
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-body text-sm text-ag-200">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      {...register('firstName')}
                      className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm font-body mt-1">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-body text-sm text-ag-200">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      {...register('lastName')}
                      className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-sm font-body mt-1">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="font-body text-sm text-ag-200">
                    Email Address
                  </Label>
                  <Input
                    id="reg-email"
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
                  <Label htmlFor="reg-password" className="font-body text-sm text-ag-200">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-body text-sm text-ag-200">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      {...register('confirmPassword')}
                      className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm pr-10 focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ag-400 hover:text-ag-200 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm font-body mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-2.5 pt-1">
                  <Checkbox
                    id="terms"
                    {...register('terms')}
                    className="rounded-[4px] border-ag-500/40 mt-0.5 size-4"
                  />
                  <Label htmlFor="terms" className="text-sm font-body text-ag-300 cursor-pointer leading-snug">
                    I agree to the{' '}
                    <Link href="#" className="text-fw-200 hover:text-fw-300 font-medium transition-colors">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="#" className="text-fw-200 hover:text-fw-300 font-medium transition-colors">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {errors.terms && (
                  <p className="text-red-500 text-sm font-body mt-1">{errors.terms.message}</p>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 md:h-13 bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-medium text-base transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
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