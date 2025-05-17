require('dotenv').config();
const express = require('express');
const httpProxy = require('http-proxy');
const axios = require('axios');

const app = express();
const proxy = httpProxy.createProxyServer();

const SPRING_API = process.env.SPRING_API_URL;
const LOGIN_ENDPOINT = process.env.LOGIN_ENDPOINT;

let jwtToken = null;

// Take JWT token
async function fetchJwtToken() {
    try {
        const res = await axios.post(`${SPRING_API}${LOGIN_ENDPOINT}`, {
            username: process.env.LOGIN_USERNAME,
            password: process.env.LOGIN_PASSWORD
        });
        jwtToken = res.data.token;
        console.log("JWT token successfully taken");
    } catch (err) {
        console.error("JWT token is not taken:", err.response?.data || err.message);
    }
}

fetchJwtToken();

// refresh token every 10 min
setInterval(fetchJwtToken, 1000 * 60 * 10);

// Proxy routing
app.use((req, res) => {
    const isAuthRequest = req.url.startsWith('/api/v1/auth');

    // Add bearer token when auth is needed.
    if (!isAuthRequest && jwtToken) {
        req.headers['Authorization'] = `Bearer ${jwtToken}`;
    }

    proxy.web(req, res, { target: SPRING_API }, (err) => {
        console.error('🚨 Spring API error:', err.message);
        res.status(502).send('Spring API not responding.');
    });
});

app.listen(8088, () => {
    console.log("API Gateway is running at http://localhost:8088");
});
