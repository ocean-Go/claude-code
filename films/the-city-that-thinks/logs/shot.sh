#!/bin/sh
# logs/shot.sh "<seconds,comma list>" <name> [w h] : full frames to review/<name>/ and a small sheet review/<name>.jpg, with page errors
export CHROME_PATH=$PWD/logs/chrome.sh
W=${3:-960}; H=${4:-540}
frames=$(python3 -c "import sys; print(','.join(str(round(float(x)*24)) for x in sys.argv[1].split(',')))" "$1")
rm -rf review/$2; node tools/capture.mjs --url film.html --params "w=$W&h=$H" --frames "$frames" --format jpeg --out review/$2 2>&1 | grep -i -E "error|warn|shader|ms|s/frame" | grep -v "software rendering" | head -12
n=$(ls review/$2/*.jpg | wc -l); cols=$([ $n -gt 4 ] && echo 3 || echo 2)
ffmpeg -y -loglevel error -pattern_type glob -i "review/$2/*.jpg" -vf "scale=$((1020/cols)):-2,tile=${cols}x$(( (n+cols-1)/cols ))" -frames:v 1 review/$2.jpg
