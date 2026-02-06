#!/bin/bash
set -e

echo "=== GoWater Driver - Capacitor Build ==="
echo ""

echo "1. Building web app..."
npm run build

echo ""
echo "2. Syncing with Capacitor..."
npx cap sync

echo ""
echo "=== Build Complete ==="
echo ""
echo "Next steps:"
echo "  Android: npx cap open android   (opens Android Studio)"
echo "  iOS:     npx cap open ios        (opens Xcode)"
echo ""
echo "Or run directly on device:"
echo "  Android: npx cap run android"
echo "  iOS:     npx cap run ios"
