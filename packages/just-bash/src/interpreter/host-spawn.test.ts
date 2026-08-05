import { describe, expect, it } from "vitest";
import type { StatementNode } from "../ast/types.js";
import { Bash } from "../Bash.js";
import { InMemoryFs } from "../fs/in-memory-fs/in-memory-fs.js";
import { resolveLimits } from "../limits.js";
import { parse } from "../parser/parser.js";
import type { Command } from "../types.js";
import { Interpreter } from "./interpreter.js";
import type { InterpreterState } from "./types.js";

describe("hostSpawn hook", () => {
  it("dispatches external commands to hostSpawn when present", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];

    // Override Bash.exec to inject hostSpawn into the interpreter context.
    // We do this by constructing an Interpreter directly with a hostSpawn hook.
    const state: InterpreterState = {
      env: new Map([
        ["HOME", "/home/user"],
        ["PATH", "/usr/bin:/bin"],
        ["IFS", " \t\n"],
        ["PWD", "/home/user"],
        ["SHELLOPTS", ""],
        ["BASHOPTS", ""],
      ]),
      cwd: "/home/user",
      previousDir: "/home/user",
      functions: new Map(),
      localScopes: [],
      callDepth: 0,
      sourceDepth: 0,
      commandCount: 0,
      lastExitCode: 0,
      lastArg: "",
      startTime: Date.now(),
      lastBackgroundPid: 0,
      virtualPid: 1,
      virtualPpid: 0,
      virtualUid: 1000,
      virtualGid: 1000,
      bashPid: 1,
      nextVirtualPid: 2,
      currentLine: 1,
      options: {
        errexit: false,
        pipefail: false,
        nounset: false,
        xtrace: false,
        verbose: false,
        posix: false,
        allexport: false,
        noclobber: false,
        noglob: false,
        noexec: false,
        vi: false,
        emacs: false,
      },
      shoptOptions: {
        extglob: false,
        dotglob: false,
        nullglob: false,
        failglob: false,
        globstar: false,
        globskipdots: true,
        nocaseglob: false,
        nocasematch: false,
        expand_aliases: false,
        lastpipe: false,
        xpg_echo: false,
      },
      inCondition: false,
      loopDepth: 0,
      exportedVars: new Set(["HOME", "PATH", "PWD"]),
      readonlyVars: new Set(["SHELLOPTS", "BASHOPTS"]),
      hashTable: new Map(),
    };

    const commands = new Map<string, Command>();
    const fs = new InMemoryFs();
    const limits = resolveLimits({});

    const interpreter = new Interpreter(
      {
        fs,
        commands,
        limits,
        exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
        hostSpawn: async (command, args) => {
          calls.push({ command, args });
          if (command === "git" && args[0] === "status") {
            return { stdout: "clean\n", stderr: "", exitCode: 0 };
          }
          return {
            stdout: "",
            stderr: `${command}: not found\n`,
            exitCode: 127,
          };
        },
      },
      state,
    );

    const ast = parse("git status --short");
    const result = await interpreter.executeScript(ast);

    expect(calls).toEqual([{ command: "git", args: ["status", "--short"] }]);
    expect(result.stdout).toBe("clean\n");
    expect(result.exitCode).toBe(0);
  });

  it("does not invoke hostSpawn for shell builtins", async () => {
    const bash = new Bash();
    const calls: Array<{ command: string; args: string[] }> = [];

    // Use a minimal state via Bash internals
    const state = (bash as unknown as { state: InterpreterState }).state;
    const commands = (bash as unknown as { commands: Map<string, Command> })
      .commands;
    const fs = (
      bash as unknown as { fs: import("../fs/interface.js").IFileSystem }
    ).fs;
    const limits = resolveLimits({});

    const interpreter = new Interpreter(
      {
        fs,
        commands,
        limits,
        exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
        hostSpawn: async (command, args) => {
          calls.push({ command, args });
          return { stdout: "", stderr: "", exitCode: 127 };
        },
      },
      state,
    );

    const ast = parse("export FOO=bar && echo $FOO");
    const result = await interpreter.executeScript(ast);

    expect(calls).toEqual([]);
    expect(result.stdout).toBe("bar\n");
  });

  it("dispatches registered commands directly when hostSpawn is present", async () => {
    // Scenario: embedder provides hostSpawn (e.g. demi's HostBackedFileSystem
    // has no /bin/editor stub) AND registers a TS-implemented command named
    // "editor". The registered command must be dispatched to its TS impl,
    // not fall through to PATH resolution (which would 127 without a stub)
    // and not be sent to hostSpawn.
    const calls: Array<{ command: string; args: string[] }> = [];
    const editorCalls: Array<{ args: string[]; cwd: string }> = [];

    const state: InterpreterState = {
      env: new Map([
        ["HOME", "/home/user"],
        ["PATH", "/usr/bin:/bin"],
        ["IFS", " \t\n"],
        ["PWD", "/home/user"],
        ["SHELLOPTS", ""],
        ["BASHOPTS", ""],
      ]),
      cwd: "/home/user",
      previousDir: "/home/user",
      functions: new Map(),
      localScopes: [],
      callDepth: 0,
      sourceDepth: 0,
      commandCount: 0,
      lastExitCode: 0,
      lastArg: "",
      startTime: Date.now(),
      lastBackgroundPid: 0,
      virtualPid: 1,
      virtualPpid: 0,
      virtualUid: 1000,
      virtualGid: 1000,
      bashPid: 1,
      nextVirtualPid: 2,
      currentLine: 1,
      options: {
        errexit: false,
        pipefail: false,
        nounset: false,
        xtrace: false,
        verbose: false,
        posix: false,
        allexport: false,
        noclobber: false,
        noglob: false,
        noexec: false,
        vi: false,
        emacs: false,
      },
      shoptOptions: {
        extglob: false,
        dotglob: false,
        nullglob: false,
        failglob: false,
        globstar: false,
        globskipdots: true,
        nocaseglob: false,
        nocasematch: false,
        expand_aliases: false,
        lastpipe: false,
        xpg_echo: false,
      },
      inCondition: false,
      loopDepth: 0,
      exportedVars: new Set(["HOME", "PATH", "PWD"]),
      readonlyVars: new Set(["SHELLOPTS", "BASHOPTS"]),
      hashTable: new Map(),
    };

    const commands = new Map<string, Command>();
    const fs = new InMemoryFs();
    // Reproduce the demi HostBackedFileSystem gap: /usr/bin exists (so
    // resolveCommand's registry-fallback branch is skipped), but there is
    // no /usr/bin/editor stub (so PATH lookup for "editor" fails). Without
    // the direct dispatch fix, registered "editor" would 127 here.
    await fs.mkdir("/usr/bin", { recursive: true });
    const limits = resolveLimits({});

    const editorCommand: Command = {
      name: "editor",
      execute: async (args, ctx) => {
        editorCalls.push({ args, cwd: ctx.cwd });
        return {
          stdout: `editor ran with ${args.join(" ")}\n`,
          stderr: "",
          exitCode: 0,
        };
      },
    };
    commands.set("editor", editorCommand);

    const interpreter = new Interpreter(
      {
        fs,
        commands,
        limits,
        exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
        hostSpawn: async (command, args) => {
          calls.push({ command, args });
          return {
            stdout: "",
            stderr: `${command}: not found\n`,
            exitCode: 127,
          };
        },
      },
      state,
    );

    const ast = parse("editor foo bar");
    const result = await interpreter.executeScript(ast);

    expect(calls).toEqual([]); // hostSpawn must not be called for registered commands
    expect(editorCalls).toEqual([{ args: ["foo", "bar"], cwd: "/home/user" }]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("editor ran with foo bar\n");
  });

  it("dispatches background statements through jobControl when present", async () => {
    const bash = new Bash();
    const state = (bash as unknown as { state: InterpreterState }).state;
    const commands = (bash as unknown as { commands: Map<string, Command> })
      .commands;
    const fs = (
      bash as unknown as { fs: import("../fs/interface.js").IFileSystem }
    ).fs;
    const limits = resolveLimits({});
    const backgroundCalls: string[] = [];
    const hostCalls: Array<{ command: string; args: string[] }> = [];

    const interpreter = new Interpreter(
      {
        fs,
        commands,
        limits,
        exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
        hostSpawn: async (command, args) => {
          hostCalls.push({ command, args });
          return {
            stdout: "",
            stderr: `${command}: not found\n`,
            exitCode: 127,
          };
        },
        jobControl: {
          startBackground: async (statement: StatementNode) => {
            backgroundCalls.push(statement.sourceText ?? "");
            return { stdout: "[1] sh -c exit 5\n", stderr: "", exitCode: 0 };
          },
        },
      },
      state,
    );

    const result = await interpreter.executeScript(
      parse("sh -c 'exit 5' &\necho after"),
    );

    expect(backgroundCalls).toEqual(["sh -c 'exit 5' &"]);
    expect(hostCalls).toEqual([]);
    expect(result.stdout).toBe("[1] sh -c exit 5\nafter\n");
    expect(result.exitCode).toBe(0);
  });

  it("dispatches jobs and wait builtins through jobControl when present", async () => {
    const bash = new Bash();
    const state = (bash as unknown as { state: InterpreterState }).state;
    const commands = (bash as unknown as { commands: Map<string, Command> })
      .commands;
    const fs = (
      bash as unknown as { fs: import("../fs/interface.js").IFileSystem }
    ).fs;
    const limits = resolveLimits({});
    const calls: Array<{ hook: "jobs" | "wait"; args: string[] }> = [];

    const interpreter = new Interpreter(
      {
        fs,
        commands,
        limits,
        exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
        hostSpawn: async (command) => ({
          stdout: "",
          stderr: `${command}: not found\n`,
          exitCode: 127,
        }),
        jobControl: {
          jobs: async (args) => {
            calls.push({ hook: "jobs", args });
            return {
              stdout: "[1] Running sh -c exit 5\n",
              stderr: "",
              exitCode: 0,
            };
          },
          wait: async (args) => {
            calls.push({ hook: "wait", args });
            return { stdout: "done\n", stderr: "", exitCode: 7 };
          },
        },
      },
      state,
    );

    const result = await interpreter.executeScript(parse("jobs\nwait %1"));

    expect(calls).toEqual([
      { hook: "jobs", args: [] },
      { hook: "wait", args: ["%1"] },
    ]);
    expect(result.stdout).toBe("[1] Running sh -c exit 5\ndone\n");
    expect(result.exitCode).toBe(7);
  });
});

