use actix_web::{web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
mod voss;

async fn index(req: HttpRequest, stream: web::Payload) -> Result<HttpResponse, Error> {
    let resp = ws::start(voss::rpc::WsSession::new(), &req, stream);
    println!("{:?}", resp);
    resp
}

#[actix_rt::main]
async fn main() -> std::io::Result<()> {
    // let data = voss::_ClockData::new(123456.8);
    // let message = voss::_RPCMessage::Clock(data);
    // let binary = voss::voss_runtime::VossBuilder::serialize_enum(&message).unwrap();
    // let decoded =
    //     voss::voss_runtime::VossReader::deserialize_enum::<voss::_RPCMessage>(&binary).unwrap();
    // println!("{:?}", binary);
    // println!("{:?}", decoded);

    HttpServer::new(|| App::new().route("/ws/", web::get().to(index)))
        .bind("127.0.0.1:8088")?
        .run()
        .await
}
