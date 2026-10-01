#!/usr/bin/env bash
# Assembla frames/frame-*.png (3840×2160, catturati a deviceScaleFactor 2)
# in sevenda-promo.mp4 1920×1080 h264/yuv420p.
# Uso: ./encode.sh [fps] [frames_dir] [output.mp4] [WxH]
#      ./encode.sh 30 frames-vertical sevenda-promo-vertical.mp4 1080x1920   (variante 9:16)
#      FFMPEG=/percorso/ffmpeg per usare un binario specifico
set -euo pipefail
cd "$(dirname "$0")"
FPS="${1:-30}"
FRAMES="${2:-frames}"
OUT="${3:-sevenda-promo.mp4}"
SIZE="${4:-1920x1080}"
FFMPEG="${FFMPEG:-ffmpeg}"

"$FFMPEG" -y -hide_banner \
  -framerate "$FPS" -i "$FRAMES/frame-%05d.png" \
  -vf "scale=${SIZE/x/:}:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p \
  -movflags +faststart \
  "$OUT"

"$FFMPEG" -hide_banner -i "$OUT" 2>&1 | grep -E "Duration|Stream #0:0" || true
