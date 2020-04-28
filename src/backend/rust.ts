import { Program } from '../ir/program';
import { PrettyWriter } from './writer';

export function generateRustServer(program: Program): string {
  const writer = new PrettyWriter();

  writer.write('use actix_web_actors::ws;\n');
  writer.write('pub struct VossWebSocket {\n');
  writer.write('userUUID: [u8;16];\n');
  writer.write('}\n');

  return writer.getSource();
}
