const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateShortcut, uploadTempShortcut } = require('../controllers/shortcuts');

// Set up multer for file uploads
const tempDir = path.join(__dirname, '../../temp');
// Create temp directory if it doesn't exist
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, tempDir);
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Shortcut routes
router.post('/generate', generateShortcut);
router.post('/upload-temp', upload.single('shortcutFile'), uploadTempShortcut);

// Serve temporary files
router.get('/temp/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(tempDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            message: 'File not found'
        });
    }
    
    // Set the appropriate content type for .shortcut files
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});

module.exports = router;