import {
  ExecutableElement,
  type ExecutableElementParams,
} from "./executable-element";

export class ControllingElement extends ExecutableElement {
  constructor(params: Omit<ExecutableElementParams, "type">) {
    super({ ...params, type: "controlling" });
  }
}
