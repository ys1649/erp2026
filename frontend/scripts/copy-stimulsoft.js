import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(__dirname, '..', 'node_modules', 'stimulsoft-reports-js', 'Scripts')
const destDir = path.resolve(__dirname, '..', 'public', 'stimulsoft')

if (!fs.existsSync(srcDir)) {
  console.error('❌ 找不到 stimulsoft-reports-js。請先執行: npm install stimulsoft-reports-js')
  process.exit(1)
}

fs.mkdirSync(destDir, { recursive: true })

const jsFiles = [
  'stimulsoft.reports.js',
  'stimulsoft.reports.engine.js',
  'stimulsoft.reports.chart.js',
  'stimulsoft.reports.export.js',
  'stimulsoft.reports.import.xlsx.js',
  'stimulsoft.viewer.js',
  'stimulsoft.designer.js',
]

let copied = 0
for (const f of jsFiles) {
  const src = path.join(srcDir, f)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(destDir, f))
    console.log(`✓ ${f}`)
    copied++
  } else {
    console.warn(`⚠ 找不到 ${f}，跳過`)
  }
}

console.log(`\n完成，共複製 ${copied} 個檔案至 public/stimulsoft/`)
console.log('接著在 index.html 取消 Stimulsoft script 標籤的 HTML 註解，再重啟 dev server 即可。')
