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
