import type { Command, TreeState } from '../types';

/**
 * Groups several commands so they undo/redo as a single unit.
 *
 * Execute applies the commands in order. Undo reverses them in *reverse*
 * order so each command's `undo` runs against the state its `execute` left
 * behind.
 */
export class BatchCommand<TRow> implements Command<TRow> {
  readonly type = 'batch';
  readonly description: string;
  private readonly commands: Command<TRow>[];

  constructor(commands: Command<TRow>[], description?: string) {
    this.commands = commands;
    this.description = description ?? `Batch (${commands.length})`;
  }

  execute(state: TreeState<TRow>): TreeState<TRow> {
    let next = state;
    for (const cmd of this.commands) next = cmd.execute(next);
    return next;
  }

  undo(state: TreeState<TRow>): TreeState<TRow> {
    let next = state;
    for (let i = this.commands.length - 1; i >= 0; i--) {
      next = this.commands[i].undo(next);
    }
    return next;
  }
}
