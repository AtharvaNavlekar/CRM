const http = require('http');

const data = JSON.stringify({
  email: 'admin@platform.internal',
  password: 'password123'
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const { token } = JSON.parse(body);
    
    // Now request /api/leads
    const req2 = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/leads',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res2) => {
      let body2 = '';
      res2.on('data', d => body2 += d);
      res2.on('end', () => {
        console.log(`Status Code for /api/leads: ${res2.statusCode}`);
        console.log(`Response Body: ${body2}`);
      });
    });
    req2.end();
  });
});
req.write(data);
req.end();
