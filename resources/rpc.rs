pub mod rpc {
    use super::voss_runtime;
    use super::voss_runtime::{VossBuilder, VossReader};
    use actix::prelude::Message;
    use actix::*;
    use actix_web::web::Bytes;
    use actix_web_actors::ws;
    use rand::{self, rngs::ThreadRng, Rng};
    use std::collections::{HashMap, BTreeSet};
    use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
    use serde::{Serialize, Deserialize};
    use std::sync::Arc;
    use rocksdb::DB;

    const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
    const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

    // Messages sent from websocket to editor;
    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct EditorMessage(pub u32, pub super::RPCMessage);

    // ****************************** Scope ******************************
    pub struct Scope {
        pub editor: Arc<EditorServer>,
        pub members: BTreeSet<u32>,
        pub objects: HashMap<voss_runtime::HASH16, super::RooObject>,
        pub live: Vec<super::VossAction>
    }

    // ****************************** VCS DS ******************************
    pub struct Commit {
        pub parent: voss_runtime::HASH20,
        pub actions: Vec<super::VossAction>
    }

    // ****************************** Editor ******************************
    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct BinaryMessage(pub Bytes);

    #[derive(Message)]
    #[rtype(u32)]
    pub struct Connect {
        pub addr: Recipient<BinaryMessage>,
    }

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct Disconnect {
        pub id: u32,
    }

    pub struct EditorServer {
        db: DB,
        sessions: HashMap<u32, Recipient<BinaryMessage>>,
        scopes: HashMap<voss_runtime::HASH20, Scope>,
        rng: ThreadRng,
    }

    impl EditorServer {
        pub fn open(path: &str) -> Result<EditorServer, ()> {
            Ok(EditorServer {
                db: DB::open_default(path).map_err(|_| { () })?,
                sessions: HashMap::new(),
                scopes: HashMap::new(),
                rng: rand::thread_rng(),
            })
        }

        pub fn broadcast(
            &self,
            message: super::RPCMessage,
            scope: &Scope,
            skip_id: u32,
        ) {
            let msg = VossBuilder::serialize_enum(&message).unwrap();
            let data = Bytes::from(msg);
            for id in &scope.members {
                if *id != skip_id {
                    if let Some(addr) = self.sessions.get(id) {
                        addr.do_send(BinaryMessage(data.clone()));
                    }
                }
            }
        }
    }

    impl Actor for EditorServer {
        type Context = Context<Self>;
    }

    impl Handler<Connect> for EditorServer {
        type Result = u32;

        fn handle(&mut self, msg: Connect, _: &mut Context<Self>) -> Self::Result {
            let id = loop {
                let id = self.rng.gen::<u32>();
                if id > 0 && !self.sessions.contains_key(&id) {
                    break id;
                }
            };
            self.sessions.insert(id, msg.addr);
            id
        }
    }

    impl Handler<Disconnect> for EditorServer {
        type Result = ();

        fn handle(&mut self, msg: Disconnect, _: &mut Context<Self>) -> Self::Result {
            if self.sessions.remove(&msg.id).is_some() {
                for (_, scope) in &mut self.scopes {
                    if scope.members.remove(&msg.id) {
                        break;
                    }
                }
            }
        }
    }

    // ****************************** Session ******************************
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
                            let msg =
                                super::RPCMessage::HostID(super::HostIDMessage { value: res });
                            ctx.binary(VossBuilder::serialize_enum(&msg).unwrap());
                        }
                        // something is wrong with the editor.
                        _ => ctx.stop(),
                    }
                    fut::ready(())
                })
                .wait(ctx);
        }

        fn stopping(&mut self, _: &mut Self::Context) -> Running {
            self.editor.do_send(Disconnect { id: self.id });
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
                }
                ws::Message::Pong(_) => {
                    self.hb = Instant::now();
                    return;
                }
                ws::Message::Close(_) | ws::Message::Continuation(_) | ws::Message::Text(_) => {
                    ctx.close(None);
                    return;
                }
                ws::Message::Binary(bin) => {
                    match VossReader::deserialize_enum::<super::RPCMessage>(&bin) {
                        Ok(msg) => msg,
                        Err(_) => {
                            ctx.close(None);
                            return;
                        }
                    }
                }
                ws::Message::Nop => return,
            };

            match msg {
                super::RPCMessage::Clock(_) => {
                    let result = super::RPCMessage::Clock(super::ClockMessage { timestamp: now() });
                    ctx.binary(VossBuilder::serialize_enum(&result).unwrap());
                }
                msg => {
                  self.editor.do_send(EditorMessage(self.id, msg));
                }
            }
        }
    }

    impl Handler<BinaryMessage> for WsSession {
        type Result = ();

        fn handle(&mut self, msg: BinaryMessage, ctx: &mut Self::Context) {
            ctx.binary(msg.0);
        }
    }

    impl WsSession {
        pub fn new(editor: Addr<EditorServer>) -> WsSession {
            WsSession {
                id: 0,
                hb: Instant::now(),
                editor,
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
    }
}
