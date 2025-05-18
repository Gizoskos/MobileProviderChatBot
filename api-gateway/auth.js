
require('dotenv').config();
const axios = require('axios');
let jwtToken = null;
const SPRING_API = process.env.SPRING_API_URL;
const LOGIN_ENDPOINT = process.env.LOGIN_ENDPOINT;
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
function getJwtToken() {
    return jwtToken;
}

module.exports = { fetchJwtToken, getJwtToken };