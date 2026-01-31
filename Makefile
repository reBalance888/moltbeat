.PHONY: help install build dev clean docker-build docker-up docker-down docker-logs prisma-generate prisma-migrate

# Default target
help:
	@echo "MoltBeat - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make install          - Install all dependencies"
	@echo "  make build            - Build all packages"
	@echo "  make dev              - Run in development mode"
	@echo "  make clean            - Clean all build artifacts"
	@echo ""
	@echo "Database:"
	@echo "  make prisma-generate  - Generate Prisma client"
	@echo "  make prisma-migrate   - Run database migrations"
	@echo "  make prisma-studio    - Open Prisma Studio"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build     - Build Docker images"
	@echo "  make docker-up        - Start all services"
	@echo "  make docker-down      - Stop all services"
	@echo "  make docker-logs      - View logs"
	@echo "  make docker-restart   - Restart all services"
	@echo ""
	@echo "Testing:"
	@echo "  make test             - Run all tests"
	@echo "  make lint             - Run linter"

# Development
install:
	pnpm install

build:
	pnpm -r build

dev:
	pnpm -r dev

clean:
	pnpm -r clean
	rm -rf node_modules
	find . -name "node_modules" -type d -exec rm -rf {} +
	find . -name "dist" -type d -exec rm -rf {} +

# Database
prisma-generate:
	cd packages/database && pnpm prisma:generate

prisma-migrate:
	cd packages/database && pnpm prisma:migrate

prisma-studio:
	cd packages/database && pnpm prisma:studio

# Docker
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-restart:
	docker-compose restart

# Testing
test:
	pnpm -r test

lint:
	pnpm -r lint
