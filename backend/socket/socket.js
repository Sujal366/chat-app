const Message = require("../models/Message");

// Store connected users
let users = {};

const socketHandler = (io) => {
  // Handle WebSocket connections
  io.on("connection", async (socket) => {
    console.log("✅ A user connected:", socket.id);

    // Send chat history to new user (sorted by time)
    const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
    socket.emit("chatHistory", messages.reverse());

    // User joins with a username
    socket.on("join", (username) => {
      users[socket.id] = username || "User";

      io.emit("message", {
        username,
        message: "joined the chat",
        color: "green",
        system: true,
      });
      io.emit("userList", Object.values(users)); // Update everyone
    });

    // Handle incoming messages
    socket.on("message", async (data) => {
      try {
        const newMessage = new Message({
          username: data.username,
          message: data.message,
          timestamp: new Date(), // Store actual date object
          color: data.color || "black",
        });

        await newMessage.save(); // Save message to database
        console.log("📩 New message saved:", newMessage);

        // Emit only the new message instead of resending the entire chat history
        io.emit("message", newMessage);
      } catch (error) {
        console.error("Error saving message:", error);
      }
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
      const username = users[socket.id] || "User";
      io.emit("message", {
        username,
        message: "left the chat",
        color: "red",
        system: true,
      });
      delete users[socket.id];
      io.emit("userList", Object.values(users));
      console.log(`❌ ${username} disconnected`, socket.id);
    });

    socket.on("typing", (username) => {
      socket.broadcast.emit("typing", username); // Notify others when a user is typing
    });

    socket.on("stopTyping", () => {
      socket.broadcast.emit("stopTyping"); // Notify when user stops typing
    });
  });
};

module.exports = socketHandler;
