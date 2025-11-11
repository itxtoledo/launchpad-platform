# Multi-stage Dockerfile for Vite app with nginx
FROM node:22-alpine AS builder

# Install build essentials for both frontend and contracts
RUN apk add --no-cache python3 make g++ py3-pip bash curl git

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy root package files and workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json files for all workspace packages
COPY apps/app/package.json apps/app/
COPY packages/contracts/package.json packages/contracts/

# Install dependencies for root and workspace
RUN pnpm install --frozen-lockfile

# Copy all files, excluding node_modules
COPY . .

# Build contracts to generate ABI (only compile, not full build to avoid esbuild conflicts)
RUN cd packages/contracts && npx hardhat compile

# Build the frontend app (after contracts are built to ensure ABI is available)
RUN cd apps/app && pnpm build

# Production stage
FROM nginx:alpine AS production

# Copy built assets from builder stage
COPY --from=builder /app/apps/app/dist /usr/share/nginx/html

# Copy custom nginx configuration (optional)
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]