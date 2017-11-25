import * as vscode from 'vscode';
import { VimState } from './../../mode/modeHandler';
import { NumericString } from './../../common/number/numericString';
import { Position } from './../../common/motion/position';
import { TextEditor } from './../../textEditor';
import { BaseAction } from './../base';


/**
 * A command is something like <escape>, :, v, i, etc.
 */
export abstract class BaseCommand extends BaseAction {
  /**
   * If isCompleteAction is true, then triggering this command is a complete action -
   * that means that we'll go and try to run it.
   */
  isCompleteAction = true;

  canBePrefixedWithCount = false;

  canBeRepeatedWithDot = false;

  /**
   * Run the command a single time.
   */
  public async exec(position: Position, vimState: VimState): Promise<VimState> {
    throw new Error("Not implemented!");
  }

  /**
   * Run the command the number of times VimState wants us to.
   */
  public async execCount(position: Position, vimState: VimState): Promise<VimState> {
    let timesToRepeat = this.canBePrefixedWithCount ? vimState.recordedState.count || 1 : 1;

    for (let i = 0; i < timesToRepeat; i++) {
      vimState = await this.exec(position, vimState);
    }

    return vimState;
  }
}

abstract class IncrementDecrementNumberAction extends BaseCommand {
  offset: number;

  public async exec(position: Position, vimState: VimState): Promise<VimState> {
    const text = TextEditor.getLineAt(position).text;

    for (let { start, end, word } of Position.IterateWords(position.getWordLeft(true))) {
      // '-' doesn't count as a word, but is important to include in parsing the number
      if (text[start.character - 1] === '-') {
        start = start.getLeft();
        word = text[start.character] + word;
      }
      // Strict number parsing so "1a" doesn't silently get converted to "1"
      const num = NumericString.parse(word);

      if (num !== null) {
        vimState.cursorPosition = await this.replaceNum(num, this.offset * (vimState.recordedState.count || 1), start, end);
        return vimState;
      }
    }
    // No usable numbers, return the original position
    return vimState;
  }

  public async replaceNum(start: NumericString, offset: number, startPos: Position, endPos: Position): Promise<Position> {
    const oldWidth = start.toString().length;
    start.value += offset;
    const newNum = start.toString();

    const range = new vscode.Range(startPos, endPos.getRight());

    if (oldWidth === newNum.length) {
      await TextEditor.replace(range, newNum);
    } else {
      // Can't use replace, since new number is a different width than old
      await TextEditor.delete(range);
      await TextEditor.insertAt(newNum, startPos);
      // Adjust end position according to difference in width of number-string
      endPos = new Position(endPos.line, endPos.character + (newNum.length - oldWidth));
    }

    return endPos;
  }
}

export class IncrementNumberAction extends IncrementDecrementNumberAction {
  offset = +1;
}

export class DecrementNumberAction extends IncrementDecrementNumberAction {
  offset = -1;
}
