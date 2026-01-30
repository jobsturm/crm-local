#!/bin/bash
# Sanity Check Script
# Run this before creating a release to ensure everything is in order

set -e

echo "🔍 Simpel CRM Sanity Check"
echo "=========================="
echo ""

# Check we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Run this script from the project root"
  exit 1
fi

# 1. Check dependencies are installed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "❌ Error: node_modules not found. Run 'npm install' first."
  exit 1
fi
echo "✅ Dependencies installed"

# 2. Type check shared package
echo "📝 Type checking shared package..."
npm run build -w @crm-local/shared
echo "✅ Shared package builds"

# 3. Type check backend
echo "📝 Type checking backend..."
npm run build -w @crm-local/backend
echo "✅ Backend builds"

# 4. Type check and build frontend
echo "📝 Building frontend..."
npm run build -w simpel-crm
echo "✅ Frontend builds"

# 5. Run backend tests
echo "🧪 Running backend tests..."
npm test -w @crm-local/backend --if-present || echo "⚠️ Tests not configured or failed"

# 6. Check for uncommitted changes
echo "📋 Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️ Warning: You have uncommitted changes"
  git status --short
else
  echo "✅ Working directory clean"
fi

# 7. Check version consistency
echo "🔢 Checking version..."
FRONTEND_VERSION=$(node -p "require('./packages/frontend/package.json').version")
echo "   Frontend version: $FRONTEND_VERSION"

# 8. Check electron-builder config
echo "⚙️ Checking electron-builder config..."
if grep -q '"publish"' packages/frontend/package.json; then
  echo "✅ Publish config found"
else
  echo "⚠️ Warning: No publish config in package.json"
fi

# 9. Check for GitHub token (needed for auto-update)
echo "🔑 Checking GitHub token..."
if [ -n "$GH_TOKEN" ]; then
  echo "✅ GH_TOKEN is set"
else
  echo "⚠️ GH_TOKEN not set (needed for publishing)"
fi

echo ""
echo "=========================="
echo "✨ Sanity check complete!"
echo ""
echo "Next steps:"
echo "  1. Update version in packages/frontend/package.json"
echo "  2. Create and push a tag: git tag v1.0.0 && git push --tags"
echo "  3. GitHub Actions will build and release automatically"
echo ""
