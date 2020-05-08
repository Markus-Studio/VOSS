import { PrettyWriter } from './writer';
import { Program } from '../ir/program';
import { generateObjectStruct, generateEnum } from './rust';

export function generateRPC(writer: PrettyWriter, program: Program): void {
  writer.write(`pub mod rpc {
  use super::voss_runtime::{VossReader, VossBuilder};
  use actix::{Actor, StreamHandler};
  use actix_web_actors::ws;
  use std::time::{SystemTime, UNIX_EPOCH};\n`);

  const rpc = program.getRPC();

  for (const message of rpc.getCases()) {
    const object = message.type.asObject();
    generateObjectStruct(writer, object);
  }

  generateEnum(writer, rpc);
  generateWebSocket(writer, program);

  writer.write('}\n');
}

function generateWebSocket(writer: PrettyWriter, program: Program) {
  writer.write(`
  pub struct WebSocket;

  impl Actor for WebSocket {
    type Context = ws::WebsocketContext<Self>;
  }

  impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WebSocket {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
      match msg {
        Ok(ws::Message::Ping(bin)) => {
          match &VossReader::deserialize_enum::<_RPCMessage>(&bin) {
            Ok(msg) => self.handle_rpc_message(msg, ctx),
            Err(_) => {}
          }
        }
        Ok(ws::Message::Text(text)) => ctx.text(text),
        Ok(ws::Message::Binary(bin)) => ctx.binary(bin),
        _ => (),
      }
    }
  }

  impl WebSocket {
    #[inline(always)]
    fn handle_rpc_message(&mut self, msg: &_RPCMessage, ctx: &mut ws::WebsocketContext<Self>) {
      match msg {
        _RPCMessage::Clock(_) => {
          let result= _RPCMessage::Clock(super::_ClockData::new(now()));
          ctx.binary(VossBuilder::serialize_enum(&result).unwrap());
        }
        _ => unimplemented!()
      }
    }
  }

  fn now() -> f64 {
    let duration = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    duration.as_millis() as f64
  }\n`);
}
