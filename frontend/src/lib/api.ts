const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

interface RequestOptions extends RequestInit {
  // HttpOnly Cookie 模式下不需要手動傳遞 token
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { headers, ...customConfig } = options;
  
  // 自動讀取 CSRF Token (由 flask-jwt-extended 設定的 csrf_access_token cookie)
  const csrfToken = getCookie('csrf_access_token');
  
  const config: RequestInit = {
    ...customConfig,
    credentials: 'include', // 讓瀏覽器自動帶上 HttpOnly Cookie
    headers: {
      'Content-Type': 'application/json',
      // 如果有 CSRF Token，則帶入 Header (Flask-JWT-Extended 預設 header 名稱為 X-CSRF-TOKEN)
      ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
      ...headers,
    },
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    // 統一拋出包含 Status Code 的錯誤，方便後續處理
    throw new ApiError(response.status, data.message || 'Something went wrong');
  }

  return data;
}