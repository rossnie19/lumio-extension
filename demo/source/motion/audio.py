"""Original chiptune soundtrack + minimal sound effects for the Lumio motion video (no voice).
Everything is synthesized here, so there's nothing to license. Effect times follow the GSAP timeline
in motion.html (keep the T* values below in sync with it).

Usage: python audio.py <out.wav>
"""
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
DURATION = 57.5
rng = np.random.default_rng(7)

# --- timeline (mirrors motion.html) ---------------------------------------------------------
T2, T3 = 5.1, 10.6
T4 = T3 + 12.3
T5 = T4 + 13.6
T6 = T5 + 11.1
T7 = T6 + 4.9
WIPES = [4.4, T2 + 4.8, T3 + 11.6, T4 + 12.9, T5 + 10.4, T6 + 4.2]
MOOD_TIMES = [T3 + 4.9, T3 + 6.6, T3 + 8.3, T3 + 10.0]


# --- building blocks ---------------------------------------------------------------------------
def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env(dur, attack=0.005, decay=0.2, sustain=0.0, release=0.03):
    """attack -> exponential decay toward sustain -> short release at the end"""
    t = t_axis(dur)
    e = np.minimum(t / max(attack, 1e-4), 1.0)
    e *= sustain + (1 - sustain) * np.exp(-np.maximum(t - attack, 0) / max(decay, 1e-4))
    rel = int(release * SR)
    if rel and len(e) > rel:
        e[-rel:] *= np.linspace(1, 0, rel)
    return e


def osc(freq, dur, wave="square", duty=0.5, vibrato=0.0):
    t = t_axis(dur)
    f = freq * (1 + vibrato * np.sin(2 * np.pi * 5.5 * t)) if vibrato else freq
    phase = np.cumsum(np.full_like(t, 1.0) * f) / SR if vibrato else freq * t
    ph = phase % 1.0
    if wave == "square":
        return np.where(ph < duty, 1.0, -1.0)
    if wave == "triangle":
        return 4 * np.abs(ph - 0.5) - 1
    return np.sin(2 * np.pi * ph)


def sweep(f0, f1, dur, wave="sine"):
    """pitch glide f0 -> f1 (exponential)"""
    t = t_axis(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    ph = np.cumsum(f) / SR
    return np.sin(2 * np.pi * ph) if wave == "sine" else np.where(ph % 1 < 0.5, 1.0, -1.0)


def noise(dur):
    return rng.uniform(-1, 1, int(dur * SR))


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lowpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, btype="low", fs=SR, output="sos"), x)


def highpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, btype="high", fs=SR, output="sos"), x)


def mix(*parts):
    """add sounds of different lengths (padded to the longest)"""
    out = np.zeros(max(len(p) for p in parts))
    for p in parts:
        out[:len(p)] += p
    return out


class Track:
    def __init__(self):
        self.l = np.zeros(int(DURATION * SR) + SR)
        self.r = np.zeros_like(self.l)

    def add(self, at, sound, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= len(self.l):
            return
        s = sound[: len(self.l) - i] * gain
        self.l[i:i + len(s)] += s * np.sqrt((1 - pan) / 2)
        self.r[i:i + len(s)] += s * np.sqrt((1 + pan) / 2)


# --- music ---------------------------------------------------------------------------------------
BPM = 112
BEAT = 60 / BPM
SIX = BEAT / 4
BAR = BEAT * 4
CHORDS = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]]   # Am  F  C  G
ROOTS = [45, 41, 48, 43]
# lead phrase over one 4-bar loop: (bar, start 16th, length in 16ths, midi note)
LEAD = [(0, 0, 4, 76), (0, 4, 2, 74), (0, 6, 2, 72), (0, 8, 4, 69), (0, 12, 4, 72),
        (1, 0, 4, 69), (1, 4, 4, 72), (1, 8, 4, 74), (1, 12, 4, 72),
        (2, 0, 6, 76), (2, 6, 2, 79), (2, 8, 4, 76), (2, 12, 4, 74),
        (3, 0, 4, 74), (3, 4, 4, 71), (3, 8, 8, 67)]


