#!/bin/bash

set -euo pipefail

if [ "$#" -ne 1 ] || [[ ! "$1" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
    echo "Usage: $0 <version> (for example: 1.2.3)" >&2
    exit 1
fi

if [ ! -f "package.json" ] || [ ! -f "scripts/release-version.cjs" ]; then
    echo "Error: Run the script from the project root" >&2
    exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
    echo "Error: The working tree must be clean before creating a release" >&2
    exit 1
fi

NEW_VERSION="$1"

echo "Pulling latest changes..."
git pull --ff-only

if git rev-parse --verify --quiet "refs/tags/v$NEW_VERSION" >/dev/null; then
    echo "Error: Tag v$NEW_VERSION already exists" >&2
    exit 1
fi

echo "Checking and updating release versions..."
node scripts/release-version.cjs update "$NEW_VERSION"
node scripts/release-version.cjs check "$NEW_VERSION"

echo "Modified files:"
git diff --name-only

echo "Do you want to proceed with the commit and tag? (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock \
        src-tauri/tauri.conf.json src/app/shared/components/footer/footer.component.html
    git commit -m "chore: bump version to $NEW_VERSION"
    git tag "v$NEW_VERSION"

    echo "Release $NEW_VERSION is ready."
    echo "To publish: git push origin main --tags"
else
    echo "Canceled. Version changes remain in the working tree."
fi
