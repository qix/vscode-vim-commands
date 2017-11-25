import { Position } from './../common/motion/position';

export class RecordedState {
  count: number;
}
export class VimState {
  cursorPosition: Position;
  recordedState: RecordedState;

  constructor() {
    this.recordedState = new RecordedState();
  }
}
