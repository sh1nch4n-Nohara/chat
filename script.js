import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, getDocs, where, doc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBkeCm4pM9BDEFW3EpJv53t7ihrfPkmhgU",
    authDomain: "full-chat-app-65da2.firebaseapp.com",
    projectId: "full-chat-app-65da2",
    storageBucket: "full-chat-app-65da2.firebasestorage.app",
    messagingSenderId: "33340883087",
    appId: "1:33340883087:web:15f1d124688585353930fa",
    measurementId: "G-XQRVHYJPCM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
    const registerButton = document.getElementById("register-btn");
    if (registerButton) {
        registerButton.addEventListener("click", async () => {
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            const username = email.split("@")[0];
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await addDoc(collection(db, "users"), {
                    userId: user.uid,
                    email: user.email,
                    username: username,
                    createdAt: new Date()
                });
                alert("Account created successfully!");
                window.location.href = "index.html";
            } catch (error) {
                alert(error.message);
            }
        });
    }

    const loginButton = document.getElementById("login-btn");
    if (loginButton) {
        loginButton.addEventListener("click", async () => {
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                localStorage.setItem("loggedInUser", userCredential.user.uid);
                localStorage.setItem("loggedInUsername", email.split("@")[0]);
                window.location.href = "home.html";
            } catch (error) {
                alert("Invalid email or password.");
            }
        });
    }

    const logoutButton = document.getElementById("logout-btn");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            await signOut(auth);
            localStorage.removeItem("loggedInUser");
            localStorage.removeItem("loggedInUsername");
            window.location.href = "index.html";
        });
    }

    const backButton = document.getElementById("back-home-btn");
    if (backButton) {
        backButton.addEventListener("click", () => {
            window.location.href = "home.html";
        });
    }

    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            document.body.classList.toggle("light-mode");
        });
    }

    const startChatButton = document.getElementById("start-chat-btn");
    if (startChatButton) {
        startChatButton.addEventListener("click", async () => {
            const targetUsername = document.getElementById("username-input").value.trim();
            const loggedInUsername = localStorage.getItem("loggedInUsername");
            if (!targetUsername || !loggedInUsername) {
                alert("Please enter a username.");
                return;
            }
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username", "==", targetUsername));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                alert("No user found.");
                return;
            }
            const inboxId = loggedInUsername < targetUsername ? `${loggedInUsername}_${targetUsername}` : `${targetUsername}_${loggedInUsername}`;
            const inboxRef = collection(db, "inboxes");
            const inboxCheck = await getDocs(query(inboxRef, where("inboxId", "==", inboxId)));
            if (inboxCheck.empty) {
                await addDoc(inboxRef, {
                    inboxId: inboxId,
                    participants: [loggedInUsername, targetUsername],
                    lastMessage: "Chat started!",
                    timestamp: new Date()
                });
            }
            localStorage.setItem("currentChatInbox", inboxId);
            window.location.href = "chat.html";
        });
    }

    function loadChatList() {
        const inboxContainer = document.getElementById("inbox-container");
        const loggedInUsername = localStorage.getItem("loggedInUsername");
        const inboxRef = collection(db, "inboxes");
        const q = query(inboxRef, where("participants", "array-contains", loggedInUsername), orderBy("timestamp", "desc"));
        onSnapshot(q, (snapshot) => {
            inboxContainer.innerHTML = "";
            if (snapshot.empty) {
                inboxContainer.innerHTML = "<p>No chats yet.</p>";
            }
            snapshot.forEach((doc) => {
                const inboxData = doc.data();
                const otherUsername = inboxData.participants.find(user => user !== loggedInUsername);
                const inboxElement = document.createElement("div");
                inboxElement.classList.add("chat-box");
                inboxElement.textContent = `~ ${otherUsername} ~`;
                inboxElement.addEventListener("click", () => {
                    localStorage.setItem("currentChatInbox", inboxData.inboxId);
                    window.location.href = "chat.html";
                });
                inboxContainer.appendChild(inboxElement);
            });
        });
    }

    if (window.location.pathname.includes("home.html")) {
        loadChatList();
    }

    const sendButton = document.getElementById("send-btn");
    if (sendButton) {
        sendButton.addEventListener("click", async () => {
            const messageInput = document.getElementById("message-input");
            const messageText = messageInput.value.trim();
            const loggedInUsername = localStorage.getItem("loggedInUsername");
            const inboxId = localStorage.getItem("currentChatInbox");
            if (!messageText || !loggedInUsername || !inboxId) {
                return;
            }
            try {
                
// ...
await addDoc(collection(db, "messages"), {
  inboxId: inboxId,
  sender: loggedInUsername,
  text: messageText,
  timestamp: serverTimestamp(), // ✅ This fixes ordering issues
  participants: inboxId.split("_")
});

                messageInput.value = "";
                scrollToBottom();
            } catch (error) {
                console.error("Error sending message:", error);
            }
        });
    }

    function scrollToBottom() {
        const messagesDiv = document.getElementById("messages");
        const inputContainer = document.getElementById("input-container");
        setTimeout(() => {
            messagesDiv.scrollTop = messagesDiv.scrollHeight - inputContainer.offsetHeight - 50;
        }, 200);
    }

    if (window.location.pathname.includes("chat.html")) {
        const messagesDiv = document.getElementById("messages");
        const chatHeader = document.getElementById("chat-header") || document.getElementById("chat-username");
        const chatUsernameSpan = document.getElementById("chat-username");
        const inboxId = localStorage.getItem("currentChatInbox");
        const loggedInUsername = localStorage.getItem("loggedInUsername");
        if (!inboxId || !loggedInUsername) {
            window.location.href = "home.html";
            return;
        }
        const inboxRef = collection(db, "inboxes");
        const q = query(inboxRef, where("inboxId", "==", inboxId));
        getDocs(q).then((snapshot) => {
            if (!snapshot.empty) {
                const inboxData = snapshot.docs[0].data();
                const recipientUsername = inboxData.participants.find(user => user !== loggedInUsername);
                if (chatUsernameSpan) {
                    chatUsernameSpan.textContent = recipientUsername || "Chat";
                }
            } else {
                if (chatUsernameSpan) {
                    chatUsernameSpan.textContent = "Chat";
                }
            }
        }).catch((error) => {
            console.error("Error fetching recipient's username:", error);
        });
        const messageQuery = query(collection(db, "messages"), where("inboxId", "==", inboxId), orderBy("timestamp"));
        onSnapshot(messageQuery, (snapshot) => {
            messagesDiv.innerHTML = "";
            if (snapshot.empty) {
                return;
            }
            const fragment = document.createDocumentFragment();
            snapshot.forEach((doc) => {
                const msgData = doc.data();
                const msgElement = document.createElement("div");
                msgElement.textContent = msgData.text;
                msgElement.classList.add(
                    msgData.sender === loggedInUsername ? "sent-message" : "received-message"
                );
                fragment.appendChild(msgElement);
            });
            messagesDiv.appendChild(fragment);
            setTimeout(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 100);
        }, (error) => {
            console.error("Error fetching messages:", error);
        });
    }
});
