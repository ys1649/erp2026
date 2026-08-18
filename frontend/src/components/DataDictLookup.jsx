import { useState, useEffect, useCallback } from 'react'
import { Modal, Input, Table, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { dataDictApi } from '../api/datadict'

/**
 * 資料字典 Lookup 元件
 * 依 TBLDD/TBL_DDFIELD 定義顯示查詢表格，選取後以 RET_VAL_FIELD 欄位值回傳 JSON Array。
 */
export default function DataDictLookup({ ddmNo, open, onCancel, onConfirm }) {
  const [meta, setMeta] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchData = useCallback(async (query) => {
    if (!ddmNo) return
    setLoading(true)
    try {
      const res = await dataDictApi.getData(ddmNo, { q: query || undefined })
      setRows(res.data)
    } catch (err) {
      message.error(err.response?.data?.detail || '查詢資料失敗')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [ddmNo])

  useEffect(() => {
    if (!open || !ddmNo) return
    setQ('')
    setSelectedRowKeys([])
    setSelectedRows([])
    setPage(1)
    setPageSize(10)
    dataDictApi.getMeta(ddmNo)
      .then((res) => setMeta(res.data))
      .catch((err) => message.error(err.response?.data?.detail || '載入資料字典定義失敗'))
    fetchData('')
  }, [open, ddmNo, fetchData])

  const isMulti = meta?.is_multi_selected === 'Y'
  const retField = meta?.ret_val_field
  const columns = (meta?.fields || []).map((f) => ({
    title: f.ddd_field_disp,
    dataIndex: f.ddd_field,
    key: f.ddd_field,
    ellipsis: true,
  }))

  const handleOk = () => {
    if (selectedRows.length === 0) {
      message.warning('請選擇至少一筆資料')
      return
    }
    onConfirm(selectedRows.map((r) => r[retField]), selectedRows)
  }

  return (
    <Modal
      title={meta?.ddm_name || '資料字典查詢'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="確認"
      cancelText="取消"
      width={800}
      destroyOnHidden
    >
      <Input.Search
        placeholder="快速搜尋"
        allowClear
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onSearch={(v) => { setPage(1); fetchData(v) }}
        style={{ marginBottom: 12 }}
        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
      />
      <Table
        rowKey={(r) => r[retField]}
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          current: page,
          pageSize,
          showTotal: (t) => `共 ${t} 筆`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps) },
        }}
        scroll={{ y: 320 }}
        rowSelection={{
          type: isMulti ? 'checkbox' : 'radio',
          selectedRowKeys,
          preserveSelectedRowKeys: true,
          onChange: (keys, sel) => { setSelectedRowKeys(keys); setSelectedRows(sel) },
        }}
      />
    </Modal>
  )
}
