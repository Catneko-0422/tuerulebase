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
  // 改進 Regex: 允許分號後沒有空格 (防禦性程式設計)
  // (?:^|;\\s*) 匹配字串開頭或分號(含可選空白)
  const matches = [...document.cookie.matchAll(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)', 'g'))];
  // 瀏覽器 document.cookie 通常會將路徑最符合 (Most Specific) 的 Cookie 排在前面
  // 因此我們應該取第一個 (matches[0])，這能解決部分 Cookie 衝突問題
  return matches.length ? decodeURIComponent(matches[0][1]) : null;
}

/**
 * 強力清除所有與認證相關的 Cookie
 * 嘗試不同的路徑 (Path) 與網域 (Domain) 組合，以解決開發環境中的 Cookie 衝突
 */
export function clearAuthCookies() {
  const names = ['csrf_access_token', 'access_token_cookie'];
  const paths = ['/', '/api', '/api/v1'];
  const domains = [
    window.location.hostname, 
    '.' + window.location.hostname, 
    'localhost', 
    '127.0.0.1'
  ];

  names.forEach(name => {
    paths.forEach(path => {
      // 清除當前網域 (無 domain 屬性)
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
      
      // 清除指定網域
      domains.forEach(domain => {
         document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain};`;
      });
    });
  });
}

interface RequestOptions extends RequestInit {
  // HttpOnly Cookie 模式下不需要手動傳遞 token
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { headers, ...customConfig } = options;
  
  // 自動讀取 CSRF Token (由 flask-jwt-extended 設定的 csrf_access_token cookie)
  const csrfToken = getCookie('csrf_access_token');

  // [DEBUG] 如果沒抓到 Token，印出警告與當前的 document.cookie 幫助排查
  if (!csrfToken) {
    console.warn(`[API] Missing CSRF Token. document.cookie: "${document.cookie}"`);
  }
  
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
  
  // 安全地解析 JSON：先檢查 Content-Type，避免 204 No Content 或 HTML 錯誤頁面導致 crash
  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    // 統一拋出包含 Status Code 的錯誤，方便後續處理
    throw new ApiError(response.status, data?.message || data?.msg || response.statusText || 'Something went wrong');
  }

  return data as T;
}