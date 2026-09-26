#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/carescribe-replay.XXXXXX")"
trap 'rm -rf "$BUILD_DIR"' EXIT

DECK_IMAGE="$PROJECT_DIR/validation/screenshots/final-judge-deck.png"
ROOM_IMAGE="$PROJECT_DIR/validation/screenshots/final-room-actors.png"
HANDOFF_IMAGE="$PROJECT_DIR/validation/screenshots/final-caregiver-provider-handoff.png"
CAPTIONS="$PROJECT_DIR/web/assets/replay-captions.vtt"
OUTPUT="$PROJECT_DIR/output/video/carescribe-three-actor-demo.mp4"
WEB_OUTPUT="$PROJECT_DIR/web/assets/carescribe-three-actor-demo.mp4"

for REQUIRED_FILE in "$DECK_IMAGE" "$ROOM_IMAGE" "$HANDOFF_IMAGE" "$CAPTIONS"; do
  test -f "$REQUIRED_FILE" || { echo "Missing replay input: $REQUIRED_FILE" >&2; exit 1; }
done

if [[ -n "${CARESCRIBE_REPLAY_AUDIO_FILE:-}" ]]; then
  ffmpeg -y -v error -i "$CARESCRIBE_REPLAY_AUDIO_FILE" \
    -af "apad=whole_dur=60,atrim=duration=60" -ar 48000 -ac 2 "$BUILD_DIR/mix.wav"
  AUDIO_SOURCE="consented-team-recording"
else
  command -v say >/dev/null
  say -v Samantha -r 180 -o "$BUILD_DIR/julie-1.aiff" \
    "We started Leo's evaluation today, but we did not complete it. I am already due in my next visit."
  say -v Karen -r 180 -o "$BUILD_DIR/maya-1.aiff" \
    "I know we need to come back, but I am not sure what today means or what I should do before then."
  say -v Daniel -r 180 -o "$BUILD_DIR/narrator-1.aiff" \
    "CareScribe organizes four plain-language anchors. Today. Next. Who. When."
  say -v Samantha -r 180 -o "$BUILD_DIR/julie-2.aiff" \
    "The second visit continues the evaluation. We are not naming a diagnosis."
  say -v Karen -r 180 -o "$BUILD_DIR/maya-2.aiff" \
    "I will notice how Leo asks for help, more, or stop, with words, gestures, or actions."
  say -v Daniel -r 180 -o "$BUILD_DIR/narrator-2.aiff" \
    "A shared, clinician-reviewed plan preserves evidence, uncertainty, responsibilities, and timing."

  ffmpeg -y -v error \
    -i "$BUILD_DIR/julie-1.aiff" -i "$BUILD_DIR/maya-1.aiff" \
    -i "$BUILD_DIR/narrator-1.aiff" -i "$BUILD_DIR/julie-2.aiff" \
    -i "$BUILD_DIR/maya-2.aiff" -i "$BUILD_DIR/narrator-2.aiff" \
    -filter_complex \
    "[0:a]aformat=channel_layouts=stereo,adelay=0|0[a0];\
[1:a]aformat=channel_layouts=stereo,adelay=10000|10000[a1];\
[2:a]aformat=channel_layouts=stereo,adelay=20000|20000[a2];\
[3:a]aformat=channel_layouts=stereo,adelay=30000|30000[a3];\
[4:a]aformat=channel_layouts=stereo,adelay=40000|40000[a4];\
[5:a]aformat=channel_layouts=stereo,adelay=50000|50000[a5];\
[a0][a1][a2][a3][a4][a5]amix=inputs=6:duration=longest:normalize=0,\
apad=whole_dur=60,atrim=duration=60[a]" \
    -map "[a]" -ar 48000 "$BUILD_DIR/mix.wav"
  AUDIO_SOURCE="macos-say:Samantha,Karen,Daniel"
fi

mkdir -p "$(dirname "$OUTPUT")" "$(dirname "$WEB_OUTPUT")"
ffmpeg -y -v error \
  -loop 1 -t 10 -i "$DECK_IMAGE" \
  -loop 1 -t 20 -i "$ROOM_IMAGE" \
  -loop 1 -t 30 -i "$HANDOFF_IMAGE" \
  -i "$BUILD_DIR/mix.wav" -i "$CAPTIONS" \
  -filter_complex \
  "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,\
pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xf4f1e8,setsar=1[v0];\
[1:v]scale=1920:1080:force_original_aspect_ratio=decrease,\
pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xf4f1e8,setsar=1[v1];\
[2:v]scale=1920:1080:force_original_aspect_ratio=decrease,\
pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xf4f1e8,setsar=1[v2];\
[v0][v1][v2]concat=n=3:v=1:a=0[v]" \
  -map "[v]" -map 3:a:0 -map 4:0 \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 128k -c:s mov_text -metadata:s:s:0 language=eng \
  -t 60 -movflags +faststart "$OUTPUT"

cp "$OUTPUT" "$WEB_OUTPUT"
echo "Built $OUTPUT"
echo "Audio source: $AUDIO_SOURCE"
