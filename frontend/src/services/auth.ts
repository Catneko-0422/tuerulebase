import type { LoginResponse } from '@/types/auth';
import { request } from '@/lib/api';

export const authService = {
  /**
   * 處理使用者登入
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  /**
   * 處理使用者登出
   */
  async logout(): Promise<void> {
    await request('/auth/logout', {
      method: 'POST',
    });
  },

  /**
   * 取得當前登入使用者資訊 (驗證 Token 有效性)
   */
  async getMe(): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },

  async forgotPassword(username: string): Promise<void> {
    await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },
};