import { Tardis, type Lazy } from "./tardis";

const { forwards, backwards } = Tardis.make<number, number>();

export const trappedWater = (heights: readonly number[]) => {
  const [columns] = Tardis.gen(function* () {
    const columns: Lazy<number>[] = [];
    for (const height of heights) {
      yield* forwards.update((left) => Math.max(left, height));
      const left = yield* forwards.get();
      const right = yield* backwards.get();
      yield* backwards.update((right) => Math.max(right, height));
      columns.push(() => Math.min(left, right()) - height);
    }
    return columns;
  }).run(0, 0);

  return columns.reduce((total, column) => total + column(), 0);
};
