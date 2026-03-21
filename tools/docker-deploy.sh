#!/bin/bash
# Docker deployment tool for remote_docs
# Combines: npm run build + docker-compose build + docker-compose up -d

set -e

echo "🚀 Starting Docker deployment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build TypeScript
echo -e "${YELLOW}Step 1/3: Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✓ TypeScript build complete${NC}"
echo ""

# Step 2: Build Docker images
echo -e "${YELLOW}Step 2/3: Building Docker images...${NC}"
docker-compose build
echo -e "${GREEN}✓ Docker build complete${NC}"
echo ""

# Step 3: Start services
echo -e "${YELLOW}Step 3/3: Starting services...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

echo "==================================="
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo "==================================="
echo ""
echo "Services:"
echo "  - API:        http://localhost:${PORT:-3000}"
echo "  - Health:     http://localhost:${PORT:-3000}/api/v1/pdf/health"
echo "  - Web UI:     http://localhost:${PORT:-3000}/api/v1/pdf/ui"
echo ""
echo "Commands:"
echo "  - View logs:  docker-compose logs -f"
echo "  - Stop:       docker-compose down"
echo "  - Restart:    docker-compose restart"
echo ""
