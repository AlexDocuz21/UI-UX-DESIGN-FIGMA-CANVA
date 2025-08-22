// server.js - Main Express Server
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Import our modules
const initializeDatabase = require('./database/init');
const User = require('./models/User');
const TimeBlock = require('./models/TimeBlock');

const app = express();
const PORT = process.env.PORT || 3000;

// Daily motivation quotes array
const motivationalQuotes = [
    "The way to get started is to quit talking and begin doing. - Walt Disney",
    "Innovation distinguishes between a leader and a follower. - Steve Jobs",
    "Life is what happens to you while you're busy making other plans. - John Lennon",
    "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
    "It is during our darkest moments that we must focus to see the light. - Aristotle",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
    "The only impossible journey is the one you never begin. - Tony Robbins",
    "In the midst of winter, I found there was, within me, an invincible summer. - Albert Camus",
    "Be yourself; everyone else is already taken. - Oscar Wilde",
    "The only way to do great work is to love what you do. - Steve Jobs"
];

// Initialize database
initializeDatabase();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: 'focusflow-secret-key-change-in-production',
    store: new SQLiteStore({ db: 'sessions.db' }),
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Flash messages middleware
app.use((req, res, next) => {
    res.locals.success_msg = req.session.success_msg;
    res.locals.error_msg = req.session.error_msg;
    delete req.session.success_msg;
    delete req.session.error_msg;
    next();
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    req.session.error_msg = 'Please log in to access this page';
    res.redirect('/login');
};

// Helper function to get daily quote
function getDailyQuote() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const quoteIndex = dayOfYear % motivationalQuotes.length;
    return motivationalQuotes[quoteIndex];
}

// Routes

