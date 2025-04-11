#!/bin/bash

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== Ollama Benchmark Tool Setup and Run =====${NC}"
echo -e "${GREEN}This script will set up all dependencies and start the application${NC}"
echo ""

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
fi

# Check if we're running as root on Linux (needed for apt)
SUDO=""
if [ "$OS" == "linux" ] && [ "$EUID" -ne 0 ]; then
    if command -v sudo &> /dev/null; then
        SUDO="sudo"
    else
        echo -e "${YELLOW}sudo is not available. Some installation steps might fail.${NC}"
    fi
fi

# Function to install packages on Linux
install_linux_packages() {
    echo -e "${GREEN}Updating package lists...${NC}"
    $SUDO apt-get update

    echo -e "${GREEN}Installing required system packages...${NC}"
    $SUDO apt-get install -y python3-pip python3-venv curl wget build-essential
    
    # Install Node.js if needed
    if ! command -v node &> /dev/null; then
        echo -e "${GREEN}Installing Node.js...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO bash -
        $SUDO apt-get install -y nodejs
    fi
}

# Function to install packages on macOS
install_macos_packages() {
    if ! command -v brew &> /dev/null; then
        echo -e "${YELLOW}Homebrew is not installed. Installing Homebrew...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    echo -e "${GREEN}Installing required system packages...${NC}"
    brew install python@3.10
    
    # Install Node.js if needed
    if ! command -v node &> /dev/null; then
        echo -e "${GREEN}Installing Node.js...${NC}"
        brew install node@18
    fi
}

# Install system dependencies based on OS
if [ "$OS" == "linux" ]; then
    echo -e "${GREEN}Detected Linux system${NC}"
    install_linux_packages
elif [ "$OS" == "macos" ]; then
    echo -e "${GREEN}Detected macOS system${NC}"
    install_macos_packages
else
    echo -e "${YELLOW}Unsupported operating system. Trying to continue anyway...${NC}"
fi

# Check for Python 3.10+
echo -e "${GREEN}Checking Python version...${NC}"
if command -v python3 &> /dev/null; then
    python_cmd="python3"
elif command -v python &> /dev/null; then
    python_cmd="python"
else
    echo -e "${RED}Error: Python not found. Please install Python 3.10 or higher.${NC}"
    exit 1
fi

python_version=$($python_cmd --version 2>&1 | awk '{print $2}')
python_major=$(echo $python_version | cut -d. -f1)
python_minor=$(echo $python_version | cut -d. -f2)

echo -e "${GREEN}Found Python $python_version${NC}"

if [ "$python_major" -lt 3 ] || ([ "$python_major" -eq 3 ] && [ "$python_minor" -lt 10 ]); then
    echo -e "${RED}Error: Python 3.10+ is required. Found Python $python_version${NC}"
    echo -e "${YELLOW}Please install Python 3.10 or higher and try again.${NC}"
    exit 1
fi

# Check for pip
if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
    echo -e "${YELLOW}pip not found. Installing pip...${NC}"
    $python_cmd -m ensurepip --upgrade
fi

if command -v pip3 &> /dev/null; then
    pip_cmd="pip3"
else
    pip_cmd="pip"
fi

# Ensure venv module is available
echo -e "${GREEN}Checking for Python venv module...${NC}"
if ! $python_cmd -c "import venv" &> /dev/null; then
    echo -e "${YELLOW}Python venv module not available. Installing...${NC}"
    if [ "$OS" == "linux" ]; then
        $SUDO apt-get install -y python3-venv
    elif [ "$OS" == "macos" ]; then
        brew install python-venv
    else
        echo -e "${RED}Could not install venv module automatically.${NC}"
        echo -e "${YELLOW}Please install Python venv module manually and try again.${NC}"
        exit 1
    fi
fi

# Check if virtual environment exists, create if not
VENV_DIR="ollama_venv"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${GREEN}Creating new Python virtual environment in $VENV_DIR...${NC}"
    $python_cmd -m venv $VENV_DIR
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create virtual environment. Trying alternate method...${NC}"
        # Try an alternate method
        $pip_cmd install virtualenv
        $python_cmd -m virtualenv $VENV_DIR
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to create virtual environment with virtualenv too.${NC}"
            echo -e "${YELLOW}Installing without virtual environment...${NC}"
            VENV_DIR=""
        fi
    fi
else
    echo -e "${GREEN}Using existing virtual environment in $VENV_DIR...${NC}"
fi

# Activate virtual environment if it exists
if [ -n "$VENV_DIR" ]; then
    echo -e "${GREEN}Activating virtual environment...${NC}"
    
    # Check which activation script exists
    if [ -f "$VENV_DIR/bin/activate" ]; then
        source "$VENV_DIR/bin/activate"
    elif [ -f "$VENV_DIR/Scripts/activate" ]; then
        source "$VENV_DIR/Scripts/activate"
    else
        echo -e "${RED}Cannot find activation script in $VENV_DIR.${NC}"
        echo -e "${YELLOW}The virtual environment may be corrupt. Continuing without it...${NC}"
        VENV_DIR=""
    fi
fi

# Use the correct pip command (from venv if available)
if [ -n "$VENV_DIR" ]; then
    if [ -f "$VENV_DIR/bin/pip" ]; then
        pip_cmd="$VENV_DIR/bin/pip"
    elif [ -f "$VENV_DIR/Scripts/pip" ]; then
        pip_cmd="$VENV_DIR/Scripts/pip"
    fi
