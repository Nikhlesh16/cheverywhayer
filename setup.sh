#!/bin/bash

echo "🚀 HyperLocal Setup Script"
echo "=========================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✓ Docker found"

# Create env files
echo ""
echo "📝 Creating environment files..."

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✓ Created backend/.env"
else
    echo "⚠ backend/.env already exists"
fi

if [ ! -f frontend/.env.local ]; then
    cp frontend/.env.example frontend/.env.local
    echo "✓ Created frontend/.env.local"
else
    echo "⚠ frontend/.env.local already exists"
fi

# Build and start services
echo ""
echo "🐳 Building Docker images..."
docker-compose build

echo ""
echo "▶ Starting services..."
docker-compose up -d

# Wait for services
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Run migrations
echo ""
echo "🗄️  Running database migrations..."
docker-compose exec -T backend npm run prisma:migrate

echo ""
echo "✅ Setup complete!"
echo ""
echo "📍 Access points:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:3001"
echo "  - Nginx Proxy: http://localhost"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "📚 Next steps:"
echo "  1. Register a new account at http://localhost:3000"
echo "  2. Zoom into the map and click a hexagon"
echo "  3. Start posting in your region!"
echo ""
echo "🛑 To stop services: docker-compose down"
echo "📋 To view logs: docker-compose logs -f"
