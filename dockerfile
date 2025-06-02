# Use official Node.js image as base
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 8000

# Command to run the application
CMD ["node", "dist/server.js"]