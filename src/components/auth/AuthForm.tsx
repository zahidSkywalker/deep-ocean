'use client';

import type { ReactNode } from 'react';

interface AuthFormProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthForm({ title, description, children, footer }: AuthFormProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-soft p-10 md:p-12">
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-ag-100">{title}</h1>
          <p className="text-ag-300 text-sm md:text-base font-body mt-2">{description}</p>
        </div>
        {children}
        {footer && <div className="mt-8 pt-8 border-t border-ag-500/20">{footer}</div>}
      </div>
    </div>
  );
}