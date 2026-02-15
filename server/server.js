const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// Basic API route
app.get('/api/status', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date() });
});

// Redirect root to login.html
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access the application at http://localhost:${PORT}`);
});
