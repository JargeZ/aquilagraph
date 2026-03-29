export type ElementType =
  | "controlling"
  | "businessLogic"
  | "sideEffect"
  | "unclassified";

export interface ExecutableElementParams {
  reference: string;
  module: string;
  className: string | null;
  name: string;
  type: ElementType;
  decorators: string[];
  parentClasses: string[];
  sourceFile: string;
  startLine: number;
  endLine: number;
}

export class ExecutableElement {
  readonly reference: string;
  readonly module: string;
  readonly className: string | null;
  readonly name: string;
  type: ElementType;
  readonly decorators: string[];
  readonly parentClasses: string[];
  readonly sourceFile: string;
  readonly startLine: number;
  readonly endLine: number;
  uses: ExecutableElement[] = [];

  constructor(params: ExecutableElementParams) {
    this.reference = params.reference;
    this.module = params.module;
    this.className = params.className;
    this.name = params.name;
    this.type = params.type;
    this.decorators = params.decorators;
    this.parentClasses = params.parentClasses;
    this.sourceFile = params.sourceFile;
    this.startLine = params.startLine;
    this.endLine = params.endLine;
  }
}
