import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const root = process.cwd();
const outDir = path.join(root, "docs", "demo-video");
const framesDir = path.join(outDir, "frames");
const audioDir = path.join(outDir, "audio-work");
const screenDir = path.join(root, "docs", "stitch-export", "png");
const ffmpeg = "C:\\tmp\\padalock-video-tools\\node_modules\\@ffmpeg-installer\\win32-x64\\ffmpeg.exe";

fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(audioDir, { recursive: true });
for (const dir of [framesDir, audioDir]) {
  for (const file of fs.readdirSync(dir)) fs.rmSync(path.join(dir, file), { recursive: true, force: true });
}

const width = 1280;
const height = 720;
const fps = 24;
const slides = [
  {
    screen: "01-splash.png",
    kicker: "PadaLock Demo",
    title: "Padala with purpose",
    body: ["Send money home in protected buckets.", "Tuition, utilities, medical, groceries, and free cash stay separated."],
    foot: "Built on Stellar testnet",
    seconds: 5.4,
    narration: "PadaLock is purpose locked remittance for overseas Filipino workers and their families.",
  },
  {
    screen: "02-onboard.png",
    kicker: "1. Create or connect",
    title: "A wallet-first remittance app",
    body: ["Families onboard with a local or external Stellar wallet.", "The app keeps signing close to the user."],
    foot: "Self-custodial by default",
    seconds: 5.6,
    narration: "Families create or connect a Stellar wallet, with signing kept close to the user.",
  },
  {
    screen: "04-dashboard.png",
    kicker: "2. Fund testnet balance",
    title: "Sender sees USDC and XLM together",
    body: ["OFWs can fund a demo wallet, refresh balances, and choose what token to send."],
    foot: "Fast, low-cost Stellar rails",
    seconds: 6.0,
    narration: "The sender sees USDC and XLM balances in one simple dashboard before sending funds home.",
  },
  {
    screen: "05-send.png",
    kicker: "3. Split the padala",
    title: "Allocate money before it leaves",
    body: ["Example: tuition 100 USDC, utilities 30 USDC, free cash 20 USDC.", "Restricted buckets can only release to approved merchant accounts."],
    foot: "Soroban escrow enforces the rules",
    seconds: 7.2,
    narration: "Instead of one lump sum, the sender splits the padala into buckets like tuition, utilities, and free cash.",
  },
  {
    screen: "06-claim.png",
    kicker: "4. Family claims",
    title: "Recipients see each bucket clearly",
    body: ["The claim link opens the available buckets.", "Family can claim allowed funds without guessing what the sender intended."],
    foot: "Clear claim flow for each bucket",
    seconds: 6.0,
    narration: "On the claim side, the family sees each bucket clearly and releases only the funds that are available.",
  },
  {
    screen: "06-claim-dark.png",
    kicker: "5. Merchant restrictions",
    title: "Purpose rules live on chain",
    body: ["Tuition goes to a whitelisted school account.", "Non-whitelisted merchant attempts are rejected by contract logic."],
    foot: "The UI helps, the contract decides",
    seconds: 6.2,
    narration: "Restricted buckets are enforced by Soroban escrow. Tuition can go to a whitelisted school, not a random merchant.",
  },
  {
    screen: "07-transparency.png",
    kicker: "6. Sender transparency",
    title: "Track exactly where funds went",
    body: ["OFWs can inspect released amounts, claim status, and merchant destinations."],
    foot: "Auditable release log",
    seconds: 5.8,
    narration: "The sender can review what was claimed, how much was released, and which merchant received it.",
  },
  {
    screen: "09-history.png",
    kicker: "7. Remittance history",
    title: "Every padala stays reviewable",
    body: ["History gives both sender and family a clean trail of transfers and claims."],
    foot: "Designed for repeat family support",
    seconds: 5.0,
    narration: "History gives both sides a clean trail for repeat family support.",
  },
  {
    screen: "08-empty-error.png",
    kicker: "Fallback states",
    title: "Built for real demo conditions",
    body: ["Empty, error, and loading states keep the flow understandable when testnet is slow."],
    foot: "Resilient UX for live demos",
    seconds: 4.8,
    narration: "Helpful empty and error states keep the flow understandable when testnet is slow.",
  },
  {
    screen: "01-splash.png",
    kicker: "Close",
    title: "PadaLock",
    body: ["Purpose-locked OFW remittance on Stellar.", "Send support home with clarity, control, and transparent claims."],
    foot: "Padala na may pangako",
    seconds: 8.0,
    narration: "PadaLock helps send support home with clarity, control, and transparent claims. Padala na may pangako.",
  },
];

