const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose'); // Import mongoose
require ('dotenv').config();

// Setup Express and Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Allow CORS
app.use(cors());
app.use(express.json()); // Add this line to parse JSON requests

// Serve static files (for your HTML, CSS, and JS)
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB:', err));

// Define a sensor data schema
const sensorDataSchema = new mongoose.Schema({
    temperature: Number,
    humidity: Number,
    carbonDioxide: Number,
    ammonia: Number,
    timestamp: { type: Date, default: Date.now }
});

// Create a model from the schema
const SensorData = mongoose.model('SensorData', sensorDataSchema);

// Generate dummy sensor data every 5 seconds
setInterval(async () => {
  const sensorData = {
    temperature: parseFloat((Math.random() * 10 + 20).toFixed(1)), // Generate random suhu between 20-30°C
    humidity: parseFloat((Math.random() * 40 + 40).toFixed(1)), // Generate random kelembapan between 40-80%
    carbonDioxide: parseFloat((Math.random() * 500 + 300).toFixed(1)), // Generate random CO2 between 300-800 ppm
    ammonia: parseFloat((Math.random() * 30).toFixed(1)) // Generate random NH3 between 0-30 ppm
  };

  // Save sensor data to MongoDB
  const newSensorData = new SensorData(sensorData);
  await newSensorData.save();

  // Emit data to clients via Socket.IO
  io.emit('sensor-data', sensorData);
}, 5000);

// Set up Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Endpoint to get all sensor data
app.get('/api/sensor-data', async (req, res) => {
  try {
      const data = await SensorData.find().sort({ timestamp: -1 });
      res.json(data);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = server;