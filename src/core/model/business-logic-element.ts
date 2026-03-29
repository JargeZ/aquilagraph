import {
  ExecutableElement,
  type ExecutableElementParams,
} from "./executable-element";

export class BusinessLogicElement extends ExecutableElement {
  constructor(params: Omit<ExecutableElementParams, "type">) {
    super({ ...params, type: "businessLogic" });
  }
}
