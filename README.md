# Mobile Provider Chatbot

This project is a **chat-based assistant system** for a mobile provider billing platform. Users can interact with the chatbot to query their monthly bill, request detailed billing information, or make partial/full payments. The system integrates Firebase Firestore, a Spring Boot backend, and Together.ai for natural language understanding.

---

## Project Links

- **GitHub Repo (Full Source Code):** [MobileProviderChatBot](https://github.com/Gizoskos/MobileProviderChatBot)
- **Live Frontend Deployment (Render):** [Chatbot UI](https://mobileproviderchatbot.onrender.com)
- **Live API Gateway Deployment (Render):** [API Gateway](https://mobileprovidergateway-ufhx.onrender.com)
- **Spring Boot API Deployment (Render):** [Spring API](https://mobile-provider-api.onrender.com)
- **Project Demo Video:** [Watch on Google Drive](https://drive.google.com/drive/folders/1rY0ePM2BiBv2Xq1WmcE1I03ddwv3HUVS?usp=drive_link)
---

## System Design

### Architecture Overview

```plaintext
[User Interface - React + Firebase Firestore]
                 |
          [API Gateway - Node.js]
        ↙                   ↘
[Spring Boot REST API]    [Together.ai for NLP]

React Frontend: Collects user input and pushes messages to Firebase Firestore.

API Gateway: Acts as a proxy, handles JWT login, forwards requests to Spring API.

Agent Service: Listens to Firestore changes, detects intent using Together.ai, and interacts with Spring API.

Spring Boot Backend: Handles business logic for billing, payments, and data persistence.
```
## Environment Configuration

### Secrets for API Gateway (Agent)

```plaintext

Instead of uploading `firebase-key.json`, it is stored securely in Render secrets:

- `FIREBASE_CREDENTIAL`: Stringified JSON from `firebase-key.json`
```json
{ "type": "service_account", "project_id": "...", ... }

In code:

const credentialJson = JSON.parse(process.env.FIREBASE_CREDENTIAL);
initializeApp({ credential: cert(credentialJson) });
```
### Environment Variables for React UI
```plaintext
The following variables are defined in Render for the React UI deployment:

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
These are used in firebaseConfig.js:

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  ...
};
```
## Assumptions
```plaintext
User IDs are predefined and mapped to billing records in the Spring Boot backend.

Message structure in Firestore follows:
{
  "text": "what is my bill",
  "sender": "user",
  "userId": "123",
  "createdAt": timestamp,
  "handled": false
}
Together.ai is used with a system prompt to parse structured JSON from free-form user text.

Frontend expects bot responses to be stored in the same Firestore collection with sender: "bot"
```


## Challenges Encountered
```plaintext
Firestore Watch Failure in Deployments:

Render environment limits streaming connections.

Replaced real-time onSnapshot with polling via setInterval.

Firebase Admin SDK Authentication Errors:

Misconfigured or improperly encoded private key caused "invalid credential" errors.

Solution: Converted JSON key to a single-line string and used JSON.parse(process.env.FIREBASE_CREDENTIAL).

Together.ai Rate Limits:

Project exceeded QPS/TPS during rapid development.

Added try/catch with informative fallbacks.

JWT Login Loop in Gateway:

Infinite forwarding due to misrouting /api/v1/auth to itself.

Handled LOGIN_ENDPOINT explicitly and skipped proxying that path.
```
## How to Run Locally
```plaintext

# Clone the repository
git clone https://github.com/Gizoskos/MobileProviderChatBot
cd MobileProviderChatBot

# Start React frontend
cd chat-frontend/mobile-provider-ui
npm install
npm start

# Start API Gateway
cd ../../api-gateway
npm install
node gateway.js

# Start Agent Listener
node agent.js

# Start Spring API (from /mobile-provider-api)
mvn spring-boot:run
```
## Technologies Used
```plaintext

React.js + Tailwind CSS for the front-end

Firebase Firestore (Database) for real-time message storage

Firebase Admin SDK

Node.js + Express + Axios gateway and message agent services

Spring Boot (Billing APIs) for billing logic and data APIs

Together.ai (LLM/Intent Detection) for intent extraction from user input

Render.com (Hosting) for deployment
```
