require('dotenv').config();
const express = require('express');
const httpProxy = require('http-proxy');
const { fetchJwtToken, getJwtToken } = require('./auth');
require('./agent');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
const proxy = httpProxy.createProxyServer();

fetchJwtToken();

// refresh token every 10 min
setInterval(fetchJwtToken, 1000 * 60 * 10);

// Proxy routing
app.use((req, res) => {
  const isAuthRequest = req.url.startsWith('/api/v1/auth');
  if (!isAuthRequest) {
    const token = getJwtToken();
    if (token) {
      req.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  proxy.web(req, res, { target: process.env.SPRING_API_URL }, (err) => {
    console.error(" Proxy error:", err.message);
    res.status(502).send('Spring API error.');
  });
});

app.listen(8088, () => {
  console.log("API Gateway is running at http://localhost:8088");
});
