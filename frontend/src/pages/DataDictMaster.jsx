import { useState, useEffect, useCallback } from 'react'
import {
  Card, Table, Button, Space, Input, Form, Row, Col,
  Popconfirm, message, Tag, Typography, Empty,
} from 'antd'
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined, ThunderboltOutlined, ExperimentOutlined,
} from '@ant-design/icons'
import { dataDictApi } from '../api/datadict'
import DataDictFormModal from '../components/DataDictFormModal'
import DataDictFieldFormModal from '../components/DataDictFieldFormModal'
import DataDictLookup from '../components/DataDictLookup'

const { Title, Text } = Typography

export default function DataDictMaster() {
  const [form] = Form.useForm()
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [tableLoading, setTableLoading] = useState(false)
  const [searchParams, setSearchParams] = useState({})

  // 主檔選取 / 欄位定義
  const [selected, setSelected] = useState(null)
  const [fields, setFields] = useState([])
  const [fieldsLoading, setFieldsLoading] = useState(false)

  // 主檔表單
  const [masterFormOpen, setMasterFormOpen] = useState(false)
  const [editMaster, setEditMaster] = useState(null)
  const [masterFormLoading, setMasterFormLoading] = useState(false)

  // 欄位表單
  const [fieldFormOpen, setFieldFormOpen] = useState(false)
  const [editField, setEditField] = useState(null)
  const [fieldFormLoading, setFieldFormLoading] = useState(false)

  const [autoGenLoading, setAutoGenLoading] = useState(false)

  // 測試 Lookup
  const [testOpen, setTestOpen] = useState(false)

  // ── 主檔查詢 ────────────────────────────────────────────
  const fetchData = useCallback(async (params = searchParams, pg = page, ps = pageSize) => {
    setTableLoading(true)
    try {
      const res = await dataDictApi.list({ ...params, page: pg, page_size: ps })
      setData(res.data.data)
      setTotal(res.data.total)
    } catch {
      message.error('載入資料失敗')
    } finally {
      setTableLoading(false)
    }
  }, [searchParams, page, pageSize])

  useEffect(() => { fetchData() }, [fetchData])

  // ── 欄位定義查詢 ────────────────────────────────────────
  const fetchFields = useCallback(async (ddmNo) => {
    if (!ddmNo) { setFields([]); return }
    setFieldsLoading(true)
    try {
      const res = await dataDictApi.listFields(ddmNo)
      setFields(res.data)
    } catch {
      message.error('載入欄位定義失敗')
    } finally {
      setFieldsLoading(false)
    }
  }, [])

  useEffect(() => { fetchFields(selected?.ddm_no) }, [selected, fetchFields])

  const handleSearch = (values) => {
    const params = { q: values.q?.trim() || undefined }
    setSearchParams(params)
    setPage(1)
    fetchData(params, 1, pageSize)
  }

  const handleReset = () => {
    form.resetFields()
    setSearchParams({})
    setPage(1)
    fetchData({}, 1, pageSize)
  }

  // ── 主檔 新增/編輯/刪除 ────────────────────────────────
  const openCreateMaster = () => { setEditMaster(null); setMasterFormOpen(true) }
  const openEditMaster = (record) => { setEditMaster(record); setMasterFormOpen(true) }

  const handleMasterFormOk = async (values) => {
    setMasterFormLoading(true)
    try {
      if (editMaster) {
        await dataDictApi.update(editMaster.ddm_no, values)
        message.success('更新成功')
      } else {
        await dataDictApi.create(values)
        message.success('新增成功')
      }
      setMasterFormOpen(false)
      fetchData()
    } catch (err) {
      message.error(err.response?.data?.detail || (editMaster ? '更新失敗' : '新增失敗'))
    } finally {
      setMasterFormLoading(false)
    }
  }

  const handleDeleteMaster = async (ddmNo) => {
    try {
      await dataDictApi.remove(ddmNo)
      message.success('刪除成功')
      if (selected?.ddm_no === ddmNo) setSelected(null)
      fetchData()
    } catch {
      message.error('刪除失敗')
    }
  }

  // ── 欄位 新增/編輯/刪除 ────────────────────────────────
  const openCreateField = () => { setEditField(null); setFieldFormOpen(true) }
  const openEditField = (record) => { setEditField(record); setFieldFormOpen(true) }

  const handleFieldFormOk = async (values) => {
    setFieldFormLoading(true)
    try {
      if (editField) {
        await dataDictApi.updateField(selected.ddm_no, editField.ddd_id, values)
        message.success('更新成功')
      } else {
        await dataDictApi.createField(selected.ddm_no, values)
        message.success('新增成功')
      }
      setFieldFormOpen(false)
      fetchFields(selected.ddm_no)
    } catch (err) {
      message.error(err.response?.data?.detail || (editField ? '更新失敗' : '新增失敗'))
    } finally {
      setFieldFormLoading(false)
    }
  }

  const handleDeleteField = async (dddId) => {
    try {
      await dataDictApi.removeField(selected.ddm_no, dddId)
      message.success('刪除成功')
      fetchFields(selected.ddm_no)
    } catch {
      message.error('刪除失敗')
    }
  }

  const handleAutoGenerate = async () => {
    if (!selected) return
    setAutoGenLoading(true)
    try {
      const res = await dataDictApi.autoGenerateFields(selected.ddm_no)
      setFields(res.data)
      message.success('已依 SQL 自動產生欄位定義')
    } catch (err) {
      message.error(err.response?.data?.detail || '自動產生失敗')
    } finally {
      setAutoGenLoading(false)
    }
  }

  // ── 主檔表格欄位 ─────────────────────────────────────────
  const masterColumns = [
    {
      title: '資料字典編號', dataIndex: 'ddm_no', key: 'ddm_no', width: 160,
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    { title: '資料字典名稱', dataIndex: 'ddm_name', key: 'ddm_name', ellipsis: true },
    { title: '回傳欄位', dataIndex: 'ret_val_field', key: 'ret_val_field', width: 120 },
    {
      title: '多選', dataIndex: 'is_multi_selected', key: 'is_multi_selected', width: 70,
      render: (v) => (v === 'Y' ? <Tag color="green">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '操作', key: 'action', width: 180, fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<ExperimentOutlined />}
            onClick={() => { setSelected(record); setTestOpen(true) }}>測試</Button>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => openEditMaster(record)}>編輯</Button>
          <Popconfirm
            title={`確定刪除「${record.ddm_name}」？`}
            okText="刪除" cancelText="取消" okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteMaster(record.ddm_no)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>刪除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const fieldColumns = [
    { title: '欄位名稱', dataIndex: 'ddd_field', key: 'ddd_field', width: 200 },
    { title: '顯示名稱', dataIndex: 'ddd_field_disp', key: 'ddd_field_disp' },
    {
      title: '操作', key: 'action', width: 140,
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => openEditField(record)}>編輯</Button>
          <Popconfirm
            title="確定刪除此欄位？"
            okText="刪除" cancelText="取消" okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteField(record.ddd_id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>刪除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      {/* ── 頁面標題 ── */}
      <Card styles={{ body: { paddingBottom: 0 } }} style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>資料字典維護</Title>
      </Card>

      {/* ── 查詢區 ── */}
      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="q" label="關鍵字">
            <Input
              placeholder="資料字典編號 / 名稱"
              allowClear
              style={{ width: 260 }}
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查詢</Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>重設</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* ── 資料字典主檔表格 ── */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
          <Col>
            <Text type="secondary">共 <strong>{total}</strong> 筆</Text>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateMaster}>
              新增資料字典
            </Button>
          </Col>
        </Row>

        <Table
          rowKey="ddm_no"
          columns={masterColumns}
          dataSource={data}
          loading={tableLoading}
          size="small"
          onRow={(record) => ({ onClick: () => setSelected(record) })}
          rowClassName={(record) => (record.ddm_no === selected?.ddm_no ? 'ant-table-row-selected' : '')}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 筆`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
              fetchData(searchParams, p, ps)
            },
          }}
        />
      </Card>

      {/* ── 欄位定義表格 ── */}
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
          <Col>
            <Text strong>
              欄位定義{selected ? ` — ${selected.ddm_name} (${selected.ddm_no})` : ''}
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ThunderboltOutlined />} disabled={!selected}
                loading={autoGenLoading} onClick={handleAutoGenerate}>
                自動產生欄位定義
              </Button>
              <Button type="primary" icon={<PlusOutlined />} disabled={!selected}
                onClick={openCreateField}>
                新增欄位
              </Button>
            </Space>
          </Col>
        </Row>
        {selected ? (
          <Table
            rowKey="ddd_id"
            columns={fieldColumns}
            dataSource={fields}
            loading={fieldsLoading}
            size="small"
            pagination={false}
          />
        ) : (
          <Empty description="請先選擇一筆資料字典" />
        )}
      </Card>

      {/* ── 主檔 新增/編輯 Modal ── */}
      <DataDictFormModal
        open={masterFormOpen}
        record={editMaster}
        loading={masterFormLoading}
        onOk={handleMasterFormOk}
        onCancel={() => setMasterFormOpen(false)}
      />

      {/* ── 欄位 新增/編輯 Modal ── */}
      <DataDictFieldFormModal
        open={fieldFormOpen}
        record={editField}
        loading={fieldFormLoading}
        onOk={handleFieldFormOk}
        onCancel={() => setFieldFormOpen(false)}
      />

      {/* ── 測試 Lookup Modal ── */}
      <DataDictLookup
        ddmNo={selected?.ddm_no}
        open={testOpen}
        onCancel={() => setTestOpen(false)}
        onConfirm={(values) => {
          message.success(`測試回傳值：${JSON.stringify(values)}`)
          setTestOpen(false)
        }}
      />
    </>
  )
}
