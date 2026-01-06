# Use lightweight Node.js image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better layer caching)
COPY /package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy application source
COPY /src ./src

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose application port
EXPOSE 3000

# Use non-root user for security (important in Kubernetes)
USER node

# Start the application
CMD ["node", "src/index.js"]
