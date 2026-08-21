import { useState, useEffect, useRef, useCallback } from 'react'
import { AutoComplete, Button, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { dataDictApi } from '../api/datadict'
import { DDLookup } from '../lib/ddLookup'

/**
 * 資料字典 Lookup 輸入框：兩種選值方式並存。
 * 1. 直接輸入文字，下方即時顯示符合條件的下拉選單，點選其一（一次只能選一筆）。
 * 2. 點右邊的搜尋按鈕開啟完整 DDLookup Modal（支援多選，依資料字典的 IS_MULTI_SELECTED 設定）。
 *
 * value/onChange 的 values/rows 一律是 TBLDD.RET_VAL_FIELD 的值（供呼叫端儲存/綁定用）。
 * displayField（選填）決定選取後畫面上顯示哪個欄位的內容，需對應 DDM_NO 的
 * TBL_DDFIELD.DDD_FIELD；沒給就沿用 RET_VAL_FIELD 顯示。onChange 的第三個參數
 * 是元件依 displayField 算好的顯示文字，呼叫端可直接拿去存成自己的顯示用 state。
 */
export default function DDLookupEdit({ ddmNo, displayField, value, onChange, placeholder, disabled, style }) {
  const [meta, setMeta] = useState(null)
  const [inputValue, setInputValue] = useState(value || '')
  const [options, setOptions] = useState([])
  const [opening, setOpening] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    dataDictApi.getMeta(ddmNo).then((res) => {
      setMeta(res.data)
      if (displayField && !res.data.fields.some((f) => f.ddd_field === displayField)) {
        console.warn(
          `DDLookupEdit: displayField "${displayField}" 不在資料字典 "${ddmNo}" 的欄位定義中，改用 RET_VAL_FIELD 顯示`
        )
      }
    })
  }, [ddmNo, displayField])

  useEffect(() => { setInputValue(value || '') }, [value])

  const retField = meta?.ret_val_field
  const fields = meta?.fields || []
  const hasDisplayField = !!displayField && fields.some((f) => f.ddd_field === displayField)

  const toDisplayText = (rows) =>
    rows.map((r) => (hasDisplayField ? r[displayField] : r[retField])).join(', ')

  const search = useCallback((text) => {
    if (!text) { setOptions([]); return }
    dataDictApi.getData(ddmNo, { q: text }).then((res) => {
      setOptions(
        res.data.slice(0, 20).map((row) => ({
          value: row[retField],
          label: fields.map((f) => row[f.ddd_field]).filter(Boolean).join(' - '),
          row,
        }))
      )
    })
  }, [ddmNo, retField, fields])

  const handleSearchText = (text) => {
    setInputValue(text)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(text), 300)
  }

  const handleSelect = (val, option) => {
    const displayText = toDisplayText([option.row])
    setInputValue(displayText)
    onChange?.([val], [option.row], displayText)
  }

  const openLookup = async () => {
    if (disabled || opening) return
    setOpening(true)
    try {
      const result = await DDLookup.getDDLookup(ddmNo)
      if (result) {
        const displayText = toDisplayText(result.rows)
        setInputValue(displayText)
        onChange?.(result.values, result.rows, displayText)
      }
    } finally {
      setOpening(false)
    }
  }

  return (
    <Space.Compact style={{ width: '100%', ...style }}>
      <AutoComplete
        style={{ width: '100%' }}
        value={inputValue}
        options={options}
        onSearch={handleSearchText}
        onSelect={handleSelect}
        disabled={disabled}
        placeholder={placeholder}
      />
      <Button icon={<SearchOutlined />} onClick={openLookup} disabled={disabled} loading={opening} />
    </Space.Compact>
  )
}
