const express = require('express');
const authRoutes = require('./src/routes/auth.route');
const messageRoutes = require('./src/routes/message.route'); // Import the auth routes

const app = express();

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes); // Use the message routes with the '/api/messages' prefix

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

module.exports = app;
