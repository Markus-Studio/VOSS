import { rnd } from './rand';

export function generateUUID(time: number, hostID: number): string {
  const buffer = new ArrayBuffer(16);
  const view = new DataView(buffer);

  view.setFloat64(0, time, true);
  const a = view.getUint32(4);

  view.setFloat64(0, time, false);
  view.setUint32(4, hostID, false);
  view.setUint32(8, rnd.rnd32(), false);
  view.setUint32(12, a, false);

  const p = (n: number) =>
    view
      .getUint32(n * 4, false)
      .toString(16)
      .padStart(8, '0');
  return p(0) + p(1) + p(2) + p(3);
}
