type TxState = {
  committed: boolean;
  callbacks: Array<() => void | Promise<void>>;
};

export type Transaction = {
  onCommit(cb: () => void | Promise<void>): void;
};

export async function withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const state: TxState = { committed: false, callbacks: [] };

  const tx: Transaction = {
    onCommit(cb) {
      state.callbacks.push(cb);
    }
  };

  try {
    const result = await fn(tx);
    state.committed = true;
    for (const cb of state.callbacks) await cb();
    return result;
  } finally {
    if (!state.committed) state.callbacks = [];
  }
}

