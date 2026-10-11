export const originalHeroFrames = [
  "01-eye",
  "02-eyes",
  "03-smile-start",
  "04-smile",
  "05-arm-start",
  "06-arm-raise",
  "07-hand-under-chin-close",
  "08-hand-under-chin",
  "09-sweep-start",
  "10-sweep-middle",
  "11-finishing-pose",
].map((name) => `/hero-frames/${name}.png`);

export function storyPosition(progress: number, count: number) {
  const p = Math.max(0, Math.min(1, progress));
  const position = Math.min(count - 1, (p / 0.86) * (count - 1));
  const index = Math.floor(position);
  const fraction = position - index;
  const blend = fraction * fraction * (3 - 2 * fraction);
  return {
    index,
    next: Math.min(count - 1, index + 1),
    blend,
    black: index < 6 ? Math.sin(Math.PI * fraction) ** 4 * 0.92 : 0,
  };
}
