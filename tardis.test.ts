import { expect, test } from "bun:test";
import fc from "fast-check";
import { noState, Tardis, type Lazy } from "./tardis";
import { neighbors } from "./neighbors";
import { assemble } from "./assembler";
import { countdown } from "./countdown";
import { trappedWater } from "./rainwater";
import { secretSanta } from "./santa";
import { thread } from "./thread";

type Op = { stream: "forwards" | "backwards"; kind: "get" | "set" | "update"; value: string };
type Observation = Lazy<string> | undefined;

const text = fc.string({ maxLength: 2 });
const ops = fc.array(fc.record({
  stream: fc.constantFrom("forwards", "backwards"),
  kind: fc.constantFrom("get", "set", "update"),
  value: text,
}), { maxLength: 12 });
const { forwards, backwards } = Tardis.make<string, string>();

const options = {
  numRuns: 300,
  seed: process.env.FC_SEED ? Number(process.env.FC_SEED) : undefined,
};

const model = (ops: readonly Op[], bw: string, fw: string) => {
  const seen = ops.map((): string | undefined => undefined);
  const play = (stream: Op["stream"], order: number[], state: string) => {
    for (const i of order) {
      const op = ops[i]!;
      if (op.stream !== stream) continue;
      if (op.kind === "get") seen[i] = state;
      if (op.kind === "set") state = op.value;
      if (op.kind === "update") state += op.value;
    }
    return state;
  };
  const indices = ops.map((_, i) => i);
  const forwards = play("forwards", indices, fw);
  const backwards = play("backwards", indices.reverse(), bw);
  return [seen, backwards, forwards];
};

const perform = ({ stream, kind, value }: Op) =>
  Tardis.gen(function* () {
    if (kind === "get" && stream === "forwards") {
      const fw = yield* forwards.get();
      return () => fw;
    }
    if (kind === "get") return yield* backwards.get();
    if (kind === "set" && stream === "forwards") yield* forwards.set(value);
    if (kind === "set" && stream === "backwards") yield* backwards.set(value);
    if (kind === "update" && stream === "forwards") yield* forwards.update((s) => s + value);
    if (kind === "update" && stream === "backwards") yield* backwards.update((s) => s + value);
  });

const sequenced = (ops: readonly Op[]) =>
  Tardis.gen(function* () {
    const seen: Observation[] = [];
    for (const op of ops) seen.push(yield* perform(op));
    return seen;
  });

const chained = (ops: readonly Op[]) =>
  ops.reduce(
    (program, op) => program.flatMap((seen) => perform(op).map((s) => [...seen, s])),
    Tardis.of<Observation[]>([]) as Tardis<string, string, Observation[]>,
  );

const observe = (program: Tardis<string, string, Observation[]>, bw: string, fw: string) => {
  const [seen, backwards, forwards] = program.run(bw, fw);
  return [seen.map((s) => s?.()), backwards, forwards];
};

test("gen and flatMap send forwards state down and backwards state up", () => {
  fc.assert(fc.property(ops, text, text, (ops, bw, fw) => {
    const expected = model(ops, bw, fw);
    expect(observe(sequenced(ops), bw, fw)).toEqual(expected);
    expect(observe(chained(ops), bw, fw)).toEqual(expected);
  }), options);
});

test("reading the future before it is sent throws", () => {
  const { backwards } = Tardis.make<number, never>();
  const eager = Tardis.gen(function* () {
    const later = yield* backwards.get();
    return later();
  });
  expect(() => eager.run(0, noState)).toThrow("Read the future before it was sent");
});

test("neighbors pairs each element with the previous and next element", () => {
  fc.assert(fc.property(fc.array(fc.integer()), (xs) => {
    expect(neighbors(xs)).toEqual(xs.map((x, i) => [xs[i - 1], x, xs[i + 1]]));
  }), options);
});

test("assemble resolves jumps to labels defined before and after them", () => {
  const name = fc.constantFrom("start", "loop", "end");
  const instruction = fc.oneof(
    fc.record({ label: name }),
    fc.record({ jump: name }),
    fc.record({ op: fc.constantFrom("push", "pop", "add") }),
  );
  fc.assert(fc.property(fc.array(instruction, { maxLength: 12 }), (raw) => {
    const program = raw.filter((x, i) =>
      !("label" in x) || raw.findIndex((y) => "label" in y && y.label === x.label) === i);
    const addresses = new Map<string, number>();
    let address = 0;
    for (const x of program) {
      if ("label" in x) addresses.set(x.label, address);
      else address++;
    }
    const expected = program
      .flatMap((x) => "op" in x ? [x.op] : "jump" in x ? [`jump ${addresses.get(x.jump)}`] : [])
      .map((line, i) => `${i}: ${line}`);
    expect(assemble(program)).toEqual(expected);
  }), options);
});

test("trappedWater fills each column up to the lower of its tallest neighbors", () => {
  fc.assert(fc.property(fc.array(fc.nat({ max: 10 }), { maxLength: 20 }), (heights) => {
    const expected = heights.reduce((total, height, i) =>
      total + Math.min(Math.max(...heights.slice(0, i + 1)), Math.max(...heights.slice(i))) - height, 0);
    expect(trappedWater(heights)).toBe(expected);
  }), options);
});

test("thread numbers posts from a single pass over any iterable", () => {
  fc.assert(fc.property(fc.array(fc.string()), (posts) => {
    expect(thread(posts.values())).toEqual(posts.map((post, i) => `${i + 1}/${posts.length} ${post}`));
  }), options);
});

test("secretSanta gives to the next person and wraps the last back to the first", () => {
  fc.assert(fc.property(fc.array(fc.string()), (people) => {
    expect(secretSanta(people)).toEqual(people.map((person, i) => `${person} → ${people[(i + 1) % people.length]}`));
  }), options);
});

test("countdown labels each step with how many steps follow it", () => {
  fc.assert(fc.property(fc.array(fc.string()), (steps) => {
    expect(countdown(steps)).toEqual(steps.map((step, i) => `T-${steps.length - 1 - i} ${step}`));
  }), options);
});
