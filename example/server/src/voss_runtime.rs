use std::error;
use std::fmt;

#[derive(Debug, Clone)]
pub enum BuilderError {
    OutOfBound,
    Overflow,
}

impl fmt::Display for BuilderError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "VOSS Out of Bound error occurred.")
    }
}

impl error::Error for BuilderError {
    fn source(&self) -> Option<&(dyn error::Error + 'static)> {
        None
    }
}

pub trait VossStruct {
    fn alignment_pow2(&self) -> usize;
    fn size(&self) -> usize;
    fn serialize(&self, builder: &mut VossBuilder) -> Result<(), BuilderError>;
}

pub trait VossEnum<'a> {
    fn get_type(&self) -> u32;
    fn get_value(&'a self) -> &'a dyn VossStruct;
}

pub struct VossBuilder {
    offset_stack: Vec<usize>,
    next_offset: usize,
    current_offset: usize,
    data: Vec<u8>,
}

impl VossBuilder {
    fn new(root_size: usize) -> VossBuilder {
        let mut data = Vec::with_capacity(256);
        data.resize(root_size, 0);
        VossBuilder {
            offset_stack: Vec::with_capacity(16),
            next_offset: root_size,
            current_offset: 0,
            data,
        }
    }

    pub fn serialize_struct(object: &dyn VossStruct) -> Result<Vec<u8>, BuilderError> {
        let mut builder = VossBuilder::new(object.size());
        object.serialize(&mut builder)?;
        builder.data.shrink_to_fit();
        Ok(builder.data)
    }

