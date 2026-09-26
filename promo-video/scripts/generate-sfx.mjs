// Original procedural SFX: no recordings, voice, music or repeating sound bed.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const timing = JSON.parse(
  readFileSync(new URL("../timing.json", import.meta.url)),
);
const rate = 48000,
  duration = (timing.coverFrames + timing.contentFrames) / timing.fps;
let timeOffset = 0;
const left = new Float64Array(rate * duration),
  right = new Float64Array(rate * duration);
let seed = 1427;
const noise = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
const events = [];
function sound(at, kind, length, gain = 1, pan = 0) {
  at += timeOffset;
  events.push({ at, kind, length, gain, pan });
  let low = 0,
    smooth = 0;
  for (let n = 0; n < Math.floor(length * rate); n++) {
    const t = n / rate,
      u = t / length,
      raw = noise();
    low += (raw - low) * 0.045;
    smooth += (raw - smooth) * 0.003;
    let v = 0;
    if (kind === "open") {
      // Felt-damped impact and air release; no sustained musical pitch.
      v =
        Math.sin(2 * Math.PI * (105 * t - 110 * t * t)) *
          Math.exp(-t * 15) *
          0.32 +
        low * Math.sin(Math.PI * u) ** 2 * 0.33;
    } else if (kind === "key") {
      v =
        (raw * 0.21 + Math.sin(t * 2 * Math.PI * (580 + pan * 200)) * 0.15) *
        Math.exp(-t * 160);
      if (t > 0.024) v += low * Math.exp(-(t - 0.024) * 210) * 0.4;
    } else if (kind === "weave") {
      v = (low * (0.7 + u) + smooth * 1.9) * Math.sin(Math.PI * u) ** 2 * 0.28;
    } else if (kind === "click") {
      v =
        (raw * 0.26 + Math.sin(2 * Math.PI * 220 * t) * 0.16) *
        Math.exp(-t * 230);
      if (t > 0.032) v += raw * 0.12 * Math.exp(-(t - 0.032) * 250);
    } else if (kind === "ratchet") {
      for (const hit of [0, 0.09])
        if (t >= hit)
          v +=
            (raw * 0.13 + Math.sin((t - hit) * 2 * Math.PI * 430) * 0.16) *
            Math.exp(-(t - hit) * 140);
    } else if (kind === "drag") {
      // Friction follows the legend from right to left.
      v =
        (low * 0.7 + (raw - low) * 0.025) *
        Math.sin(Math.PI * u) ** 1.4 *
        (0.78 + 0.22 * Math.sin(t * 2 * Math.PI * 7));
    } else if (kind === "snap") {
      v =
        (Math.sin(2 * Math.PI * 740 * t) * 0.23 +
          Math.sin(2 * Math.PI * 1193 * t) * 0.07) *
          Math.exp(-t * 35) +
        raw * 0.09 * Math.exp(-t * 190);
    } else if (kind === "write") {
      v =
        (raw - low) *
        (Math.sin(2 * Math.PI * 34 * t) > 0.4 ? 1 : 0.12) *
        Math.sin(Math.PI * u) *
        0.085;
    } else if (kind === "export") {
      v =
        Math.sin(2 * Math.PI * (155 * t - 40 * t * t)) *
          Math.exp(-t * 21) *
          0.3 +
        low * Math.sin(Math.PI * u) ** 2 * 0.4;
      if (t > 0.065) v += raw * Math.exp(-(t - 0.065) * 170) * 0.13;
    } else if (kind === "air") {
      v = (low * 0.65 + smooth * 1.8) * Math.sin(Math.PI * u) ** 2 * 0.45;
    } else throw Error(`Unknown sound: ${kind}`);
    const movingPan =
      kind === "drag"
        ? 0.42 - u * 0.84
        : kind === "weave"
          ? -0.35 + 0.7 * u
          : pan;
    const a = ((movingPan + 1) * Math.PI) / 4,
      index = Math.round(at * rate) + n;
    if (index >= left.length) throw Error("Sound extends beyond film");
    const edge = Math.min(1, t / 0.0008) * Math.min(1, (length - t) / 0.007);
    left[index] += v * gain * Math.cos(a) * edge;
    right[index] += v * gain * Math.sin(a) * edge;
  }
}
sound(0.12, "open", 0.52, 0.95);
sound(timing.coverFrames / timing.fps - 0.25, "air", 0.4, 0.7);
timeOffset = timing.coverFrames / timing.fps;
sound(0.12, "open", 0.52, 0.95);
[0.89, 1.04, 1.19, 1.38, 1.6, 1.79, 2.08].forEach((at, i) =>
  sound(at, "key", 0.08, 0.46 + (i % 3) * 0.13, -0.3 + (i % 4) * 0.1),
);
sound(1.95, "weave", 1.82, 0.75);
sound(4.55, "click", 0.08, 0.65, -0.15);
sound(7.8, "air", 0.42, 0.9);
sound(8.08, "open", 0.44, 0.65);
sound(10.5, "air", 0.4, 0.6, 0.2);
sound(12.72, "click", 0.08, 0.9, -0.15);
sound(12.9, "ratchet", 0.22, 0.85, -0.15);
sound(15.7, "click", 0.08, 0.85, 0.4);
sound(15.94, "drag", 1.82, 0.68);
sound(17.84, "snap", 0.3, 0.95, -0.3);
sound(20.04, "weave", 0.5, 0.9, -0.2);
sound(21.22, "write", 0.32, 0.85, -0.22);
sound(22.02, "write", 0.19, 0.65, -0.12);
sound(23.3, "export", 0.5, 0.9, 0.2);
[26.03, 26.2, 26.37].forEach((at, i) =>
  sound(at, "key", 0.08, 0.75, -0.35 + i * 0.35),
);
sound(28.88, "air", 0.55, 0.85);
sound(29.16, "open", 0.62, 1.05);
let peak = 0;
for (let i = 0; i < left.length; i++)
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const multiplier = 0.46 / peak; // More than 6 dB headroom for encoded peaks.
let energy = 0;
const wav = Buffer.alloc(44 + left.length * 4);
wav.write("RIFF");
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(left.length * 4, 40);
for (let i = 0; i < left.length; i++) {
  const l = left[i] * multiplier,
    r = right[i] * multiplier;
  energy += l * l + r * r;
  wav.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(r * 32767), 46 + i * 4);
}
mkdirSync("public", { recursive: true });
mkdirSync("out", { recursive: true });
writeFileSync("public/sfx.wav", wav);
const report = {
  duration,
  sampleRate: rate,
  channels: 2,
  peak: 0.46,
  rmsDb: 10 * Math.log10(energy / (left.length * 2)),
  timbres: [...new Set(events.map((e) => e.kind))],
  events,
  voice: false,
  music: false,
  externalSamples: false,
};
writeFileSync("out/sound-design.json", JSON.stringify(report, null, 2) + "\n");
console.log(
  `${duration} s / ${report.timbres.length} original timbres / ${events.length} synchronized gestures / peak -6.74 dBFS / RMS ${report.rmsDb.toFixed(2)} dBFS`,
);
