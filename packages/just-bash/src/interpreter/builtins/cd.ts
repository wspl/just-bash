/**
 * cd - Change directory builtin
 */

import type { ExecResult } from "../../types.js";
import { failure, success } from "../helpers/result.js";
import type { InterpreterContext } from "../types.js";

export async function handleCd(
  ctx: InterpreterContext,
  args: string[],
): Promise<ExecResult> {
  let target: string;
  let printPath = false;
  let physical = false;

  // Parse options
  let i = 0;
  while (i < args.length) {
    if (args[i] === "--") {
      // End of options
      i++;
      break;
    } else if (args[i] === "-L") {
      physical = false;
      i++;
    } else if (args[i] === "-P") {
      physical = true;
      i++;
    } else if (args[i].startsWith("-") && args[i] !== "-") {
      // Unknown option - ignore for now
      i++;
    } else {
      break;
    }
  }

  // Get the target directory
  const remainingArgs = args.slice(i);
  if (remainingArgs.length > 1) {
    return failure("bash: cd: too many arguments\n", 2);
  }
  if (remainingArgs.length === 0 || remainingArgs[0] === "~") {
    if (!ctx.state.env.has("HOME")) {
      return failure("bash: cd: HOME not set\n");
    }
    target = ctx.state.env.get("HOME") ?? "";
  } else if (remainingArgs[0] === "-") {
    target = ctx.state.previousDir;
    printPath = true; // cd - prints the new directory
  } else {
    target = remainingArgs[0];
  }

  if (target === ".") {
    if (!(await cwdDirectoryExists(ctx))) {
      try {
        await ctx.hostCwd?.enter(".");
      } catch {
        return failure(`bash: cd: ${target}: No such file or directory\n`);
      }
      const nextPwd = `${ctx.state.cwd}/.`;
      ctx.state.previousDir = ctx.state.cwd;
      ctx.state.cwd = nextPwd;
      ctx.state.env.set("PWD", nextPwd);
      ctx.state.env.set("OLDPWD", ctx.state.previousDir);
      return {
        stdout: "",
        stderr:
          "cd: error retrieving current directory: getcwd: cannot access parent directories: No such file or directory\n",
        exitCode: 0,
      };
    }
  }

  if (target === ".." && !(await cwdDirectoryExists(ctx))) {
    const parent = parentDirectory(ctx.state.cwd);
    try {
      if (ctx.hostCwd) {
        try {
          await ctx.hostCwd.enter("..");
        } catch {
          await ctx.hostCwd.enter(parent);
        }
      } else {
        const parentStat = await ctx.fs.stat(parent);
        if (!parentStat.isDirectory) {
          return failure(`bash: cd: ${target}: Not a directory\n`);
        }
      }
    } catch {
      return failure(`bash: cd: ${target}: No such file or directory\n`);
    }
    ctx.state.previousDir = ctx.state.cwd;
    ctx.state.cwd = parent;
    ctx.state.env.set("PWD", parent);
    ctx.state.env.set("OLDPWD", ctx.state.previousDir);
    return success("");
  }

  // CDPATH support: if target doesn't start with / or ., search CDPATH directories
  // CDPATH is only used for relative paths that don't start with .
  if (
    !target.startsWith("/") &&
    !target.startsWith("./") &&
    !target.startsWith("../") &&
    target !== "." &&
    target !== ".."
  ) {
    const cdpath = ctx.state.env.get("CDPATH");
    if (cdpath) {
      const cdpathDirs = cdpath.split(":").filter((d) => d);
      for (const dir of cdpathDirs) {
        const candidate = dir.startsWith("/")
          ? `${dir}/${target}`
          : `${ctx.state.cwd}/${dir}/${target}`;
        try {
          const stat = await ctx.fs.stat(candidate);
          if (stat.isDirectory) {
            // Found in CDPATH - use this path and print it
            target = candidate;
            printPath = true;
            break;
          }
        } catch {
          // Directory doesn't exist in this CDPATH entry, continue
        }
      }
    }
  }

  // Check path components before normalization to catch cases like "nonexistent/.."
  // where the intermediate directory doesn't exist
  const pathToCheck = target.startsWith("/")
    ? target
    : `${ctx.state.cwd}/${target}`;
  const parts = pathToCheck.split("/").filter((p) => p && p !== ".");
  let currentPath = "";
  for (const part of parts) {
    if (part === "..") {
      // Go up one level
      currentPath = currentPath.split("/").slice(0, -1).join("/") || "/";
    } else {
      currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
      try {
        const stat = await ctx.fs.stat(currentPath);
        if (!stat.isDirectory) {
          return failure(`bash: cd: ${target}: Not a directory\n`);
        }
      } catch {
        return failure(`bash: cd: ${target}: No such file or directory\n`);
      }
    }
  }

  let newDir = currentPath || "/";

  if (physical) {
    try {
      newDir = await ctx.fs.realpath(newDir);
    } catch {
      return failure(`bash: cd: ${target}: No such file or directory\n`);
    }
  }

  try {
    await ctx.hostCwd?.enter(newDir);
  } catch {
    return failure(`bash: cd: ${target}: No such file or directory\n`);
  }

  ctx.state.previousDir = ctx.state.cwd;
  ctx.state.cwd = newDir;
  ctx.state.env.set("PWD", ctx.state.cwd);
  ctx.state.env.set("OLDPWD", ctx.state.previousDir);

  // cd - prints the new directory
  return success(printPath ? `${newDir}\n` : "");
}

async function cwdDirectoryExists(ctx: InterpreterContext): Promise<boolean> {
  try {
    const stat = await ctx.fs.stat(ctx.state.cwd);
    return stat.isDirectory;
  } catch {
    return false;
  }
}

function parentDirectory(path: string): string {
  const trimmed = path.replace(/\/+$/, "") || "/";
  if (trimmed === "/") return "/";
  const slash = trimmed.lastIndexOf("/");
  return slash <= 0 ? "/" : trimmed.slice(0, slash);
}
