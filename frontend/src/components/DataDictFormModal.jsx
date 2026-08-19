import { useEffect } from 'react'
import { Modal, Form, Input, Radio } from 'antd'

const { TextArea } = Input

export default function DataDictFormModal({ open, record, onOk, onCancel, loading }) {
  const [form] = Form.useForm()
  const isEdit = !!record

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(record ? { ...record } : { is_multi_selected: 'N' })
  }, [open, record, form])

  const handleOk = () => {
    form.validateFields().then((values) => onOk(values))
  }

  return (
    <Modal
      title={isEdit ? `編輯資料字典 — ${record?.ddm_no}` : '新增資料字典'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText={isEdit ? '儲存' : '新增'}
      cancelText="取消"
      confirmLoading={loading}
      width={700}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" size="small">
        <Form.Item name="ddm_no" label="資料字典編號" rules={[{ required: true, message: '必填' }]}>
          <Input disabled={isEdit} maxLength={80} placeholder="例：DD_CUSTOMER" />
        </Form.Item>
        <Form.Item name="ddm_name" label="資料字典名稱" rules={[{ required: true, message: '必填' }]}>
          <Input maxLength={80} placeholder="Lookup 視窗標題" />
        </Form.Item>
        <Form.Item
          name="ddm_sql"
          label="來源 SQL"
          rules={[{ required: true, message: '必填' }]}
          extra="需為 SELECT 查詢，例：SELECT CUM_NO, CUM_NAME FROM TBL_CUSTOMER"
        >
          <TextArea rows={4} maxLength={4000} />
        </Form.Item>
        <Form.Item
          name="ret_val_field"
          label="回傳欄位"
          rules={[{ required: true, message: '必填' }]}
          extra="需對應來源 SQL 中的欄位名稱，選取後以此欄位值回傳"
        >
          <Input maxLength={80} placeholder="例：CUM_NO" />
        </Form.Item>
        <Form.Item name="is_multi_selected" label="是否允許多選">
          <Radio.Group options={[{ label: '是', value: 'Y' }, { label: '否', value: 'N' }]} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