// Landing page
app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Registration routes
app.get('/register', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Register - FocusFlow</title>
            <link href="/styles.css" rel="stylesheet">
        </head>
        <body>
            <div class="auth-container">
                <div class="auth-card">
                    <h1>Create Your Account</h1>
                    <p>Join thousands of professionals who use FocusFlow to boost their productivity</p>
                    
                    ${res.locals.error_msg ? `<div class="alert alert-error">${res.locals.error_msg}</div>` : ''}
                    
                    <form action="/register" method="POST" class="auth-form">
                        <div class="form-group">
                            <label for="username">Username</label>
                            <input type="text" id="username" name="username" required 
                                   minlength="3" maxlength="50" 
                                   pattern="[a-zA-Z0-9_]+" 
                                   title="Username can only contain letters, numbers, and underscores">
                        </div>
                        
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" required 
                                   minlength="6" maxlength="100"
                                   title="Password must be at least 6 characters long">
                        </div>
                        
                        <div class="form-group">
                            <label for="confirmPassword">Confirm Password</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" required>
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-full">Create Account</button>
                    </form>
                    
                    <p class="auth-link">
                        Already have an account? <a href="/login">Sign in here</a>
                    </p>
                </div>
            </div>
            
            <script>
                // Client-side password confirmation validation
                document.querySelector('.auth-form').addEventListener('submit', function(e) {
                    const password = document.getElementById('password').value;
                    const confirmPassword = document.getElementById('confirmPassword').value;
                    
                    if (password !== confirmPassword) {
                        e.preventDefault();
                        alert('Passwords do not match!');
                    }
                });
            </script>
        </body>
        </html>
    `);
});

app.post('/register', async (req, res) => {
    const { username, password, confirmPassword } = req.body;
    
    try {
        // Validation
        if (!username || !password || !confirmPassword) {
            req.session.error_msg = 'All fields are required';
            return res.redirect('/register');
        }
        
        if (password !== confirmPassword) {
            req.session.error_msg = 'Passwords do not match';
            return res.redirect('/register');
        }
        
        if (password.length < 6) {
            req.session.error_msg = 'Password must be at least 6 characters long';
            return res.redirect('/register');
        }
        
        // Check if user already exists
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            req.session.error_msg = 'Username already exists';
            return res.redirect('/register');
        }
        
        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = await User.create(username, hashedPassword);
        
        // Log in the user
        req.session.userId = userId;
        req.session.username = username;
        req.session.success_msg = 'Account created successfully! Welcome to FocusFlow.';
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Registration error:', error);
        req.session.error_msg = 'An error occurred during registration. Please try again.';
        res.redirect('/register');
    }
});

// Login routes
app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login - FocusFlow</title>
            <link href="/styles.css" rel="stylesheet">
        </head>
        <body>
            <div class="auth-container">
                <div class="auth-card">
                    <h1>Welcome Back</h1>
                    <p>Sign in to your FocusFlow account to continue your productivity journey</p>
                    
                    ${res.locals.error_msg ? `<div class="alert alert-error">${res.locals.error_msg}</div>` : ''}
                    ${res.locals.success_msg ? `<div class="alert alert-success">${res.locals.success_msg}</div>` : ''}
                    
                    <form action="/login" method="POST" class="auth-form">
                        <div class="form-group">
                            <label for="username">Username</label>
                            <input type="text" id="username" name="username" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-full">Sign In</button>
                    </form>
                    
                    <p class="auth-link">
                        Don't have an account? <a href="/register">Create one here</a>
                    </p>
                    
                    <p class="auth-link">
                        <a href="/">← Back to home</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        if (!username || !password) {
            req.session.error_msg = 'Username and password are required';
            return res.redirect('/login');
        }
        
        const user = await User.findByUsername(username);
        if (!user) {
            req.session.error_msg = 'Invalid username or password';
            return res.redirect('/login');
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            req.session.error_msg = 'Invalid username or password';
            return res.redirect('/login');
        }
        
        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.success_msg = `Welcome back, ${user.username}!`;
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        req.session.error_msg = 'An error occurred during login. Please try again.';
        res.redirect('/login');
    }
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

// Dashboard
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const timeBlocks = await TimeBlock.findByUserId(req.session.userId);
        const dailyQuote = getDailyQuote();
        
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dashboard - FocusFlow</title>
                <link href="/styles.css" rel="stylesheet">
            </head>
            <body>
                <nav class="dashboard-nav">
                    <div class="nav-content">
                        <div class="nav-brand">
                            <i class="fas fa-clock"></i>
                            <span>FocusFlow</span>
                        </div>
                        <div class="nav-user">
                            <span>Hello, ${req.session.username}</span>
                            <form action="/logout" method="POST" style="display: inline;">
                                <button type="submit" class="btn btn-secondary btn-sm">Logout</button>
                            </form>
                        </div>
                    </div>
                </nav>
                
                <main class="dashboard-main">
                    <div class="dashboard-header">
                        <h1>Your Time Blocks</h1>
                        <div class="dashboard-actions">
                            <a href="/timeblocks/create" class="btn btn-primary">
                                <i class="fas fa-plus"></i> New Time Block
                            </a>
                            ${timeBlocks.length > 0 ? '<a href="/export" class="btn btn-secondary">Export CSV</a>' : ''}
                        </div>
                    </div>
                    
                    ${res.locals.success_msg ? `<div class="alert alert-success">${res.locals.success_msg}</div>` : ''}
                    ${res.locals.error_msg ? `<div class="alert alert-error">${res.locals.error_msg}</div>` : ''}
                    
                    <!-- Quick Task Adder -->
                    <div class="quick-task-container">
                        <div class="quick-task-card">
                            <h3><i class="fas fa-bolt"></i> Quick Add Task</h3>
                            <form id="quickTaskForm" class="quick-task-form">
                                <div class="quick-task-inputs">
                                    <input type="text" id="quickTaskName" placeholder="Task name" required>
                                    <input type="time" id="quickTaskTime" required>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-plus"></i> Add Task
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <!-- Daily Quote Card -->
                    <div class="quote-container">
                        <div class="quote-card">
                            <div class="quote-icon">
                                <i class="fas fa-quote-left"></i>
                            </div>
                            <p class="quote-text">${dailyQuote}</p>
                            <div class="quote-footer">
                                <span class="quote-label">Daily Motivation</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="timeblocks-container">
                        ${timeBlocks.length === 0 ? 
                            `<div class="empty-state">
                                <i class="fas fa-calendar-plus"></i>
                                <h2>No time blocks yet</h2>
                                <p>Create your first time block to start organizing your day</p>
                                <a href="/timeblocks/create" class="btn btn-primary">Create Time Block</a>
                            </div>` :
                            `<div class="timeblocks-grid" id="timeBlocksGrid">
                                ${timeBlocks.map(block => `
                                    <div class="timeblock-card" data-id="${block.id}">
                                        <div class="timeblock-header">
                                            <h3>${block.title}</h3>
                                            <div class="timeblock-actions">
                                                <a href="/timeblocks/edit/${block.id}" class="btn-icon">
                                                    <i class="fas fa-edit"></i>
                                                </a>
                                                <form action="/timeblocks/delete/${block.id}" method="POST" style="display: inline;" 
                                                      onsubmit="return confirm('Are you sure you want to delete this time block?')">
                                                    <button type="submit" class="btn-icon btn-danger">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                        <div class="timeblock-content">
                                            <div class="timeblock-time">
                                                <i class="fas fa-clock"></i>
                                                ${formatDateTime(block.start_time)} - ${formatDateTime(block.end_time)}
                                            </div>
                                            ${block.description ? `<p class="timeblock-description">${block.description}</p>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>`
                        }
                    </div>
                </main>
                
                <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>
                <script>
                    // Quick Task Form Handler
                    document.getElementById('quickTaskForm').addEventListener('submit', async function(e) {
                        e.preventDefault();
                        
                        const taskName = document.getElementById('quickTaskName').value;
                        const taskTime = document.getElementById('quickTaskTime').value;
                        const submitBtn = this.querySelector('button[type="submit"]');
                        
                        if (!taskName || !taskTime) {
                            alert('Please fill in both task name and time');
                            return;
                        }
                        
                        // Show loading state
                        const originalText = submitBtn.innerHTML;
                        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
                        submitBtn.disabled = true;
                        
                        try {
                            const response = await fetch('/api/quick-task', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    taskName: taskName,
                                    taskTime: taskTime
                                })
                            });
                            
                            const result = await response.json();
                            
                            if (response.ok) {
                                // Clear form
                                document.getElementById('quickTaskName').value = '';
                                document.getElementById('quickTaskTime').value = '';
                                
                                // Add new time block to the grid
                                addTimeBlockToGrid(result.timeBlock);
                                
                                // Show success message
                                showAlert('Task added successfully!', 'success');
                            } else {
                                showAlert(result.error || 'Failed to add task', 'error');
                            }
                        } catch (error) {
                            console.error('Error adding task:', error);
                            showAlert('Error adding task. Please try again.', 'error');
                        } finally {
                            // Reset button
                            submitBtn.innerHTML = originalText;
                            submitBtn.disabled = false;
                        }
                    });
                    
                    // Function to add new time block to grid
                    function addTimeBlockToGrid(timeBlock) {
                        const grid = document.getElementById('timeBlocksGrid');
                        if (!grid) {
                            // If no grid exists (empty state), reload page to show proper layout
                            window.location.reload();
                            return;
                        }
                        
                        const newCard = document.createElement('div');
                        newCard.className = 'timeblock-card';
                        newCard.dataset.id = timeBlock.id;
                        newCard.innerHTML = \`
                            <div class="timeblock-header">
                                <h3>\${timeBlock.title}</h3>
                                <div class="timeblock-actions">
                                    <a href="/timeblocks/edit/\${timeBlock.id}" class="btn-icon">
                                        <i class="fas fa-edit"></i>
                                    </a>
                                    <form action="/timeblocks/delete/\${timeBlock.id}" method="POST" style="display: inline;" 
                                          onsubmit="return confirm('Are you sure you want to delete this time block?')">
                                        <button type="submit" class="btn-icon btn-danger">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </form>
                                </div>
                            </div>
                            <div class="timeblock-content">
                                <div class="timeblock-time">
                                    <i class="fas fa-clock"></i>
                                    \${formatDateTime(timeBlock.start_time)} - \${formatDateTime(timeBlock.end_time)}
                                </div>
                                \${timeBlock.description ? \`<p class="timeblock-description">\${timeBlock.description}</p>\` : ''}
                            </div>
                        \`;
                        
                        grid.appendChild(newCard);
                        
                        // Add animation
                        newCard.style.opacity = '0';
                        newCard.style.transform = 'translateY(20px)';
                        setTimeout(() => {
                            newCard.style.transition = 'all 0.3s ease';
                            newCard.style.opacity = '1';
                            newCard.style.transform = 'translateY(0)';
                        }, 100);
                    }
                    
                    // Function to show alert messages
                    function showAlert(message, type) {
                        const alertDiv = document.createElement('div');
                        alertDiv.className = \`alert alert-\${type}\`;
                        alertDiv.textContent = message;
                        
                        const container = document.querySelector('.dashboard-main');
                        const header = document.querySelector('.dashboard-header');
                        container.insertBefore(alertDiv, header.nextSibling);
                        
                        // Auto remove after 3 seconds
                        setTimeout(() => {
                            alertDiv.remove();
                        }, 3000);
                    }
                    
                    // Format datetime function (client-side version)
                    function formatDateTime(dateTimeString) {
                        return new Date(dateTimeString).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });
                    }
                    
                    // Set default time to current time
                    document.addEventListener('DOMContentLoaded', function() {
                        const timeInput = document.getElementById('quickTaskTime');
                        const now = new Date();
                        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                                          now.getMinutes().toString().padStart(2, '0');
                        timeInput.value = currentTime;
                    });
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Dashboard error:', error);
        req.session.error_msg = 'Error loading dashboard';
        res.redirect('/login');
    }
});

// API Routes

// Daily Quote API
app.get('/api/quote', (req, res) => {
    try {
        const quote = getDailyQuote();
        res.json({ quote: quote, date: new Date().toISOString().split('T')[0] });
    } catch (error) {
        console.error('Quote API error:', error);
        res.status(500).json({ error: 'Failed to fetch quote' });
    }
});

// Quick Task API
app.post('/api/quick-task', requireAuth, async (req, res) => {
    try {
        const { taskName, taskTime } = req.body;
        
        if (!taskName || !taskTime) {
            return res.status(400).json({ error: 'Task name and time are required' });
        }
        
        // Create start and end times based on the provided time
        const today = new Date();
        const [hours, minutes] = taskTime.split(':');
        
        const startTime = new Date(today);
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 1); // Default 1-hour duration
        
        // Ensure we don't create a time block in the past
        const now = new Date();
        if (startTime < now) {
            startTime.setDate(startTime.getDate() + 1); // Move to tomorrow
            endTime.setDate(endTime.getDate() + 1);
        }
        
        const timeBlockId = await TimeBlock.create(
            req.session.userId,
            taskName,
            null, // No description for quick tasks
            startTime.toISOString(),
            endTime.toISOString()
        );
        
        // Fetch the created time block to return it
        const timeBlock = await TimeBlock.findById(timeBlockId);
        
        res.json({ 
            success: true, 
            message: 'Task added successfully',
            timeBlock: timeBlock
        });
    } catch (error) {
        console.error('Quick task API error:', error);
        res.status(500).json({ error: 'Failed to add task' });
    }
});

// Existing time block routes...
app.get('/timeblocks/create', requireAuth, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Create Time Block - FocusFlow</title>
            <link href="/styles.css" rel="stylesheet">
        </head>
        <body>
            <nav class="dashboard-nav">
                <div class="nav-content">
                    <div class="nav-brand">
                        <i class="fas fa-clock"></i>
                        <span>FocusFlow</span>
                    </div>
                    <div class="nav-user">
                        <a href="/dashboard" class="btn btn-secondary btn-sm">← Back to Dashboard</a>
                    </div>
                </div>
            </nav>
            
            <main class="form-main">
                <div class="form-container">
                    <h1>Create New Time Block</h1>
                    
                    ${res.locals.error_msg ? `<div class="alert alert-error">${res.locals.error_msg}</div>` : ''}
                    
                    <form action="/timeblocks/create" method="POST" class="timeblock-form">
                        <div class="form-group">
                            <label for="title">Task Name *</label>
                            <input type="text" id="title" name="title" required maxlength="200">
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="start_time">Start Time *</label>
                                <input type="datetime-local" id="start_time" name="start_time" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="end_time">End Time *</label>
                                <input type="datetime-local" id="end_time" name="end_time" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="description">Description</label>
                            <textarea id="description" name="description" maxlength="1000" rows="4" 
                                      placeholder="Add any additional details about this time block..."></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <a href="/dashboard" class="btn btn-secondary">Cancel</a>
                            <button type="submit" class="btn btn-primary">Create Time Block</button>
                        </div>
                    </form>
                </div>
            </main>
            
            <script>
                // Set minimum datetime to now
                document.addEventListener('DOMContentLoaded', function() {
                    const now = new Date();
                    const nowString = now.toISOString().slice(0, 16);
                    document.getElementById('start_time').value = nowString;
                    
                    // Set end time 1 hour later
                    const endTime = new Date(now.getTime() + 60 * 60 * 1000);
                    document.getElementById('end_time').value = endTime.toISOString().slice(0, 16);
                    
                    // Validate end time is after start time
                    document.querySelector('.timeblock-form').addEventListener('submit', function(e) {
                        const startTime = new Date(document.getElementById('start_time').value);
                        const endTime = new Date(document.getElementById('end_time').value);
                        
                        if (endTime <= startTime) {
                            e.preventDefault();
                            alert('End time must be after start time');
                        }
                    });
                });
            </script>
        </body>
        </html>
    `);
});

