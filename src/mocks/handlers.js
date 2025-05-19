import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('https://test-oc.52imile.cn/lm/express/lhd/transit/monitor/driverCheckIn', () => {
    return HttpResponse.json({
      status: "failure",
      resultCode: "50000",
      resultObject: null,
      message: "System abnormality, please contact technical support",
      traceId: "1d1f01694b914b6a945642dbe8241955.174.17476369077490093",
      requestToken: null,
      forDevlopMessage: "Request method 'GET' not supported"
    })
  })
] 