describe("preferHostSpawn routing", () => {
  function makeHarness(
    hostSpawnResult: (command: string) => import("../types.js").ExecResult,
  ) {
    const bash = new Bash();
    const state = (bash as unknown as { state: InterpreterState }).state;
    const commands = (bash as unknown as { commands: Map<string, Command> })
      .commands;
    const fs = (
      bash as unknown as { fs: import("../fs/interface.js").IFileSystem }
    ).fs;
    let spawnCalls = 0;
    let portableCalls = 0;
    commands.set("scan", {
      name: "scan",
      preferHostSpawn: true,
      execute: async () => {
        portableCalls += 1;
        return { stdout: "portable\n", stderr: "", exitCode: 0 };
      },
    });
    const interpreter = new Interpreter(
      {
        fs,
        commands,
        limits: resolveLimits({}),
        exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
        hostSpawn: async (command) => {
          spawnCalls += 1;
          return hostSpawnResult(command);
        },
      },
      state,
    );
    return {
      interpreter,
      counts: () => ({ spawnCalls, portableCalls }),
    };
  }

  it("routes a preferHostSpawn command to the host binary when it exists", async () => {
    const harness = makeHarness(() => ({
      stdout: "real\n",
      stderr: "",
      exitCode: 0,
    }));
    const result = await harness.interpreter.executeScript(
      parse("scan target"),
    );
    expect(result.stdout).toBe("real\n");
    expect(harness.counts()).toEqual({ spawnCalls: 1, portableCalls: 0 });
  });

  it("falls back to the portable implementation when the host has no binary, and remembers", async () => {
    const harness = makeHarness((command) => ({
      stdout: "",
      stderr: `${command}: command not found\n`,
      exitCode: 127,
    }));
    const first = await harness.interpreter.executeScript(parse("scan a"));
    expect(first.stdout).toBe("portable\n");
    const second = await harness.interpreter.executeScript(parse("scan b"));
    expect(second.stdout).toBe("portable\n");
    // Only the first invocation pays the probe; the miss is remembered.
    expect(harness.counts()).toEqual({ spawnCalls: 1, portableCalls: 2 });
  });

  it("treats a real exit 127 without a spawn-error marker as the command's own result", async () => {
    const harness = makeHarness(() => ({
      stdout: "",
      stderr: "scan: internal failure\n",
      exitCode: 127,
    }));
    const result = await harness.interpreter.executeScript(parse("scan a"));
    expect(result.exitCode).toBe(127);
    expect(result.stderr).toBe("scan: internal failure\n");
    expect(harness.counts()).toEqual({ spawnCalls: 1, portableCalls: 0 });
  });
});
