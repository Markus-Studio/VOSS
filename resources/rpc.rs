pub mod rpc {
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
    sessions: HashMap<u32, Recipient<BinaryMessage>>,
    scope_members: HashMap<voss_runtime::HASH20, HashSet<u32>>,
    rng: ThreadRng,
  }

  impl EditorServer {
    pub fn open(name: &str) -> EditorServer {
      EditorServer {
        sessions: HashMap::new(),
        scope_members: HashMap::new(),
        rng: rand::thread_rng(),
      }
    }

    fn broadcast(&self, message: RPCMessage, scope: &voss_runtime::HASH20, skip_id: u32) {
      let msg = VossBuilder::serialize_enum(&message).unwrap();
      let data = Bytes::from(msg);
      if let Some(sessions) = self.scope_members.get(&scope) {
        for id in sessions {
            if *id != skip_id {
                if let Some(addr) = self.sessions.get(id) {
                    let _ = addr.do_send(BinaryMessage(data.clone()));
                }
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
        for (_, sessions) in &mut self.scope_members {
          if sessions.remove(&msg.id) {
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
  }
}