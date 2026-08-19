import { useEffect, useRef, useState } from 'react'
import { Modal, Button, Alert, Spin, message, Typography } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { reportApi } from '../api/reports'
import { customerApi } from '../api/customers'

const VIEWER_ID = 'sti-customer-preview-viewer'

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

export default function CustomerReportPreview({ open, onClose, reportName, searchParams }) {
  const [loading, setLoading] = useState(false)
  const [stimulsoftReady, setStimulsoftReady] = useState(false)
  const [notInstalled, setNotInstalled] = useState(false)
  // afterOpenChange(true) 代表 Modal 動畫完成、DOM 就緒
  const [modalVisible, setModalVisible] = useState(false)
  const viewerDivRef = useRef(null)

  // 開啟時先確認 Stimulsoft 是否已載入
  useEffect(() => {
    if (!open) return
    setStimulsoftReady(false)
    setNotInstalled(false)
    waitForStimulsoft(5000)
      .then(() => setStimulsoftReady(true))
      .catch(() => setNotInstalled(true))
  }, [open])

  // Modal 動畫完成且 Stimulsoft 就緒後初始化 Viewer
  useEffect(() => {
    if (!modalVisible || !stimulsoftReady || !reportName) return
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

    const viewer = new S.Viewer.StiViewer(viewerOptions, `CustomerPreviewViewer_${reportName}`, false)

    // 1. 從後端讀取 .mrt 檔
    fetch(reportApi.customerReportUrl(reportName))
      .then((res) => {
        if (!res.ok) throw new Error(`無法載入報表檔案 (HTTP ${res.status})`)
        return res.text()
      })
      .then((mrtContent) => {
        // 兩份 .mrt 若 ReportGuid 相同，Stimulsoft 會以 GUID 為 key 命中快取
        // 導致第二次載入仍顯示第一份報表；強制覆寫 GUID 確保每次都重新載入
        const reportJson = JSON.parse(mrtContent)
        reportJson.ReportGuid = Date.now().toString(36) + Math.random().toString(36).slice(2)
        const report = new S.Report.StiReport()
        report.load(JSON.stringify(reportJson))

        // 2. 從 /api/customers/report-data 取得資料並注入
        const q = searchParams?.q
        const dataUrl = `${customerApi.reportDataUrl()}${q ? `?q=${encodeURIComponent(q)}` : ''}`
        return fetch(dataUrl)
          .then((res) => {
            if (!res.ok) throw new Error(`無法載入資料 (HTTP ${res.status})`)
            return res.json()
          })
          .then((jsonData) => {
            // .mrt 資料來源名稱為 root
            const dataSet = new S.System.Data.DataSet('root')
            dataSet.readJson(JSON.stringify(jsonData))
            report.regData('root', 'root', dataSet)
            report.renderAsync(() => {
              viewer.report = report
              if (viewerDivRef.current) {
                viewerDivRef.current.innerHTML = ''
                viewer.renderHtml(VIEWER_ID)
              }
              setLoading(false)
            })
          })
      })
      .catch((err) => {
        console.error('[CustomerReportPreview]', err)
        message.error(err.message || '報表載入失敗')
        setLoading(false)
      })

    return () => {
      if (viewerDivRef.current) viewerDivRef.current.innerHTML = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalVisible, stimulsoftReady, reportName])

  return (
    <Modal
      title={`列印 — ${reportName ?? ''}`}
      open={open}
      onCancel={onClose}
      afterOpenChange={(visible) => setModalVisible(visible)}
      footer={<Button onClick={onClose}>關閉</Button>}
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
                cd frontend &amp;&amp; npm install
              </Typography.Text>
              <p style={{ marginTop: 8 }}>
                <code>npm install</code> 會自動將檔案複製至{' '}
                <code>public/stimulsoft/</code>，完成後重新啟動開發伺服器即可。
              </p>
            </div>
          }
          style={{ margin: 24 }}
        />
      ) : (
        <Spin spinning={loading} tip="載入中...">
          <div
            ref={viewerDivRef}
            id={VIEWER_ID}
            style={{ height: 'calc(100vh - 160px)', minHeight: 500 }}
          />
        </Spin>
      )}
    </Modal>
  )
}
