export type Lazy<A> = () => A;

export const noState = undefined as never;

const deferred = <A>() => {
  let source: Lazy<A> | undefined;
  let cached: { value: A } | undefined;
  return {
    await: (): A => {
      if (!source) throw new Error("Read the future before it was sent");
      return (cached ??= { value: source() }).value;
    },
    succeed: (value: Lazy<A>) => {
      source = value;
    },
  };
};

type Backwards<T> = T extends Tardis<infer BW, unknown, unknown> ? BW : never;
type Forwards<T> = T extends Tardis<unknown, infer FW, unknown> ? FW : never;

export interface Tardis<out BW, out FW, out A> {
  step(bw: Lazy<BW>, fw: FW): [A, Lazy<BW>, FW];
}

export class Tardis<out BW, out FW, out A> {
  constructor(step: (bw: Lazy<BW>, fw: FW) => [A, Lazy<BW>, FW]) {
    this.step = step;
  }

  static of<A>(a: A): Tardis<never, never, A> {
    return new Tardis((bw, fw) => [a, bw, fw]);
  }

  static make<BW, FW>() {
    return {
      forwards: {
        get: () => new Tardis<BW, FW, FW>((bw, fw) => [fw, bw, fw]),
        set: (fw: FW) => new Tardis<BW, FW, void>((bw) => [undefined, bw, fw]),
        update: (f: (fw: FW) => FW) => new Tardis<BW, FW, void>((bw, fw) => [undefined, bw, f(fw)]),
      },
      backwards: {
        get: () => new Tardis<BW, FW, Lazy<BW>>((bw, fw) => [bw, bw, fw]),
        set: (bw: BW) => new Tardis<BW, FW, void>((_bw, fw) => [undefined, () => bw, fw]),
        update: (f: (bw: BW) => BW) => new Tardis<BW, FW, void>((bw, fw) => [undefined, () => f(bw()), fw]),
      },
    };
  }

  flatMap<B>(f: (a: A) => Tardis<BW, FW, B>): Tardis<BW, FW, B> {
    return new Tardis((bw, fw) => {
      const middle = deferred<BW>();
      const [a, past, fwMiddle] = this.step(middle.await, fw);
      const [b, bwMiddle, future] = f(a).step(bw, fwMiddle);
      middle.succeed(bwMiddle);
      return [b, past, future];
    });
  }

  map<B>(f: (a: A) => B): Tardis<BW, FW, B> {
    return this.flatMap((a) => Tardis.of(f(a)));
  }

  *[Symbol.iterator](): Generator<Tardis<BW, FW, A>, A, A> {
    return yield this;
  }

  run(bw: BW, fw: FW): [A, BW, FW] {
    const [a, past, future] = this.step(() => bw, fw);
    return [a, past(), future];
  }

  static gen<T extends Tardis<unknown, unknown, unknown>, A>(
    body: () => Generator<T, A, any>,
  ): Tardis<Backwards<T>, Forwards<T>, A> {
    return new Tardis((bw, fw) => {
      const it = body();
      const loop = (state: IteratorResult<T, A>): Tardis<any, any, A> =>
        state.done ? Tardis.of(state.value) : state.value.flatMap((a) => loop(it.next(a)));
      return loop(it.next()).step(bw, fw);
    });
  }
}
