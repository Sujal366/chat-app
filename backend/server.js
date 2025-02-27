// Import required modules
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const messageRoutes = require("./routes/messageRoutes");
const socketHandler = require("./socket/socket");

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Enable CORS for frontend connection
app.use(cors());

// Connect to MongoDB
connectDB();

// Initialize WebSocket server
const io = new Server(server, {
  cors: {
    origin: [
      "https://chatting-app-kohl-eight.vercel.app",
      // "http://localhost:3000",
    ], // Change this to your frontend URL in production
    methods: ["GET", "POST"],
  },
});

// Use WebSocket handler
socketHandler(io);

// API routes
app.use("/api/messages", messageRoutes);

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
