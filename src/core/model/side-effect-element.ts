import {
  ExecutableElement,
  type ExecutableElementParams,
} from "./executable-element";

export class SideEffectElement extends ExecutableElement {
  constructor(params: Omit<ExecutableElementParams, "type">) {
    super({ ...params, type: "sideEffect" });
  }
}
