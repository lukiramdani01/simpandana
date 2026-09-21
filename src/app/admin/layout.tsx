import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Superadmin Suite — SimpanUang (TataDana) AI Switchboard & Controls',
  description: 'SimpanUang Superadmin RBAC Dashboard: AI Provider Switchboard, User Management, Payment Approvals, and User Impersonation',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] selection:bg-[#0071E3] selection:text-white">
      {children}
    </div>
  );
}
