const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('./database.js');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Middleware to validate Telegram's initData
const validateInitData = (req, res, next) => {
    const initData = req.headers['x-telegram-init-data'];

    if (!initData) {
        return res.status(401).json({ error: 'Unauthorized: No initData provided' });
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash'); // remove hash from params for validation

    // Sort keys alphabetically for consistent hash calculation
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys.map(key => `${key}=${params.get(key)}`).join('\n');

    try {
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash !== hash) {
            return res.status(401).json({ error: 'Unauthorized: Invalid hash' });
        }

        const user = JSON.parse(params.get('user'));
        req.userId = user.id; // Attach user's Telegram ID to the request
        next();

    } catch (error) {
        console.error("Error validating initData:", error);
        return res.status(500).json({ error: 'Internal server error during validation' });
    }
};

// Apply the validation middleware to all routes in this router
router.use(validateInitData);

// GET all entries for a user
router.get('/entries', (req, res) => {
    const sql = "SELECT * FROM entries WHERE user_id = ? ORDER BY entry_date DESC";
    db.all(sql, [req.userId], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// POST a new entry
router.post('/entries', (req, res) => {
    // Basic validation
    const { entry_date, content, mood, file_id } = req.body;
    if (!entry_date || !content) {
        return res.status(400).json({ "error": "Missing required fields: entry_date and content" });
    }

    const sql = `INSERT INTO entries (user_id, entry_date, content, mood, file_id) 
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(user_id, entry_date) 
                 DO UPDATE SET content=excluded.content, mood=excluded.mood, file_id=excluded.file_id, updated_at=CURRENT_TIMESTAMP`;
    
    const params = [req.userId, entry_date, content, mood, file_id];

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        res.status(201).json({
            "message": "success",
            "data": { id: this.lastID }
        });
    });
});


module.exports = router;
