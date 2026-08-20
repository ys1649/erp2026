import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import App from './App'
import { antdLocale, antdTheme } from './theme'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider locale={antdLocale} theme={antdTheme}>
    <App />
  </ConfigProvider>
)
