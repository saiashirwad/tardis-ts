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
