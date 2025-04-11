FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js for frontend build
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Return to app directory
WORKDIR /app

# Expose port
EXPOSE 7000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7000"]