def kick():
    return sweep(150, 42, 0.22) * env(0.22, 0.001, 0.07) * 1.0


def snare():
    n = bandpass(noise(0.18), 1200, 6000) * env(0.18, 0.001, 0.05)
    return n * 0.9 + osc(190, 0.18, "sine") * env(0.18, 0.001, 0.03) * 0.5


def hat(open_=False):
    d = 0.22 if open_ else 0.05
    return highpass(noise(d), 7000) * env(d, 0.001, 0.08 if open_ else 0.015)


def music():
    m = Track()
    bars = int(np.ceil(DURATION / BAR))
    outro_bar = int(T7 / BAR)          # last full bar before the outro chord
    for b in range(bars):
        start = b * BAR
        if start > DURATION:
            break
        chord, root = CHORDS[b % 4], ROOTS[b % 4]
        intro = b < 2
        final = b > outro_bar

        if final:
            # outro: a held C major chord with a slow falling arpeggio, then silence
            if b == outro_bar + 1:
                for k, n in enumerate([60, 64, 67, 72]):
                    m.add(start, osc(midi(n), 3.8, "square", 0.25) * env(3.8, 0.02, 1.6, 0.0, 0.5), 0.05, -0.3 + k * 0.2)
                m.add(start, osc(midi(36), 3.8, "triangle") * env(3.8, 0.01, 1.8), 0.22)
                for k, n in enumerate([84, 79, 76, 72, 67, 64]):
                    m.add(start + k * SIX * 2, osc(midi(n), 0.4, "square", 0.125) * env(0.4, 0.002, 0.15), 0.05, 0.25)
            continue

        # arpeggio (16ths)
        for s in range(16):
            if intro and s % 2:
                continue
            n = chord[[0, 1, 2, 1][s % 4]] + 12
            m.add(start + s * SIX, osc(midi(n), SIX * 0.9, "square", 0.125) * env(SIX * 0.9, 0.002, 0.07), 0.045 if intro else 0.05, -0.35)

        # soft pad in the intro
        if intro:
            for n in chord:
                m.add(start, osc(midi(n), BAR, "triangle") * env(BAR, 0.4, 2.0, 0.4, 0.3), 0.05)
            continue

        # bass (8ths, octave bounce)
        for e in range(8):
            n = root + (12 if e % 2 else 0)
            m.add(start + e * BEAT / 2, osc(midi(n), BEAT / 2 * 0.85, "triangle") * env(BEAT / 2 * 0.85, 0.003, 0.18, 0.3), 0.26)

        # drums
        for s in (0, 8, 10):
            if s == 10 and b % 2 == 0:
                continue
            m.add(start + s * SIX, kick(), 0.5)
        for s in (4, 12):
            m.add(start + s * SIX, snare(), 0.2)
        for s in range(0, 16, 2):
            m.add(start + s * SIX, hat(open_=(s == 14 and b % 4 == 3)), 0.07 if s % 4 else 0.05, 0.3)
        if b == outro_bar:  # little fill into the outro
            for s in (12, 13, 14, 15):
                m.add(start + s * SIX, snare(), 0.14 + 0.03 * (s - 12))

        # lead melody in the middle sections (bars 6-13 and 16-21), echoing the companion/Compass scenes
        if 6 <= b < 14 or 16 <= b < 22:
            loop_bar = b % 4
            for bar_i, st, ln, n in LEAD:
                if bar_i != loop_bar:
                    continue
                d = ln * SIX * 0.95
                m.add(start + st * SIX, osc(midi(n), d, "square", 0.25, vibrato=0.004) * env(d, 0.005, 0.5, 0.35, 0.04), 0.06, 0.3)

    # glue: tame the fizz of raw square waves, add a short ping-pong echo for space
    l, r = lowpass(m.l, 7000), lowpass(m.r, 7000)
    delay = int(SIX * 3 * SR)
    for _ in range(3):
        l2, r2 = l.copy(), r.copy()
        l2[delay:] += r[:-delay] * 0.22
        r2[delay:] += l[:-delay] * 0.22
        l, r = l2, r2
    # fade in with the picture, fade out at the end
    n = len(l)
    fade = np.ones(n)
    fi = int(1.0 * SR)
    fade[:fi] = np.linspace(0, 1, fi)
    fo0, fo1 = int((DURATION - 2.2) * SR), int(DURATION * SR)
    fade[fo0:fo1] = np.linspace(1, 0, fo1 - fo0) ** 1.5
    fade[fo1:] = 0
    return l * fade, r * fade


