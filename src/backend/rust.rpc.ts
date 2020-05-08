import { PrettyWriter } from './writer';
import { Program } from '../ir/program';
import { generateObjectStruct, generateEnum } from './rust';

export function generateRPC(writer: PrettyWriter, program: Program): void {
  writer.write(`pub mod rpc {
  use super::voss_runtime::{VossReader, VossBuilder};
  use super::voss_runtime;
  use actix::*;
  use actix_web_actors::ws;
  use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
  
  const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
  const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);\n`);

  const rpc = program.getRPC();

  for (const message of rpc.getCases()) {
    const object = message.type.asObject();
    generateObjectStruct(writer, object, true);
  }

  generateEnum(writer, rpc);
  generateWebSocket(writer, program);

  writer.write('}\n');
}

function generateWebSocket(writer: PrettyWriter, program: Program) {
  writer.write(`
  pub struct WsSession {
    hb: Instant,
  }

  impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
      // Start sending heartbeat messages.
      self.hb(ctx);
    }

    fn stopping(&mut self, _: &mut Self::Context) -> Running {
      Running::Stop
    }
  }

  impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
      fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
          let msg = match msg {
              Err(_) => {
                  ctx.close(None);
                  return;
              }
              Ok(msg) => msg,
          };

          let msg = match msg {
              ws::Message::Ping(msg) => {
                self.hb = Instant::now();
                ctx.pong(&msg);
                return;
              },
              ws::Message::Pong(_) => {
                self.hb = Instant::now();
                return;
              },
              ws::Message::Close(_) | ws::Message::Continuation(_) | ws::Message::Text(_) => {
                ctx.close(None);
                return;
              },
              ws::Message::Binary(bin) => match VossReader::deserialize_enum::<RPCMessage>(&bin) {
                Ok(msg) => msg,
                Err(_) => {
                    ctx.close(None);
                    return;
                }
              },
              ws::Message::Nop => return,
          };

          match msg {
            RPCMessage::Clock(_) => {
              let result = RPCMessage::Clock(ClockMessage::new(now()));
              ctx.binary(VossBuilder::serialize_enum(&result).unwrap());
            },
            _ => unimplemented!()
          }
      }
  }

  impl WsSession {
    pub fn new() -> WsSession {
      WsSession {
        hb: Instant::now()
      }
    }

    fn hb(&self, ctx: &mut ws::WebsocketContext<Self>) {
      ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
        if Instant::now().duration_since(act.hb) > CLIENT_TIMEOUT {
            ctx.stop();
            return;
        }
        ctx.ping(b"");
      });
    }
  }

  fn now() -> f64 {
    let duration = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    duration.as_millis() as f64
  }\n`);
}
