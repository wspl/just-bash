import { describe, expect, it } from "vitest";
import { Bash } from "../../Bash.js";

const text = "任务600578金币发放计数下降 🙂 café Ã©";

// Inspect command arguments and file bytes: the top-level output decoder can
// hide a Latin-1 variable by decoding it again before returning stdout.
function shell(content = `${text}\n`) {
  const calls: string[][] = [];
  const bash = new Bash({
    files: { "/input": content },
    customCommands: [
      {
        name: "capture",
        execute: async (args) => {
          calls.push(args);
          return { stdout: "", stderr: "", exitCode: 0 };
        },
      },
    ],
  });
  return { bash, calls };
}

describe("read UTF-8 boundaries", () => {
  for (const script of [
    'read -r value < /input; capture "$value"',
    'cat /input | { read -r value; capture "$value"; }',
    `read -r value <<< '${text}'; capture "$value"`,
    'read -r < /input; capture "$REPLY"',
    'exec 3< /input; read -r -u 3 value; capture "$value"',
  ]) {
    it(script, async () => {
      const { bash, calls } = shell();
      const result = await bash.exec(script);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(calls).toEqual([[text]]);
    });
  }

  it("round-trips JSONL through read and a pipe without changing disk bytes", async () => {
    const content = `${[JSON.stringify({ title: text }), JSON.stringify({ title: "下一条" })].join("\n")}\n`;
    const { bash } = shell(content);
    const result = await bash.exec(
      'while read -r line; do echo "$line" >> /output; done < /input',
    );
    expect(result.exitCode).toBe(0);
    expect(await bash.fs.readFileBuffer("/output")).toEqual(
      new TextEncoder().encode(content),
    );
  });

  it("splits decoded Unicode IFS and assigns arrays", async () => {
    const { bash, calls } = shell("中文界🙂界é\n");
    await bash.exec(
      'IFS=界 read -r -a values < /input; capture "${values[@]}"',
    );
    expect(calls).toEqual([["中文", "🙂", "é"]]);
  });

  for (const option of ["-n", "-N"]) {
    it(`counts code points and retains unread bytes with ${option}`, async () => {
      const { bash, calls } = shell("中🙂é尾\n");
      await bash.exec(
        `{ read -r ${option} 2 first; read -r rest; capture "$first" "$rest"; } < /input`,
      );
      expect(calls).toEqual([["中🙂", "é尾"]]);
    });
  }

  it("preserves EOF status and an unterminated Unicode line", async () => {
    const { bash, calls } = shell("尾🙂");
    await bash.exec('read -r value < /input; capture "$?" "$value"');
    expect(calls).toEqual([["1", "尾🙂"]]);
  });

  it("keeps Latin-1-looking Unicode in file descriptors intact", async () => {
    const { bash, calls } = shell("Ã©\n");
    await bash.exec('exec 3< /input; read -r value <&3; capture "$value"');
    expect(calls).toEqual([["Ã©"]]);
  });
  it("advances read-write descriptors in decoded string offsets", async () => {
    const { bash, calls } = shell("中🙂é尾\n");
    await bash.exec(
      'exec 3<> /input; read -r -n 2 first <&3; read -r rest <&3; capture "$first" "$rest"',
    );
    expect(calls).toEqual([["中🙂", "é尾"]]);
  });

  it("handles Unicode continuation lines and escaped code points", async () => {
    const { bash, calls } = shell("中\\\n🙂尾\n");
    await bash.exec('read value < /input; capture "$value"');
    expect(calls).toEqual([["中🙂尾"]]);
  });
});
