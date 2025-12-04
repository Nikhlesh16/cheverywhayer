.PHONY: help setup build up down logs clean migrate test lint

help:
	@echo "HyperLocal Development Commands"
	@echo "================================"
	@echo "make setup       - Initial setup (builds and starts services)"
	@echo "make build       - Build Docker images"
	@echo "make up          - Start services"
	@echo "make down        - Stop services"
	@echo "make restart     - Restart services"
	@echo "make logs        - View all service logs"
	@echo "make clean       - Remove containers and volumes"
	@echo "make migrate     - Run database migrations"
	@echo "make migrate-new - Create a new migration"
	@echo "make studio      - Open Prisma Studio"
	@echo "make lint        - Run linters"
	@echo "make test        - Run tests"
	@echo "make shell-be    - Backend shell"
	@echo "make shell-fe    - Frontend shell"
	@echo "make shell-db    - Database shell"

setup:
	@echo "🚀 Setting up HyperLocal..."
	cp backend/.env.example backend/.env 2>/dev/null || true
	cp frontend/.env.example frontend/.env.local 2>/dev/null || true
	make build
	make up
	sleep 10
	make migrate
	@echo "✅ Setup complete!"

build:
	@echo "🐳 Building Docker images..."
	docker-compose build

up:
	@echo "▶ Starting services..."
	docker-compose up -d

down:
	@echo "🛑 Stopping services..."
	docker-compose down

restart:
	@echo "🔄 Restarting services..."
	docker-compose restart

logs:
	@docker-compose logs -f

logs-backend:
	@docker-compose logs -f backend

logs-frontend:
	@docker-compose logs -f frontend

logs-db:
	@docker-compose logs -f postgres

clean:
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	find . -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .next -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name dist -exec rm -rf {} + 2>/dev/null || true

migrate:
	@echo "🗄️  Running migrations..."
	docker-compose exec -T backend npm run prisma:migrate

migrate-new:
	@echo "📝 Creating new migration..."
	docker-compose exec -T backend npm run prisma:migrate

studio:
	@echo "🎨 Opening Prisma Studio..."
	docker-compose exec -T backend npm run prisma:studio

prisma-generate:
	@echo "🔧 Generating Prisma client..."
	docker-compose exec -T backend npm run prisma:generate

lint:
	@echo "🔍 Running linters..."
	docker-compose exec -T backend npm run lint
	docker-compose exec -T frontend npm run lint

test:
	@echo "🧪 Running tests..."
	docker-compose exec -T backend npm run test
	docker-compose exec -T frontend npm run test

test-coverage:
	@echo "📊 Running tests with coverage..."
	docker-compose exec -T backend npm run test:cov
	docker-compose exec -T frontend npm run test:cov

shell-backend:
	@docker-compose exec backend sh

shell-frontend:
	@docker-compose exec frontend sh

shell-db:
	@docker-compose exec postgres psql -U postgres -d hyperlocal_db

shell-redis:
	@docker-compose exec redis redis-cli

ps:
	@docker-compose ps

db-reset:
	@echo "⚠️  Resetting database..."
	docker-compose down -v
	make up
	sleep 5
	make migrate
	@echo "✅ Database reset complete!"

install-backend:
	@echo "📦 Installing backend dependencies..."
	docker-compose exec -T backend npm install

install-frontend:
	@echo "📦 Installing frontend dependencies..."
	docker-compose exec -T frontend npm install

update-backend:
	@echo "🔄 Updating backend dependencies..."
	docker-compose exec -T backend npm update

update-frontend:
	@echo "🔄 Updating frontend dependencies..."
	docker-compose exec -T frontend npm update

health:
	@echo "🏥 Checking service health..."
	@docker-compose ps
	@docker-compose exec -T postgres pg_isready -U postgres || true
	@docker-compose exec -T redis redis-cli ping || true
