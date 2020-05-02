mod voss;
mod voss_runtime;

struct Test {
    value: f64,
}

impl voss_runtime::FromReader for Test {
    fn from_reader(reader: &voss_runtime::VossReader) -> Result<Self, voss_runtime::ReaderError> {
        Err(voss_runtime::ReaderError::InvalidBuffer)
    }
}

impl voss_runtime::VossStruct for Test {
    fn alignment_pow2(&self) -> usize {
        3
    }

    fn size(&self) -> usize {
        8
    }

    fn serialize(
        &self,
        builder: &mut voss_runtime::VossBuilder,
    ) -> Result<(), voss_runtime::BuilderError> {
        builder.f64(0, self.value)?;
        Ok(())
    }
}

// #[actix_rt::main]
fn main() {
    let data: &[u8] = &[0, 1, 2, 3, 4, 5, 6, 7, 8];
    let slice: &[u8] = &data[1..2];
    println!("{:?}", slice);
}
