require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const File = require('./models/File');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB Atlas
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('Error connecting to MongoDB Atlas:', err));

// Middleware
app.use(cors());
app.use(express.json());

const multer = require('multer');
const fs = require('fs');
const allowedMimeTypes = [
    'text/csv', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes.includes(file.mimetype) || ['.csv', '.xlsx', '.xls'].includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
    }
};

const upload = multer({ 
    storage: multer.memoryStorage(),
    fileFilter: fileFilter
});

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

app.post('/api/upload-biometric', (req, res, next) => {
    upload.single('file')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'File upload error: ' + err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        // Multi-Client Isolation: Infer client_id from request
        const clientId = req.body.client_id || req.body.companyId || 'default_client';
        const { fileName, overwrite } = req.body;
        
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // 1. File Storage Structure: /data/{client_id}/
        const rootDataDir = path.join(__dirname, 'data');
        const clientDir = path.join(rootDataDir, clientId);

        // 4 & 7. Security: Prevent unauthorized access / Directory traversal
        const normalizedClientDir = path.normalize(clientDir);
        if (!normalizedClientDir.startsWith(path.normalize(rootDataDir))) {
            return res.status(403).json({ error: 'Unauthorized folder access.' });
        }

        // 2. Folder Management: auto create folder with proper permissions
        if (!fs.existsSync(normalizedClientDir)) {
            // mode 0o755 gives rwx to owner, rx to group/others
            fs.mkdirSync(normalizedClientDir, { recursive: true, mode: 0o755 });
        }

        // 3. File Handling: save in client's data folder
        const originalExt = path.extname(req.file.originalname);
        const finalFileName = fileName ? 
            (fileName.endsWith(originalExt) ? fileName : fileName + originalExt) : 
            `${Date.now()}_${req.file.originalname}`;
            
        const filePath = path.join(normalizedClientDir, finalFileName);

        if (fs.existsSync(filePath) && overwrite !== 'true') {
            return res.status(409).json({ error: 'A file with this name already exists.', code: 'DUPLICATE_FILE' });
        }

        // 6. Error Handling: write file
        fs.writeFileSync(filePath, req.file.buffer);

        // 5. File Path Tracking: Store uploaded file path in MongoDB
        const fileRecord = await File.create({
            clientId,
            originalName: req.file.originalname,
            fileName: finalFileName,
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: filePath
        });

        res.json({ 
            success: true, 
            message: 'File uploaded successfully', 
            path: `/data/${clientId}/${finalFileName}`,
            fileId: fileRecord._id
        });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Internal Server Error: Failed to process and store the file.' });
    }
});

// Route to check DB records
app.get('/api/files', async (req, res) => {
    try {
        const files = await File.find().sort({ uploadedAt: -1 });
        res.json({
            count: files.length,
            files: files
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch files from database' });
    }
});

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
