export interface User {
  id: number;
  username: string;
  role: string;
  email?: string;
  is_superuser: boolean;
  is_password_changed: boolean;
  reset_password_requested?: boolean;
}

export interface LoginResponse {
  message: string;
  data: {
    user: User;
  };
}
