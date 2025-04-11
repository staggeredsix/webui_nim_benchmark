#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Installing dependencies for NIM Benchmark Tool${NC}"

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 not found. Installing...${NC}"
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found. Installing...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Check for NVIDIA drivers and CUDA
if ! command -v nvidia-smi &> /dev/null; then
    echo -e "${RED}NVIDIA drivers not found. Please install NVIDIA drivers and CUDA toolkit${NC}"
    exit 1
fi

# Create virtual environment
echo -e "${GREEN}Creating Python virtual environment...${NC}"
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo -e "${GREEN}Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Install Node.js dependencies
echo -e "${GREEN}Installing Node.js dependencies...${NC}"
cd frontend
npm install

# Build frontend
echo -e "${GREEN}Building frontend...${NC}"
npm run build

echo -e "${GREEN}Installation complete!${NC}"
echo "To start the application:"
echo "1. Activate virtual environment: source venv/bin/activate"
echo "2. Start backend: python -m uvicorn app.main:app --host 0.0.0.0 --port 7000"