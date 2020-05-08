mod voss;

// #[actix_rt::main]
fn main() {
    let data = voss::_ClockData::new(123456.8);
    let message = voss::_RPCMessage::Clock(data);
    let binary = voss::voss_runtime::VossBuilder::serialize_enum(&message).unwrap();
    let decoded = voss::voss_runtime::VossReader::deserialize_enum::<voss::_RPCMessage>(&binary).unwrap();
    println!("{:?}", binary);
    println!("{:?}", decoded);
}
