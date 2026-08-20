# ERP2026 進銷存系統 — 開發文件

> 最後更新：2026-08-20（DDLookup 呼叫式 API + DDLookupInput 打字下拉/多選 Modal 雙模式；修正版本號 React 19 / antd 6）

---

## 目錄

1. [系統概覽](#系統概覽)
2. [技術堆疊](#技術堆疊)
3. [目錄結構](#目錄結構)
4. [資料庫](#資料庫)
5. [後端 FastAPI](#後端-fastapi)
6. [前端 React + Vite](#前端-react--vite)
7. [資料字典與可重用 Lookup 元件](#資料字典與可重用-lookup-元件)
8. [Stimulsoft 報表設計器](#stimulsoft-報表設計器)
9. [啟動方式](#啟動方式)
10. [移植到新電腦](#移植到新電腦)
11. [已完成功能](#已完成功能)
12. [待開發功能](#待開發功能)

---

## 系統概覽

進銷存 + 財務總帳系統，前後端分離架構。

- **前端**：React 19 SPA，透過 Vite dev server（port 5173）提供
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
| react | 19.x | UI 框架 |
| vite | 8.x | 開發伺服器 / 打包工具 |
| antd | 6.x | UI 元件庫（繁體中文 zh_TW） |
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
│       ├── reports.py       # 報表檔案列表 + 下載 API（no-cache）
│       └── data_dict.py     # 資料字典主檔/欄位 CRUD + Lookup meta/data API
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
│       │   ├── reports.js       # reportApi：listCustomer / customerReportUrl（含 cache-buster）
│       │   └── datadict.js      # dataDictApi：主檔/欄位 CRUD、meta、data
│       ├── lib/
│       │   └── ddLookup.jsx     # ★ DDLookup.getDDLookup(ddmNo)：呼叫式 Promise API，動態掛載/卸載
│       ├── theme.js             # antd ConfigProvider 的 locale/theme 設定（main.jsx 與 ddLookup.jsx 共用）
│       ├── pages/
│       │   ├── CustomerMaster.jsx   # 客戶主檔維護頁面
│       │   └── DataDictMaster.jsx   # 資料字典維護頁面（主檔 + 欄位定義）
│       └── components/
│           ├── CustomerFormModal.jsx      # 新增/編輯客戶 Modal
│           ├── CustomerReport.jsx         # Stimulsoft 報表設計器/預覽 Modal（localStorage 版面）
│           ├── CustomerReportPreview.jsx  # Stimulsoft 純預覽 Modal（載入 .mrt 檔）
│           ├── DataDictFormModal.jsx      # 新增/編輯資料字典主檔 Modal
│           ├── DataDictFieldFormModal.jsx # 新增/編輯資料字典欄位 Modal
│           ├── DataDictLookup.jsx         # ★ 可重用 Lookup 元件（JSX 掛用）
│           └── DDLookupInput.jsx          # ★ 輸入框：打字下拉選單 + 搜尋鈕開 Modal，兩種選值方式並存
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
| TBLDD | 資料字典主檔（Lookup 定義） | 依實際建立筆數 |
| TBL_DDFIELD | 資料字典欄位定義 | 依實際建立筆數 |

#### TBLDD（資料字典主檔）

| 欄位 | 說明 |
|------|------|
| DDM_NO | PK，資料字典編號，其他畫面用這個編號指定要用哪個資料字典 |
| DDM_NAME | 資料字典名稱，即 Lookup 視窗標題 |
| DDM_SQL | 資料來源 SQL（僅允許單一 SELECT 查詢，後端會檔） |
| RET_VAL_FIELD | 選取後回傳的欄位名稱，需對應 DDM_SQL 查詢出的欄位 |
| IS_MULTI_SELECTED | 是否允許多選（`Y`/`N`） |

#### TBL_DDFIELD（資料字典欄位定義）

| 欄位 | 說明 |
|------|------|
| DDD_ID | PK，`S_DDD_ID.NEXTVAL` |
| DDM_NO | FK → TBLDD.DDM_NO |
| DDD_FIELD | 欄位名稱，需對應 DDM_SQL 查詢出的欄位（可用「自動產生欄位定義」帶出） |
| DDD_FIELD_DISP | 欄位顯示名稱，Lookup 表格的欄位標題 |

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

#### 資料字典（`/api/datadict`）

| Method | 路徑 | 說明 |
|--------|------|------|
| GET | `/api/datadict` | 分頁查詢主檔（關鍵字比對編號/名稱） |
| GET | `/api/datadict/{ddm_no}` | 取得單筆主檔 |
| POST | `/api/datadict` | 新增主檔（201，DDM_SQL 需為單一 SELECT） |
| PUT | `/api/datadict/{ddm_no}` | 更新主檔 |
| DELETE | `/api/datadict/{ddm_no}` | 刪除主檔（會先刪除底下的欄位定義） |
| GET | `/api/datadict/{ddm_no}/fields` | 取得欄位定義清單 |
| POST | `/api/datadict/{ddm_no}/fields` | 新增欄位定義 |
| PUT | `/api/datadict/{ddm_no}/fields/{ddd_id}` | 更新欄位定義 |
| DELETE | `/api/datadict/{ddm_no}/fields/{ddd_id}` | 刪除欄位定義 |
| POST | `/api/datadict/{ddm_no}/fields/auto-generate` | 依 DDM_SQL 欄位結構自動產生欄位定義（保留已存在欄位的顯示名稱） |
| GET | `/api/datadict/{ddm_no}/meta` | 供 Lookup 元件用：主檔資訊 + 欄位定義清單 |
| GET | `/api/datadict/{ddm_no}/data?q=` | 執行 DDM_SQL 取得 Lookup 資料，`q` 可跨所有已定義欄位做關鍵字過濾（不分頁，回傳全部符合的資料） |

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
| `pages/DataDictMaster.jsx` | 資料字典維護（主檔 + 欄位定義雙表格、自動產生欄位定義、測試 Lookup） |
| `components/DataDictFormModal.jsx` | 新增 / 編輯資料字典主檔表單 |
| `components/DataDictFieldFormModal.jsx` | 新增 / 編輯資料字典欄位表單 |
| `components/DataDictLookup.jsx` | ★ 可重用 Lookup 元件，其他頁面需要「選值」時直接掛用（詳見下一節） |
| `components/DDLookupInput.jsx` | ★ 打字下拉選單（單選）+ 搜尋鈕開完整 Modal（可多選），一行接上資料字典 |
| `lib/ddLookup.jsx` | ★ `DDLookup.getDDLookup(ddmNo)`：呼叫式 Lookup，不用寫 `<DataDictLookup>` JSX，回傳 Promise |
| `api/customers.js` | customerApi（list / get / create / update / remove / reportDataUrl） |
| `api/reports.js` | reportApi（listCustomer / customerReportUrl，URL 含 `?_=timestamp` cache-buster） |
| `api/datadict.js` | dataDictApi（主檔/欄位 CRUD、autoGenerateFields、getMeta、getData） |

---

## 資料字典與可重用 Lookup 元件

「資料字典」是一個可設定的 Table Lookup 元件來源：先在**資料字典維護**頁面（分頁「資料字典維護」）定義好一筆資料字典，之後任何頁面只要知道它的 `DDM_NO`，就能直接掛上 `<DataDictLookup>` 元件做選值查詢，不用另外寫 Modal / API。

### 運作原理

- **TBLDD**（主檔）：定義 Lookup 的資料來源 SQL、回傳欄位、是否多選。
- **TBL_DDFIELD**（欄位定義）：定義 Lookup 表格要顯示哪些欄位、標題是什麼；可用「自動產生欄位定義」依 DDM_SQL 的欄位結構自動帶出（已存在的欄位會保留原顯示名稱）。
- `DataDictLookup` 元件在開啟時呼叫 `GET /api/datadict/{ddm_no}/meta` 取得表格欄位與設定，呼叫 `GET /api/datadict/{ddm_no}/data?q=` 取得（可依關鍵字過濾的）資料列；使用者選取後，元件依 `RET_VAL_FIELD` 從選取列中取值，以 **JSON Array** 回傳（單選也是陣列，只是長度為 1）。

### 新增一個資料字典（前置作業）

1. 到「資料字典維護」頁面點「新增資料字典」，填 `DDM_NO`（其他頁面程式碼要用到）、`DDM_NAME`（Lookup 標題）、`DDM_SQL`（單一 SELECT 查詢）、`RET_VAL_FIELD`（回傳欄位）、是否多選。
2. 選取剛新增的那筆，點「自動產生欄位定義」，系統會依 SQL 欄位結構自動列出欄位；可再逐一「編輯」欄位把顯示名稱改成中文。
3. 點該筆的「測試」按鈕，用 `DataDictLookup` 本尊確認搜尋、選取、回傳值都符合預期。

### 在其他頁面使用 `<DataDictLookup>`

```jsx
import { useState } from 'react'
import { Input, Button, Space } from 'antd'
import DataDictLookup from '../components/DataDictLookup'

function SalesOrderForm() {
  const [lookupOpen, setLookupOpen] = useState(false)
  const [cumNo, setCumNo] = useState('')

  return (
    <>
      <Space.Compact style={{ width: '100%' }}>
        <Input value={cumNo} readOnly placeholder="客戶編號" />
        <Button onClick={() => setLookupOpen(true)}>選擇</Button>
      </Space.Compact>

      <DataDictLookup
        ddmNo="TBL_CUSTOMER"                 // 對應 TBLDD.DDM_NO
        open={lookupOpen}
        onCancel={() => setLookupOpen(false)}
        onConfirm={(values) => {
          setCumNo(values[0])                // 單選：取第一筆；多選則整個陣列都要
          setLookupOpen(false)
        }}
      />
    </>
  )
}
```

#### Props

| Prop | 型別 | 說明 |
|------|------|------|
| `ddmNo` | string | 要使用的資料字典編號（`TBLDD.DDM_NO`），需已在資料字典維護頁面建立並定義好欄位 |
| `open` | boolean | 是否顯示 Modal |
| `onCancel` | () => void | 取消 / 關閉時呼叫 |
| `onConfirm` | (values, rows) => void | 按下「確認」時呼叫：`values` 為選取列的 `RET_VAL_FIELD` 值陣列（JSON Array，單選也是陣列）；`rows` 為選取的完整資料列，需要其他欄位（例如同時要客戶名稱）可從這裡取 |

> 元件內部已處理搜尋框、欄位標題（依 `TBL_DDFIELD`）、單選/多選（依 `TBLDD.IS_MULTI_SELECTED`），呼叫端只需要管開關狀態與拿回傳值即可。

### 呼叫式用法：`DDLookup.getDDLookup(ddmNo)`

不想在頁面上寫 `<DataDictLookup>` JSX、管 `open` state 的話，可以改用 `frontend/src/lib/ddLookup.jsx` 匯出的 `DDLookup`。呼叫後會動態把 Modal 掛到 `document.body`，使用者操作完再自動卸載，回傳一個 Promise：

```jsx
import { DDLookup } from '../lib/ddLookup'

async function handlePickCustomer() {
  const result = await DDLookup.getDDLookup('TBL_CUSTOMER')
  if (!result) return                 // 使用者取消，resolve 為 null
  setCumNo(result.values[0])          // RET_VAL_FIELD 值陣列
  setCumName(result.rows[0]?.CUM_NAME) // 完整選取列，可取其他欄位
}
```

- `result === null`：使用者取消（X / 取消鈕 / 點遮罩 / Esc 都算）。
- `result === { values, rows }`：確認選取，`values`/`rows` 內容與 `<DataDictLookup>` 的 `onConfirm(values, rows)` 完全一致。
- 因為動態掛載的是**獨立的 React root**，`ddLookup.jsx` 內部會自己包一層跟 `main.jsx` 相同的 `<ConfigProvider>`（設定集中在 `frontend/src/theme.js`，兩處共用，避免改主題漏改一處）。
- 連續呼叫多次會各自獨立掛載、各自 resolve，antd Modal 原生處理堆疊 z-index，不需要排隊機制。

### 輸入框元件：`<DDLookupInput>`

大部分表單欄位（客戶編號、產品編號⋯）都會用到資料字典選值，`frontend/src/components/DDLookupInput.jsx` 把常見的兩種選值方式包在同一個元件裡，一行接上：

```jsx
import { useState } from 'react'
import DDLookupInput from '../components/DDLookupInput'

function SalesOrderForm() {
  const [cumNo, setCumNo] = useState('')   // 單選字典：畫面顯示用字串

  return (
    <DDLookupInput
      ddmNo="TBL_CUSTOMER"
      value={cumNo}
      onChange={(values, rows) => setCumNo(values.join(', '))}  // 單選/多選由字典設定決定，這裡不強制取第一筆
      placeholder="客戶編號"
    />
  )
}
```

**兩種選值方式並存**：
1. **直接輸入文字**：邊打字邊向後端查（`GET /api/datadict/{ddm_no}/data?q=`，debounce 300ms），下方即時出現符合條件的下拉選單，點選其一——這個方式**一次只能選一筆**，適合快速輸入已知編號。
2. **點右邊搜尋按鈕**：開啟完整的 `DDLookup` Modal，可瀏覽、搜尋、多選（依資料字典的 `IS_MULTI_SELECTED` 設定）——多選情境一定要用這個方式，打字下拉選單不支援多選。

不管走哪個路徑，最終都是呼叫 `onChange(values, rows)`，**單選或多選完全由資料字典本身的 `IS_MULTI_SELECTED` 決定**，`DDLookupInput` 不會替呼叫端做任何截斷——`values`/`rows` 就是完整陣列（單選時陣列長度自然是 1），怎麼顯示（例如多選時 `join(', ')`）或儲存由呼叫端自己決定。Props：`ddmNo`（必填）、`value`（顯示字串）、`onChange(values, rows)`、`placeholder`、`disabled`、`style`。

---

## Stimulsoft 報表設計器

### 授權

- 商品：**Stimulsoft Reports.JS — Single Developer License**
- 費用：約 $800 USD（首次），續約 $400 USD/年（可不續約繼續用舊版）
- 購買：https://www.stimulsoft.com/en/online-store/purchase#js
- 客戶端（End User）使用報表：**免 Royalty**，不限客戶數量

### 安裝步驟

```bash
cd frontend
npm install
```

`stimulsoft-reports-js` 已列在 `package.json` dependencies，且 `postinstall` 腳本會自動執行 `copy-stimulsoft.js`，`npm install` 完成後即會自動產生以下 JS 檔：
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

# 3. 安裝前端套件（postinstall 會自動複製 Stimulsoft JS 到 public/stimulsoft/）
cd ../frontend
npm install

# 4. 啟動（參考上方啟動方式）
```

> **注意**：`frontend/node_modules/` 和 `frontend/public/stimulsoft/` 不需要複製，
> 執行 `npm install` 後會自動重建。

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
- [x] 資料字典模組（TBLDD / TBL_DDFIELD）
  - [x] 資料字典維護頁面（主檔 + 欄位定義雙表格，新增/編輯/刪除）
  - [x] 自動產生欄位定義（依 DDM_SQL 欄位結構）
  - [x] 可重用 `DataDictLookup` 元件（搜尋、單/多選、JSON Array 回傳）
  - [x] 主檔 DDM_SQL 僅允許單一 SELECT（後端檢查，防止多重語句）
  - [x] 呼叫式 `DDLookup.getDDLookup(ddmNo)`（Promise API，動態掛載/卸載，不用寫 JSX）
  - [x] `DDLookupInput` 元件（打字下拉選單快速選 + 搜尋鈕開完整 Modal 可多選，一行接上資料字典）

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
