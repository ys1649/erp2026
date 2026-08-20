import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import DataDictLookup from '../components/DataDictLookup'
import { antdLocale, antdTheme } from '../theme'

function mountLookup(ddmNo) {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    let settled = false
    const settle = (result) => {
      if (settled) return
      settled = true
      root.unmount()
      container.remove()
      resolve(result)
    }

    root.render(
      <ConfigProvider locale={antdLocale} theme={antdTheme}>
        <DataDictLookup
          ddmNo={ddmNo}
          open={true}
          onCancel={() => settle(null)}
          onConfirm={(values, rows) => settle({ values, rows })}
        />
      </ConfigProvider>
    )
  })
}

/**
 * 呼叫式資料字典 Lookup：不用在頁面上寫 <DataDictLookup> 標籤，
 * 呼叫端只要 await 拿回傳值即可，單選/多選由資料字典定義決定。
 *
 *   const result = await DDLookup.getDDLookup('TBL_CUSTOMER')
 *   if (!result) return          // 使用者取消
 *   result.values                // RET_VAL_FIELD 值陣列
 *   result.rows                  // 完整選取列
 */
export const DDLookup = {
  getDDLookup(ddmNo) {
    return mountLookup(ddmNo)
  },
}
