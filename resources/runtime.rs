pub mod voss_runtime {
    use std::cell::RefCell;
    use std::error;
    use std::fmt;
    use std::fmt::Write;
    use std::u8;

    #[derive(PartialEq, Eq, Copy, Clone, Hash)]
    pub struct HASH16([u8; 16]);

    impl std::fmt::Debug for HASH16 {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            static CHARS: &'static [u8] = b"0123456789abcdef";
            let mut s = String::with_capacity(32);

            for &byte in self.0.iter() {
                s.write_char(CHARS[(byte >> 4) as usize].into())?;
                s.write_char(CHARS[(byte & 0xf) as usize].into())?
            }

            f.write_str(&s)
        }
    }

    impl HASH16 {
        pub fn new(hash: &str) -> HASH16 {
            assert_eq!(hash.len(), 32);
            HASH16([
                u8::from_str_radix(&hash[0..2], 16).unwrap(),
                u8::from_str_radix(&hash[2..4], 16).unwrap(),
                u8::from_str_radix(&hash[4..6], 16).unwrap(),
                u8::from_str_radix(&hash[6..8], 16).unwrap(),
                u8::from_str_radix(&hash[8..10], 16).unwrap(),
                u8::from_str_radix(&hash[10..12], 16).unwrap(),
                u8::from_str_radix(&hash[12..14], 16).unwrap(),
                u8::from_str_radix(&hash[14..16], 16).unwrap(),
                u8::from_str_radix(&hash[16..18], 16).unwrap(),
                u8::from_str_radix(&hash[18..20], 16).unwrap(),
                u8::from_str_radix(&hash[20..22], 16).unwrap(),
                u8::from_str_radix(&hash[22..24], 16).unwrap(),
                u8::from_str_radix(&hash[24..26], 16).unwrap(),
                u8::from_str_radix(&hash[26..28], 16).unwrap(),
                u8::from_str_radix(&hash[28..30], 16).unwrap(),
                u8::from_str_radix(&hash[30..32], 16).unwrap(),
            ])
        }
    }

    #[derive(PartialEq, Eq, Copy, Clone, Hash)]
    pub struct HASH20([u8; 20]);

    impl std::fmt::Debug for HASH20 {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            static CHARS: &'static [u8] = b"0123456789abcdef";
            let mut s = String::with_capacity(40);

            for &byte in self.0.iter() {
                s.write_char(CHARS[(byte >> 4) as usize].into())?;
                s.write_char(CHARS[(byte & 0xf) as usize].into())?
            }

            f.write_str(&s)
        }
    }

    impl HASH20 {
        pub fn new(hash: &str) -> HASH20 {
            assert_eq!(hash.len(), 40);
            HASH20([
                u8::from_str_radix(&hash[0..2], 16).unwrap(),
                u8::from_str_radix(&hash[2..4], 16).unwrap(),
                u8::from_str_radix(&hash[4..6], 16).unwrap(),
                u8::from_str_radix(&hash[6..8], 16).unwrap(),
                u8::from_str_radix(&hash[8..10], 16).unwrap(),
                u8::from_str_radix(&hash[10..12], 16).unwrap(),
                u8::from_str_radix(&hash[12..14], 16).unwrap(),
                u8::from_str_radix(&hash[14..16], 16).unwrap(),
                u8::from_str_radix(&hash[16..18], 16).unwrap(),
                u8::from_str_radix(&hash[18..20], 16).unwrap(),
                u8::from_str_radix(&hash[20..22], 16).unwrap(),
                u8::from_str_radix(&hash[22..24], 16).unwrap(),
                u8::from_str_radix(&hash[24..26], 16).unwrap(),
                u8::from_str_radix(&hash[26..28], 16).unwrap(),
                u8::from_str_radix(&hash[28..30], 16).unwrap(),
                u8::from_str_radix(&hash[30..32], 16).unwrap(),
                u8::from_str_radix(&hash[32..34], 16).unwrap(),
                u8::from_str_radix(&hash[34..36], 16).unwrap(),
                u8::from_str_radix(&hash[36..38], 16).unwrap(),
                u8::from_str_radix(&hash[38..40], 16).unwrap(),
            ])
        }
    }

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

    pub trait FromReader: Sized {
        fn from_reader(reader: &VossReader) -> Result<Self, ReaderError>;
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

        pub fn serialize_struct(object: &impl VossStruct) -> Result<Vec<u8>, BuilderError> {
            let mut builder = VossBuilder::new(object.size());
            object.serialize(&mut builder)?;
            builder.data.shrink_to_fit();
            Ok(builder.data)
        }

        pub fn serialize_enum<'a>(
            value: &'a (impl VossEnum<'a> + 'a),
        ) -> Result<Vec<u8>, BuilderError> {
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

            // if next_offset < self.data.capacity() {
            //     let additional = next_offset - self.data.capacity();
            //     if self.data.try_reserve(additional).is_err() {
            //         return Err(BuilderError::Overflow);
            //     }
            // }

            self.data.resize(next_offset, 0);
            self.next_offset = next_offset;

            Ok(())
        }

        #[inline]
        pub fn u8(&mut self, offset: usize, value: u8) -> Result<(), BuilderError> {
            self.bound_check(offset, 1)?;
            self.data[self.current_offset + offset] = value;
            Ok(())
        }

        #[inline]
        pub fn u16(&mut self, mut offset: usize, value: u16) -> Result<(), BuilderError> {
            self.bound_check(offset, 2)?;
            offset += self.current_offset;
            let raw = value.to_le_bytes();
            self.data[offset + 0] = raw[0];
            self.data[offset + 1] = raw[1];
            Ok(())
        }

        #[inline]
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

        #[inline]
        pub fn i8(&mut self, offset: usize, value: i8) -> Result<(), BuilderError> {
            self.bound_check(offset, 1)?;
            self.data[self.current_offset + offset] = value.to_le_bytes()[0];
            Ok(())
        }

        #[inline]
        pub fn i16(&mut self, mut offset: usize, value: i16) -> Result<(), BuilderError> {
            self.bound_check(offset, 2)?;
            offset += self.current_offset;
            let raw = value.to_le_bytes();
            self.data[offset + 0] = raw[0];
            self.data[offset + 1] = raw[1];
            Ok(())
        }

        #[inline]
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

        #[inline]
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

        #[inline]
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

        #[inline]
        pub fn bool(&mut self, offset: usize, value: bool) -> Result<(), BuilderError> {
            self.bound_check(offset, 1)?;
            self.data[self.current_offset + offset] = if value { 0 } else { 1 };
            Ok(())
        }

        #[inline]
        pub fn hash16(&mut self, mut offset: usize, value: &HASH16) -> Result<(), BuilderError> {
            self.bound_check(offset, 16)?;
            offset += self.current_offset;
            self.data[offset + 0] = value.0[0];
            self.data[offset + 1] = value.0[1];
            self.data[offset + 2] = value.0[2];
            self.data[offset + 3] = value.0[3];
            self.data[offset + 4] = value.0[4];
            self.data[offset + 5] = value.0[5];
            self.data[offset + 6] = value.0[6];
            self.data[offset + 7] = value.0[7];
            self.data[offset + 8] = value.0[8];
            self.data[offset + 9] = value.0[9];
            self.data[offset + 10] = value.0[10];
            self.data[offset + 11] = value.0[11];
            self.data[offset + 12] = value.0[12];
            self.data[offset + 13] = value.0[13];
            self.data[offset + 14] = value.0[14];
            self.data[offset + 15] = value.0[15];
            Ok(())
        }

        #[inline]
        pub fn hash20(&mut self, mut offset: usize, value: &HASH20) -> Result<(), BuilderError> {
            self.bound_check(offset, 20)?;
            offset += self.current_offset;
            self.data[offset + 0] = value.0[0];
            self.data[offset + 1] = value.0[1];
            self.data[offset + 2] = value.0[2];
            self.data[offset + 3] = value.0[3];
            self.data[offset + 4] = value.0[4];
            self.data[offset + 5] = value.0[5];
            self.data[offset + 6] = value.0[6];
            self.data[offset + 7] = value.0[7];
            self.data[offset + 8] = value.0[8];
            self.data[offset + 9] = value.0[9];
            self.data[offset + 10] = value.0[10];
            self.data[offset + 11] = value.0[11];
            self.data[offset + 12] = value.0[12];
            self.data[offset + 13] = value.0[13];
            self.data[offset + 14] = value.0[14];
            self.data[offset + 15] = value.0[15];
            self.data[offset + 16] = value.0[16];
            self.data[offset + 17] = value.0[17];
            self.data[offset + 18] = value.0[18];
            self.data[offset + 19] = value.0[19];
            Ok(())
        }

        #[inline]
        pub fn str(&mut self, offset: usize, value: &String) -> Result<(), BuilderError> {
            if value.len() == 0 {
                self.u32(offset, 0)?;
                self.u32(offset + 4, 0)?;
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
            self.next_offset = self.next_offset - upper_size + size as usize;
            self.u32(offset, size)?;
            self.u32(offset + 4, relative as u32)?;

            Ok(())
        }

        #[inline]
        pub fn object(
            &mut self,
            offset: usize,
            value: &dyn VossStruct,
        ) -> Result<(), BuilderError> {
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

        #[inline]
        pub fn oneof<'a>(
            &mut self,
            offset: usize,
            value: &'a (impl VossEnum<'a> + 'a),
        ) -> Result<(), BuilderError> {
            self.u32(offset + self.current_offset, value.get_type())?;
            self.object(offset + 4, value.get_value())?;
            Ok(())
        }
    }

    #[inline]
    fn next_number_divisible_by_pow2(number: usize, pow: usize) -> usize {
        let n = (number >> pow) << pow;

        if n == number {
            n
        } else {
            n + (1 << pow)
        }
    }

    #[derive(Debug, Clone)]
    pub enum ReaderError {
        InvalidBuffer,
    }

    impl fmt::Display for ReaderError {
        fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
            write!(f, "Failed to decode invalid buffer.")
        }
    }

    impl error::Error for ReaderError {
        fn source(&self) -> Option<&(dyn error::Error + 'static)> {
            None
        }
    }

    pub struct VossReader<'a> {
        current_offset: RefCell<usize>,
        data: &'a [u8],
    }

    impl<'a> VossReader<'a> {
        #[inline(always)]
        fn bound_check(&self, offset: usize, size: usize) -> Result<(), ReaderError> {
            if self.current_offset.borrow().clone() + offset + size <= self.data.len() {
                Ok(())
            } else {
                Err(ReaderError::InvalidBuffer)
            }
        }

        #[inline]
        pub fn u8(&self, mut offset: usize) -> Result<u8, ReaderError> {
            self.bound_check(offset, 1)?;
            offset += self.current_offset.borrow().clone();
            Ok(self.data[offset])
        }

        #[inline]
        pub fn u16(&self, mut offset: usize) -> Result<u16, ReaderError> {
            self.bound_check(offset, 2)?;
            offset += self.current_offset.borrow().clone();
            Ok(u16::from_le_bytes([
                self.data[offset + 0],
                self.data[offset + 1],
            ]))
        }

        #[inline]
        pub fn u32(&self, mut offset: usize) -> Result<u32, ReaderError> {
            self.bound_check(offset, 4)?;
            offset += self.current_offset.borrow().clone();
            Ok(u32::from_le_bytes([
                self.data[offset + 0],
                self.data[offset + 1],
                self.data[offset + 2],
                self.data[offset + 3],
            ]))
        }

        #[inline]
        pub fn i8(&self, mut offset: usize) -> Result<i8, ReaderError> {
            self.bound_check(offset, 1)?;
            offset += self.current_offset.borrow().clone();
            Ok(self.data[offset] as i8)
        }

        #[inline]
        pub fn i16(&self, mut offset: usize) -> Result<i16, ReaderError> {
            self.bound_check(offset, 2)?;
            offset += self.current_offset.borrow().clone();
            Ok(i16::from_le_bytes([
                self.data[offset + 0],
                self.data[offset + 1],
            ]))
        }

        #[inline]
        pub fn i32(&self, mut offset: usize) -> Result<i32, ReaderError> {
            self.bound_check(offset, 4)?;
            offset += self.current_offset.borrow().clone();
            Ok(i32::from_le_bytes([
                self.data[offset + 0],
                self.data[offset + 1],
                self.data[offset + 2],
                self.data[offset + 3],
            ]))
        }

        #[inline]
        pub fn f32(&self, mut offset: usize) -> Result<f32, ReaderError> {
            self.bound_check(offset, 4)?;
            offset += self.current_offset.borrow().clone();
            Ok(f32::from_le_bytes([
                self.data[offset + 0],
                self.data[offset + 1],
                self.data[offset + 2],
                self.data[offset + 3],
            ]))
        }

        #[inline]
        pub fn f64(&self, mut offset: usize) -> Result<f64, ReaderError> {
            self.bound_check(offset, 8)?;
            offset += self.current_offset.borrow().clone();
            Ok(f64::from_le_bytes([
                self.data[offset + 0],
                self.data[offset + 1],
                self.data[offset + 2],
                self.data[offset + 3],
                self.data[offset + 4],
                self.data[offset + 5],
                self.data[offset + 6],
                self.data[offset + 7],
            ]))
        }

        #[inline]
        pub fn hash16(&self, mut offset: usize) -> Result<HASH16, ReaderError> {
            self.bound_check(offset, 16)?;
            offset += self.current_offset.borrow().clone();
            Ok(HASH16([
                self.data[offset + 0],
                self.data[offset + 1],
                self.data[offset + 2],
                self.data[offset + 3],
                self.data[offset + 4],
                self.data[offset + 5],
                self.data[offset + 6],
                self.data[offset + 7],
                self.data[offset + 8],
                self.data[offset + 9],
                self.data[offset + 10],
                self.data[offset + 11],
                self.data[offset + 12],
                self.data[offset + 13],
                self.data[offset + 14],
                self.data[offset + 15],
            ]))
        }

        #[inline]
        pub fn hash20(&self, mut offset: usize) -> Result<HASH20, ReaderError> {
            self.bound_check(offset, 20)?;
            offset += self.current_offset.borrow().clone();
            Ok(HASH20([
                self.data[offset + 0],
                self.data[offset + 1],
                self.data[offset + 2],
                self.data[offset + 3],
                self.data[offset + 4],
                self.data[offset + 5],
                self.data[offset + 6],
                self.data[offset + 7],
                self.data[offset + 8],
                self.data[offset + 9],
                self.data[offset + 10],
                self.data[offset + 11],
                self.data[offset + 12],
                self.data[offset + 13],
                self.data[offset + 14],
                self.data[offset + 15],
                self.data[offset + 16],
                self.data[offset + 17],
                self.data[offset + 18],
                self.data[offset + 19],
            ]))
        }

        #[inline]
        pub fn str(&self, offset: usize) -> Result<String, ReaderError> {
            let current_offset = self.current_offset.borrow().clone();
            let size = self.u32(offset)? as usize;
            let relative_offset = self.u32(offset + 4)? as usize;

            if size == 0 {
                if relative_offset != 0 {
                    return Err(ReaderError::InvalidBuffer);
                }
                return Ok("".to_string());
            }

            if size % 2 == 1 {
                return Err(ReaderError::InvalidBuffer);
            }

            let string_offset = offset + relative_offset;
            self.bound_check(string_offset, size)?;

            let start_index = current_offset + string_offset;
            let end_index = start_index + size;
            let slice = &self.data[start_index..end_index];

            let len = size / 2;
            let mut buffer = Vec::<u16>::with_capacity(len);
            buffer.extend(
                slice
                    .iter()
                    .step_by(2)
                    .zip(slice.iter().skip(1).step_by(2))
                    .map(|(&a, &b)| u16::from_le_bytes([a, b])),
            );

            let result = String::from_utf16(&buffer);

            if result.is_err() {
                return Err(ReaderError::InvalidBuffer);
            }
            return Ok(result.unwrap());
        }

        #[inline]
        pub fn object<T: FromReader>(&self, offset: usize) -> Result<T, ReaderError> {
            let relative_offset = self.u32(offset)? as usize;
            let struct_offset = offset + relative_offset;

            if struct_offset >= self.data.len() {
                return Err(ReaderError::InvalidBuffer);
            }

            let old_offset = self.current_offset.replace(struct_offset);
            let result = T::from_reader(self);
            self.current_offset.replace(old_offset);
            result
        }

        #[inline]
        pub fn oneof<T: FromReader>(&self, mut offset: usize) -> Result<T, ReaderError> {
            offset += self.current_offset.borrow().clone();
            let old_offset = self.current_offset.replace(offset);
            let result = T::from_reader(self);
            self.current_offset.replace(old_offset);
            result
        }

        #[inline]
        pub fn deserialize_struct<T: FromReader>(buffer: &'a [u8]) -> Result<T, ReaderError> {
            let reader = VossReader {
                current_offset: RefCell::new(0),
                data: buffer,
            };
            T::from_reader(&reader)
        }

        #[inline]
        pub fn deserialize_enum<T: FromReader>(buffer: &'a [u8]) -> Result<T, ReaderError> {
            let reader = VossReader {
                current_offset: RefCell::new(0),
                data: buffer,
            };
            reader.oneof(0)
        }
    }

    impl<'a> From<&'a Vec<u8>> for VossReader<'a> {
        fn from(vec: &'a Vec<u8>) -> VossReader<'a> {
            VossReader {
                current_offset: RefCell::new(0),
                data: vec,
            }
        }
    }
}
