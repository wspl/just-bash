import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {chapters} from "../src/content.ts";

const root = process.cwd();
const audioDir = join(root, "public/audio");
const captionsDir = join(root, "public/captions");
mkdirSync(audioDir, {recursive: true});
mkdirSync(captionsDir, {recursive: true});

const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, {encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]});
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr}`);
  return result.stdout.trim();
};

const captionPhrases = (text: string) =>
  text
    .split(/(?<=[。！？；])/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      if (part.length <= 25) return [part];
      const pieces = part.split(/(?<=[，、：])/u).map((piece) => piece.trim()).filter(Boolean);
      return pieces.length > 1 ? pieces : [part];
    });

let cursorMs = 0;
const timeline = [];
const captions = [];

for (const chapter of chapters) {
  const aiff = join(audioDir, `${chapter.id}.aiff`);
  const wav = join(audioDir, `${chapter.id}.wav`);
  const m4a = join(audioDir, `${chapter.id}.m4a`);
  run("say", ["-v", "Tingting", "-r", "205", "-o", aiff, chapter.narration]);
  run("afconvert", ["-f", "WAVE", "-d", "LEI16", aiff, wav]);
  run("npx", ["remotion", "ffmpeg", "-y", "-i", wav, "-c:a", "aac", "-b:a", "160k", "-f", "mp4", m4a]);
  rmSync(aiff);
  rmSync(wav);
  const durationSeconds = Number(
    run("npx", ["remotion", "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", m4a]),
  );
  const durationMs = Math.ceil(durationSeconds * 1000);
  const paddingBeforeMs = 500;
  const paddingAfterMs = 700;
  const startMs = cursorMs;
  const audioStartMs = startMs + paddingBeforeMs;
  const endMs = audioStartMs + durationMs + paddingAfterMs;
  timeline.push({...chapter, startMs, audioStartMs, durationMs, endMs, audioFile: `audio/${chapter.id}.m4a`});

  const phrases = captionPhrases(chapter.narration);
  const totalWeight = phrases.reduce((sum, phrase) => sum + phrase.replace(/[，。！？；：、]/gu, "").length, 0);
  let phraseCursor = audioStartMs;
  for (const phrase of phrases) {
    const weight = phrase.replace(/[，。！？；：、]/gu, "").length;
    const phraseDuration = Math.max(450, (durationMs * weight) / totalWeight);
    captions.push({
      text: phrase,
      startMs: Math.round(phraseCursor),
      endMs: Math.round(Math.min(audioStartMs + durationMs, phraseCursor + phraseDuration)),
      timestampMs: Math.round(phraseCursor),
      confidence: 1,
    });
    phraseCursor += phraseDuration;
  }
  cursorMs = endMs;
  process.stdout.write(`${chapter.number} ${chapter.title}: ${(durationMs / 1000).toFixed(1)}s\n`);
}

writeFileSync(join(root, "public/timeline.json"), JSON.stringify({durationMs: cursorMs, chapters: timeline}, null, 2));
writeFileSync(join(captionsDir, "captions.json"), JSON.stringify(captions, null, 2));
process.stdout.write(`Total: ${(cursorMs / 60000).toFixed(2)} minutes\n`);
