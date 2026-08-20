import { useState, useEffect, useRef, useCallback } from 'react'
import { AutoComplete, Button, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { dataDictApi } from '../api/datadict'
import { DDLookup } from '../lib/ddLookup'

/**
 * 資料字典 Lookup 輸入框：兩種選值方式並存。
 * 1. 直接輸入文字，下方即時顯示符合條件的下拉選單，點選其一（一次只能選一筆）。
 * 2. 點右邊的搜尋按鈕開啟完整 DDLookup Modal（支援多選，依資料字典的 IS_MULTI_SELECTED 設定）。
 * 兩種方式選完都透過 onChange(values, rows) 回傳完整陣列，呼叫端自行決定怎麼顯示/儲存。
 */
export default function DDLookupInput({ ddmNo, value, onChange, placeholder, disabled, style }) {
  const [meta, setMeta] = useState(null)
  const [inputValue, setInputValue] = useState(value || '')
  const [options, setOptions] = useState([])
  const [opening, setOpening] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    dataDictApi.getMeta(ddmNo).then((res) => setMeta(res.data))
  }, [ddmNo])

  useEffect(() => { setInputValue(value || '') }, [value])

  const retField = meta?.ret_val_field
  const fields = meta?.fields || []

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
    setInputValue(val)
    onChange?.([val], [option.row])
  }

  const openLookup = async () => {
    if (disabled || opening) return
    setOpening(true)
    try {
      const result = await DDLookup.getDDLookup(ddmNo)
      if (result) {
        setInputValue(result.values.join(', '))
        onChange?.(result.values, result.rows)
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
