mod voss;
mod voss_runtime;

struct Test {
    value: f64,
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
fn main() {}
