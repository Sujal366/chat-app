const mongoose = require("mongoose");

const connectDB = async () => {
    try{
      // Connect to MongoDB
      await mongoose
        .connect(process.env.MONGO_URI)
        .then(() => console.log("✅ MongoDB connected"))
    }
    catch (error) {
        console.error(`❌ MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
}

module.exports = connectDB;