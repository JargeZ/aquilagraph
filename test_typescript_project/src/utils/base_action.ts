export abstract class BaseBusinessAction<Input = void, Output = void> {
  abstract execute(input: Input): Promise<Output> | Output;
}