# --- sound effects ---------------------------------------------------------------------------------
def pop(pitch=1.0):
    return mix(sweep(380 * pitch, 760 * pitch, 0.09) * env(0.09, 0.002, 0.035), highpass(noise(0.02), 3000) * env(0.02, 0.0005, 0.004) * 0.3)


def tick():
    return highpass(noise(0.012), 2500) * env(0.012, 0.0005, 0.003)


def click():
    return mix(osc(2600, 0.02, "sine") * env(0.02, 0.0005, 0.006), highpass(noise(0.008), 3000) * env(0.008, 0.0003, 0.002) * 0.6)


def whoosh(dur=0.7, lo=300, hi=3000):
    n = noise(dur)
    half = len(n) // 2
    shape = np.concatenate([np.linspace(0, 1, half) ** 2, np.linspace(1, 0, len(n) - half) ** 1.5])
    return (bandpass(n, lo, hi) * shape) * 0.9


def thud():
    return mix(sweep(110, 45, 0.3) * env(0.3, 0.001, 0.1), lowpass(noise(0.12), 900) * env(0.12, 0.001, 0.03) * 0.6)


def marker(dur):
    n = bandpass(noise(dur), 2500, 6000)
    wobble = 0.6 + 0.4 * np.sin(2 * np.pi * 17 * t_axis(dur))
    return n * wobble * env(dur, 0.05, 10, 1.0, 0.1)


def notes(seq, step, wave="square", duty=0.25, length=0.18):
    out = np.zeros(int((len(seq) * step + length) * SR))
    for k, n in enumerate(seq):
        s = osc(midi(n), length, wave, duty) * env(length, 0.002, length * 0.4)
        i = int(k * step * SR)
        out[i:i + len(s)] += s
    return out


def coin():
    return notes([83, 88], 0.05, "square", 0.5, 0.12)


def chime():
    out = np.zeros(int((2.0 + 4 * 0.07) * SR) + 1)  # last note starts 0.21s in and rings 2s
    for k, n in enumerate([84, 88, 91, 96]):
        s = osc(midi(n), 2.0, "sine") * env(2.0, 0.003, 0.6)
        i = int(k * 0.07 * SR)
        out[i:i + len(s)] += s * (0.8 - 0.12 * k)
    return out


