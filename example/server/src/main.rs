mod voss;

// #[actix_rt::main]
fn main() {
  let point = voss::Point2D::new(0.3, 0.5);
  let data = voss::voss_runtime::VossBuilder::serialize_struct(&point).unwrap();
  println!("{:?}", data);
}
