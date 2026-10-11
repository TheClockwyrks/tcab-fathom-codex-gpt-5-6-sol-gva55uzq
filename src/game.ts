import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
export type Direction = "up" | "down" | "left" | "right";
export type Screen =
  | "title"
  | "howto"
  | "countdown"
  | "playing"
  | "paused"
  | "cleared"
  | "gameover";
type PState = "den" | "wander" | "chase" | "search";
type Body = { x: number; y: number; tx: number; ty: number; dir: Direction };
type Forager = Body & { moving: boolean };
type Drifter = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  lit: boolean;
  mind: boolean;
  travel: boolean;
  dir: Direction;
};
type Predator = Body & {
  kind: C.PredatorKind;
  state: PState;
  released: boolean;
  mind: boolean;
  travel: boolean;
  speed: number;
  alert: boolean;
  lit: boolean;
  detectRange: number | null;
  hearingRange: number | null;
  hearingLock: boolean | null;
  flareCharging: boolean | null;
  flaring: boolean | null;
  flareRadius: number | null;
  timer: number;
  releaseAt: number;
};
type Pulse = {
  source: "forager" | "gloamfin";
  tint: "cyan" | "violet" | "orange";
  ox: number;
  oy: number;
  front: number;
  range: number;
};
type Images = Record<string, ImageBitmap[]>;
export interface FathomState {
  version: number;
  screen: Screen;
  menuIndex: number | null;
  titleIndex: number;
  depth: number;
  score: number;
  lives: number;
  muted: boolean;
  planktonRemaining: number;
  drifterIn: number;
  brightness: number;
  brightHold: number;
  visionRadius: number;
  windowRadius: number;
  sonar: { ready: boolean; cooldown: number; range: number };
  ink: { ready: boolean; cooldown: number };
  grid: {
    cols: number;
    rows: number;
    tile: number;
    originX: number;
    originY: number;
  };
  tiles: string[];
  plankton: string[];
  visibility: string[];
  forager: Forager;
  drifters: Drifter[];
  predators: Predator[];
  pulses: Pulse[];
  inkClouds: { x: number; y: number; radius: number; remaining: number }[];
  simTime: number;
  accumulator: number;
  screenTimer: number;
  playTime: number;
  desired: Direction | null;
  images: Images;
}
type R = DeepReadonly<FathomState>;
type Rect = { x: number; y: number; w: number; h: number };
export interface FathomDebugApi {
  version: number;
  reset(s: R): FathomState;
  snapshot(s: R): Record<string, unknown>;
  reconcile(s: R): FathomState;
  setScreen(s: R, v: Screen): FathomState;
  setMenuIndex(s: R, v: number): FathomState;
  setTitleIndex(s: R, v: number): FathomState;
  menuItemRect(s: R, v: number): Rect | null;
  setScore(s: R, v: number): FathomState;
  setLives(s: R, v: number): FathomState;
  setDepth(s: R, v: number): FathomState;
  setMaze(s: R, v: string[]): FathomState;
  setPlankton(s: R, x: number, y: number, v: boolean): FathomState;
  clearPlankton(s: R): FathomState;
  clearFog(s: R): FathomState;
  setForagerTile(s: R, x: number, y: number): FathomState;
  setForagerDir(s: R, v: Direction): FathomState;
  setBrightness(s: R, v: number): FathomState;
  setBrightHold(s: R, v: number): FathomState;
  clearPredators(s: R): FathomState;
  addPredator(s: R, k: C.PredatorKind, x: number, y: number): FathomState;
  setPredatorTile(s: R, i: number, x: number, y: number): FathomState;
  setPredatorDir(s: R, i: number, v: Direction): FathomState;
  setPredatorState(s: R, i: number, v: "den" | "wander" | "chase"): FathomState;
  setPredatorReleased(s: R, i: number, v: boolean): FathomState;
  setPredatorMind(s: R, i: number, v: boolean): FathomState;
  setPredatorTravel(s: R, i: number, v: boolean): FathomState;
  spawnDrifter(s: R, x: number, y: number): FathomState;
  clearDrifters(s: R): FathomState;
  setDrifterMind(s: R, i: number, v: boolean): FathomState;
  setDrifterTravel(s: R, i: number, v: boolean): FathomState;
  setDrifterIn(s: R, v: number): FathomState;
  setSonarCooldown(s: R, v: number): FathomState;
  setInkCooldown(s: R, v: number): FathomState;
}
export const BACKGROUND = "#02070d";
const ds: Direction[] = ["up", "down", "left", "right"],
  vec: Record<Direction, [number, number]> = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  };
