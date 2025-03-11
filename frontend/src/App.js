import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io(process.env.REACT_APP_BACKEND_URL);
// const socket = io("http://localhost:4000");

const App = () => {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [username, setUsername] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
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

  useEffect(() => {
    if (isAtBottom && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight; // Auto-scroll only if at bottom
    }
  }, [chat]);

  // useEffect(() => {
  //   setPage(1); // Reset page when component mounts
  //   loadOlderMessages();
  // }, []);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("message", {
        username: username.trim() || "User",
        message,
        color: "black",
      });
      setMessage("");
    }
  };

  const loadOlderMessages = () => {
    if (loading || !hasMore) return;
    setLoading(true);

    fetch(`http://localhost:4000/getMessages?page=${page}&limit=${limit}`)
      .then((response) => response.json())
      .then((olderMessages) => {
        if (olderMessages.length === 0) {
          setHasMore(false);
        } else {
          setChat((prevChat) => [...olderMessages, ...prevChat]); // Append at the top
          setPage(page + 1); // Move to next page
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleScroll = () => {
    if (!chatRef.current) return;

    // Load older messages when scrolled to the top
    if (chatRef.current.scrollTop === 0) {
      loadOlderMessages();
    }

    // Check if the user is at the bottom
    const isUserAtBottom =
      chatRef.current.scrollHeight - chatRef.current.scrollTop ===
      chatRef.current.clientHeight;
    setIsAtBottom(isUserAtBottom);
  };

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "black",
        color: "white",
        // this div should cover full screen
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        overflow: "auto",
      }}
    >
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
            const newUsername = e.target.value; // Don't trim immediately
            setUsername(newUsername);
          }}
          onBlur={() => {
            const finalUsername = username.trim() || "User";
            setUsername(finalUsername);
            localStorage.setItem("chatUsername", finalUsername);
            socket.emit("join", finalUsername);
          }}
        />
      </div>
      <div
        ref={chatRef}
        onScroll={handleScroll}
        style={{
          marginTop: "20px",
          border: "1px solid #ccc",
          backgroundColor: "oklch(0.872 0.01 258.338)",
          padding: "10px",
          height: "300px",
          overflowY: "scroll",
        }}
      >
        {loading && <p>Loading more messages...</p>}
        {chat.map((msg, index) =>
          msg.system ? (
            <p key={index} style={{ color: msg.color || "black" }}>
              {msg.color === "red" ? "⚠️" : "🟢"} {msg.username} {msg.message}
            </p>
          ) : (
            <p key={index} style={{ color: msg.color || "black" }}>
              <strong>{msg.username}:</strong> {msg.message}{" "}
              <em style={{ fontSize: "0.8em", color: "gray" }}>
                ({new Date(msg.timestamp).toLocaleTimeString()})
              </em>
            </p>
          )
        )}
        {typingUser && (
          <p style={{ fontStyle: "italic", color: "gray" }}>{typingUser}</p>
        )}
      </div>
      <input
        type="text"
        placeholder="Type a message..."
        value={message}
        style={{ marginTop: "10px", marginRight: "10px"}}
        onChange={(e) => {
          setMessage(e.target.value);
          socket.emit("typing", username.trim() ? username : "User");
          setTimeout(() => {
            socket.emit("stopTyping");
          }, 2000);
        }}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default App;
