# Minimal Node.js backend Dockerfile
FROM node:20-alpine

# Accept build arguments for environment variables
ARG MONGO_URI
ARG PORT=4000
ARG JWT_SECRET
ARG JWT_REFRESH_SECRET

# Set environment variables
ENV MONGO_URI=${MONGO_URI}
ENV PORT=${PORT}
ENV JWT_SECRET=${JWT_SECRET}
ENV JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

WORKDIR /app
COPY package*.json ./
RUN npm install --production

# Copy application files
COPY . .

EXPOSE 4000
CMD ["npm", "start"]
