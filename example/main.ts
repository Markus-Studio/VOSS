const ws = new WebSocket('ws://127.0.0.1:8088/ws/');

ws.onopen = () => {
  const ab = new ArrayBuffer(24);
  ws.send(ab);

  const enc = new TextEncoder(); // always utf-8
  const text = enc.encode('This is a string converted to a Uint8Array');
  ws.send(text);
};

ws.onmessage = async event => {
  console.log('received', await event.data.arrayBuffer());
};
