#!/bin/bash

# FocusFlow Startup Script
# This script sets up and starts the FocusFlow application

echo "🚀 FocusFlow Startup Script"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js (v16 or higher) first."
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
REQUIRED_VERSION="16.0.0"

# Simple version comparison
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    print_status "Node.js version $NODE_VERSION is compatible"
else
    print_error "Node.js version $NODE_VERSION is too old. Please upgrade to v16 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_info "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please update .env file with your configuration before proceeding to production."
fi

# Install dependencies
print_info "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

print_status "Dependencies installed successfully"

# Initialize database
print_info "Initializing database..."
node -e "const init = require('./database/init'); init();"

if [ $? -ne 0 ]; then
    print_error "Failed to initialize database"
    exit 1
fi

print_status "Database initialized successfully"

# Create necessary directories
mkdir -p logs
mkdir -p backups
mkdir -p public/uploads

print_status "Created necessary directories"

# Check if we're in development mode
if [ "${NODE_ENV:-development}" = "development" ]; then
    print_info "Starting in development mode with nodemon..."
    print_info "Server will restart automatically on file changes"
    npm run dev
else
    print_info "Starting in production mode..."
    npm start
fi