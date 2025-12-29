//! Utilities to deal with unique IDs.

use base64::{
    engine::general_purpose::URL_SAFE_NO_PAD as base64_encoder,
    Engine as _,
};
use uuid::Uuid;

/// Generates a random identifier as a base64-encoded UUID.
#[inline]
pub fn generate_id() -> String {
    base64_encoder.encode(&Uuid::new_v4())
}
