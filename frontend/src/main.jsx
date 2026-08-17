import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import App from './App'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider locale={zhTW} theme={{ token: { colorPrimary: '#1677ff' } }}>
    <App />
  </ConfigProvider>
)
