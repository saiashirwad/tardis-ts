import { assemble } from "./assembler";
import { countdown } from "./countdown";
import { neighbors } from "./neighbors";
import { trappedWater } from "./rainwater";
import { secretSanta } from "./santa";
import { thread } from "./thread";

console.log(neighbors([1, 2, 3]));

console.log(assemble([
  { label: "start" },
  { op: "push" },
  { jump: "end" },
  { jump: "start" },
  { label: "end" },
  { op: "pop" },
]));

console.log(trappedWater([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]));

console.log(thread(["time travel is real", "the proof is this numbering", "fin"]));

console.log(secretSanta(["Ann", "Bob", "Cat"]));

console.log(countdown(["ignition", "clamps release", "liftoff"]));
