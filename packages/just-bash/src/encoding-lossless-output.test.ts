import { describe, expect, it } from "vitest";
import { Bash } from "./Bash.js";
import { latin1FromBytes, stderrAsBytes, stdoutAsBytes } from "./encoding.js";

const raw = "\x89PNG\x00\xff\xc2";
const text = "· café Ã© 中文 🎉\uFEFF";
const encoded = String.fromCharCode(...new TextEncoder().encode(text));

function bash() {
  return new Bash({
    customCommands: [
      {
        name: "bytes",
        execute: async () => ({
          stdout: raw,
          stdoutKind: "bytes",
          stderr: "",
          exitCode: 0,
        }),
      },
      {
        name: "text",
        execute: async () => ({ stdout: text, stderr: "", exitCode: 0 }),
      },
      {
        name: "errbytes",
        execute: async () => ({
          stdout: "",
          stderr: raw,
          stderrKind: "bytes",
          exitCode: 7,
        }),
      },
    ],
  });
}

describe("lossless interpreter output", () => {
  for (const script of [
    "text; bytes",
    "text && bytes",
    "{ text; bytes; }",
    "(text; bytes)",
    "for i in 1; do text; bytes; done",
    "f() { text; bytes; return; }; f",
    "{ text; bytes; exit; } | cat",
    "text; bytes; exit 3",
    "eval 'text; bytes'",
  ]) {
    it(script, async () => {
      const result = await bash().exec(script);
      expect(latin1FromBytes(stdoutAsBytes(result))).toBe(encoded + raw);
    });
  }

  it("redirects both streams as bytes without encoding guesses", async () => {
    const env = bash();
    await env.exec("{ text; errbytes; } &> /out");
    expect(Array.from(await env.fs.readFileBuffer("/out"))).toEqual(
      Array.from(encoded + raw, (c) => c.charCodeAt(0)),
    );
    const result = await env.exec("text >&2");
    expect(result.stderr).toBe(text);
  });

  it("does not turn opaque stderr into text", async () => {
    const result = await bash().exec("errbytes");
    expect(latin1FromBytes(stderrAsBytes(result))).toBe(raw);
  });

  it("preserves Unicode error diagnostics through control-flow exits", async () => {
    const result = await bash().exec("exit 'café 中文'");
    expect(result.stderr).toContain("café 中文");
    expect(result.stderr).not.toContain("�");
  });

  it("decodes only after all statement bytes have been joined", async () => {
    const env = new Bash({
      customCommands: [
        {
          name: "first",
          execute: async () => ({
            stdout: "\xc3",
            stdoutKind: "bytes",
            stderr: "",
            exitCode: 0,
          }),
        },
        {
          name: "second",
          execute: async () => ({
            stdout: "\xa9",
            stdoutKind: "bytes",
            stderr: "",
            exitCode: 0,
          }),
        },
      ],
    });
    expect((await env.exec("first; second")).stdout).toBe("é");
  });
});
