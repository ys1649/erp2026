import { Layout, Typography } from 'antd'
import CustomerMaster from './pages/CustomerMaster'

const { Header, Content } = Layout

export default function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#1677ff' }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
          Use Claude Code with your Team or Enterprise plan
        </Typography.Title>
      </Header>
      <Content style={{ padding: '24px', background: '#f5f5f5' }}>
        <CustomerMaster />
      </Content>
    </Layout>
  )
}
