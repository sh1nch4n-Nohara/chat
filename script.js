import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBkeCm4pM9BDEFW3EpJv53t7ihrfPkmhgU",
  authDomain: "full-chat-app-65da2.firebaseapp.com",
  projectId: "full-chat-app-65da2",
  storageBucket: "full-chat-app-65da2.appspot.com",
  messagingSenderId: "33340883087",
  appId: "1:33340883087:web:15f1d124688585353930fa",
  measurementId: "G-XQRVHYJPCM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ✅ Global reply state
let replyingTo = null;

function showReplyPreview() {
  const preview = document.getElementById("reply-preview");
  if (!preview) return;
  if (replyingTo) {
    preview.innerHTML = `
      <div style="padding: 6px 12px; background: #2a2a2a; border-left: 4px solid #00f0ff; border-radius: 6px; margin-bottom: 6px; font-size: 13px; color: #ccc; display: flex; justify-content: space-between; align-items: center;">
        <span style="max-width: 85%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${replyingTo.text || "🗨️ Replied message"}</span>
        <button id="cancel-reply-btn" style="background: none; border: none; color: #888; font-size: 16px; cursor: pointer;">✕</button>
      </div>
    `;
    document.getElementById("cancel-reply-btn").onclick = () => {
      replyingTo = null;
      preview.innerHTML = "";
    };
  } else {
    preview.innerHTML = "";
  }
}

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
          username,
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

      const inboxId =
        loggedInUsername < targetUsername
          ? `${loggedInUsername}_${targetUsername}`
          : `${targetUsername}_${loggedInUsername}`;

      const inboxRef = collection(db, "inboxes");
      const inboxCheck = await getDocs(query(inboxRef, where("inboxId", "==", inboxId)));
      if (inboxCheck.empty) {
        await addDoc(inboxRef, {
          inboxId,
          participants: [loggedInUsername, targetUsername],
          lastMessage: "Chat started!",
          timestamp: new Date()
        });
      }

      localStorage.setItem("currentChatInbox", inboxId);
      window.location.href = "chat.html";
    });
  }

  if (window.location.pathname.includes("home.html")) {
    const inboxContainer = document.getElementById("inbox-container");
    const loggedInUsername = localStorage.getItem("loggedInUsername");
    const inboxRef = collection(db, "inboxes");
    const q = query(
      inboxRef,
      where("participants", "array-contains", loggedInUsername),
      orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snapshot) => {
      inboxContainer.innerHTML = "";
      if (snapshot.empty) {
        inboxContainer.innerHTML = "<p>No chats yet.</p>";
      }
      snapshot.forEach((inboxDoc) => {
        const inboxData = inboxDoc.data();
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
  const sendButton = document.getElementById("send-btn");
  if (sendButton) {
    sendButton.addEventListener("click", async () => {
      const messageInput = document.getElementById("message-input");
      const messageText = messageInput.value.trim();
      const loggedInUsername = localStorage.getItem("loggedInUsername");
      const inboxId = localStorage.getItem("currentChatInbox");

      if (!messageText || !loggedInUsername || !inboxId) return;

      try {
        await addDoc(collection(db, "messages"), {
          inboxId,
          sender: loggedInUsername,
          receiver: localStorage.getItem("chatWith"),
          text: messageText,
          timestamp: serverTimestamp(),
          status: "sent",
          participants: inboxId.split("_"),
          replyTo: replyingTo?.msgId || null
        });

        messageInput.value = "";
        replyingTo = null;
        showReplyPreview();
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
        if (chatUsernameSpan) chatUsernameSpan.textContent = recipientUsername || "Chat";
      } else {
        if (chatUsernameSpan) chatUsernameSpan.textContent = "Chat";
      }
    }).catch((error) => {
      console.error("Error fetching recipient's username:", error);
    });

    const messageQuery = query(
      collection(db, "messages"),
      where("inboxId", "==", inboxId),
      orderBy("timestamp")
    );

    onSnapshot(messageQuery, (snapshot) => {
      messagesDiv.innerHTML = "";
      const fragment = document.createDocumentFragment();

      snapshot.forEach((messageDoc, idx) => {
        const msgData = messageDoc.data();
        const msgId = messageDoc.id;

        const msgElement = document.createElement("div");
        msgElement.classList.add(
          msgData.sender === loggedInUsername ? "sent-message" : "received-message"
        );

        msgElement.addEventListener("click", () => {
          showActionPanel(msgElement, msgData, msgId);
        });

        // 🔁 Reply display block
        if (msgData.replyTo) {
          const originalDoc = snapshot.docs.find(doc => doc.id === msgData.replyTo);
          if (originalDoc) {
            const original = originalDoc.data();
            const replyBox = document.createElement("div");
            replyBox.textContent = original.text || "🗨️ Replied message";
            replyBox.style.background = "#2c2c2c";
            replyBox.style.color = "#aaa";
            replyBox.style.padding = "4px 8px";
            replyBox.style.marginBottom = "6px";
            replyBox.style.borderLeft = "3px solid #00f0ff";
            replyBox.style.fontSize = "13px";
            replyBox.style.borderRadius = "6px";
            msgElement.appendChild(replyBox);
          }
        }

        // 💬 Message content
        const textNode = document.createElement("div");
        textNode.textContent = msgData.text;
        textNode.style.fontSize = "15px";
        textNode.style.color = msgData.sender === loggedInUsername ? "#fff" : "#000";
        msgElement.appendChild(textNode);

        // 🧠 Emoji reaction display
        if (msgData.reaction) {
          const react = document.createElement("div");
          react.textContent = msgData.reaction;
          react.style.fontSize = "15px";
          react.style.marginTop = "4px";
          react.style.padding = "2px 8px";
          react.style.borderRadius = "16px";
          react.style.background = "#111";
          react.style.color = "#00f0ff";
          react.style.display = "inline-block";
          react.style.boxShadow = "0 0 8px rgba(0,240,255,0.6)";
          msgElement.appendChild(react);
        }

        // 👁 Status indicator
        const isLast = messageDoc.id === snapshot.docs[snapshot.docs.length - 1]?.id;
        if (msgData.sender === loggedInUsername && isLast) {
          const status = document.createElement("span");
          status.textContent = msgData.status === "seen" ? "👁️ Seen" : "✔ Sent";
          status.style.fontSize = "13px";
          status.style.color = "#888";
          status.style.marginTop = "4px";
          msgElement.appendChild(status);
        }

        // 👇 Long-press support
        let pressTimer, panelOpened = false;

        msgElement.addEventListener("mousedown", () => {
          pressTimer = setTimeout(() => {
            showActionPanel(msgElement, msgData, msgId);
            panelOpened = true;
          }, 500);
        });
        msgElement.addEventListener("mouseup", () => {
          if (!panelOpened) clearTimeout(pressTimer);
          panelOpened = false;
        });
        msgElement.addEventListener("mouseleave", () => {
          clearTimeout(pressTimer);
          panelOpened = false;
        });

        msgElement.addEventListener("touchstart", (e) => {
          e.preventDefault();
          pressTimer = setTimeout(() => {
            showActionPanel(msgElement, msgData, msgId);
            panelOpened = true;
          }, 500);
        });
        msgElement.addEventListener("touchend", () => {
          if (!panelOpened) clearTimeout(pressTimer);
          panelOpened = false;
        });
        msgElement.addEventListener("touchcancel", () => {
          clearTimeout(pressTimer);
          panelOpened = false;
        });

        fragment.appendChild(msgElement);

        // ✅ Mark as seen
        if (msgData.sender !== loggedInUsername && msgData.status !== "seen") {
          const msgRef = doc(db, "messages", msgId);
          updateDoc(msgRef, { status: "seen" });
        }
      });

      messagesDiv.appendChild(fragment);
      setTimeout(() => {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }, 100);
    });
  }

  function showActionPanel(targetEl, msgData, msgId) {
    document.querySelectorAll(".action-panel").forEach(el => el.remove());

    const panel = document.createElement("div");
    panel.className = "action-panel";
    panel.style.position = "absolute";
    panel.style.background = "#222";
    panel.style.color = "#fff";
    panel.style.padding = "10px";
    panel.style.borderRadius = "12px";
    panel.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
    panel.style.zIndex = 9999;
    panel.style.minWidth = "140px";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.gap = "8px";

    const rect = targetEl.getBoundingClientRect();
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top - 100}px`;

    const btn = (label, handler) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = () => {
        handler();
        panel.remove();
        document.removeEventListener("click", outside);
      };
      return b;
    };

    panel.appendChild(btn("Reply", () => {
      replyingTo = { text: msgData.text, msgId };
      showReplyPreview();
    }));

    panel.appendChild(btn("React", () => {
      panel.remove();
      showEmojiPicker(targetEl, msgId);
    }));

    if (msgData.sender === localStorage.getItem("loggedInUsername")) {
      panel.appendChild(btn("Unsend", async () => {
        const ref = doc(db, "messages", msgId);
        await updateDoc(ref, { text: "🗑️ This message was unsent", unsent: true });
      }));
    }

    const outside = (e) => {
      if (!panel.contains(e.target)) {
        panel.remove();
        document.removeEventListener("click", outside);
      }
    };

    document.body.appendChild(panel);
    setTimeout(() => {
      document.addEventListener("click", outside);
    }, 10);
  }

  function showEmojiPicker(targetEl, msgId) {
    document.querySelectorAll(".emoji-picker").forEach(el => el.remove());

    const picker = document.createElement("div");
    picker.className = "emoji-picker";
    picker.style.position = "absolute";
    picker.style.background = "#111";
    picker.style.padding = "8px 10px";
    picker.style.borderRadius = "12px";
    picker.style.display = "flex";
    picker.style.gap = "8px";
    picker.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
    picker.style.zIndex = 9999;

    const emojis = ["❤️", "😂", "👍", "😮", "😢", "🔥"];
    emojis.forEach(emoji => {
      const btn = document.createElement("div");
      btn.textContent = emoji;
      btn.style.fontSize = "20px";
      btn.style.cursor = "pointer";
      btn.onclick = async () => {
        const ref = doc(db, "messages", msgId);
        await updateDoc(ref, { reaction: emoji });
        picker.remove();
      };
      picker.appendChild(btn);
    });

    const rect = targetEl.getBoundingClientRect();
    picker.style.left = `${rect.left}px`;
    picker.style.top = `${rect.top - 60}px`;

    document.body.appendChild(picker);

    const close = (e) => {
      if (!picker.contains(e.target)) {
        picker.remove();
        document.removeEventListener("click", close);
      }
    };

    setTimeout(() => {
      document.addEventListener("click", close);
    }, 10);
  }
const deleteAllBtn = document.getElementById("delete-all-btn");
if (deleteAllBtn) {
  const loggedInUsername = localStorage.getItem("loggedInUsername");
  const targetUser = localStorage.getItem("chatWith");
console.log("Deleting inbox with:", targetUser); // ✅ Debug check


  // Place this near the bottom after DOMContentLoaded and after you load chat state
const deleteAllBtn = document.getElementById("delete-all-btn");

if (deleteAllBtn) {
  deleteAllBtn.addEventListener("click", async () => {
    try {
      const inboxId = localStorage.getItem("currentChatInbox"); // use the same key used across the app
      if (!inboxId) {
        alert("Inbox not found. Reopen the chat and try again.");
        return;
      }

      const ok = confirm(`Delete all messages in this chat?\nInbox: ${inboxId}`);
      if (!ok) return;

      // Fetch all messages for this inbox
      const qRef = query(collection(db, "messages"), where("inboxId", "==", inboxId));
      const snap = await getDocs(qRef);

      if (snap.empty) {
        alert("No messages to delete.");
        return;
      }

      // Batch-like delete using Promise.all (client SDK)
      const tasks = [];
      snap.forEach(d => {
        tasks.push(deleteDoc(doc(db, "messages", d.id)));
      });

      await Promise.all(tasks);
      alert("Inbox cleared.");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting messages: " + (err?.message || err));
    }
  });
}


}
const profileButton = document.getElementById("profile-btn");
if (profileButton) {
  profileButton.addEventListener("click", () => {
    alert("coming soon");
  });
}

});





