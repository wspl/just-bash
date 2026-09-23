import { afterEach, beforeEach, describe, it } from "vitest";
import {
  cleanupTestDir,
  compareOutputs,
  createTestDir,
  setupFiles,
} from "./fixture-runner.js";

describe("read UTF-8 - Real Bash Comparison", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await createTestDir();
  });
  afterEach(async () => {
    await cleanupTestDir(dir);
  });
  for (const script of [
    'read -r value < input; printf "%s" "$value" | base64',
    'while read -r value; do printf "%s\\n" "$value"; done < input',
    'read -r -a values < input; printf "%s\\n" "${values[@]}"',
  ]) {
    it(script, async () => {
      const env = await setupFiles(dir, { input: "中文 🙂 café Ã©\n下一行\n" });
      await compareOutputs(env, dir, script);
    });
  }
});
