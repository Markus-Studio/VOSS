mod voss;

// #[actix_rt::main]
fn main() {
    let data: &[u8] = &[0, 1, 2, 3, 4, 5, 6, 7, 8];
    let slice: &[u8] = &data[1..2];
    println!("{:?}", slice);
}
