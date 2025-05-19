import fetch from 'node-fetch'

async function testMock() {
  try {
    const response = await fetch('https://test-oc.52imile.cn/lm/express/lhd/transit/monitor/driverCheckIn')
    const data = await response.json()
    console.log('Mock Response:', data)
  } catch (error) {
    console.error('Error:', error)
  }
}

testMock() 