const cp = (x: number, y: number) => ({
  x: C.GRID_ORIGIN_X + x * C.TILE + 16,
  y: C.GRID_ORIGIN_Y + y * C.TILE + 16,
});
const cl = (s: R): FathomState => structuredClone(s) as unknown as FathomState;
const put = (a: readonly string[], x: number, y: number, v: string) =>
  a.map((r, i) => (i === y ? r.slice(0, x) + v + r.slice(x + 1) : r));
const err = (v: boolean) => {
  if (!v) throw new RangeError("Fathom debug: invalid argument");
};
function maze() {
  const a = Array.from({ length: C.GRID_ROWS }, () =>
    Array(C.GRID_COLS).fill("#"),
  );
  for (let y = 1; y < 17; y += 2) for (let x = 1; x < 35; x++) a[y][x] = ".";
  for (let x = 3; x < 35; x += 4) for (let y = 1; y < 17; y++) a[y][x] = ".";
  a[13][0] = a[13][35] = ".";
  for (let y = 7; y < 10; y++) for (let x = 16; x < 20; x++) a[y][x] = "d";
  a[6][17] = "g";
  a[5][17] = ".";
  return a.map((r) => r.join(""));
}
function predator(
  k: C.PredatorKind,
  i: number,
  x = 17,
  y = 8,
  loose = false,
): Predator {
  return {
    ...cp(x, y),
    tx: x,
    ty: y,
    dir: "up",
    kind: k,
    state: loose ? "wander" : "den",
    released: loose,
    mind: true,
    travel: true,
    speed: C.PREDATOR_SPEED,
    alert: false,
    lit: false,
    detectRange: k === "gloamfin" ? null : C.LANTERN_RANGE_BASE,
    hearingRange: k === "gloamfin" ? C.GLOAMFIN_HEAR : null,
    hearingLock: k === "gloamfin" ? false : null,
    flareCharging: k === "flarefish" ? false : null,
    flaring: k === "flarefish" ? false : null,
    flareRadius: k === "flarefish" ? 0 : null,
    timer: C.FLARE_INTERVAL,
    releaseAt: i * C.DEN_RELEASE_GAP,
  };
}
function fresh(images: Images, muted = false, titleIndex = 0) {
  const tiles = maze(),
    plankton = tiles.map((r) =>
      [...r].map((x) => (x === "." ? "*" : "-")).join(""),
    );
  return {
    version: 1,
    screen: "title",
    menuIndex: titleIndex,
    titleIndex,
    depth: 1,
    score: 0,
    lives: C.START_LIVES,
    muted,
    planktonRemaining: plankton.join("").match(/\*/g)?.length ?? 0,
    drifterIn: C.DRIFTER_INTERVAL,
    brightness: 0,
    brightHold: 0,
    visionRadius: C.VISION_MIN,
    windowRadius: C.KINDLE_VISION_MIN,
    sonar: { ready: true, cooldown: 0, range: C.SONAR_RANGE_BASE },
    ink: { ready: true, cooldown: 0 },
    grid: {
      cols: C.GRID_COLS,
      rows: C.GRID_ROWS,
      tile: C.TILE,
      originX: C.GRID_ORIGIN_X,
      originY: C.GRID_ORIGIN_Y,
    },
    tiles,
    plankton,
    visibility: Array(18).fill("u".repeat(36)),
    forager: { ...cp(3, 15), tx: 3, ty: 15, dir: "left", moving: false },
    drifters: [],
    predators: C.DEN_ORDER.map((k, i) => predator(k, i)),
    pulses: [],
    inkClouds: [],
    simTime: 0,
    accumulator: 0,
    screenTimer: 0,
    playTime: 0,
    desired: null,
    images,
  } as FathomState;
}
function rec(s: R) {
  const n = cl(s);
  n.visionRadius = C.VISION_MIN + C.VISION_GAIN * n.brightness;
  n.windowRadius = C.KINDLE_VISION_MIN + C.KINDLE_VISION_GAIN * n.brightness;
  n.sonar.ready = n.sonar.cooldown <= 0;
  n.sonar.range = Math.max(C.SONAR_RANGE_MIN, C.SONAR_RANGE_BASE - n.depth + 1);
  n.ink.ready = n.ink.cooldown <= 0;
  n.planktonRemaining = n.plankton.join("").match(/\*/g)?.length ?? 0;
  return n;
}
const rects = [
  { x: 470, y: 392, w: 340, h: 54 },
  { x: 470, y: 458, w: 340, h: 54 },
  { x: 470, y: 524, w: 340, h: 54 },
];
function api(images: Images): FathomDebugApi {
  const b = (s: R) => cl(s),
    at = (s: R, x: number, y: number) => err(s.tiles[y]?.[x] === ".");
  const pi = (s: R, i: number) => err(!!s.predators[i]),
    di = (s: R, i: number) => err(!!s.drifters[i]);
  return {
    version: 1,
    reset: (s) => fresh(images, s.muted),
    snapshot: (s) => {
      const n = cl(s);
      const { images, accumulator, screenTimer, playTime, desired, ...o } = n;
      void images;
      void accumulator;
      void screenTimer;
      void playTime;
      void desired;
      return o;
    },
    reconcile: rec,
    setScreen: (s, v) => {
      const n = b(s);
      n.screen = v;
      n.menuIndex =
        v === "title"
          ? n.titleIndex
          : v === "paused" || v === "gameover"
            ? 0
            : null;
      return n;
    },
    setMenuIndex: (s, v) => ({ ...b(s), menuIndex: v }),
    setTitleIndex: (s, v) => ({ ...b(s), titleIndex: v }),
    menuItemRect: (s, v) =>
      v >= 0 &&
      v <
        (s.screen === "paused"
          ? 3
          : s.screen === "title" || s.screen === "gameover"
            ? 2
            : 0)
        ? rects[v]
        : null,
    setScore: (s, v) => {
      err(Number.isInteger(v) && v >= 0);
      return { ...b(s), score: v };
    },
    setLives: (s, v) => {
      err(Number.isInteger(v) && v >= 0);
      return { ...b(s), lives: v };
    },
    setDepth: (s, v) => {
      err(Number.isInteger(v) && v > 0);
      const n = b(s);
      n.depth = v;
      n.predators = C.DEN_ORDER.map((k, i) => predator(k, i));
      return rec(n);
    },
    setMaze: (s, v) => {
      err(
        v.length === 18 &&
          v.every((x) => x.length === 36 && /^[#.gd]+$/.test(x)),
      );
      return { ...b(s), tiles: [...v] };
    },
    setPlankton: (s, x, y, v) => {
      at(s, x, y);
      const n = b(s);
      n.plankton = put(n.plankton, x, y, v ? "*" : "-");
      return rec(n);
    },
    clearPlankton: (s) => ({
      ...b(s),
      plankton: Array(18).fill("-".repeat(36)),
      planktonRemaining: 0,
    }),
    clearFog: (s) => ({ ...b(s), visibility: Array(18).fill("u".repeat(36)) }),
    setForagerTile: (s, x, y) => {
      at(s, x, y);
      const n = b(s);
      n.forager = { ...n.forager, ...cp(x, y), tx: x, ty: y, moving: false };
      return n;
    },
    setForagerDir: (s, v) => {
      const n = b(s);
      n.forager.dir = v;
      n.forager.moving = false;
      return n;
    },
    setBrightness: (s, v) => {
      err(v >= 0 && v <= 1);
      return rec({ ...b(s), brightness: v });
    },
    setBrightHold: (s, v) => ({ ...b(s), brightHold: v }),
    clearPredators: (s) => ({ ...b(s), predators: [] }),
    addPredator: (s, k, x, y) => {
      at(s, x, y);
      const n = b(s);
      n.predators.push(predator(k, n.predators.length, x, y, true));
      return n;
    },
    setPredatorTile: (s, i, x, y) => {
      pi(s, i);
      const n = b(s);
      Object.assign(n.predators[i], cp(x, y), { tx: x, ty: y });
      return n;
    },
    setPredatorDir: (s, i, v) => {
      pi(s, i);
      const n = b(s);
      n.predators[i].dir = v;
      return n;
    },
    setPredatorState: (s, i, v) => {
      pi(s, i);
      const n = b(s);
      n.predators[i].state = v;
      return n;
    },
    setPredatorReleased: (s, i, v) => {
      pi(s, i);
      const n = b(s);
      n.predators[i].released = v;
      return n;
    },
    setPredatorMind: (s, i, v) => {
      pi(s, i);
      const n = b(s);
      n.predators[i].mind = v;
      return n;
    },
    setPredatorTravel: (s, i, v) => {
      pi(s, i);
      const n = b(s);
      n.predators[i].travel = v;
      return n;
    },
    spawnDrifter: (s, x, y) => {
      at(s, x, y);
      const n = b(s);
      n.drifters.push({
        ...cp(x, y),
        tx: x,
        ty: y,
        dir: "up",
        lit: false,
        mind: true,
        travel: true,
      });
      return n;
    },
    clearDrifters: (s) => ({ ...b(s), drifters: [] }),
    setDrifterMind: (s, i, v) => {
      di(s, i);
      const n = b(s);
      n.drifters[i].mind = v;
      return n;
    },
    setDrifterTravel: (s, i, v) => {
      di(s, i);
      const n = b(s);
      n.drifters[i].travel = v;
      return n;
    },
    setDrifterIn: (s, v) => ({ ...b(s), drifterIn: v }),
    setSonarCooldown: (s, v) =>
      rec({ ...b(s), sonar: { ...s.sonar, cooldown: v } }),
    setInkCooldown: (s, v) => rec({ ...b(s), ink: { ...s.ink, cooldown: v } }),
  };
}
function tick(s: R) {
  const n = rec(s);
  n.simTime += C.TICK_DT;
  if (n.screen === "countdown" && (n.screenTimer -= C.TICK_DT) <= 0)
    n.screen = "playing";
  if (n.screen !== "playing") return n;
  n.playTime += C.TICK_DT;
  n.sonar.cooldown = Math.max(0, n.sonar.cooldown - C.TICK_DT);
  n.ink.cooldown = Math.max(0, n.ink.cooldown - C.TICK_DT);
  if (n.brightHold > 0) n.brightHold -= C.TICK_DT;
  else n.brightness *= Math.pow(0.5, C.TICK_DT / C.BRIGHT_HALFLIFE);
  if (n.forager.moving && n.desired) {
    const [dX, dY] = vec[n.desired],
      nx = n.forager.x + dX * C.FORAGER_SPEED * C.TICK_DT,
      ny = n.forager.y + dY * C.FORAGER_SPEED * C.TICK_DT,
      tx = Math.floor((nx - C.GRID_ORIGIN_X) / 32),
      ty = Math.floor((ny - C.GRID_ORIGIN_Y) / 32);
    if (n.tiles[ty]?.[tx] === ".") {
      Object.assign(n.forager, { x: nx, y: ny, tx, ty, dir: n.desired });
    }
  }
  if (n.plankton[n.forager.ty][n.forager.tx] === "*") {
    n.plankton = put(n.plankton, n.forager.tx, n.forager.ty, "-");
    n.score += C.SCORE_PLANKTON;
    n.brightness = Math.min(1, n.brightness + C.BRIGHT_PER_EAT);
    n.brightHold = C.BRIGHT_HOLD;
  }
  n.pulses = n.pulses
    .map((p) => ({ ...p, front: p.front + C.SONAR_WAVE_SPEED * C.TICK_DT }))
    .filter((p) => p.front <= p.range);
  n.inkClouds = n.inkClouds
    .map((x) => ({ ...x, remaining: x.remaining - C.TICK_DT }))
    .filter((x) => x.remaining > 0);
  return rec(n);
}
function text(
  c: CanvasRenderingContext2D,
  t: string,
  x: number,
  y: number,
  z = 24,
  col = "#dfffff",
) {
  c.font = `700 ${z}px monospace`;
  c.textAlign = "center";
  c.fillStyle = col;
  c.fillText(t, x, y);
}
function menu(c: CanvasRenderingContext2D, a: readonly string[], i: number) {
  a.forEach((t, j) => {
    const r = rects[j];
    c.fillStyle = j === i ? "#123c48" : "#07151e";
    c.fillRect(r.x, r.y, r.w, r.h);
    text(c, t, 640, r.y + 36, 20, j === i ? "#9ffff4" : "#678b95");
  });
}
export const game: Game<FathomState, FathomDebugApi> = {
  async initialize(a: InitApi<FathomState>) {
    for (const x of C.ACTIONS)
      a.input.register(x, { keys: [...C.BINDINGS[x]] });
    for (const x of Object.values(C.CUES))
      a.audio.define(x, { freq: 440, durationMs: 150 });
    const images: Images = {};
    for (const [n, k] of [
      ["glimmerfin", 8],
      ["lanternjaw", 16],
      ["gloamfin", 8],
      ["flarefish", 8],
      ["drifter", 8],
      ["flare-bloom", 8],
      ["trench-walls", 19],
    ] as const)
      images[n] = await Promise.all(
        Array.from({ length: k }, (_, i) =>
          a.assets.loadImage(`${n}/${i}.png`),
        ),
      );
    a.diagnostics.register("screen", (s) => s.screen);
    a.diagnostics.register("depth", (s) => s.depth);
    a.diagnostics.register("score", (s) => s.score);
    a.diagnostics.register("lives", (s) => s.lives);
    return [fresh(images), api(images)];
  },
  update(s, a: UpdateApi, dt) {
    let n = cl(s);
    if (a.input.pressed("mute")) a.audio.setMuted(!a.audio.muted());
    n.muted = a.audio.muted();
    if (n.screen === "playing") {
      n.desired = ds.find((x) => a.input.value(x) > 0) ?? null;
      n.forager.moving = !!n.desired;
      if (a.input.pressed("pause")) {
        n.screen = "paused";
        n.menuIndex = 0;
      }
      if (a.input.pressed("a") && n.sonar.ready) {
        n.sonar.cooldown = C.SONAR_COOLDOWN;
        n.pulses.push({
          source: "forager",
          tint: "cyan",
          ox: n.forager.tx,
          oy: n.forager.ty,
          front: 0,
          range: n.sonar.range,
        });
        a.audio.play(C.CUES.sonar);
      }
      if (a.input.pressed("b") && n.ink.ready) {
        n.ink.cooldown = C.INK_COOLDOWN;
        n.inkClouds.push({
          x: n.forager.x,
          y: n.forager.y,
          radius: C.INK_RADIUS,
          remaining: C.INK_LIFE,
        });
        a.audio.play(C.CUES.ink);
      }
    } else if (n.screen === "title" && a.input.pressed("confirm")) {
      n.titleIndex = n.menuIndex ?? 0;
      if (n.titleIndex === 1) {
        n.screen = "howto";
        n.menuIndex = null;
      } else {
        n.screen = "countdown";
        n.menuIndex = null;
        n.screenTimer = 3;
      }
    } else if (
      n.screen === "howto" &&
      (a.input.pressed("confirm") || a.input.pressed("back"))
    ) {
      n.screen = "title";
      n.menuIndex = n.titleIndex;
    }
    n.accumulator += Math.max(0, dt);
    while (n.accumulator >= C.TICK_DT) {
      n.accumulator -= C.TICK_DT;
      n = tick(n);
    }
    return n;
  },
  render(s, a: RenderApi) {
    const c = a.ctx;
    c.fillStyle = BACKGROUND;
    c.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
    if (s.screen === "title") {
      text(c, C.TITLE_TEXT, 640, 230, 104, "#9afff4");
      text(c, C.TAGLINE_TEXT, 640, 290, 19, "#4ba4b5");
      menu(c, C.TITLE_ITEMS, s.menuIndex ?? 0);
      return;
    }
    if (s.screen === "howto") {
      text(c, "HOW TO PLAY", 640, 150, 48);
      text(c, "ARROWS / WASD  SWIM", 640, 280);
      text(c, "SPACE  SONAR     SHIFT  INK", 640, 330);
      text(c, "GRAZE EVERY LIGHT. EVADE THE HUNTERS.", 640, 420, 18);
      return;
    }
    for (let y = 0; y < 18; y++)
      for (let x = 0; x < 36; x++) {
        const px = C.GRID_ORIGIN_X + x * 32,
          py = C.GRID_ORIGIN_Y + y * 32,
          wall = s.tiles[y][x] === "#";
        c.globalAlpha = 0.8;
        c.drawImage(s.images["trench-walls"][wall ? 15 : 16], px, py, 32, 32);
        if (s.plankton[y][x] === "*") {
          c.fillStyle = "#8ffff4";
          c.fillRect(px + 13, py + 13, 6, 6);
        }
      }
    c.globalAlpha = 1;
    c.drawImage(s.images.glimmerfin[0], s.forager.x - 16, s.forager.y - 16);
    text(c, String(s.score).padStart(6, "0"), 150, 52, 36);
    text(c, `DEPTH ${s.depth}`, 1110, 48, 20);
    if (s.screen === "countdown")
      text(c, String(Math.ceil(s.screenTimer)), 640, 390, 90);
    if (s.screen === "paused") menu(c, C.PAUSE_ITEMS, s.menuIndex ?? 0);
  },
};