function esc(text) {
  return String(text).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function wrap(text, max = 34) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function tspans(lines, x, y, gap) {
  return lines.map((line, index) => `<tspan x="${x}" y="${y + index * gap}">${esc(line)}</tspan>`).join("");
}

async function renderPhone(screenFile, scale) {
  const imgPath = path.join(screenDir, screenFile);
  const metadata = await sharp(imgPath).metadata();
  const targetH = Math.round(552 * scale);
  const targetW = Math.round((metadata.width / metadata.height) * targetH);
  const screen = await sharp(imgPath).resize({ height: targetH }).png().toBuffer();
  const phoneW = Math.max(310, targetW + 62);
  const phoneH = targetH + 62;
  const left = Math.round((phoneW - targetW) / 2);
  const top = 31;
  const svg = Buffer.from(`
    <svg width="${phoneW}" height="${phoneH}" viewBox="0 0 ${phoneW} ${phoneH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${phoneW}" height="${phoneH}" rx="42" fill="#1B1B1B"/>
      <rect x="10" y="10" width="${phoneW - 20}" height="${phoneH - 20}" rx="34" fill="#FCF9F8"/>
      <rect x="${Math.round(phoneW / 2 - 38)}" y="18" width="76" height="8" rx="4" fill="#313030" opacity="0.35"/>
    </svg>`);
  return sharp(svg).composite([{ input: screen, left, top }]).png().toBuffer();
}

async function renderFrame(slide, frameIndex, totalFrames, globalFrame, allFrames) {
  const local = totalFrames <= 1 ? 0 : frameIndex / (totalFrames - 1);
  const ease = 0.5 - Math.cos(local * Math.PI) / 2;
  const phone = await renderPhone(slide.screen, 0.985 + ease * 0.03);
  const progressW = Math.round((globalFrame / Math.max(1, allFrames - 1)) * 1120);
  const titleLines = wrap(slide.title, 22);
  const bodyLines = slide.body.flatMap((line) => wrap(line, 46));
  const phoneX = Math.round(806 + Math.sin(local * Math.PI) * 10);

  const svg = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="1280" height="720" fill="#FCF9F8"/>
      <rect x="0" y="0" width="1280" height="720" fill="#F6F3F2" opacity="0.72"/>
      <circle cx="1110" cy="92" r="150" fill="#FFC72C" opacity="0.18"/>
      <circle cx="78" cy="640" r="210" fill="#A4F3CA" opacity="0.18"/>
      <rect x="80" y="70" width="540" height="7" rx="3.5" fill="#5D0518"/>
      <text x="80" y="122" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="1" fill="#775A00">${esc(slide.kicker.toUpperCase())}</text>
      <text font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="58" font-weight="800" fill="#1B1B1B">${tspans(titleLines, 80, 206, 66)}</text>
      <text font-family="Inter, Arial, sans-serif" font-size="26" font-weight="400" fill="#564242">${tspans(bodyLines, 82, 390, 38)}</text>
      <rect x="80" y="574" width="520" height="64" rx="16" fill="#FFFFFF" stroke="#DCC0C0"/>
      <circle cx="116" cy="606" r="16" fill="#5D0518"/>
      <path d="M109 606 L114 611 L124 599" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <text x="144" y="615" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="#5D0518">${esc(slide.foot)}</text>
      <rect x="80" y="674" width="1120" height="8" rx="4" fill="#E5E2E1"/>
      <rect x="80" y="674" width="${progressW}" height="8" rx="4" fill="#5D0518"/>
      <text x="1140" y="652" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="#897172">${String(Math.min(slides.length, slides.indexOf(slide) + 1)).padStart(2, "0")}/${String(slides.length).padStart(2, "0")}</text>
    </svg>`);

  return sharp(svg)
    .composite([{ input: phone, left: phoneX, top: 58 }])
    .png()
    .toFile(path.join(framesDir, `frame-${String(globalFrame).padStart(4, "0")}.png`));
}

function writeWav(filePath, samples, sampleRate, channels) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

function generateMusic(filePath, durationSeconds) {
  const sampleRate = 48000;
  const channels = 2;
  const total = Math.ceil(durationSeconds * sampleRate);
  const samples = new Float32Array(total * channels);
  const chords = [
    [220.0, 277.18, 329.63],
    [196.0, 246.94, 329.63],
    [174.61, 220.0, 261.63],
    [207.65, 261.63, 311.13],
  ];
  for (let i = 0; i < total; i += 1) {
    const t = i / sampleRate;
    const chord = chords[Math.floor(t / 4) % chords.length];
    const beat = (t * 2) % 1;
    let value = 0;
    for (const freq of chord) {
      value += Math.sin(2 * Math.PI * freq * t) * 0.06;
      value += Math.sin(2 * Math.PI * freq * 2 * t) * 0.02;
    }
    const pulse = Math.sin(2 * Math.PI * 880 * t) * Math.max(0, 1 - beat * 8) * 0.08;
    const tick = Math.sin(2 * Math.PI * 1320 * t) * Math.max(0, 1 - (((t * 4) % 1) * 10)) * 0.025;
    const bass = Math.sin(2 * Math.PI * (chord[0] / 2) * t) * 0.07;
    const fade = Math.min(1, t / 2, (durationSeconds - t) / 3);
    value = (value + pulse + tick + bass) * Math.max(0, fade);
    samples[i * 2] = value * 0.92;
    samples[i * 2 + 1] = value;
  }
  writeWav(filePath, samples, sampleRate, channels);
}

function generateVoiceClips() {
  const scriptPath = path.join(audioDir, "make-voiceover.ps1");
  fs.writeFileSync(scriptPath, `param([string]$TextPath, [string]$WavePath)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice("Microsoft Zira Desktop")
$s.Rate = 1
$s.Volume = 100
$s.SetOutputToWaveFile($WavePath)
$s.Speak([System.IO.File]::ReadAllText($TextPath))
$s.Dispose()
`);

  const clips = [];
  let start = 0;
  const lines = [];
  for (const [index, slide] of slides.entries()) {
    const textPath = path.join(audioDir, `voice-${String(index + 1).padStart(2, "0")}.txt`);
    const wavPath = path.join(audioDir, `voice-${String(index + 1).padStart(2, "0")}.wav`);
    fs.writeFileSync(textPath, slide.narration);
    const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, textPath, wavPath], { stdio: "inherit" });
    if (result.status !== 0) throw new Error(`voice clip ${index + 1} failed with status ${result.status}`);
    clips.push({ path: wavPath, delayMs: Math.round((start + 0.45) * 1000) });
    lines.push(`${start.toFixed(1)}s - ${slide.narration}`);
    start += slide.seconds;
  }
  fs.writeFileSync(path.join(outDir, "voiceover.txt"), lines.join("\n"));
  return clips;
}

const totalFrames = slides.reduce((sum, slide) => sum + Math.round(slide.seconds * fps), 0);
const durationSeconds = totalFrames / fps;
let globalFrame = 0;
for (const slide of slides) {
  const count = Math.round(slide.seconds * fps);
  for (let i = 0; i < count; i += 1) {
    await renderFrame(slide, i, count, globalFrame, totalFrames);
    globalFrame += 1;
  }
  process.stdout.write(`Rendered ${slide.screen}\n`);
}

const silentOutput = path.join(outDir, "padalock-demo-silent.mp4");
const output = path.join(outDir, "padalock-demo.mp4");
const musicPath = path.join(audioDir, "background-music.wav");
const voiceClips = generateVoiceClips();
generateMusic(musicPath, durationSeconds);

let result = spawnSync(ffmpeg, [
  "-y",
  "-framerate", String(fps),
  "-i", path.join(framesDir, "frame-%04d.png"),
  "-c:v", "libx264",
  "-preset", "medium",
  "-crf", "20",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  silentOutput,
], { stdio: "inherit" });
if (result.status !== 0) throw new Error(`ffmpeg video encode failed with status ${result.status}`);

const audioInputs = [musicPath, ...voiceClips.map((clip) => clip.path)];
const filterParts = ["[1:a]volume=0.58,aresample=48000,apad[music]"];
const mixLabels = ["[music]"];
for (const [index, clip] of voiceClips.entries()) {
  const inputIndex = index + 2;
  const label = `v${index}`;
  filterParts.push(`[${inputIndex}:a]adelay=${clip.delayMs}|${clip.delayMs},volume=1.45,aresample=48000[${label}]`);
  mixLabels.push(`[${label}]`);
}
filterParts.push(`${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=0,alimiter=limit=0.95[a]`);

result = spawnSync(ffmpeg, [
  "-y",
  "-i", silentOutput,
  ...audioInputs.flatMap((input) => ["-i", input]),
  "-filter_complex", filterParts.join(";"),
  "-map", "0:v:0",
  "-map", "[a]",
  "-c:v", "copy",
  "-c:a", "aac",
  "-b:a", "192k",
  "-t", durationSeconds.toFixed(3),
  "-movflags", "+faststart",
  output,
], { stdio: "inherit" });
if (result.status !== 0) throw new Error(`ffmpeg audio mix failed with status ${result.status}`);

fs.unlinkSync(silentOutput);
fs.rmSync(framesDir, { recursive: true, force: true });
fs.rmSync(audioDir, { recursive: true, force: true });
fs.writeFileSync(path.join(outDir, "README.md"), `# PadaLock Demo Video\n\nGenerated from the Stitch screen exports in \`docs/stitch-export/png\`.\n\n- Output: \`padalock-demo.mp4\`\n- Resolution: ${width}x${height}\n- FPS: ${fps}\n- Duration: ${durationSeconds.toFixed(1)} seconds\n- Audio: slide-synced Windows text-to-speech voiceover plus generated background music\n\nRegenerate with:\n\n\`\`\`powershell\nnode scripts/generate-demo-video.mjs\n\`\`\`\n`);

console.log(`Wrote ${output}`);
