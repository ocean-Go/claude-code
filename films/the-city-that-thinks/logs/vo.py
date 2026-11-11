import sys, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("logs/venv-dl/kokoro.onnx", "logs/venv-dl/voices.bin")
lines = {"VO1": "The future is not waiting.", "VO2": "Intelligence needs power.", "VO3": "Power needs a new vision.", "VO4": "Everything is connected."}
voice = sys.argv[1]; out = sys.argv[2]
for i, t in lines.items():
    s, sr = k.create(t, voice=voice, speed=0.88, lang="en-us")
    sf.write(f"{out}/{i}.wav", s, sr, subtype="PCM_24")
    print(i, round(len(s)/sr, 2), sr)
