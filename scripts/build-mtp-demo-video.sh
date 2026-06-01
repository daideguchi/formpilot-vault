#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INPUT_VIDEO="$ROOT_DIR/assets/autoplay-demo-en.mp4"
NARRATION_TEXT="$ROOT_DIR/submission/mind-the-product-demo-narration.txt"
WORK_DIR="$ROOT_DIR/tmp/demo-video"
AIFF_AUDIO="$WORK_DIR/narration.aiff"
M4A_AUDIO="$WORK_DIR/narration.m4a"
OUTPUT_VIDEO="$ROOT_DIR/assets/mind-the-product-demo-en.mp4"
SITE_OUTPUT="$ROOT_DIR/site/assets/mind-the-product-demo-en.mp4"

mkdir -p "$WORK_DIR"

if [[ ! -f "$INPUT_VIDEO" ]]; then
  echo "missing input video: $INPUT_VIDEO" >&2
  exit 1
fi

if [[ ! -f "$NARRATION_TEXT" ]]; then
  echo "missing narration text: $NARRATION_TEXT" >&2
  exit 1
fi

say -v Samantha -r 164 -f "$NARRATION_TEXT" -o "$AIFF_AUDIO"
ffmpeg -hide_banner -loglevel error -y -i "$AIFF_AUDIO" -c:a aac -b:a 128k "$M4A_AUDIO"

ffmpeg -hide_banner -loglevel error -y \
  -i "$INPUT_VIDEO" \
  -i "$M4A_AUDIO" \
  -filter_complex "[1:a]apad=pad_dur=30[a]" \
  -map 0:v:0 -map "[a]" \
  -c:v copy -c:a aac -b:a 128k \
  -shortest \
  -movflags +faststart \
  "$OUTPUT_VIDEO"

cp "$OUTPUT_VIDEO" "$SITE_OUTPUT"

ffprobe -v error -show_entries format=duration,size -of json "$OUTPUT_VIDEO"
