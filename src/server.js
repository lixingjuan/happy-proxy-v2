import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

// 设置 MSW 服务器
const server = setupServer(...handlers)

// 启动服务器
server.listen({ onUnhandledRequest: 'bypass' }, () => {
  console.log('MSW server is running...')
  console.log('Mocking requests to: https://test-oc.52imile.cn/lm/express/lhd/transit/monitor/driverCheckIn')
}) 