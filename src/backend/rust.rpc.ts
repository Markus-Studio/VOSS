import { PrettyWriter } from './writer';
import { Program } from '../ir/program';
import { generateObjectStruct, generateEnum } from './rust';

export function generateRPC(writer: PrettyWriter, program: Program): void {
  writer.write(`pub mod rpc {
  use super::voss_runtime::{VossReader, VossBuilder};
  use super::voss_runtime;
  use actix::*;
  use actix_web_actors::ws;
  use actix::prelude::{Message};
  use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
  use rand::{self, rngs::ThreadRng, Rng};
  use std::collections::HashMap;
  
  const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
  const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);\n`);

  const rpc = program.getRPC();

  for (const message of rpc.getCases()) {
    const object = message.type.asObject();
    generateObjectStruct(writer, object, true);
  }

  generateEnum(writer, rpc);
  generateEditor(writer, program);
  generateWebSocket(writer, program);

  writer.write('}\n');
}

function generateEditor(writer: PrettyWriter, program: Program): void {
  writer.write(`
  #[derive(Message)]
  #[rtype(u32)]
  pub struct Connect {
    pub addr: Recipient<RPCMessage>,
  }

  pub struct EditorServer {
    sessions: HashMap<u32, Recipient<RPCMessage>>,
    rng: ThreadRng,
  }

  impl EditorServer {
    pub fn open(name: &str) -> EditorServer {
      EditorServer {
        sessions: HashMap::new(),
        rng: rand::thread_rng(),
      }
    }
  }

  impl Actor for EditorServer {
    type Context = Context<Self>;
  }

  // Handler for Connect message.
  //
  // Register a new session in editor and assign a unique id.
  impl Handler<Connect> for EditorServer {
    type Result = u32;

    fn handle(&mut self, msg: Connect, _: &mut Context<Self>) -> Self::Result {
      let id = loop {
        let id = self.rng.gen::<u32>();
        if !self.sessions.contains_key(&id) {
          break id;
        }
      };

      self.sessions.insert(id, msg.addr);

      id
    }
  }
  `);
}

function generateWebSocket(writer: PrettyWriter, program: Program) {
  writer.write(`
  pub struct WsSession {
    id: u32,
    hb: Instant,
    editor: Addr<EditorServer>,
  }

  impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
      // Start sending heartbeat messages.
      self.hb(ctx);

      let addr = ctx.address();
      self.editor
        .send(Connect {
          addr: addr.recipient(),
        })
        .into_actor(self)
        .then(|res, act, ctx| {
          match res {
              Ok(res) => {
                act.id = res;
                let msg = RPCMessage::HostID(HostIDMessage::new(res));
                ctx.binary(VossBuilder::serialize_enum(&msg).unwrap());
              },
              // something is wrong with the editor.
              _ => ctx.stop(),
          }
          fut::ready(())
        })
        .wait(ctx);
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

  // Handle RPC messages sent from Editor, simply send it to peer websocket.
  impl Handler<RPCMessage> for WsSession {
    type Result = ();

    fn handle(&mut self, msg: RPCMessage, ctx: &mut Self::Context) {
      // Currently we serialize message here, which is wrong, it serializes
      // the same message per each peer. but it can be fixed later.
      ctx.binary(VossBuilder::serialize_enum(&msg).unwrap());
    }
  }

  impl WsSession {
    pub fn new(editor: Addr<EditorServer>) -> WsSession {
      WsSession {
        id: 0,
        hb: Instant::now(),
        editor
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
