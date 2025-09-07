//! Library part of `maptiles`.

use derive_builder::Builder;
use std::fmt::Display;

pub mod mvt;
pub mod protos;
pub mod web_mercator;

/// Business record.
#[derive(Builder, Clone, Debug)]
#[builder(setter(into), pattern = "owned")]
pub struct BusinessRecord {
    /// Unique ID of the record.
    pub record_id: String,

    /// ID of the dog who carried out the business.
    pub dog_id: Option<String>,

    /// Business type.
    pub business_type: BusinessType,

    /// Timestamp when the business was carried out.
    ///
    /// Represented as a number of seconds elapsed since 00:00:00 UTC on
    /// January 1, 1970.
    pub timestamp: i64,

    /// Location of the business.
    pub location: LonLat<f64>,
}

/// Longitude and latitude coordinates.
#[derive(Clone, Debug)]
pub struct LonLat<T>(pub T, pub T);

impl<T> LonLat<T> {
    /// Returns the longitude.
    #[inline]
    pub const fn longitude(&self) -> &T {
        &self.0
    }

    /// Returns the latitude.
    #[inline]
    pub const fn latitude(&self) -> &T {
        &self.1
    }
}

/// Business type.
#[derive(Clone, Debug)]
pub enum BusinessType {
    /// Pee.
    Pee,
    /// Poo.
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
