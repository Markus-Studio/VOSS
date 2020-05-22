use actix::*;
use actix_web::{web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
mod voss;

async fn ws_route(
    req: HttpRequest,
    stream: web::Payload,
    srv: web::Data<Addr<voss::rpc::EditorServer>>,
) -> Result<HttpResponse, Error> {
    ws::start(
        voss::rpc::WsSession::new(srv.get_ref().clone()),
        &req,
        stream,
    )
}

#[actix_rt::main]
async fn main() -> std::io::Result<()> {
    let editor = voss::rpc::EditorServer::open("data/project1").unwrap().start();

    HttpServer::new(move || {
        App::new()
            .data(editor.clone())
            .service(web::resource("/ws/").to(ws_route))
    })
    .bind("127.0.0.1:8088")?
    .run()
    .await
}
