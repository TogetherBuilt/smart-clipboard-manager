import * as vscode from "vscode";
import { ClipboardManager } from "../manager";
import { ClipHistoryItem } from "../tree/history";
import { commandList } from "./common";

export class PinClipboardHistory implements vscode.Disposable {
  private _disposable: vscode.Disposable[] = [];

  constructor(protected _manager: ClipboardManager) {
    this._disposable.push(
      vscode.commands.registerCommand(
        commandList.pinClipboardHistory,
        this.execute,
        this
      )
    );
    this._disposable.push(
      vscode.commands.registerCommand(
        commandList.unpinClipboardHistory,
        this.execute,
        this
      )
    );
  }

  protected async execute(value: string | ClipHistoryItem) {
    if (value instanceof ClipHistoryItem) {
      value = value.clip.value;
    }

    this._manager.togglePinClip(value);
  }

  public dispose() {
    this._disposable.forEach(d => d.dispose());
  }
}