fi

# Install or upgrade pip
echo -e "${GREEN}Upgrading pip...${NC}"
$pip_cmd install --upgrade pip

# Explicitly install key dependencies first
echo -e "${GREEN}Installing critical dependencies...${NC}"
$pip_cmd install fastapi uvicorn aiohttp pydantic websockets slowapi sqlalchemy prometheus-client docker

# Install Python dependencies from requirements.txt
echo -e "${GREEN}Installing remaining Python dependencies...${NC}"
$pip_cmd install -r requirements.txt

# Check if installation was successful
echo -e "${GREEN}Verifying key dependencies...${NC}"
if [ -n "$VENV_DIR" ]; then
    if [ -f "$VENV_DIR/bin/python" ]; then
        venv_python="$VENV_DIR/bin/python"
    elif [ -f "$VENV_DIR/Scripts/python" ]; then
        venv_python="$VENV_DIR/Scripts/python"
    else
        venv_python="$python_cmd"
    fi
else
    venv_python="$python_cmd"
fi

$venv_python -c "import fastapi; import uvicorn; import aiohttp; import pydantic; import slowapi; import docker; print('All critical dependencies verified!')" || {
    echo -e "${RED}Failed to verify dependencies. Installing directly...${NC}"
    $pip_cmd install fastapi uvicorn aiohttp pydantic websockets slowapi docker
    
    $venv_python -c "import fastapi; import uvicorn; import aiohttp; import pydantic; import slowapi; import docker; print('All critical dependencies verified!')" || {
        echo -e "${RED}Critical error: Could not install required dependencies.${NC}"
        exit 1
    }
}

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+ to build the frontend.${NC}"
    echo -e "${YELLOW}You can download it from: https://nodejs.org/${NC}"
    echo -e "${YELLOW}Continuing with backend only...${NC}"
elif ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm to build the frontend.${NC}"
    echo -e "${YELLOW}Continuing with backend only...${NC}"
else
    node_version=$(node --version | cut -d'v' -f2)
    node_major=$(echo $node_version | cut -d. -f1)
    
    echo -e "${GREEN}Found Node.js $node_version${NC}"
    
    if [ "$node_major" -lt 18 ]; then
        echo -e "${YELLOW}Warning: Node.js 18+ is recommended. Found Node.js $node_version${NC}"
        echo -e "${YELLOW}Frontend build may fail. Consider upgrading Node.js.${NC}"
    fi
    
    # Build frontend
    echo -e "${GREEN}Building frontend...${NC}"
    (cd frontend && npm install && npm run build)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Frontend build failed. Will continue with backend only.${NC}"
    else
        echo -e "${GREEN}Frontend built successfully!${NC}"
        
        # Create frontend_dist directory if it doesn't exist
        if [ ! -d "frontend_dist" ]; then
            mkdir -p frontend_dist
        fi
        
        # Copy built frontend files to the expected location
        cp -r frontend/dist/* frontend_dist/
        echo -e "${GREEN}Copied frontend build to frontend_dist directory${NC}"
    fi
fi

# Check if Ollama is running
echo -e "${YELLOW}Checking if Ollama server is running...${NC}"
ollama_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:11434/api/tags 2>/dev/null || echo "failed")

if [ "$ollama_status" = "200" ]; then
    echo -e "${GREEN}Ollama server is running!${NC}"
else
    echo -e "${YELLOW}Warning: Ollama server doesn't seem to be running.${NC}"
    echo -e "${YELLOW}Please start Ollama with 'ollama serve' before running benchmarks.${NC}"
    
    # Attempt to check if Ollama is installed
    if command -v ollama &> /dev/null; then
        echo -e "${GREEN}Ollama is installed. Starting Ollama server...${NC}"
        if [ "$OS" == "linux" ] || [ "$OS" == "macos" ]; then
            # Start Ollama in background
            nohup ollama serve > ollama.log 2>&1 &
            echo -e "${GREEN}Started Ollama server in background${NC}"
            # Give it time to start
            echo -e "${YELLOW}Waiting for Ollama server to start...${NC}"
            sleep 5
        else
            echo -e "${YELLOW}Please start Ollama manually with 'ollama serve'${NC}"
        fi
    else
        echo -e "${RED}Ollama does not appear to be installed.${NC}"
        echo -e "${YELLOW}Please install Ollama from https://ollama.ai/download${NC}"
    fi
fi

# Start the application
echo -e "${GREEN}===== Starting Ollama Benchmark Tool =====${NC}"
echo -e "${GREEN}Open your browser to http://localhost:7000 when ready${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"

# Use the Python from virtual environment if available
if [ -n "$VENV_DIR" ]; then
    echo -e "${GREEN}Running from virtual environment: $(which python)${NC}"
    if [ -f "$VENV_DIR/bin/uvicorn" ]; then
        "$VENV_DIR/bin/uvicorn" app.main:app --host 0.0.0.0 --port 7000 --reload
    elif [ -f "$VENV_DIR/Scripts/uvicorn" ]; then
        "$VENV_DIR/Scripts/uvicorn" app.main:app --host 0.0.0.0 --port 7000 --reload
    else
        $venv_python -m uvicorn app.main:app --host 0.0.0.0 --port 7000 --reload
    fi
else
    echo -e "${GREEN}Running without virtual environment${NC}"
    uvicorn app.main:app --host 0.0.0.0 --port 7000 --reload
fi
