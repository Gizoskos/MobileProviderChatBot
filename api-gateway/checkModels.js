require('dotenv').config();
const axios = require('axios');

async function getModels() {
    try {
        const res = await axios.get("https://api.together.xyz/models", {
            headers: {
                Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        console.log(" Together.ai Models:");
        console.log(res.data);
    } catch (err) {
        console.error(" Error:", err.response?.data || err.message);
    }
}

getModels();
