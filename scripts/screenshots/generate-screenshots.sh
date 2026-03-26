#!/bin/bash
# ============================================================
# DungeonMind — App Store Screenshot Generator
# ============================================================
# Generates App Store screenshots at two required sizes:
#   - 6.7" (iPhone 16 Pro Max) — 1290×2796
#   - 5.5" (iPhone 8 Plus)     — 1242×2208 (scaled from 6.7")
#
# Prerequisites:
#   - Xcode + Simulator installed
#   - Maestro CLI installed (~/.maestro/bin/maestro)
#   - Expo CLI + project dependencies installed
#
# Usage:
#   ./scripts/screenshots/generate-screenshots.sh
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$PROJECT_DIR/screenshots"
OUTPUT_67="$OUTPUT_DIR/6.7-inch"
OUTPUT_55="$OUTPUT_DIR/5.5-inch"
MAESTRO_BIN="${HOME}/.maestro/bin/maestro"

# Device configuration
DEVICE_67_NAME="iPhone 16 Pro Max"
DEVICE_67_UDID=""

# Target resolutions
RES_67_W=1290
RES_67_H=2796
RES_55_W=1242
RES_55_H=2208

echo "========================================"
echo "DungeonMind Screenshot Generator"
echo "========================================"

# Step 0: Verify tools
echo ""
echo "[1/6] Verifying tools..."

if ! command -v xcrun &>/dev/null; then
  echo "ERROR: xcrun not found. Install Xcode Command Line Tools."
  exit 1
fi

if [ ! -f "$MAESTRO_BIN" ]; then
  echo "ERROR: Maestro not found at $MAESTRO_BIN"
  echo "Install: curl -Ls 'https://get.maestro.mobile.dev' | bash"
  exit 1
fi

echo "  xcrun: $(which xcrun)"
echo "  maestro: $MAESTRO_BIN"

# Step 1: Find or create simulator
echo ""
echo "[2/6] Setting up simulator..."

DEVICE_67_UDID=$(xcrun simctl list devices available -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    for d in devices:
        if d['name'] == '$DEVICE_67_NAME' and d['state'] == 'Shutdown':
            print(d['udid'])
            sys.exit(0)
        if d['name'] == '$DEVICE_67_NAME':
            print(d['udid'])
            sys.exit(0)
" 2>/dev/null || true)

if [ -z "$DEVICE_67_UDID" ]; then
  echo "  Creating $DEVICE_67_NAME simulator..."
  DEVICE_67_UDID=$(xcrun simctl create "$DEVICE_67_NAME" \
    "com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro-Max" \
    "com.apple.CoreSimulator.SimRuntime.iOS-18-6" 2>/dev/null || true)
fi

if [ -z "$DEVICE_67_UDID" ]; then
  echo "ERROR: Could not find or create $DEVICE_67_NAME simulator."
  echo "Available devices:"
  xcrun simctl list devices available | grep -i "iphone"
  exit 1
fi

echo "  Using: $DEVICE_67_NAME ($DEVICE_67_UDID)"

# Step 2: Boot simulator
echo ""
echo "[3/6] Booting simulator..."

SIM_STATE=$(xcrun simctl list devices -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    for d in devices:
        if d['udid'] == '$DEVICE_67_UDID':
            print(d['state'])
            sys.exit(0)
" 2>/dev/null)

if [ "$SIM_STATE" != "Booted" ]; then
  xcrun simctl boot "$DEVICE_67_UDID" 2>/dev/null || true
  echo "  Waiting for simulator to boot..."
  sleep 5
fi

# Set clean status bar
xcrun simctl status_bar "$DEVICE_67_UDID" override \
  --time "9:41" \
  --batteryState charged \
  --batteryLevel 100 \
  --cellularMode active \
  --cellularBars 4 \
  --wifiBars 3 \
  --dataNetwork wifi 2>/dev/null || true

echo "  Simulator booted with clean status bar."

# Step 3: Create output directories
echo ""
echo "[4/6] Preparing output directories..."

mkdir -p "$OUTPUT_67" "$OUTPUT_55"
echo "  6.7\" output: $OUTPUT_67"
echo "  5.5\" output: $OUTPUT_55"

# Step 4: Take screenshots using xcrun simctl
echo ""
echo "[5/6] Capturing screenshots..."
echo "  NOTE: The app must be running with seeded demo data."
echo "  If the app is not running, start it first with:"
echo "    npx expo start --ios --device $DEVICE_67_UDID"
echo ""

# Define screenshot names
SCREENSHOTS=(
  "01-campaign-hub"
  "02-character-creation"
  "03-session-play"
  "04-character-sheet"
  "05-dice-roll"
  "06-scene-illustration"
)

# If Maestro flows exist, run them
MAESTRO_FLOW="$SCRIPT_DIR/maestro/screenshots.yaml"
if [ -f "$MAESTRO_FLOW" ]; then
  echo "  Running Maestro flow for automated capture..."
  cd "$PROJECT_DIR"
  MAESTRO_OUTPUT="$OUTPUT_67"
  "$MAESTRO_BIN" test "$MAESTRO_FLOW" \
    --device "$DEVICE_67_UDID" \
    --output "$MAESTRO_OUTPUT" \
    2>&1 || echo "  WARNING: Maestro flow had issues. Falling back to manual capture."
fi

# Manual capture fallback — take a screenshot of whatever is currently on screen
echo ""
echo "  Taking manual screenshots of current screen state..."
for name in "${SCREENSHOTS[@]}"; do
  TARGET="$OUTPUT_67/$name.png"
  if [ ! -f "$TARGET" ]; then
    echo "  Capture $name manually: Position the app on the desired screen, then run:"
    echo "    xcrun simctl io $DEVICE_67_UDID screenshot '$TARGET'"
  else
    echo "  $name.png — already captured"
  fi
done

# Step 5: Generate 5.5" versions by resizing
echo ""
echo "[6/6] Generating 5.5\" screenshots from 6.7\" originals..."

for file in "$OUTPUT_67"/*.png; do
  [ -f "$file" ] || continue
  filename=$(basename "$file")
  target="$OUTPUT_55/$filename"
  sips -z $RES_55_H $RES_55_W "$file" --out "$target" >/dev/null 2>&1
  echo "  $filename → 5.5\" ($RES_55_W×$RES_55_H)"
done

echo ""
echo "========================================"
echo "Screenshot generation complete!"
echo "========================================"
echo ""
echo "6.7\" screenshots: $OUTPUT_67"
echo "5.5\" screenshots: $OUTPUT_55"
echo ""

# Count generated files
COUNT_67=$(find "$OUTPUT_67" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
COUNT_55=$(find "$OUTPUT_55" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
echo "Generated: ${COUNT_67} × 6.7\" + ${COUNT_55} × 5.5\" = $((COUNT_67 + COUNT_55)) total screenshots"

if [ "$COUNT_67" -lt 6 ]; then
  echo ""
  echo "WARNING: Only $COUNT_67/6 screenshots captured."
  echo "Some screens may need manual capture. See instructions above."
fi
