@echo off
setlocal enabledelayedexpansion

echo 🚀 HyperLocal Setup Script
echo ==========================
echo.

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

echo ✓ Docker found
echo.

REM Create env files
echo 📝 Creating environment files...

if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo ✓ Created backend\.env
) else (
    echo ⚠ backend\.env already exists
)

if not exist frontend\.env.local (
    copy frontend\.env.example frontend\.env.local
    echo ✓ Created frontend\.env.local
) else (
    echo ⚠ frontend\.env.local already exists
)

REM Build and start services
echo.
echo 🐳 Building Docker images...
docker-compose build

echo.
echo ▶ Starting services...
docker-compose up -d

REM Wait for services
echo.
echo ⏳ Waiting for services to be healthy...
timeout /t 10 /nobreak

REM Run migrations
echo.
echo 🗄️  Running database migrations...
docker-compose exec -T backend npm run prisma:migrate

echo.
echo ✅ Setup complete!
echo.
echo 📍 Access points:
echo   - Frontend: http://localhost:3000
echo   - Backend API: http://localhost:3001
echo   - Nginx Proxy: http://localhost
echo   - PostgreSQL: localhost:5432
echo   - Redis: localhost:6379
echo.
echo 📚 Next steps:
echo   1. Register a new account at http://localhost:3000
echo   2. Zoom into the map and click a hexagon
echo   3. Start posting in your region!
echo.
echo 🛑 To stop services: docker-compose down
echo 📋 To view logs: docker-compose logs -f
echo.
