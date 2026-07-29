const express = require('express');
const cors = require('cors');
const authRoutes = require('./src/routes/auth.route');
const messageRoutes = require('./src/routes/message.route'); // Import the auth routes
const userRoutes = require('./src/routes/user.route');
const { frontendUrl } = require('./src/configs/env');

const app = express();

// Middleware to allow the frontend origin to call this REST API with Bearer
// tokens. Origin is sourced from env (FRONTEND_URL) rather than hardcoded or
// wildcarded, since wildcard CORS is unsafe when credentials are involved.
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes); // Use the message routes with the '/api/messages' prefix
app.use('/api/users', userRoutes); // Use the user routes with the '/api/users' prefix

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

module.exports = app;
