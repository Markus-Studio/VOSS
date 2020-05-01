use actix::{Actor, StreamHandler};
use actix_web_actors::ws;

struct VossBuilder {}

struct VossReader {}

trait VossSerializable {
    fn serialize(&self);
    fn deserialize() -> Self;
}

pub struct VossWSConnection {}

impl Actor for VossWSConnection {
    type Context = ws::WebsocketContext<Self>;
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for VossWSConnection {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(msg)) => ctx.pong(&msg),
            Ok(ws::Message::Text(text)) => {
                println!("text");
                ctx.text(text);
            }
            Ok(ws::Message::Binary(bin)) => {
                println!("binary {}", bin.len());
                ctx.binary(bin);
            }
            _ => (),
        }
    }
}
