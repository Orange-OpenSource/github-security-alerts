#!/bin/bash

# Automatic release script
# Usage: ./release.sh 1.2.3

echo "🔄 Pulling latest changes..."
if ! git pull; then
    echo "❌ Error: git pull failed"
    exit 1
fi

if [ $# -eq 0 ]; then
    echo "❌ Usage: $0 <version>"
    echo "   Example: $0 1.2.3"
    exit 1
fi

NEW_VERSION="$1"

# Automatically detect the current version from package.json
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')

echo "🚀 Automatic release: $CURRENT_VERSION → $NEW_VERSION"

# Verify that we are in the correct directory
if [ ! -f "package.json" ] || [ ! -f "src-tauri/Cargo.toml" ]; then
    echo "❌ Error: Run the script from the project root"
    exit 1
fi

echo "📝 Updating versions in all files..."

# 1. package.json
sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/g" package.json

# 2. src-tauri/Cargo.toml
sed -i "s/version = \"$CURRENT_VERSION\"/version = \"$NEW_VERSION\"/g" src-tauri/Cargo.toml

# 3. src-tauri/tauri.conf.json
if [ -f "src-tauri/tauri.conf.json" ]; then
    sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/g" src-tauri/tauri.conf.json
fi

# 5. Footer component
sed -i "s/>v$CURRENT_VERSION</>v$NEW_VERSION</g" src/app/shared/components/footer/footer.component.html

# 7. Update Cargo.lock
echo "🔧 Updating Cargo.lock..."
cd src-tauri
cargo update
cd ..

echo "✅ All versions have been updated"

# Verify changes
echo "📋 Modified files:"
git diff --name-only

echo "🤔 Do you want to proceed with the commit and tag? (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    # Commit
    echo "💾 Committing changes..."
    git add .
    git commit -m "chore: bump version to $NEW_VERSION"
    
    # Tag
    echo "🏷️ Creating tag v$NEW_VERSION..."
    git tag "v$NEW_VERSION"
    
    echo "🎉 Release $NEW_VERSION is ready!"
    echo ""
    echo "📤 To publish:"
    echo "   git push origin main --tags"
    echo ""
    echo "🤖 GitHub Actions will automatically:"
    echo "   • Build the app"
    echo "   • Create the release"
    echo "   • Generate OTA updates"
else
    echo "❌ Canceled. You can undo changes with: git checkout ."
fi