const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { normalizeMessage } = require('./utils');
//const OpenAI = require('openai'); MAYBE LATER
const axios = require('axios');
const { fetchJwtToken, getJwtToken } = require('./auth');


// Firebase setup
initializeApp({ credential: cert(require('./firebase-key.json')) });
const db = getFirestore();

// OpenAI setup
//const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });  MAYBE LATER

// Token fetch + interval
fetchJwtToken();
setInterval(fetchJwtToken, 1000 * 60 * 10);

// Listen the message
db.collection('messages').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
        const data = change.doc.data();
        if (data.handled || data.sender !== 'user') return;

        if (change.type === 'added' && data.sender === 'user' && !data.handled) {
            console.log(`Message has taken: ${data.text}`);

            let intent = "";
            let subscriberId = 0;
            let month = "";
            let year = 0;
            let amount = null
            const normalizedText = normalizeMessage(data.text);
            try {
                const togetherRes = await axios.post(
                    `${process.env.TOGETHER_API_URL}/chat/completions`,
                    {
                        model: "mistralai/Mistral-7B-Instruct-v0.1",
                        messages: [{
                            role: "user",
                            content: `Extract the following fields from this message: intent [query-bill, query-bill-detailed, make-payment], subscriberId (number), month (string), year (number), amount (number - optional). 
        Respond ONLY as JSON. Example: 
        { "intent": "make-payment", "subscriberId": 123456, "month": "March", "year": 2025, "amount": 65 } When the user asks for the detailed bill the intent is for query-bill-detailed. If the user prompt includes only bill without detailed then give the user query-bill 
        
        Message: "${normalizedText}"`
                        }]
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
                            "Content-Type": "application/json"
                        }
                    }
                );

                const parsed = JSON.parse(togetherRes.data.choices[0].message.content);
                intent = parsed.intent;
                subscriberId = parsed.subscriberId;
                month = parsed.month;
                year = parsed.year;
                amount = parsed.amount || null;

                console.log("TogetherAI response:", togetherRes.data); // Burası çok önemli
            } catch (err) {
                console.error(" Together.ai parsing error:", err.response?.data || err.message);
            }


            /*             // sending prompt
                        try {
                            const completion = await openai.chat.completions.create({
                                model: "gpt-3.5-turbo",
                                messages: [{
                                    role: "user",
                                    content: `Extract the following fields from this message: intent [query-bill, query-bill-detailed, make-payment], subscriberId (number), month (string), year (number), amount (number - optional)
            Respond ONLY as JSON. Example:
            { "intent": "make-payment", "subscriberId": 123456, "month": "March", "year": 2025, "amount": 65 }
            
            Message: "${data.text}"`
                                }]
                            });
            
                            const parsed = JSON.parse(completion.choices[0].message.content);
                            intent = parsed.intent;
                            subscriberId = parsed.subscriberId;
                            month = parsed.month;
                            year = parsed.year;
                            amount = parsed.amount || null;
            
                        } catch (err) {
                            console.error(" OpenAI parsing error:", err.message);
                            return;
                        }
             */
            // call spring api
            const token = getJwtToken();
            const headers = { Authorization: `Bearer ${token}` };
            let botResponse = "Sorry, I couldn't understand your request.";

            try {
                if (intent === "bill") {
                    const res = await axios.get(`${process.env.SPRING_API_GATEWAY}/api/v1/bill?subscriberNo=${subscriberId}&month=${month}&year=${year}`, { headers });
                    const bill = res.data;
                    botResponse = `Bill Summary:
- Subscriber: ${subscriberId}
- Month: ${bill.month}
- Total Amount: $${bill.totalAmount}

Would you like to see the detailed bill or proceed with payment?`;

                } else if (intent === "bill-detailed") {
                    const res = await axios.get(`${process.env.SPRING_API_GATEWAY}/api/v1/bill-detailed?month=${month}&year=${year}&page=0&size=10`, { headers });
                    const detail = res.data.content?.[0] || {};
                    botResponse = `Bill Details for ${month} ${year}:
- Usage Type: ${detail.usageType}
- Amount: ${detail.amount} ${detail.unit}
- Total Billed: $${detail.billTotalAmount || 0}`;

                } else if (intent === "pay") {
                    if (!amount) {
                        botResponse = "Please specify an amount for payment.";
                    } else {
                        const res = await axios.post(`${process.env.SPRING_API_GATEWAY}/api/v1/pay`, {
                            subscriberNo: subscriberId,
                            month,
                            year,
                            amount
                        }, { headers });

                        botResponse = `Payment successful!

Payment Summary:
- Subscriber: ${subscriberId}
- Month: ${month} ${year}
- Amount: $${amount}`;
                    }
                }
            } catch (err) {
                console.error("API call failed:", err.response?.data || err.message || err);
                botResponse = `API error: ${err.response?.data?.message || err.message || "Unknown error"}`;
            }

            //  Firestore bot answer
            await db.collection("messages").add({
                userId: data.userId,
                text: botResponse,
                sender: "bot",
                createdAt: new Date()
            });

            // set the message status as done
            await change.doc.ref.update({ handled: true });
        }
    });
});