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
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-soft p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-ag-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-heading font-bold text-lg">A</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-ag-100">{title}</h1>
          <p className="text-ag-300 text-sm font-body mt-1">{description}</p>
        </div>
        {children}
        {footer && <div className="mt-6 pt-6 border-t border-ag-500/20">{footer}</div>}
      </div>
    </div>
  );
}