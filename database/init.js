// database/init.js - Database Initialization
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'focusflow.db');

function initializeDatabase() {
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
            process.exit(1);
        }
        console.log('📁 Connected to SQLite database');
    });

    db.serialize(() => {
        // Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            } else {
                console.log('✅ Users table ready');
            }
        });

        // TimeBlocks table
        db.run(`
            CREATE TABLE IF NOT EXISTS time_blocks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                start_time DATETIME NOT NULL,
                end_time DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) {
                console.error('Error creating time_blocks table:', err.message);
            } else {
                console.log('✅ Time blocks table ready');
            }
        });

        // Create indexes for better performance
        db.run(`
            CREATE INDEX IF NOT EXISTS idx_time_blocks_user_id 
            ON time_blocks(user_id)
        `);

        db.run(`
            CREATE INDEX IF NOT EXISTS idx_time_blocks_start_time 
            ON time_blocks(start_time)
        `);
    });

    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('📦 Database initialization complete');
        }
    });
}

module.exports = initializeDatabase;