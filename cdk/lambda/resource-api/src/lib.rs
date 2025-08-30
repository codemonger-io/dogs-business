//! Core library for the Dog's Business Resource API.

use serde::Serialize;

/// Information on a dog.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DogInfo {
    /// ID of the dog.
    pub dog_id: String,
    /// Name of the dog.
    pub name: String,
}
