import * as VOSS from '../test-voss';


function main() {
  const server = 'ws://127.0.0.1:8088/ws/';
  const session = new VOSS.RPC.VossSession(server);
}

window.addEventListener('load', () => main());