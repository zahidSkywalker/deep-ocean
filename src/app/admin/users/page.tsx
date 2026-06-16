'use client';

import { useState, useMemo } from 'react';
import { Search, MoreHorizontal, UserCog, Ban, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useAdminStore } from '@/store/useAdminStore';
import type { AdminUser } from '@/data/admin-dashboard';
import { toast } from 'sonner';

const roleBadge: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  vendor: 'bg-blue-100 text-blue-700',
  customer: 'bg-green-100 text-green-700',
};

const statusBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  inactive: 'bg-gray-100 text-gray-700',
};

export default function AdminUsersPage() {
  const platformUsers = useAdminStore((s) => s.platformUsers);
  const updateUserStatus = useAdminStore((s) => s.updateUserStatus);
  const updateUserRole = useAdminStore((s) => s.updateUserRole);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredUsers = useMemo(() => {
    return platformUsers.filter((u) => {
      const matchesSearch =
        !search ||
        u.firstName.toLowerCase().includes(search.toLowerCase()) ||
        u.lastName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [platformUsers, search, roleFilter, statusFilter]);

  const handleChangeRole = (userId: string, role: AdminUser['role']) => {
    updateUserRole(userId, role);
    toast.success(`User role updated to ${role}`);
  };

  const handleToggleStatus = (user: AdminUser) => {
    if (user.status === 'suspended' || user.status === 'inactive') {
      updateUserStatus(user.id, 'active');
      toast.success(`${user.firstName} ${user.lastName} has been activated`);
    } else {
      updateUserStatus(user.id, 'suspended');
      toast.success(`${user.firstName} ${user.lastName} has been suspended`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-ag-100">User Management</h2>
        <p className="text-sm text-ag-300 font-body mt-1">
          {platformUsers.length} user{platformUsers.length !== 1 ? 's' : ''} on the platform
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-soft p-4 md:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ag-400 pointer-events-none" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 font-body"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-40 font-body">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 font-body">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <p className="text-lg font-medium text-ag-200 font-body">No users found</p>
          <p className="text-sm text-ag-300 font-body mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ag-500/20 bg-ag-800/20">
                    <th className="text-left py-3 px-4 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">User</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Role</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Orders</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Spent</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider hidden lg:table-cell">Joined</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider hidden lg:table-cell">Last Active</th>
                    <th className="text-right py-3 px-4 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ag-500/10">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-ag-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="w-9 h-9 rounded-full object-cover shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-ag-100 font-body truncate max-w-[160px]">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-ag-300 font-body truncate max-w-[160px]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary" className={`text-xs capitalize ${roleBadge[user.role]}`}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary" className={`text-xs capitalize ${statusBadge[user.status]}`}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-ag-100 font-body text-xs">{user.totalOrders}</td>
                      <td className="py-3 px-3 text-ag-100 font-heading text-xs">${user.totalSpent.toFixed(2)}</td>
                      <td className="py-3 px-3 text-ag-300 font-body text-xs hidden lg:table-cell">{user.joinedAt}</td>
                      <td className="py-3 px-3 text-ag-300 font-body text-xs hidden lg:table-cell">{user.lastActive}</td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-ag-300 hover:text-ag-100 hover:bg-ag-800/50">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="font-heading text-xs">Change Role</DropdownMenuLabel>
                            {(['admin', 'vendor', 'customer'] as const).filter((r) => r !== user.role).map((role) => (
                              <DropdownMenuItem key={role} onClick={() => handleChangeRole(user.id, role)} className="text-xs font-body">
                                <UserCog className="w-3.5 h-3.5 mr-2" />
                                Set as {role}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            {user.status === 'active' ? (
                              <DropdownMenuItem onClick={() => handleToggleStatus(user)} className="text-xs font-body text-red-600">
                                <Ban className="w-3.5 h-3.5 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleToggleStatus(user)} className="text-xs font-body text-green-600">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                                Activate User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden grid gap-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-2xl shadow-soft p-4">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="w-12 h-12 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-ag-100 font-body text-sm">{user.firstName} {user.lastName}</p>
                      <Badge variant="secondary" className={`text-[10px] capitalize ${roleBadge[user.role]}`}>{user.role}</Badge>
                      <Badge variant="secondary" className={`text-[10px] capitalize ${statusBadge[user.status]}`}>{user.status}</Badge>
                    </div>
                    <p className="text-xs text-ag-300 font-body mt-0.5 truncate">{user.email}</p>
                    {user.vendorName && (
                      <p className="text-xs text-ag-300 font-body mt-0.5">{user.vendorName}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-ag-300 hover:text-ag-100 shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="font-heading text-xs">Change Role</DropdownMenuLabel>
                      {(['admin', 'vendor', 'customer'] as const).filter((r) => r !== user.role).map((role) => (
                        <DropdownMenuItem key={role} onClick={() => handleChangeRole(user.id, role)} className="text-xs font-body">
                          <UserCog className="w-3.5 h-3.5 mr-2" />
                          Set as {role}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      {user.status === 'active' ? (
                        <DropdownMenuItem onClick={() => handleToggleStatus(user)} className="text-xs font-body text-red-600">
                          <Ban className="w-3.5 h-3.5 mr-2" />
                          Suspend User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleToggleStatus(user)} className="text-xs font-body text-green-600">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                          Activate User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-ag-500/10 text-xs text-ag-300 font-body">
                  <span>{user.totalOrders} orders</span>
                  <span>${user.totalSpent.toFixed(2)} spent</span>
                  <span className="ml-auto">{user.lastActive}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}