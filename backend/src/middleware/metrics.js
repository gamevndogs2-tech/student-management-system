const client = require('prom-client');

client.collectDefaultMetrics({ prefix: 'student_management_' });

const httpRequests = new client.Counter({
  name: 'student_management_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

function metricsMiddleware(req, res, next) {
  res.on('finish', () => {
    httpRequests.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });
  });
  next();
}

async function metricsHandler(req, res) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

module.exports = { metricsMiddleware, metricsHandler };