def sfx():
    fx = Track()
    # 1. intro
    fx.add(0.3, pop(0.8), 0.5)
    fx.add(0.34, chime(), 0.10)
    for i in range(0, 30, 2):                       # tagline typing
        fx.add(1.2 + i * 0.025, tick(), 0.14)
    fx.add(2.3, pop(1.3), 0.35)
    # wipes
    for w in WIPES:
        fx.add(w, whoosh(1.2, 250, 2600), 0.48)
    # 2. hook
    for i in range(5):
        fx.add(T2 + 0.2 + i * 0.08, tick(), 0.12)
    fx.add(T2 + 1.0, whoosh(0.6, 500, 3500), 0.28, 0.5)          # chat card slides in from the right
    for i in range(4):
        fx.add(T2 + 1.5 + i * 0.08, tick(), 0.12)
    fx.add(T2 + 2.3, marker(0.45), 0.05)                          # gold highlight
    fx.add(T2 + 2.95, thud(), 0.55, 0.4)                          # "?" stamp
    fx.add(T2 + 2.95, notes([64, 63], 0.09, "square", 0.5, 0.12), 0.07, 0.4)
    # 3. companions
    for i in range(3):
        fx.add(T3 + 0.3 + i * 0.16, pop(0.9 + i * 0.15), 0.38, -0.4 + i * 0.4)
    fx.add(T3 + 3.8, whoosh(0.5, 300, 2000), 0.28)
    fx.add(T3 + 4.2, pop(0.7), 0.45, -0.3)
    for i in range(4):
        fx.add(T3 + 4.6 + i * 0.1, tick(), 0.12, 0.2)
    mood_sounds = [notes([76, 79], 0.08, length=0.14),                 # curious: little lift
                   notes([72, 76, 79, 84], 0.06, length=0.16),         # focused: happy arpeggio
                   notes([69, 69], 0.12, "square", 0.5, 0.09),         # concerned: two alert beeps
                   notes([67, 64, 60], 0.14, "triangle", length=0.3)]  # idle: sleepy fall
    for at, s, g in zip(MOOD_TIMES, mood_sounds, [0.10, 0.10, 0.09, 0.16]):
        fx.add(at, s, g, -0.2)
    # 4. compass
    fx.add(T4 + 0.2, whoosh(0.7, 300, 2500), 0.28)
    fx.add(T4 + 1.9, marker(1.4), 0.06)                           # highlighter sweep
    fx.add(T4 + 3.55, click(), 0.6)                              # right-click
    fx.add(T4 + 3.6, pop(1.6), 0.18)                              # menu appears
    fx.add(T4 + 4.75, click(), 0.65)                               # "Check with Compass"
    fx.add(T4 + 5.1, whoosh(0.8, 400, 4000), 0.42, 0.6)           # sidebar slides in from the right
    fx.add(T4 + 5.9, pop(1.1), 0.3)
    fx.add(T4 + 8.2, pop(1.1), 0.3)
    for i in range(3):
        fx.add(T4 + 8.6 + i * 0.15, pop(1.5 + i * 0.2), 0.25, -0.3 + i * 0.3)
    for i in range(3):
        fx.add(T4 + 11.0 + i * 0.1, tick(), 0.14)
    fx.add(T4 + 11.35, notes([72, 79], 0.1, length=0.25), 0.08)
    # 5. dashboard
    for i in range(4):
        fx.add(T5 + 0.3 + i * 0.14, pop(0.8 + i * 0.12), 0.3, -0.45 + i * 0.3)
    for i, at in enumerate([T5 + 1.6, T5 + 3.6, T5 + 5.6, T5 + 7.6]):
        fx.add(at, whoosh(0.45, 600, 3000), 0.2, -0.45 + i * 0.3)
    fx.add(T5 + 9.6, whoosh(0.5, 300, 2000), 0.16)
    # 6. popup
    fx.add(T6 + 0.1, whoosh(0.6, 400, 3000), 0.26, 0.4)
    fx.add(T6 + 0.55, pop(1.0), 0.35, 0.4)
    for k in range(1, 9):                                         # counters counting up (power2.out)
        x = 1 - np.sqrt(1 - k / 9)
        fx.add(T6 + 1.0 + 1.4 * x, coin(), 0.09, -0.3)
    # 7. outro
    fx.add(T7 + 0.1, pop(0.75), 0.45)
    fx.add(T7 + 0.15, chime(), 0.14)
    for i in range(2):
        fx.add(T7 + 0.7 + i * 0.1, tick(), 0.12)
    for i in range(3):
        fx.add(T7 + 1.3 + i * 0.1, tick(), 0.12)
    return fx.l, fx.r


# --- mix -------------------------------------------------------------------------------------------
ml, mr = music()
sl, sr_ = sfx()
n = int(DURATION * SR)
MUSIC_LEVEL = 0.42   # music sits under the effects (they should stay audible but small)
left = ml[:n] * MUSIC_LEVEL + sl[:n]
right = mr[:n] * MUSIC_LEVEL + sr_[:n]
stereo = np.stack([left, right], axis=1)
# master: bring the average level up to about -16 dBFS, then a soft limiter keeps peaks under -1 dBFS
level = np.sqrt(np.mean(stereo[: int((DURATION - 2.5) * SR)] ** 2))
stereo *= 10 ** (-16 / 20) / level
stereo = np.tanh(stereo / 0.89) * 0.89
wavfile.write(sys.argv[1], SR, (stereo * 32767).astype(np.int16))
print("wrote", sys.argv[1], f"{DURATION}s, peak {np.max(np.abs(stereo)):.2f}")
