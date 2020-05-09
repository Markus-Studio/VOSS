const buffer = new ArrayBuffer(16);
const view = new DataView(buffer);

const t0 = Date.now();
const t1 = t0 + 1000;

view.setFloat64(0, t0, true);
view.setFloat64(8, t1, true);

const u8 = [...new Uint8Array(buffer)];
console.log(u8.slice(0, 8));
console.log(u8.slice(8));