app.post('/timeblocks/create', requireAuth, async (req, res) => {
    const { title, start_time, end_time, description } = req.body;
    
    try {
        // Validation
        if (!title || !start_time || !end_time) {
            req.session.error_msg = 'Title, start time, and end time are required';
            return res.redirect('/timeblocks/create');
        }
        
        if (new Date(end_time) <= new Date(start_time)) {
            req.session.error_msg = 'End time must be after start time';
            return res.redirect('/timeblocks/create');
        }
        
        await TimeBlock.create(
            req.session.userId,
            title,
            description || null,
            start_time,
            end_time
        );
        
        req.session.success_msg = 'Time block created successfully!';
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Create time block error:', error);
        req.session.error_msg = 'Error creating time block. Please try again.';
        res.redirect('/timeblocks/create');
    }
});

app.get('/timeblocks/edit/:id', requireAuth, async (req, res) => {
    try {
        const timeBlock = await TimeBlock.findById(req.params.id);
        
        if (!timeBlock || timeBlock.user_id !== req.session.userId) {
            req.session.error_msg = 'Time block not found';
            return res.redirect('/dashboard');
        }
        
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Edit Time Block - FocusFlow</title>
                <link href="/styles.css" rel="stylesheet">
            </head>
            <body>
                <nav class="dashboard-nav">
                    <div class="nav-content">
                        <div class="nav-brand">
                            <i class="fas fa-clock"></i>
                            <span>FocusFlow</span>
                        </div>
                        <div class="nav-user">
                            <a href="/dashboard" class="btn btn-secondary btn-sm">← Back to Dashboard</a>
                        </div>
                    </div>
                </nav>
                
                <main class="form-main">
                    <div class="form-container">
                        <h1>Edit Time Block</h1>
                        
                        ${res.locals.error_msg ? `<div class="alert alert-error">${res.locals.error_msg}</div>` : ''}
                        
                        <form action="/timeblocks/edit/${timeBlock.id}" method="POST" class="timeblock-form">
                            <div class="form-group">
                                <label for="title">Task Name *</label>
                                <input type="text" id="title" name="title" required maxlength="200" 
                                       value="${timeBlock.title}">
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="start_time">Start Time *</label>
                                    <input type="datetime-local" id="start_time" name="start_time" required
                                           value="${formatDateTimeForInput(timeBlock.start_time)}">
                                </div>
                                
                                <div class="form-group">
                                    <label for="end_time">End Time *</label>
                                    <input type="datetime-local" id="end_time" name="end_time" required
                                           value="${formatDateTimeForInput(timeBlock.end_time)}">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="description">Description</label>
                                <textarea id="description" name="description" maxlength="1000" rows="4" 
                                          placeholder="Add any additional details about this time block...">${timeBlock.description || ''}</textarea>
                            </div>
                            
                            <div class="form-actions">
                                <a href="/dashboard" class="btn btn-secondary">Cancel</a>
                                <button type="submit" class="btn btn-primary">Update Time Block</button>
                            </div>
                        </form>
                    </div>
                </main>
                
                <script>
                    // Validate end time is after start time
                    document.querySelector('.timeblock-form').addEventListener('submit', function(e) {
                        const startTime = new Date(document.getElementById('start_time').value);
                        const endTime = new Date(document.getElementById('end_time').value);
                        
                        if (endTime <= startTime) {
                            e.preventDefault();
                            alert('End time must be after start time');
                        }
                    });
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Edit time block error:', error);
        req.session.error_msg = 'Error loading time block';
        res.redirect('/dashboard');
    }
});

