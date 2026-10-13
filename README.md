```ts
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

if (import.meta.main) {
  console.log(neighbors([1, 2, 3]));
}
```

```console
$ bun neighbors.ts
[
  [ undefined, 1, 2 ], [ 1, 2, 3 ], [ 2, 3, undefined ]
]
```

```ts
import { Tardis, type Lazy } from "./tardis";

export type Instruction = { label: string } | { jump: string } | { op: string };

type Labels = Readonly<Record<string, number>>;

const { forwards, backwards } = Tardis.make<Labels, { address: number; labels: Labels }>();

export const assemble = (program: readonly Instruction[]) => {
  const [lines] = Tardis.gen(function* () {
    const lines: Lazy<string>[] = [];
    for (const instruction of program) {
      const { address, labels } = yield* forwards.get();

      if ("label" in instruction) {
        const label = { [instruction.label]: address };
        yield* forwards.set({ address, labels: { ...labels, ...label } });
        yield* backwards.update((later) => ({ ...later, ...label }));
        continue;
      }

      const later = yield* backwards.get();
      yield* forwards.set({ address: address + 1, labels });
      if ("op" in instruction) {
        lines.push(() => `${address}: ${instruction.op}`);
      } else {
        lines.push(() => `${address}: jump ${labels[instruction.jump] ?? later()[instruction.jump]}`);
      }
    }
    return lines;
  }).run({}, { address: 0, labels: {} });

  return lines.map((line) => line());
};

if (import.meta.main) {
  console.log(assemble([
    { label: "start" },
    { op: "push" },
    { jump: "end" },
    { jump: "start" },
    { label: "end" },
    { op: "pop" },
  ]));
}
```

```console
$ bun assembler.ts
[ "0: push", "1: jump 3", "2: jump 0", "3: pop" ]
```

```ts
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

if (import.meta.main) {
  console.log(trappedWater([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]));
}
```

```console
$ bun rainwater.ts
6
```

```ts
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

if (import.meta.main) {
  console.log(thread(["time travel is real", "the proof is this numbering", "fin"]));
}
```

```console
$ bun thread.ts
[ "1/3 time travel is real", "2/3 the proof is this numbering", "3/3 fin" ]
```

```ts
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
```

```console
$ bun santa.ts
[ "Ann → Bob", "Bob → Cat", "Cat → Ann" ]
```

```ts
import { noState, Tardis, type Lazy } from "./tardis";

const { backwards } = Tardis.make<number, never>();

export const countdown = (steps: readonly string[]) => {
  const [lines] = Tardis.gen(function* () {
    const lines: Lazy<string>[] = [];
    for (const step of steps) {
      yield* backwards.update((remaining) => remaining + 1);
      const remaining = yield* backwards.get();
      lines.push(() => `T-${remaining()} ${step}`);
    }
    return lines;
  }).run(0, noState);

  return lines.map((line) => line());
};

if (import.meta.main) {
  console.log(countdown(["ignition", "clamps release", "liftoff"]));
}
```

```console
$ bun countdown.ts
[ "T-2 ignition", "T-1 clamps release", "T-0 liftoff" ]
```
