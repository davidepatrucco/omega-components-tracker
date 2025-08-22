# Minimal Node.js backend Dockerfile
FROM node:20-alpine

# Accept build arguments for environment variables
ARG MONGO_URI
ARG PORT=4000
ARG AZURE_STORAGE_ACCOUNT
ARG AZURE_STORAGE_KEY
ARG AZURE_FILE_SHARE

# Set environment variables
ENV MONGO_URI=${MONGO_URI}
ENV PORT=${PORT}
ENV AZURE_STORAGE_ACCOUNT=${AZURE_STORAGE_ACCOUNT}
ENV AZURE_STORAGE_KEY=${AZURE_STORAGE_KEY}
ENV AZURE_FILE_SHARE=${AZURE_FILE_SHARE}

WORKDIR /app
COPY package*.json ./
RUN npm install --production

# Copy application files
COPY . .

EXPOSE 4000
CMD ["npm", "start"]
