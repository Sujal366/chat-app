import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:4000");

const App = () => {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [username, setUsername] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const chatRef = useRef(null);
  let lastMessageTimestamp = null;

  useEffect(() => {
    // Retrieve username from localStorage or generate a new one
    let savedUsername = localStorage.getItem("chatUsername");
    if (!savedUsername) {
      savedUsername = "User " + Math.floor(Math.random() * 1000);
      localStorage.setItem("chatUsername", savedUsername);
    }

    setUsername(savedUsername);
    socket.emit("join", savedUsername);

    //let lastMessageTimestamp = null; // Track last message timestamp

    socket.on("chatHistory", (messages) => {
      if (messages.length > 0) {
        lastMessageTimestamp = messages[0].timestamp; // Store timestamp of the first loaded message
      }
      setChat(messages);
    });

    socket.on("message", (data) => {
      setChat((prevChat) => [...prevChat, data]);
    });

    socket.on("typing", (username) => {
      setTypingUser(
        username ? `${username} is typing...` : "User is typing..."
      );
    });

    socket.on("stopTyping", () => {
      setTypingUser("");
    });

    socket.on("userList", (userList) => {
      setUsers(userList);
    });

    return () => {
      socket.off("chatHistory");
      socket.off("message");
      socket.off("typing");
      socket.off("stopTyping");
      socket.off("userList");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("message", { username: username.trim() || "User", message });
      setMessage("");
    }
  };

  const loadOlderMessages = () => {
    if (loading || !hasMore) return;
    setLoading(true);
    socket.emit("loadOlderMessages", lastMessageTimestamp, (olderMessages) => {
      if (olderMessages.length === 0) {
        setHasMore(false);
      } else {
        lastMessageTimestamp = olderMessages[0].timestamp;
        setChat((prevChat) => [...olderMessages, ...prevChat]);
      }
      setLoading(false);
    });
  };

  const handleScroll = () => {
    if (chatRef.current.scrollTop === 0) {
      loadOlderMessages();
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Chat App 💬</h2>
      <div style={{ display: "flex", alignItems: "center" }}>
        <h4>Online Users:</h4>
        {users.map((user, index) => (
          <p key={index}>{user},</p>
        ))}
      </div>
      <div>
        <b>User Name: </b>
      <input
        type="text"
        placeholder="Enter your name"
        value={username}
        onChange={(e) => {
          const newUsername = e.target.value.trim() || "User";
          setUsername(newUsername);
          localStorage.setItem("chatUsername", newUsername);
          socket.emit("join", newUsername);
        }}
        />
        </div>
      <div
        ref={chatRef}
        onScroll={handleScroll}
        style={{
          marginTop: "20px",
          border: "1px solid #ccc",
          padding: "10px",
          height: "300px",
          overflowY: "scroll",
        }}
      >
        {loading && <p>Loading more messages...</p>}
        {chat.map((msg, index) => (
          <p key={index} style={{ color: msg.system ? "gray" : "black" }}>
            {msg.system ? (
              <>
                ⚠️ {msg.username} {msg.message}
              </>
            ) : (
              <>
                <strong>{msg.username}:</strong> {msg.message}{" "}
                <em style={{ fontSize: "0.8em", color: "gray" }}>
                  ({new Date(msg.timestamp).toLocaleTimeString()})
                </em>
              </>
            )}
          </p>
        ))}
        {typingUser && (
          <p style={{ fontStyle: "italic", color: "gray" }}>{typingUser}</p>
        )}
      </div>
      <input
        type="text"
        placeholder="Type a message..."
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          socket.emit("typing", username.trim() ? username : "User");
          setTimeout(() => {
            socket.emit("stopTyping");
          }, 1000);
        }}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default App;
