require('dotenv').config();
const express = require('express');
const httpProxy = require('http-proxy');
const path = require('path');
const { fetchJwtToken, getJwtToken } = require('./auth');
//require('./agent');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.send("Gateway is running.");
});
const proxy = httpProxy.createProxyServer();

fetchJwtToken();

// refresh token every 10 min
setInterval(fetchJwtToken, 1000 * 60 * 10);

// Proxy routing
app.all('/api/*', (req, res) => {
  const isAuthRequest = req.url.startsWith('/api/v1/auth');

  if (!isAuthRequest) {
    const token = getJwtToken();
    if (token) {
      req.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // spring api proxy
  proxy.web(req, res, { target: process.env.SPRING_API_URL }, (err) => {
    console.error(" Proxy error:", err.message);
    res.status(502).send("Spring API error.");
  });
});

app.use('*', (req, res) => {
  res.status(404).send("Not found.");
});

const PORT = process.env.PORT || 8088;
app.listen(PORT, () => {
  console.log(`API Gateway is running at http://localhost:${PORT}`);
});