# ERP2026 進銷存系統 — 開發文件

> 最後更新：2026-08-17（列印選單、報表預覽）

---

## 目錄

1. [系統概覽](#系統概覽)
2. [技術堆疊](#技術堆疊)
3. [目錄結構](#目錄結構)
4. [資料庫](#資料庫)
5. [後端 FastAPI](#後端-fastapi)
6. [前端 React + Vite](#前端-react--vite)
7. [Stimulsoft 報表設計器](#stimulsoft-報表設計器)
8. [啟動方式](#啟動方式)
9. [移植到新電腦](#移植到新電腦)
10. [已完成功能](#已完成功能)
11. [待開發功能](#待開發功能)

---

## 系統概覽

進銷存 + 財務總帳系統，前後端分離架構。

- **前端**：React 18 SPA，透過 Vite dev server（port 5173）提供
- **後端**：FastAPI REST API（port 8000），前端以 Vite proxy 轉發 `/api` 請求
- **資料庫**：Oracle 19C（遠端，無需本機安裝 Oracle Instant Client）
- **報表**：Stimulsoft Reports.JS（嵌入式報表設計器 + 預覽列印）

---

## 技術堆疊

### 後端

| 套件 | 版本 | 用途 |
|------|------|------|
| fastapi | 0.141.1 | REST API 框架 |
| uvicorn | 0.32.0 | ASGI 伺服器 |
| pydantic | 2.13.4 | 資料驗證 |
| oracledb | 2.4.1 | Oracle DB 驅動（thin mode，不需 Instant Client） |
| python-multipart | 0.0.12 | Form 資料解析 |

### 前端

| 套件 | 版本 | 用途 |
|------|------|------|
| react | 18.x | UI 框架 |
| vite | 8.x | 開發伺服器 / 打包工具 |
| antd | 5.x | UI 元件庫（繁體中文 zh_TW） |
| axios | 最新 | HTTP 用戶端 |
| stimulsoft-reports-js | 2026.3.2 | 報表設計器（需另購授權） |

---

## 目錄結構

```
ERP2026/
├── backend/
│   ├── main.py              # FastAPI 入口，CORS、路由註冊
│   ├── database.py          # Oracle 連線 context manager
│   ├── requirements.txt     # Python 套件清單
│   └── routers/
│       ├── customers.py     # 客戶主檔 CRUD + report-data API
│       └── reports.py       # 報表檔案列表 + 下載 API（no-cache）
│
├── Report/
│   └── Customer/            # 客戶報表範本目錄（*.mrt）
│       ├── 客戶清冊.mrt
│       └── 客戶編號對照表.mrt
│
├── frontend/
│   ├── index.html           # 入口 HTML（含 Stimulsoft script 標籤）
│   ├── vite.config.js       # Vite 設定（proxy /api → localhost:8000）
│   ├── package.json
│   ├── scripts/
│   │   └── copy-stimulsoft.js   # 將 Stimulsoft JS 複製到 public/
│   ├── public/
│   │   └── stimulsoft/          # Stimulsoft JS 執行檔（由 copy-stimulsoft.js 產生）
│   │       ├── stimulsoft.reports.js
│   │       ├── stimulsoft.viewer.js
│   │       └── stimulsoft.designer.js
│   └── src/
│       ├── main.jsx             # React 入口，ConfigProvider zh_TW
│       ├── App.jsx              # 頁面 Layout（Header + Content）
│       ├── style.css            # 全域樣式
│       ├── api/
│       │   ├── customers.js     # customerApi（axios）
│       │   └── reports.js       # reportApi：listCustomer / customerReportUrl（含 cache-buster）
│       ├── pages/
│       │   └── CustomerMaster.jsx   # 客戶主檔維護頁面
│       └── components/
│           ├── CustomerFormModal.jsx      # 新增/編輯客戶 Modal
│           ├── CustomerReport.jsx         # Stimulsoft 報表設計器/預覽 Modal（localStorage 版面）
│           └── CustomerReportPreview.jsx  # Stimulsoft 純預覽 Modal（載入 .mrt 檔）
│
└── .claude/
    └── skills/
        └── run-master-seed/
            ├── SKILL.md         # Skill 說明
            └── seed300.py       # 產生 300 筆測試資料（冪等）
```

---

## 資料庫

### 連線資訊

```
Host:     JNVB2BWEB01.cminl.oa
Port:     1521
Service:  orcl.cminl.oa
User:     erp2026
Password: erp2026
```

> 使用 `python-oracledb` thin mode，**不需安裝 Oracle Instant Client**。

### 已建立的資料表

| 資料表 | 說明 | 測試資料 |
|--------|------|---------|
| TBL_CUSTOMER | 客戶主檔 | C001–C300（300 筆） |
| TBL_SUPPLIER | 供應商主檔 | S001–S300（300 筆） |
| TBL_PRODUCT | 產品主檔 | P001–P300（300 筆） |

### 重新產生測試資料

```bash
cd .claude/skills/run-master-seed
python seed300.py
```

此腳本為冪等操作（先刪後插），可重複執行。

---

## 後端 FastAPI

### 啟動

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### API 路由總覽

#### 客戶主檔（`/api/customers`）

| Method | 路徑 | 說明 |
|--------|------|------|
| GET | `/api/customers` | 分頁查詢（支援關鍵字搜尋） |
| GET | `/api/customers/report-data` | Stimulsoft 資料來源（中文欄位名稱） |
| GET | `/api/customers/{cum_no}` | 取得單筆客戶 |
| POST | `/api/customers` | 新增客戶（201） |
| PUT | `/api/customers/{cum_no}` | 更新客戶 |
| DELETE | `/api/customers/{cum_no}` | 刪除客戶 |

#### 報表檔案（`/api/reports`）

| Method | 路徑 | 說明 |
|--------|------|------|
| GET | `/api/reports/customer` | 列出 `Report/Customer/*.mrt` 的檔名（不含副檔名） |
| GET | `/api/reports/customer/{filename}` | 下載單一 `.mrt` 檔（`Cache-Control: no-store`） |

### 查詢參數（GET /api/customers）

| 參數 | 說明 |
|------|------|
| `q` | 關鍵字，比對 CUM_NO / CUM_NAME / CUM_UNIFORM_NO |
| `page` | 頁碼（預設 1） |
| `page_size` | 每頁筆數（預設 20，最大 500） |

---

## 前端 React + Vite

### 啟動

```bash
cd frontend
npm install
npm run dev
```

瀏覽器開啟：`http://localhost:5173`

### Vite Proxy

`/api/*` 請求自動轉發到 `http://localhost:8000`，開發時不需處理 CORS。

```js
// vite.config.js
proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }
```

### 已實作頁面 / 元件

| 檔案 | 說明 |
|------|------|
| `pages/CustomerMaster.jsx` | 客戶主檔維護（查詢、分頁、新增、編輯、刪除、列印選單） |
| `components/CustomerFormModal.jsx` | 新增 / 編輯客戶表單（基本、聯絡、財務資料） |
| `components/CustomerReport.jsx` | Stimulsoft 報表 Modal（設計版面 Tab + 預覽列印 Tab，版面存 localStorage） |
| `components/CustomerReportPreview.jsx` | Stimulsoft 純預覽 Modal（直接載入 `.mrt` 檔，每次強制重新整理） |
| `api/customers.js` | customerApi（list / get / create / update / remove / reportDataUrl） |
| `api/reports.js` | reportApi（listCustomer / customerReportUrl，URL 含 `?_=timestamp` cache-buster） |

---

## Stimulsoft 報表設計器

### 授權

- 商品：**Stimulsoft Reports.JS — Single Developer License**
- 費用：約 $800 USD（首次），續約 $400 USD/年（可不續約繼續用舊版）
- 購買：https://www.stimulsoft.com/en/online-store/purchase#js
- 客戶端（End User）使用報表：**免 Royalty**，不限客戶數量

### 安裝步驟（移植到新電腦後需重做）

```bash
cd frontend
npm install stimulsoft-reports-js
node scripts/copy-stimulsoft.js
```

執行後 `public/stimulsoft/` 目錄會產生以下 3 個 JS 檔：
- `stimulsoft.reports.js`
- `stimulsoft.viewer.js`
- `stimulsoft.designer.js`

`index.html` 已設定好 `<script>` 標籤，無需手動修改。

### 報表資料來源

- URL：`http://localhost:5173/api/customers/report-data`
- 格式：JSON 陣列，欄位名稱為中文（客戶編號、客戶名稱⋯）
- 資料表來源欄位名稱（`NameInSource`）：`Customers.root`

### 報表範本管理

| 模式 | 範本來源 | 說明 |
|------|---------|------|
| 報表設計（`CustomerReport`） | 瀏覽器 `localStorage`（key: `erp_customer_report_tpl`） | 可即時設計並儲存版面 |
| 預覽列印（`CustomerReportPreview`） | `Report/Customer/*.mrt` 檔案 | 透過 `/api/reports/customer/{filename}` 下載，每次強制從磁碟讀取（no-cache） |

### 新增報表

將設計好的 `.mrt` 檔案放入 `Report/Customer/` 目錄，頁面【列印】選單會自動出現對應的 Menu Item，無需修改程式碼。

### 注意事項

- `.mrt` 檔案若有相同 `ReportGuid`，`CustomerReportPreview` 在載入時會自動覆寫 GUID 以避免 Stimulsoft 內部快取干擾。
- 後端 `/api/reports/customer/{filename}` 回應加掛 `Cache-Control: no-store`，前端 URL 另附 `?_={timestamp}` 雙重防快取。

---

## 啟動方式

需開兩個終端機：

**終端機 1 — 後端**

```bash
cd D:\ERP2026\ERP2026\backend
python -m uvicorn main:app --reload --port 8000
```

**終端機 2 — 前端**

```bash
cd D:\ERP2026\ERP2026\frontend
npm run dev
```

**瀏覽器**：開啟 `http://localhost:5173`

---

## 移植到新電腦

### 前置需求

| 軟體 | 版本需求 | 備註 |
|------|---------|------|
| Python | 3.10+ | 建議 3.12 或 3.13 |
| Node.js | 18+ | 建議 22.x |
| npm | 隨 Node.js | — |

### 步驟

```bash
# 1. 複製專案目錄到新電腦
# （直接複製整個 ERP2026 資料夾）

# 2. 安裝後端套件
cd ERP2026/backend
pip install -r requirements.txt

# 3. 安裝前端套件
cd ../frontend
npm install

# 4. 重新複製 Stimulsoft JS（node_modules 不複製）
node scripts/copy-stimulsoft.js

# 5. 啟動（參考上方啟動方式）
```

> **注意**：`frontend/node_modules/` 和 `frontend/public/stimulsoft/` 不需要複製，
> 執行 `npm install` 和 `copy-stimulsoft.js` 後會自動重建。

---

## 已完成功能

- [x] Oracle 19C 連線（thin mode，不需 Instant Client）
- [x] TBL_CUSTOMER / TBL_SUPPLIER / TBL_PRODUCT 各 300 筆測試資料
- [x] 客戶主檔維護頁面
  - [x] 關鍵字查詢（編號 / 名稱 / 統一編號）
  - [x] 分頁顯示（20 筆/頁，可調整）
  - [x] 新增客戶（表單驗證、重複編號檢查）
  - [x] 編輯客戶（表單預填）
  - [x] 刪除客戶（Popconfirm 確認）
  - [x] 列印選單（Dropdown，自動掃描 `Report/Customer/*.mrt`）
  - [x] 報表預覽列印（`CustomerReportPreview`，載入 `.mrt` 檔，強制 no-cache）
  - [x] 報表設計器（`CustomerReport`，Stimulsoft Designer + Viewer，版面存 localStorage）
  - [x] 報表資料來源 API（`/api/customers/report-data`）
  - [x] 報表檔案 API（`/api/reports/customer`，列表 + 下載，no-cache headers）

---

## 待開發功能

- [ ] 供應商主檔維護頁面（TBL_SUPPLIER）
- [ ] 產品主檔維護頁面（TBL_PRODUCT）
- [ ] 左側導覽選單（多頁面路由）
- [ ] 銷售訂單模組
- [ ] 採購訂單模組
- [ ] 財務總帳模組
- [ ] 使用者登入 / 權限控管
- [ ] Docker 部署設定
