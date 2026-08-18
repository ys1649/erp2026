import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Button, Space, Alert, Tabs, Spin, message, Popconfirm, Typography } from 'antd'
import { PrinterOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { customerApi } from '../api/customers'

const TEMPLATE_KEY = 'erp_customer_report_tpl'
const DESIGNER_ID = 'sti-designer-root'
const VIEWER_ID = 'sti-viewer-root'

function waitForStimulsoft(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      if (window.Stimulsoft) return resolve(window.Stimulsoft)
      if (Date.now() - start > timeoutMs) return reject(new Error('Stimulsoft 未載入'))
      setTimeout(check, 200)
    }
    check()
  })
}

export default function CustomerReport({ open, onClose, searchParams }) {
  const [activeTab, setActiveTab] = useState('designer')
  const [loading, setLoading] = useState(false)
  const [stimulsoftReady, setStimulsoftReady] = useState(false)
  const [notInstalled, setNotInstalled] = useState(false)
  // afterOpenChange(true) 代表 Modal 動畫已完成、DOM 完全就位
  const [modalVisible, setModalVisible] = useState(false)
  const designerRef = useRef(null)
  const viewerRef = useRef(null)
  const designerDivRef = useRef(null)
  const viewerDivRef = useRef(null)

  const tabs = useMemo(() => [
    {
      key: 'designer',
      label: <><EditOutlined /> 設計版面</>,
      children: (
        <div ref={designerDivRef} id={DESIGNER_ID} style={{ height: 'calc(100vh - 220px)', minHeight: 500 }} />
      ),
    },
    {
      key: 'viewer',
      label: <><PrinterOutlined /> 預覽 / 列印</>,
      children: (
        <div ref={viewerDivRef} id={VIEWER_ID} style={{ height: 'calc(100vh - 220px)', minHeight: 500 }} />
      ),
    },
  ], [])

  // 一開啟就開始等 Stimulsoft（不等動畫，先跑）
  useEffect(() => {
    if (!open) return
    waitForStimulsoft(5000)
      .then(() => setStimulsoftReady(true))
      .catch(() => setNotInstalled(true))
  }, [open])

  // Designer 初始化：等 Modal 動畫完成（modalVisible）才執行，確保 DOM 已就位
  useEffect(() => {
    if (!modalVisible || !stimulsoftReady || activeTab !== 'designer') return
    const container = designerDivRef.current
    if (!container) return

    setLoading(true)
    const S = window.Stimulsoft

    try {
      const options = new S.Designer.StiDesignerOptions()
      options.appearance.fullScreenMode = false
      options.appearance.showSaveButton = true

      const designer = new S.Designer.StiDesigner(options, 'CustomerDesigner', false)
      const report = new S.Report.StiReport()

      const saved = localStorage.getItem(TEMPLATE_KEY)
      if (saved) {
        report.load(saved)
      } else {
        const conn = new S.Report.Dictionary.StiJsonDatabase()
        conn.name = 'Customers'
        conn.alias = 'Customers'
        conn.pathData = customerApi.reportDataUrl()
        report.dictionary.databases.add(conn)
      }

      designer.report = report

      designer.onSaveReport = (args) => {
        const json = args.report.saveToJsonString()
        localStorage.setItem(TEMPLATE_KEY, json)
        message.success('報表版面已儲存至瀏覽器快取')
      }

      container.innerHTML = ''
      designer.renderHtml(DESIGNER_ID)
      designerRef.current = designer
    } catch (e) {
      console.error('[CustomerReport] Designer init error:', e)
      message.error('設計器初始化失敗：' + e.message)
    } finally {
      setLoading(false)
    }

    return () => {
      if (designerDivRef.current) designerDivRef.current.innerHTML = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalVisible, stimulsoftReady, activeTab])

  // Viewer 初始化：同樣等 Modal 動畫完成
  useEffect(() => {
    if (!modalVisible || !stimulsoftReady || activeTab !== 'viewer') return
    const container = viewerDivRef.current
    if (!container) return

    setLoading(true)
    const S = window.Stimulsoft

    const viewerOptions = new S.Viewer.StiViewerOptions()
    viewerOptions.appearance.fullScreenMode = false
    viewerOptions.exports.showExportToPdf = true
    viewerOptions.exports.showExportToExcel2007 = true
    viewerOptions.exports.showExportToWord2007 = true
    viewerOptions.toolbar.showSendEmailButton = false

    const viewer = new S.Viewer.StiViewer(viewerOptions, 'CustomerViewer', false)
    const report = new S.Report.StiReport()

    const saved = localStorage.getItem(TEMPLATE_KEY)
    if (saved) {
      report.load(saved)
    } else {
      message.warning('尚未設計報表版面，請先至「設計版面」頁籤建立版面。')
      setLoading(false)
      return
    }

    const url = `${customerApi.reportDataUrl()}${searchParams?.q ? `?q=${encodeURIComponent(searchParams.q)}` : ''}`
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((jsonData) => {
        const dataSet = new S.System.Data.DataSet('Customers')
        dataSet.readJson(JSON.stringify(jsonData))
        report.regData('Customers', 'Customers', dataSet)
        report.renderAsync(() => {
          viewer.report = report
          if (viewerDivRef.current) {
            viewerDivRef.current.innerHTML = ''
            viewer.renderHtml(VIEWER_ID)
          }
          viewerRef.current = viewer
          setLoading(false)
        })
      })
      .catch((err) => {
        console.error('報表資料載入失敗', err)
        message.error('報表資料載入失敗，請稍後再試。')
        setLoading(false)
      })

    return () => {
      if (viewerDivRef.current) viewerDivRef.current.innerHTML = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalVisible, stimulsoftReady, activeTab])

  const handleClearTemplate = () => {
    localStorage.removeItem(TEMPLATE_KEY)
    message.info('版面已重置，請重新設計。')
    setActiveTab('viewer')
    setTimeout(() => setActiveTab('designer'), 50)
  }

  return (
    <Modal
      title="客戶清冊列印"
      open={open}
      onCancel={onClose}
      afterOpenChange={(visible) => setModalVisible(visible)}
      footer={
        <Space>
          <Popconfirm title="確定重置版面？已設計的版面將清除。" onConfirm={handleClearTemplate}>
            <Button icon={<DeleteOutlined />} danger>重置版面</Button>
          </Popconfirm>
          <Button onClick={onClose}>關閉</Button>
        </Space>
      }
      width="95vw"
      style={{ top: 16 }}
      styles={{ body: { padding: '0 16px 8px' } }}
      destroyOnHidden
    >
      {notInstalled ? (
        <Alert
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
          message="Stimulsoft Reports.JS 未載入"
          description={
            <div>
              <p>請依下列步驟安裝 Stimulsoft：</p>
              <Typography.Text code>
                cd frontend &amp;&amp; npm install stimulsoft-reports-js
              </Typography.Text>
              <p style={{ marginTop: 8 }}>
                然後執行 <code>node scripts/copy-stimulsoft.js</code> 將檔案複製至{' '}
                <code>public/stimulsoft/</code>，再重新啟動開發伺服器。
              </p>
              <p>
                詳見{' '}
                <a href="https://www.stimulsoft.com" target="_blank" rel="noreferrer">
                  Stimulsoft 官網
                </a>{' '}
                取得 Trial License。
              </p>
            </div>
          }
          style={{ margin: 24 }}
        />
      ) : (
        <Spin spinning={loading} tip="載入中...">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabs}
            tabBarStyle={{ marginBottom: 8 }}
          />
        </Spin>
      )}
    </Modal>
  )
}
