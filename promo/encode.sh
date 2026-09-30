#!/usr/bin/env bash
# Assembla frames/frame-*.png (3840×2160, catturati a deviceScaleFactor 2)
# in sevenda-promo.mp4 1920×1080 h264/yuv420p.
# Uso: ./encode.sh [fps]   (FFMPEG=/percorso/ffmpeg per usare un binario specifico)
set -euo pipefail
cd "$(dirname "$0")"
FPS="${1:-30}"
FFMPEG="${FFMPEG:-ffmpeg}"

"$FFMPEG" -y -hide_banner \
  -framerate "$FPS" -i frames/frame-%05d.png \
  -vf "scale=1920:1080:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p \
  -movflags +faststart \
  sevenda-promo.mp4

"$FFMPEG" -hide_banner -i sevenda-promo.mp4 2>&1 | grep -E "Duration|Stream #0:0" || true
