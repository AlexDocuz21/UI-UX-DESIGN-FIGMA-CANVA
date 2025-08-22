// models/TimeBlock.js - TimeBlock Model
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'focusflow.db');

class TimeBlock {
    static async findByUserId(userId) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.all(
                `SELECT * FROM time_blocks 
                 WHERE user_id = ? 
                 ORDER BY start_time DESC`,
                [userId],
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

    static async findById(id) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.get(
                'SELECT * FROM time_blocks WHERE id = ?',
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

    static async create(userId, title, description, startTime, endTime) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.run(
                `INSERT INTO time_blocks (user_id, title, description, start_time, end_time) 
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, title, description, startTime, endTime],
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

    static async update(id, title, description, startTime, endTime) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.run(
                `UPDATE time_blocks 
                 SET title = ?, description = ?, start_time = ?, end_time = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [title, description, startTime, endTime, id],
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

    static async delete(id) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.run(
                'DELETE FROM time_blocks WHERE id = ?',
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

    static async findByUserIdAndDateRange(userId, startDate, endDate) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.all(
                `SELECT * FROM time_blocks 
                 WHERE user_id = ? AND start_time >= ? AND end_time <= ?
                 ORDER BY start_time ASC`,
                [userId, startDate, endDate],
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

    static async findOverlapping(userId, startTime, endTime, excludeId = null) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            let query = `
                SELECT * FROM time_blocks 
                WHERE user_id = ? 
                AND (
                    (start_time <= ? AND end_time > ?) OR
                    (start_time < ? AND end_time >= ?) OR
                    (start_time >= ? AND end_time <= ?)
                )
            `;
            let params = [userId, startTime, startTime, endTime, endTime, startTime, endTime];
            
            if (excludeId) {
                query += ' AND id != ?';
                params.push(excludeId);
            }
            
            db.all(query, params, (err, rows) => {
                db.close();
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    static async getStats(userId) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            
            db.get(
                `SELECT 
                    COUNT(*) as total_blocks,
                    SUM((julianday(end_time) - julianday(start_time)) * 24) as total_hours,
                    AVG((julianday(end_time) - julianday(start_time)) * 24) as avg_duration
                 FROM time_blocks 
                 WHERE user_id = ?`,
                [userId],
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
}

module.exports = TimeBlock;