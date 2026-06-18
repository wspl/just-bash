/**
 * continue - Skip to next loop iteration builtin
 */

import type { ExecResult } from "../../types.js";
import {
  BreakError,
  BuiltinFatalError,
  ContinueError,
  SubshellExitError,
} from "../errors.js";
import { result } from "../helpers/result.js";
import type { InterpreterContext } from "../types.js";

export function handleContinue(
  ctx: InterpreterContext,
  args: string[],
): ExecResult {
  // Check if we're in a loop
  if (ctx.state.loopDepth === 0) {
    // If we're in a subshell spawned from a loop context, exit the subshell
    if (ctx.state.parentHasLoopContext) {
      throw new SubshellExitError();
    }
    return result("", "bash: continue: only meaningful in a loop\n", 0);
  }

  // bash: too many arguments is an error (exit code 1)
  if (args.length > 1) {
    throw new BuiltinFatalError(1, "", "bash: continue: too many arguments\n");
  }

  let levels = 1;
  if (args.length > 0) {
    const n = Number.parseInt(args[0], 10);
    if (Number.isNaN(n)) {
      throw new BuiltinFatalError(
        128,
        "",
        `bash: continue: ${args[0]}: numeric argument required\n`,
      );
    }
    if (n < 1) {
      throw new BreakError(1, "", "bash: continue: loop count out of range\n");
    }
    levels = n;
  }

  throw new ContinueError(levels);
}
