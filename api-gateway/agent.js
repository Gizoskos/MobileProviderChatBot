const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { normalizeMessage } = require('./utils');
const axios = require('axios');
const { fetchJwtToken, getJwtToken } = require('./auth');
let botResponse = null;
// Firebase setup
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_CREDENTIAL)) });
const db = getFirestore();

// Fetch JWT initially and then every 10 minutes
fetchJwtToken();
setInterval(fetchJwtToken, 1000 * 60 * 10);

// Listen to new user messages
db.collection('messages').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
        const data = change.doc.data();

        if (change.type === 'added' && data.sender === 'user' && !data.handled) {
            console.log(`Message has taken: ${data.text}`);

            let intent = "";
            let subscriberId = 0;
            let month = "";
            let year = 0;
            let amount = null;

            const normalizedText = normalizeMessage(data.text);

            try {
                const togetherRes = await axios.post(
                    `${process.env.TOGETHER_API_URL}/chat/completions`,
                    {
                        model: "mistralai/Mistral-7B-Instruct-v0.1",
                        messages: [{
                            role: "user",
                            content: `Extract the following fields from this message: intent [bill, bill-detailed, pay], subscriberId (number), month (string), year (number), amount (number - optional). 
Respond ONLY as JSON. Example: 
{ "intent": "pay", "subscriberId": 123456, "month": "March", "year": 2025, "amount": 65 }

{ "intent": "bill-detailed", "subscriberId": 123456, "month": "March", "year": 2025 }

When the user asks for the detailed bill the intent is for bill-detailed. If the user prompt includes only bill without detailed then give the user bill.

Extract the following fields from this message:
- intent [bill, bill-detailed, pay],
- subscriberId (number),
- month: string (e.g., "January", "February"),
- year: number (e.g., 2025),
- amount (number). 

If the user asks for detailed bill, set the intent to "bill-detailed".
If the user only mentions bill (without detail), set the intent to "bill".
If the user wants to make a payment, set the intent to "pay". 

Payment can be done as partial so total amount decreases from the given user amount.
Respond ONLY in valid JSON object.
Do NOT include any explanation, comments, or text outside the JSON object.
Do NOT include any comments or explanations.
Do NOT wrap the response in triple backticks.
Your response MUST start with '{' and end with '}'.
DO NOT Wrap the JSON in triple backticks like \`\`\`json
Example response:
{
  "intent": "bill-detailed",
  "subscriberId": 7,
  "month": "May",
  "year": 2025
}

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

                console.log("TogetherAI response:", togetherRes.data);
            } catch (err) {
                console.error("Together.ai parsing error:", err.response?.data || err.message);
                botResponse = "Sorry, I couldn't understand your request.";
            }

            // Call Spring API
            if (!botResponse && intent) {
                const token = getJwtToken();
                const headers = { Authorization: `Bearer ${token}` };


                try {
                    if (intent === "query-bill") {
                        const res = await axios.get(
                            `${process.env.SPRING_API_GATEWAY}/api/v1/bill?subscriberNo=${subscriberId}&month=${month}&year=${year}`,
                            { headers }
                        );

                        const bill = res.data;
                        botResponse = `Bill Summary:
- Subscriber: ${subscriberId}
- Month: ${bill.month}
- Total Amount: $${bill.totalAmount}

Would you like to see the detailed bill or proceed with payment?`;

                    } else if (intent === "query-bill-detailed") {
                        const res = await axios.get(
                            `${process.env.SPRING_API_GATEWAY}/api/v1/bill-detailed?month=${month}&year=${year}&page=0&size=10`,
                            { headers }
                        );

                        const detail = res.data.content?.[0] || {};
                        botResponse = `Bill Details for ${month} ${year}:
- Usage Type: ${detail.usageType}
- Amount: ${detail.amount} ${detail.unit}
- Total Billed: $${detail.billTotalAmount || 0}`;

                    } else if (intent === "make-payment") {
                        if (!amount) {
                            botResponse = "Please specify an amount for payment.";
                        } else {
                            const res = await axios.post(
                                `${process.env.SPRING_API_GATEWAY}/api/v1/pay`,
                                {
                                    subscriberNo: subscriberId,
                                    month,
                                    year,
                                    amount
                                },
                                { headers }
                            );

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

                // Send bot response
                if (botResponse) {
                    await db.collection("messages").add({
                        userId: data.userId,
                        text: botResponse,
                        sender: "bot",
                        createdAt: new Date()
                    });
                }

                // Mark user message as handled
                await change.doc.ref.update({ handled: true });
            }
        }
    });
});