app.post('/timeblocks/edit/:id', requireAuth, async (req, res) => {
    const { title, start_time, end_time, description } = req.body;
    
    try {
        const timeBlock = await TimeBlock.findById(req.params.id);
        
        if (!timeBlock || timeBlock.user_id !== req.session.userId) {
            req.session.error_msg = 'Time block not found';
            return res.redirect('/dashboard');
        }
        
        // Validation
        if (!title || !start_time || !end_time) {
            req.session.error_msg = 'Title, start time, and end time are required';
            return res.redirect(`/timeblocks/edit/${req.params.id}`);
        }
        
        if (new Date(end_time) <= new Date(start_time)) {
            req.session.error_msg = 'End time must be after start time';
            return res.redirect(`/timeblocks/edit/${req.params.id}`);
        }
        
        await TimeBlock.update(
            req.params.id,
            title,
            description || null,
            start_time,
            end_time
        );
        
        req.session.success_msg = 'Time block updated successfully!';
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Update time block error:', error);
        req.session.error_msg = 'Error updating time block. Please try again.';
        res.redirect(`/timeblocks/edit/${req.params.id}`);
    }
});

app.post('/timeblocks/delete/:id', requireAuth, async (req, res) => {
    try {
        const timeBlock = await TimeBlock.findById(req.params.id);
        
        if (!timeBlock || timeBlock.user_id !== req.session.userId) {
            req.session.error_msg = 'Time block not found';
            return res.redirect('/dashboard');
        }
        
        await TimeBlock.delete(req.params.id);
        req.session.success_msg = 'Time block deleted successfully!';
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Delete time block error:', error);
        req.session.error_msg = 'Error deleting time block';
        res.redirect('/dashboard');
    }
});

