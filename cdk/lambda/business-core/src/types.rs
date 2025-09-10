//! Common types.

use derive_builder::Builder;
use serde::{Deserialize, Serialize};
use std::fmt::Display;

/// Information on a business record.
#[derive(Builder, Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
#[builder(setter(into), pattern = "owned")]
pub struct BusinessRecord {
    /// ID of the business record.
    pub record_id: String,
    /// ID of the dog who carried out the business.
    ///
    /// Missing in public records.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dog_id: Option<String>,
    /// Type of the business.
    pub business_type: BusinessType,
    /// Location of the business.
    pub location: GeolocationCoordinates,
    /// Timestamp when the business record was created.
    ///
    /// Represented as the number of seconds elapsed since 00:00:00 on
    /// January 1, 1970 UTC.
    pub timestamp: i64,
}

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

/// Coordinates of a geographic location.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct GeolocationCoordinates {
    /// Longitude in degrees.
    pub longitude: f64,
    /// Latitude in degrees.
    pub latitude: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    macro_rules! assert_approx_eq {
        ($a:expr, $b:expr, $e:expr) => {
            assert!(($a - $b).abs() < $e, "Expected {} to be approximately equal to {} within {}", $a, $b, $e);
        };
    }

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

    #[test]
    fn test_deserialize_geolocation_coordinates() {
        const EPSILON: f64 = 1e-11; // guarantees 10-digit precision

        let input = r#"{
            "longitude": 139.7670506677,
            "latitude": 35.6814709332
        }"#;
        let GeolocationCoordinates {
            longitude,
            latitude,
        } = serde_json::from_str(input).unwrap();
        assert_approx_eq!(longitude, 139.7670506677, EPSILON);
        assert_approx_eq!(latitude, 35.6814709332, EPSILON);

        let input = r#"{
            "longitude": -58.381645119,
            "latitude": -34.6035270547
        }"#;
        let GeolocationCoordinates {
            longitude,
            latitude,
        } = serde_json::from_str(input).unwrap();
        assert_approx_eq!(longitude, -58.381645119, EPSILON);
        assert_approx_eq!(latitude, -34.6035270547, EPSILON);
    }

    #[test]
    fn test_serialize_business_record() {
        const EPSILON: f64 = 1e-11; // guarantees 10-digit precision for coordinates
        let input = BusinessRecord {
            record_id: "012345678901234567890".to_string(),
            dog_id: Some("0123456789abcdefghijk".to_string()),
            business_type: BusinessType::Pee,
            location: GeolocationCoordinates {
                longitude: 139.7650506677,
                latitude: 35.6814709332,
            },
            timestamp: 1757224548,
        };
        let output = serde_json::to_string(&input).unwrap();
        let value: serde_json::Value = serde_json::from_str(&output).unwrap();
        let properties = value.as_object().unwrap();
        assert_eq!(
            properties.get("recordId").unwrap().as_str().unwrap(),
            "012345678901234567890",
        );
        assert_eq!(
            properties.get("dogId").unwrap().as_str().unwrap(),
            "0123456789abcdefghijk",
        );
        assert_eq!(
            properties.get("businessType").unwrap().as_str().unwrap(),
            "pee",
        );
        let location = properties.get("location").unwrap();
        assert_approx_eq!(
            location.get("longitude").unwrap().as_f64().unwrap(),
            139.7650506677,
            EPSILON
        );
        assert_approx_eq!(
            location.get("latitude").unwrap().as_f64().unwrap(),
            35.6814709332,
            EPSILON
        );
        assert_eq!(
            properties.get("timestamp").unwrap().as_i64().unwrap(),
            1757224548,
        );

        // missing dogId
        let input = BusinessRecord {
            record_id: "abcdefghij01234567890".to_string(),
            dog_id: None,
            business_type: BusinessType::Poo,
            location: GeolocationCoordinates {
                longitude: -58.381645119,
                latitude: -34.6035270547,
            },
            timestamp: 1757463402,
        };
        let output = serde_json::to_string(&input).unwrap();
        let value: serde_json::Value = serde_json::from_str(&output).unwrap();
        let properties = value.as_object().unwrap();
        assert_eq!(
            properties.get("recordId").unwrap().as_str().unwrap(),
            "abcdefghij01234567890",
        );
        assert!(properties.get("dogId").is_none());
        assert_eq!(
            properties.get("businessType").unwrap().as_str().unwrap(),
            "poo",
        );
        let location = properties.get("location").unwrap();
        assert_approx_eq!(
            location.get("longitude").unwrap().as_f64().unwrap(),
            -58.381645119,
            EPSILON
        );
        assert_approx_eq!(
            location.get("latitude").unwrap().as_f64().unwrap(),
            -34.6035270547,
            EPSILON
        );
        assert_eq!(
            properties.get("timestamp").unwrap().as_i64().unwrap(),
            1757463402,
        );
    }
}
