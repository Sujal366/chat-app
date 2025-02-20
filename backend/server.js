// Import required modules
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Enable CORS for frontend connection
app.use(cors());

// Initialize WebSocket server
const io = new Server(server, {
  cors: {
    origin: "*", // Change this to your frontend URL in production
    methods: ["GET", "POST"],
  },
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB connection error:", err));

// Define Message Schema
const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now }, // Store actual date object
});

const Message = mongoose.model("Message", messageSchema);

// Store connected users
let users = {};

// Handle WebSocket connections
io.on("connection", async (socket) => {
  console.log("✅ A user connected:", socket.id);

  // Send chat history to new user (sorted by time)
  const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
  socket.emit("chatHistory", messages);

  // User joins with a username
  socket.on("join", (username) => {
    users[socket.id] = username || "User";
    io.emit("userList", Object.values(users)); // Update everyone
  });

  // Handle incoming messages with timestamps
  socket.on("message", async (data) => {
    const timestamp = new Date().toISOString(); // Ensure consistent timestamp format
    const newMessage = new Message({ ...data, timestamp });
    await newMessage.save(); // Save message to database
    io.emit("message", { ...data, timestamp });
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    const username = users[socket.id] || "User";
    io.emit("message", { username, message: "left the chat", system: true });
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

// API endpoint for fetching paginated messages
app.get("/getMessages", async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 20; // Default: 20 messages per batch

    const skip = (page - 1) * limit;

    // Fetch messages in descending order (latest first)
    const messages = await Message.find()
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.json(messages.reverse()); // Reverse so oldest messages are at the top
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
