# Minimal Node.js backend Dockerfile
FROM node:20-alpine

# Accept build arguments for environment variables
ARG MONGO_URI
ARG PORT=4000
ARG AZURE_STORAGE_ACCOUNT
ARG AZURE_STORAGE_KEY
ARG AZURE_FILE_SHARE
ARG FRONTEND_ORIGIN

# Set environment variables
ENV MONGO_URI=${MONGO_URI}
ENV PORT=${PORT}
ENV AZURE_STORAGE_ACCOUNT=${AZURE_STORAGE_ACCOUNT}
ENV AZURE_STORAGE_KEY=${AZURE_STORAGE_KEY}
ENV AZURE_FILE_SHARE=${AZURE_FILE_SHARE}
ENV FRONTEND_ORIGIN=${FRONTEND_ORIGIN}

WORKDIR /app

# Copy package files from backend directory
COPY backend/package*.json ./
RUN npm install --production

# Copy backend application files
COPY backend/ ./

# Make shared directory available at the expected path
COPY shared/ ../shared/

EXPOSE 4000
CMD ["npm", "start"]
