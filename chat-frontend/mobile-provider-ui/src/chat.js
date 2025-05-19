import { useEffect, useState } from "react";
import { db } from "/etc/secrets/firebaseConfig";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

function Chat() {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [botThinking, setBotThinking] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "messages"), orderBy("createdAt"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(data);

            // find last user and bot msg
            const lastUserMsg = [...data].reverse().find(msg => msg.sender === "user");
            const lastBotMsg = [...data].reverse().find(msg => msg.sender === "bot");

            // If there is last user message and bot still havent answered yet.
            if (lastUserMsg && !lastUserMsg.handled) {
                // Bot yanıtı henüz gelmemişse "thinking" durumuna gir
                if (!lastBotMsg || new Date(lastBotMsg.createdAt?.toDate?.() ?? 0) < new Date(lastUserMsg.createdAt?.toDate?.() ?? 0)) {
                    setBotThinking(true);
                }
            } else {
                setBotThinking(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const sendMessage = async () => {
        if (!text.trim()) return;
        await addDoc(collection(db, "messages"), {
            text,
            sender: "user",
            userId: "123",
            createdAt: serverTimestamp(),
            handled: false
        });
        setText("");
    };

    return (
        <div style={styles.container}>
            <h2>💬 Mobile Provider Chatbot</h2>
            <div style={styles.chatBox}>
                {messages.map(msg => (
                    <div key={msg.id} style={{ alignSelf: msg.sender === "user" ? "flex-end" : "flex-start" }}>
                        {msg.replyTo && (
                            <div style={{ fontSize: "0.8rem", color: "#888" }}>
                                ↪ replying to message: {messages.find(m => m.id === msg.replyTo)?.text || "message"}
                            </div>
                        )}
                        <div style={{
                            backgroundColor: msg.sender === "user" ? "#cce5ff" : "#f1f1f1",
                            padding: "10px", borderRadius: "10px", marginTop: "5px"
                        }}>
                            <strong>{msg.sender === "user" ? "You" : "Bot"}:</strong> {msg.text}
                        </div>
                    </div>
                ))}
                {botThinking && (
                    <div style={{ fontStyle: 'italic', color: 'pink', alignSelf: 'flex-start' }}>
                        Bot is thinking...
                    </div>
                )}
            </div>
            <div style={styles.inputArea}>
                <input
                    style={styles.input}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Ask about your bill..."
                />
                <button onClick={sendMessage} style={styles.button}>
                    Send
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: 20,
        fontFamily: "Arial, sans-serif",
        maxWidth: 600,
        margin: "0 auto",
    },
    chatBox: {
        border: "1px solid #ccc",
        borderRadius: 6,
        height: 400,
        overflowY: "auto",
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        backgroundColor: "#fff",
    },
    inputArea: {
        display: "flex",
        gap: 10,
        marginTop: 15,
    },
    input: {
        flex: 1,
        padding: 10,
        fontSize: 16,
    },
    button: {
        padding: "10px 16px",
        backgroundColor: "#007bff",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
    },
};

export default Chat;
