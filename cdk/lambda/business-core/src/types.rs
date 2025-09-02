//! Common types.

use serde::{Deserialize, Serialize};
use std::fmt::Display;

/// Business type.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum BusinessType {
    /// Pee.
    #[serde(rename = "pee")]
    Pee,
    /// Poo.
    #[serde(rename = "poo")]
    Poo,
}

impl Display for BusinessType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> Result<(), std::fmt::Error> {
        match self {
            BusinessType::Pee => write!(f, "pee"),
            BusinessType::Poo => write!(f, "poo"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Clone, Debug, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct BusinessTypeContainer {
        business_type: BusinessType,
    }

    #[test]
    fn test_deserialize_business_type() {
        let input = r#"{
            "businessType": "pee"
        }"#;
        let BusinessTypeContainer {
            business_type,
        } = serde_json::from_str(input).unwrap();
        assert!(matches!(business_type, BusinessType::Pee));

        let input = r#"{
            "businessType": "poo"
        }"#;
        let BusinessTypeContainer {
            business_type,
        } = serde_json::from_str(input).unwrap();
        assert!(matches!(business_type, BusinessType::Poo));
    }
}
