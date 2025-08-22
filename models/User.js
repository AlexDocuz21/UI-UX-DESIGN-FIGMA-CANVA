// models/User.js - User Model
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'focusflow.db');

class User {
    static async findByUsername(username) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.get(
                'SELECT * FROM users WHERE username = ?',
                [username],
                (err, row) => {
                    db.close();
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    static async findById(id) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.get(
                'SELECT * FROM users WHERE id = ?',
                [id],
                (err, row) => {
                    db.close();
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    static async create(username, passwordHash) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.run(
                'INSERT INTO users (username, password_hash) VALUES (?, ?)',
                [username, passwordHash],
                function(err) {
                    db.close();
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    static async getAll() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.all(
                'SELECT id, username, created_at FROM users ORDER BY created_at DESC',
                (err, rows) => {
                    db.close();
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    static async delete(id) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.run(
                'DELETE FROM users WHERE id = ?',
                [id],
                function(err) {
                    db.close();
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                }
            );
        });
    }

    static async updatePassword(id, newPasswordHash) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.run(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [newPasswordHash, id],
                function(err) {
                    db.close();
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                }
            );
        });
    }
}

module.exports = User;