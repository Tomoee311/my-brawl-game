"""Generate the game's small, original PCM sound-effects pack using Python stdlib only."""
from math import exp, pi, sin
from pathlib import Path
import random
import struct
import wave

RATE = 44100
OUT = Path(__file__).resolve().parent.parent / "assets" / "sfx"


def env(t, length, attack=0.006, release=0.08):
    return min(1.0, t / max(attack, 1e-5)) * min(1.0, max(0.0, (length - t) / max(release, 1e-5)))


def write(name, samples):
    peak = max(1e-9, max(abs(v) for v in samples))
    scale = 0.88 / peak
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / (name + ".wav")), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v * scale)) * 32767)) for v in samples))


def swipe(name, duration, seed, base_hz, intensity=1.0, metallic=0.0):
    rng = random.Random(seed)
    count = int(RATE * duration)
    lp1 = lp2 = 0.0
    out = []
    phase = 0.0
    for i in range(count):
        t = i / RATE
        p = t / duration
        e = env(t, duration, 0.004, duration * 0.42)
        white = rng.uniform(-1, 1)
        cutoff = base_hz * (1.45 - 0.72 * p)
        a = 1.0 - exp(-2 * pi * min(cutoff, RATE * 0.45) / RATE)
        lp1 += a * (white - lp1)
        high = white - lp1 * 0.75
        lp2 += a * (high - lp2)
        phase += 2 * pi * (base_hz * (1.75 - 0.85 * p)) / RATE
        ring = sin(phase) * metallic * exp(-t * 17)
        out.append((lp2 * 0.82 + ring) * e * intensity)
    write(name, out)


def shot(name, seed, duration=0.22, pitch=150):
    rng = random.Random(seed)
    count = int(RATE * duration)
    out = []
    phase = 0.0
    lp = 0.0
    for i in range(count):
        t = i / RATE
        noise_env = exp(-t * 38) if t < 0.09 else exp(-3.42 - (t - 0.09) * 19)
        cutoff = 5200 - min(t, 0.12) * 36000
        a = 1 - exp(-2 * pi * max(300, cutoff) / RATE)
        n = rng.uniform(-1, 1)
        lp += a * (n - lp)
        phase += 2 * pi * max(38, pitch * exp(-t * 19)) / RATE
        thump = sin(phase) * exp(-t * 28)
        out.append((lp * 0.78 + thump * 0.55) * noise_env)
    write(name, out)


def impact(name, seed, heavy=True):
    rng = random.Random(seed)
    duration = 0.42 if heavy else 0.16
    count = int(RATE * duration)
    out = []
    phase1 = phase2 = 0.0
    lp = 0.0
    for i in range(count):
        t = i / RATE
        strength = exp(-t * (10 if heavy else 22))
        n = rng.uniform(-1, 1)
        a = 1 - exp(-2 * pi * 6200 / RATE)
        lp += a * (n - lp)
        phase1 += 2 * pi * max(35, 92 - t * 120) / RATE
        phase2 += 2 * pi * 1180 / RATE
        body = sin(phase1) * exp(-t * 12) * (0.9 if heavy else 0.28)
        metal = sin(phase2) * exp(-t * 20) * 0.18
        out.append((body + lp * 0.62 + metal) * strength)
    write(name, out)


def thud(name, seed, duration, pitch, body_gain=0.9, noise_hz=900, decay=22, click=0.0):
    """Soft low thump + muffled noise: fist swing / fist hit. click = high crack (blade/bullet hit)."""
    rng = random.Random(seed)
    out = []
    phase = ph2 = lp = 0.0
    for i in range(int(RATE * duration)):
        t = i / RATE
        a = 1 - exp(-2 * pi * noise_hz / RATE)
        lp += a * (rng.uniform(-1, 1) - lp)
        phase += 2 * pi * max(40, pitch * exp(-t * 14)) / RATE
        ph2 += 2 * pi * 2400 / RATE
        body = sin(phase) * exp(-t * decay) * body_gain
        crack = sin(ph2) * exp(-t * 55) * click
        out.append((body + lp * 0.6 * exp(-t * decay * 1.2) + crack) * min(1.0, t / 0.002))
    write(name, out)


def pickup():
    duration = 0.32
    out = [0.0] * int(RATE * duration)
    for start, hz, amp in ((0.0, 660, 0.3), (0.075, 880, 0.25), (0.15, 1320, 0.23)):
        phase = 0.0
        for i in range(int(RATE * (duration - start))):
            t = i / RATE
            phase += 2 * pi * hz / RATE
            out[int(start * RATE) + i] += sin(phase) * exp(-t * 13) * amp
    write("pickup", out)


def main():
    swipe("sword_slash", 0.24, 11, 1900, 1.0, 0.10)
    swipe("sword_heavy", 0.38, 22, 1050, 1.0, 0.28)
    swipe("katana_slash", 0.15, 33, 3100, 0.95, 0.08)
    swipe("spear_thrust", 0.20, 44, 1450, 0.82, 0.03)
    swipe("axe_swing", 0.34, 55, 780, 1.0, 0.32)
    shot("gunshot", 66, 0.24, 175)
    impact("heavy_impact", 77, True)
    impact("light_impact", 88, False)
    impact("land", 144, False)
    pickup()
    swipe("throw", 0.18, 99, 1250, 0.75, 0.0)
    swipe("dodge", 0.13, 111, 2300, 0.62, 0.0)
    swipe("jump", 0.12, 122, 2600, 0.58, 0.0)
    impact("ko", 133, True)
    swipe("fist_light", 0.11, 201, 1500, 0.55, 0.0)
    swipe("fist_heavy", 0.20, 202, 900, 0.8, 0.0)
    thud("fist_hit", 203, 0.14, 190, 0.95, 700, 24)
    thud("blade_hit", 204, 0.12, 240, 0.35, 5200, 30, click=0.4)
    thud("bullet_hit", 205, 0.09, 420, 0.3, 4000, 40, click=0.3)
    print("Generated 19 WAV effects in", OUT)


if __name__ == "__main__":
    main()
