import { describe, expect, it } from "vitest";
import { Bash } from "../../Bash.js";

const text = "金币广告任务下降 🙂 café Ã©";
describe("mapfile UTF-8 variable boundary", () => {
  for (const command of ["mapfile", "readarray"]) {
    for (const [options, input, expected] of [
      ["-t", `${text}\n下一条`, [text, "下一条"]],
      ["", `${text}\n`, [`${text}\n`]],
      ["-t -s 1 -n 1", `首条\n${text}\n尾条\n`, [text]],
      ["-t -d 界", `${text}界尾条界`, [text, "尾条"]],
      ["-t -d ''", `${text}\0尾条\0`, [text, "尾条"]],
    ] as const) {
      it(`${command} ${options}`, async () => {
        const calls: string[][] = [];
        const bash = new Bash({ files: { "/input": input }, customCommands: [{
          name: "capture", execute: async args => {
            calls.push(args); return { stdout: "", stderr: "", exitCode: 0 };
          },
        }] });
        const result = await bash.exec(`${command} ${options} lines < /input; capture "\${lines[@]}"`);
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe("");
        expect(calls).toEqual([[...expected]]);
      });
    }
  }
});
