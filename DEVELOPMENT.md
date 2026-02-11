# 專案開發文檔 (Development Documentation)

## 1. 系統架構總覽

本專案採用 **前後端分離 (Decoupled Architecture)** 架構：

- **前端 (Frontend)**: React + TypeScript + Vite + Tailwind CSS
- **後端 (Backend)**: Flask + SQLAlchemy + JWT
- **通訊協定**: RESTful API (JSON)
- **驗證機制**: JWT (JSON Web Token)

---

## 2. 前端架構詳解 (`frontend/`)

為了避免程式碼變成「義大利麵條 (Spaghetti Code)」，我們將職責分得很清楚：

### 📂 核心模組說明

#### 1. 底層通訊官：`src/lib/api.ts`
- **職責**: 這是最底層的 API 呼叫工具。
- **功能**:
  - 統一設定 `BASE_URL` (從環境變數讀取)。
  - 設定 `credentials: 'include'`，讓瀏覽器自動攜帶 HttpOnly Cookie。
  - 自動讀取 `csrf_access_token` Cookie 並加入 `X-CSRF-TOKEN` Header，以通過後端 CSRF 驗證。
  - 統一處理 HTTP 錯誤狀態碼 (如 401, 403, 500)，並拋出 `ApiError`。
- **好處**: 你不需要在每個頁面都寫 `fetch('http://...', { headers: ... })`，只要呼叫 `request('/auth/login')` 即可。

#### 2. 業務窗口：`src/services/`
- **職責**: 定義具體的業務邏輯 API。
- **範例 (`auth.ts`)**:
  - `login(username, password)`: 呼叫底層 API 進行登入。
  - `logout()`: 呼叫底層 API 進行登出。
  - `getMe()`: 呼叫底層 API 確認登入狀態。
- **好處**: 頁面 (Page) 不需要知道 API 的網址是什麼，只需要呼叫 Service。

#### 3. 全域廣播站：`src/contexts/AuthContext.tsx`
- **職責**: 管理「全域狀態」。
- **功能**:
  - 記住「現在是誰登入 (User)」。
  - 提供 `login()` 和 `logout()` 方法給 UI 使用。
  - 程式啟動時，自動從 `localStorage` 讀取舊的登入資訊，保持登入狀態。
- **好處**: 任何頁面只要用 `useAuth()` 就可以知道使用者有沒有登入，不用自己去查 LocalStorage。

#### 4. 路由守衛：`src/components/ProtectedRoute.tsx`
- **職責**: 保護需要登入的頁面。
- **運作**: 如果使用者沒登入，自動踢回 `/login`；如果有登入，才顯示內容。

---

## 3. 資料流運作流程 (Data Flow)

### 🟢 登入流程 (Login Flow)

1. **使用者** 在 `LoginPage` 輸入帳號密碼，按下送出。
2. **LoginPage** 呼叫 `authService.login(username, password)`。
3. **authService** 呼叫 `request('/auth/login')` (位於 `lib/api.ts`)。
4. **後端** 驗證成功，設定 `HttpOnly Cookie` 並回傳 `{ user }`。
5. **LoginPage** 拿到資料，呼叫 `login(user)` (位於 `AuthContext`)。
6. **AuthContext** 做三件事：
   - 更新 React State (讓畫面變更)。
   - 將 User 資訊存入 `localStorage` (UI 顯示用)。
   - 導向首頁 `/`。

### 🔄 重新整理流程 (Reload / Session Restore)

1. **使用者** 重新整理頁面。
2. **AuthContext** 初始化，呼叫 `authService.getMe()`。
3. **瀏覽器** 自動將 HttpOnly Cookie 帶給後端 `/auth/me`。
4. **後端** 驗證 Token 有效性，回傳最新使用者資訊。
5. **AuthContext** 更新 React State，使用者保持登入狀態。

### 🔴 登出流程 (Logout Flow)

1. **使用者** 在 `HomePage` 按下「登出」。
2. **HomePage** 呼叫 `logout()` (位於 `AuthContext`)。
3. **AuthContext** 呼叫 `authService.logout()` 通知後端清除 Cookie 並作廢 Token。
4. **AuthContext** 清除 React State 和 `localStorage`。
5. **頁面** 自動偵測到沒登入，跳轉回 `/login`。

---

## 4. 後端架構詳解 (`backend/`)

後端主要負責邏輯處理與資料庫溝通。

### 📂 核心模組

#### 1. 認證服務：`src/services/auth.py`
- **`login_service(data)`**:
  - 檢查帳號密碼格式。
  - 查詢資料庫 (`User.query`)。
  - 驗證密碼雜湊 (`check_password`)。
  - 簽發 JWT Token (`create_access_token`)。
- **`logout_service(jti)`**:
  - 將 Token 的 ID (JTI) 存入 `TokenBlocklist` 資料庫表，標記為失效。
- **`/me` Endpoint**:
  - 透過 Cookie 中的 Token 識別使用者 (`get_jwt_identity`)。
  - 回傳當前使用者資訊，用於前端初始化。

---

## 5. 常見問題 (FAQ)

### Q: 為什麼要分這麼多檔案？
**A:** 為了**可維護性**。
- 如果 API 網址變了，你只需要改 `lib/api.ts` 一個地方，不用改幾十個頁面。
- 如果登入邏輯變了，你只需要改 `AuthContext`，所有頁面都會自動更新。

### Q: 什麼是 Context？
**A:** 想像它是 React 的「全域變數」。原本 React 的資料只能父傳子 (Props)，但像「使用者資訊」這種幾乎每個頁面都要用的資料，用 Context 存起來，大家都可以直接拿，不用一層一層傳。

### Q: 資安注意事項？
**A:** 我們已採用 **HttpOnly Cookie** 機制。
- **優點**: JavaScript 無法讀取 Token，有效防禦 XSS 攻擊竊取 Token。
- **注意**: 後端需設定 `JWT_TOKEN_LOCATION = ['cookies']` 並在 Login Response 中使用 `set_access_cookies()`。
- **CSRF**: 已開啟 `JWT_COOKIE_CSRF_PROTECT = True`。前端 `api.ts` 會自動處理 CSRF Token。

---

## 6. 快速開始

### 前置準備
請確保電腦已安裝 **Node.js** (建議 v16+) 與 **Python** (建議 3.10+)。

### 1. 環境變數設定
專案依賴環境變數來設定 API 網址與密鑰。請參考目錄下的 `.env.example` 建立 `.env` 檔案。

### 2. 啟動後端 (Backend)
```bash
cd backend

# 建立並啟用虛擬環境 (建議)
python -m venv venv
# Windows: .\venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# 安裝依賴套件
pip install -r requirements.txt

# 啟動伺服器
flask run
```

### 3. 啟動前端 (Frontend)
```bash
cd frontend

# 安裝依賴套件
npm install

# 啟動開發伺服器 (建議綁定 127.0.0.1 以避免 Cookie 跨域問題)
npm run dev -- --host 127.0.0.1
```