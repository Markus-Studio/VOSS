mod voss;

// #[actix_rt::main]
fn main() {
    let point = voss::Point2D::new(0.3, 0.5);
    let circle = voss::Circle::new("Circle 1".to_string(), 12.5, point);
    let data = voss::voss_runtime::VossBuilder::serialize_struct(&circle).unwrap();
    println!("{:#?}", circle);
    println!("{:?}", data);
}
