import { useEffect } from 'react'
import { Modal, Form, Input } from 'antd'

export default function DataDictFieldFormModal({ open, record, onOk, onCancel, loading }) {
  const [form] = Form.useForm()
  const isEdit = !!record

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(record ? { ...record } : {})
  }, [open, record, form])

  const handleOk = () => {
    form.validateFields().then((values) => onOk(values))
  }

  return (
    <Modal
      title={isEdit ? '編輯欄位定義' : '新增欄位定義'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText={isEdit ? '儲存' : '新增'}
      cancelText="取消"
      confirmLoading={loading}
      width={480}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" size="small">
        <Form.Item
          name="ddd_field"
          label="欄位名稱"
          rules={[{ required: true, message: '必填' }]}
          extra="需對應來源 SQL 中的欄位名稱"
        >
          <Input maxLength={80} placeholder="例：CUM_NO" />
        </Form.Item>
        <Form.Item name="ddd_field_disp" label="顯示名稱" rules={[{ required: true, message: '必填' }]}>
          <Input maxLength={80} placeholder="例：客戶編號" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
