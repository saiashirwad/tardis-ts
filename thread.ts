import { noState, Tardis, type Lazy } from "./tardis";

const { forwards, backwards } = Tardis.make<number, number>();

export const thread = (posts: Iterable<string>) => {
  const [numbered] = Tardis.gen(function* () {
    const numbered: Lazy<string>[] = [];
    for (const post of posts) {
      yield* forwards.update((count) => count + 1);
      const position = yield* forwards.get();
      const total = yield* backwards.get();
      numbered.push(() => `${position}/${total()} ${post}`);
    }
    const count = yield* forwards.get();
    yield* backwards.set(count);
    return numbered;
  }).run(noState, 0);

  return numbered.map((post) => post());
};
