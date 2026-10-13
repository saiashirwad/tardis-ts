import { noState, Tardis, type Lazy } from "./tardis";

const { forwards, backwards } = Tardis.make<string | undefined, string | undefined>();

export const secretSanta = (people: readonly string[]) => {
  const [gifts] = Tardis.gen(function* () {
    const gifts: [string, Lazy<string | undefined>][] = [];
    for (const person of people) {
      const first = yield* forwards.get();
      yield* forwards.set(first ?? person);
      yield* backwards.set(person);
      const receiver = yield* backwards.get();
      gifts.push([person, receiver]);
    }
    const first = yield* forwards.get();
    yield* backwards.set(first);
    return gifts;
  }).run(noState, undefined);

  return gifts.map(([giver, receiver]) => `${giver} → ${receiver()}`);
};

if (import.meta.main) {
  console.log(secretSanta(["Ann", "Bob", "Cat"]));
}
