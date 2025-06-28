require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const TelegramBot = require('node-telegram-bot-api');
const db = require('./database.js');

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;

if (!token) {
    console.error("Telegram bot token is not provided. Please set TELEGRAM_BOT_TOKEN in your .env file.");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const { id: telegram_id, first_name, last_name, username } = msg.from;

    // Add user to the database if not exists
    const sql = `INSERT OR IGNORE INTO users (id, telegram_id, first_name, last_name, username) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [telegram_id, telegram_id, first_name, last_name, username], (err) => {
        if (err) {
            console.error("Error saving user to database:", err.message);
        }
    });

    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Open Daily Journal', web_app: { url: webAppUrl } }]
            ]
        }
    };

    bot.sendMessage(chatId, 'Welcome to your Daily Journal! Click the button below to open the journal.', opts);
});

console.log('Telegram bot is running...');

module.exports = bot;
