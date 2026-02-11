import { request } from '@/lib/api';
import type { User } from '@/types/auth';

export interface CreateUserPayload {
  username: string;
  password: string;
  role?: string;
  email?: string;
  current_password?: string;
}

export interface GetUsersParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  show_only_requested?: boolean;
}

export interface UsersResponse {
  data: {
    users: User[];
    pagination: {
      total: number;
      pages: number;
      page: number;
      per_page: number;
    };
  };
}

export const userService = {
  // 取得所有用戶列表
  getUsers: (params: GetUsersParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params.sort_order) searchParams.append('sort_order', params.sort_order);
    if (params.show_only_requested !== undefined) searchParams.append('show_only_requested', params.show_only_requested.toString());

    return request<UsersResponse>(`/users?${searchParams.toString()}`);
  },
  
  // 新增用戶
  createUser: (data: CreateUserPayload) => request<void>('/users', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  
  // 刪除用戶
  deleteUser: (id: number, currentPassword?: string) => request<void>(`/users/${id}`, { 
    method: 'DELETE',
    body: JSON.stringify({ current_password: currentPassword })
  }),

  resetPassword: (id: number, password: string, currentPassword?: string) => request<void>(`/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password, current_password: currentPassword })
  }),
};