// Export to CSV
app.get('/export', requireAuth, async (req, res) => {
    try {
        const timeBlocks = await TimeBlock.findByUserId(req.session.userId);
        
        if (timeBlocks.length === 0) {
            req.session.error_msg = 'No time blocks to export';
            return res.redirect('/dashboard');
        }
        
        // Generate CSV
        const csvHeaders = 'Title,Description,Start Time,End Time,Duration (hours)\n';
        const csvRows = timeBlocks.map(block => {
            const startTime = new Date(block.start_time);
            const endTime = new Date(block.end_time);
            const duration = ((endTime - startTime) / (1000 * 60 * 60)).toFixed(2);
            
            return [
                `"${block.title}"`,
                `"${block.description || ''}"`,
                `"${formatDateTime(block.start_time)}"`,
                `"${formatDateTime(block.end_time)}"`,
                duration
            ].join(',');
        }).join('\n');
        
        const csv = csvHeaders + csvRows;
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="focusflow-timeblocks-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Export error:', error);
        req.session.error_msg = 'Error exporting time blocks';
        res.redirect('/dashboard');
    }
});

// API endpoints for potential frontend enhancement
app.get('/api/timeblocks', requireAuth, async (req, res) => {
    try {
        const timeBlocks = await TimeBlock.findByUserId(req.session.userId);
        res.json(timeBlocks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch time blocks' });
    }
});

// Helper functions
function formatDateTime(dateTimeString) {
    return new Date(dateTimeString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatDateTimeForInput(dateTimeString) {
    return new Date(dateTimeString).toISOString().slice(0, 16);
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).send('Internal Server Error');
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Page Not Found - FocusFlow</title>
            <link href="/styles.css" rel="stylesheet">
        </head>
        <body>
            <div class="error-container">
                <h1>404 - Page Not Found</h1>
                <p>The page you're looking for doesn't exist.</p>
                <a href="/" class="btn btn-primary">Go Home</a>
            </div>
        </body>
        </html>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 FocusFlow server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🔐 Login: http://localhost:${PORT}/login`);
    console.log(`📝 Register: http://localhost:${PORT}/register`);
});

module.exports = app;