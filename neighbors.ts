import { Tardis, type Lazy } from "./tardis";

export const neighbors = <A>(xs: readonly A[]) => {
  const { forwards, backwards } = Tardis.make<A | undefined, A | undefined>();

  const [rows] = Tardis.gen(function* () {
    const rows: [A | undefined, A, Lazy<A | undefined>][] = [];
    for (const x of xs) {
      const previous = yield* forwards.get();
      yield* forwards.set(x);
      yield* backwards.set(x);
      const next = yield* backwards.get();
      rows.push([previous, x, next]);
    }
    return rows;
  }).run(undefined, undefined);

  return rows.map(([previous, x, next]) => [previous, x, next()]);
};