    pub fn serialize_enum<'a>(value: &'a (dyn VossEnum<'a> + 'a)) -> Result<Vec<u8>, BuilderError> {
        let mut builder = VossBuilder::new(8);
        builder.u32(0, value.get_type())?;
        builder.object(4, value.get_value())?;
        builder.data.shrink_to_fit();
        Ok(builder.data)
    }

    #[inline(always)]
    fn bound_check(&self, offset: usize, size: usize) -> Result<(), BuilderError> {
        if self.current_offset + offset + size <= self.data.len() {
            Ok(())
        } else {
            Err(BuilderError::OutOfBound)
        }
    }

    #[inline(always)]
    fn set_next_offset(&mut self, next_offset: usize) -> Result<(), BuilderError> {
        if next_offset <= self.data.len() {
            return Ok(());
        }

        if next_offset < self.data.capacity() {
            let additional = next_offset - self.data.capacity();
            if self.data.try_reserve(additional).is_err() {
                return Err(BuilderError::Overflow);
            }
        }

        self.data.resize(next_offset, 0);
        self.next_offset = next_offset;

        Ok(())
    }

    pub fn u8(&mut self, offset: usize, value: u8) -> Result<(), BuilderError> {
        self.bound_check(offset, 1)?;
        self.data[self.current_offset + offset] = value;
        Ok(())
    }

    pub fn u16(&mut self, mut offset: usize, value: u16) -> Result<(), BuilderError> {
        self.bound_check(offset, 2)?;
        offset += self.current_offset;
        let raw = value.to_le_bytes();
        self.data[offset + 0] = raw[0];
        self.data[offset + 1] = raw[1];
        Ok(())
    }

    pub fn u32(&mut self, mut offset: usize, value: u32) -> Result<(), BuilderError> {
        self.bound_check(offset, 4)?;
        offset += self.current_offset;
        let raw = value.to_le_bytes();
        self.data[offset + 0] = raw[0];
        self.data[offset + 1] = raw[1];
        self.data[offset + 2] = raw[2];
        self.data[offset + 3] = raw[3];
        Ok(())
    }

    pub fn i8(&mut self, mut offset: usize, value: i8) -> Result<(), BuilderError> {
        self.bound_check(offset, 1)?;
        self.data[self.current_offset + offset] = value.to_le_bytes()[0];
        Ok(())
    }

    pub fn i16(&mut self, mut offset: usize, value: i16) -> Result<(), BuilderError> {
        self.bound_check(offset, 2)?;
        offset += self.current_offset;
        let raw = value.to_le_bytes();
        self.data[offset + 0] = raw[0];
        self.data[offset + 1] = raw[1];
        Ok(())
    }

    pub fn i32(&mut self, mut offset: usize, value: i32) -> Result<(), BuilderError> {
        self.bound_check(offset, 4)?;
        offset += self.current_offset;
        let raw = value.to_le_bytes();
        self.data[offset + 0] = raw[0];
        self.data[offset + 1] = raw[1];
        self.data[offset + 2] = raw[2];
        self.data[offset + 3] = raw[3];
        Ok(())
    }

    pub fn f32(&mut self, mut offset: usize, value: f32) -> Result<(), BuilderError> {
        self.bound_check(offset, 4)?;
        offset += self.current_offset;
        let raw = value.to_le_bytes();
        self.data[offset + 0] = raw[0];
        self.data[offset + 1] = raw[1];
        self.data[offset + 2] = raw[2];
        self.data[offset + 3] = raw[3];
        Ok(())
    }

    pub fn f64(&mut self, mut offset: usize, value: f64) -> Result<(), BuilderError> {
        self.bound_check(offset, 8)?;
        offset += self.current_offset;
        let raw = value.to_le_bytes();
        self.data[offset + 0] = raw[0];
        self.data[offset + 1] = raw[1];
        self.data[offset + 2] = raw[2];
        self.data[offset + 3] = raw[3];
        self.data[offset + 4] = raw[4];
        self.data[offset + 5] = raw[5];
        self.data[offset + 6] = raw[6];
        self.data[offset + 7] = raw[7];
        Ok(())
    }

    pub fn bool(&mut self, mut offset: usize, value: bool) -> Result<(), BuilderError> {
        self.bound_check(offset, 1)?;
        self.data[self.current_offset + offset] = if value { 0 } else { 1 };
        Ok(())
    }

    pub fn uuid(&mut self, mut offset: usize, value: [u8; 16]) -> Result<(), BuilderError> {
        self.bound_check(offset, 16)?;
        offset += self.current_offset;
        self.data[offset + 0] = value[0];
        self.data[offset + 1] = value[1];
        self.data[offset + 2] = value[2];
        self.data[offset + 3] = value[3];
        self.data[offset + 4] = value[4];
        self.data[offset + 5] = value[5];
        self.data[offset + 6] = value[6];
        self.data[offset + 7] = value[7];
        Ok(())
    }

    pub fn str(&mut self, mut offset: usize, value: String) -> Result<(), BuilderError> {
        if value.len() == 0 {
            self.u32(offset, 0);
            self.u32(offset + 4, 0);
            return Ok(());
        }

        self.bound_check(offset, 8)?;

        let mut string_offset = self.next_offset;
        let upper_size = value.len() * 2;
        let mut count = 0;
        self.set_next_offset(self.next_offset + upper_size)?;
        let relative = string_offset - offset;

        for cp in value.encode_utf16() {
            let raw = cp.to_le_bytes();
            self.data[string_offset + 0] = raw[0];
            self.data[string_offset + 1] = raw[1];
            count += 1;
            string_offset += 2;
        }

        let size = (count * 2) as u32;
        self.next_offset = self.next_offset - upper_size + size;
        self.u32(offset, size);
        self.u32(offset + 4, relative);

        Ok(())
    }

    pub fn object(&mut self, offset: usize, value: &dyn VossStruct) -> Result<(), BuilderError> {
        let size = value.size();

        if size == 0 {
            self.u32(offset, 0)?;
            return Ok(());
        }

        let align = value.alignment_pow2();
        let struct_offset = if align > 0 {
            next_number_divisible_by_pow2(self.next_offset, align)
        } else {
            self.next_offset
        };

        let next_offset = self.next_offset;
        let pointer_offset = offset + self.current_offset;
        let relative = struct_offset - pointer_offset;
        self.set_next_offset(next_offset + size)?;

        self.offset_stack.push(self.current_offset);
        self.current_offset = struct_offset;
        let result = value.serialize(self);
        self.current_offset = self.offset_stack.pop().unwrap();

        if result.is_err() {
            self.next_offset = next_offset;
        } else {
            self.u32(offset, relative as u32)?;
        }

        result
    }

    pub fn oneof<'a>(
        &mut self,
        offset: usize,
        value: &'a (dyn VossEnum<'a> + 'a),
    ) -> Result<(), BuilderError> {
        self.u32(offset + self.current_offset, value.get_type())?;
        self.object(offset + 4, value.get_value())?;
        Ok(())
    }
}

fn next_number_divisible_by_pow2(number: usize, pow: usize) -> usize {
    let n = (number >> pow) << pow;
    if n == number {
        n
    } else {
        n + (1 << pow)
    }
}
