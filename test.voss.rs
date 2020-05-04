pub struct FieldTypePrimitive {
  provider: String,
}

pub struct TypespaceObject {
  uuid: voss_runtime::UUID,
  title: String,
  x: i32,
  y: i32,
}

pub struct FieldTypeObjectReference {
  obj: voss_runtime::UUID,
}

pub struct TypespaceObjectField {
  uuid: voss_runtime::UUID,
  title: String,
  owner: voss_runtime::UUID,
  field_type: FieldType,
}

pub struct _ClockData {
  timestamp: f64,
}

pub struct _ReplyData {
  reply_id: u32,
}

pub struct _ObjectDeleteRequest {
  reply_id: u32,
  timestamp: f64,
  uuid: voss_runtime::UUID,
}

pub struct _FetchByUUIDRequest {
  reply_id: u32,
  uuid: voss_runtime::UUID,
}

pub struct _ObjectTypespaceObjectCreateRequest {
  reply_id: u32,
  timestamp: f64,
  data: voss_runtime::UUID,
}

pub struct _RootFetchTypespaceObjectRequest {
  reply_id: u32,
}

pub struct _ObjectTypespaceObjectSetTitleRequest {
  reply_id: u32,
  timestamp: f64,
  previous_value: String,
  new_value: String,
}

pub struct _ObjectTypespaceObjectSetXRequest {
  reply_id: u32,
  timestamp: f64,
  previous_value: i32,
  new_value: i32,
}

pub struct _ObjectTypespaceObjectSetYRequest {
  reply_id: u32,
  timestamp: f64,
  previous_value: i32,
  new_value: i32,
}

pub struct _ObjectTypespaceObjectFieldCreateRequest {
  reply_id: u32,
  timestamp: f64,
  data: voss_runtime::UUID,
}

pub struct _RootFetchTypespaceObjectFieldRequest {
  reply_id: u32,
}

pub struct _ObjectTypespaceObjectFieldSetTitleRequest {
  reply_id: u32,
  timestamp: f64,
  previous_value: String,
  new_value: String,
}

pub struct _ObjectTypespaceObjectFieldSetOwnerRequest {
  reply_id: u32,
  timestamp: f64,
  previous_value: voss_runtime::UUID,
  new_value: voss_runtime::UUID,
}

pub struct _ObjectTypespaceObjectFieldSetFieldTypeRequest {
  reply_id: u32,
  timestamp: f64,
  previous_value: FieldType,
  new_value: FieldType,
}
