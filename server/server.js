const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// Setup Express and Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Allow CORS
app.use(cors());
app.use(express.json()); // Add this line to parse JSON requests

// Serve static files (for your HTML, CSS, and JS)
app.use(express.static("public"));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// Define a sensor data schema
const sensorDataSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  carbondioxide: Number,
  ammonia: Number,
  latitude: Number,
  longitude: Number,
  timestamp: { type: Date, default: Date.now },
});

// Create a model from the schema
const SensorData = mongoose.model("SensorData", sensorDataSchema);

// Endpoint untuk menerima data dari ESP32
app.post("/api/sensor-data", async (req, res) => {
  try {
    const sensorData = new SensorData(req.body);
    await sensorData.save();

    // Emit data ke semua klien yang terhubung via Socket.IO
    io.emit("sensor-data", req.body);

    res.status(201).json({ message: "Data received and saved successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Set up Socket.IO connection
io.on("connection", (socket) => {
  console.log("Client connected");
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Endpoint to get all sensor data
app.get("/api/sensor-data", async (req, res) => {
  try {
    const data = await SensorData.find().sort({ timestamp: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start the server
const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = server;
