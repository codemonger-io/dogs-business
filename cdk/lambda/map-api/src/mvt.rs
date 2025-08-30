//! Mapbox Vector Tile (MVT).
//!
//! https://github.com/mapbox/vector-tile-spec

use serde::Deserialize;

pub mod symbol;

/// Tile coordinates.
#[derive(Clone, Debug, Deserialize)]
pub struct TileCoordinates {
    /// Zoom level of the tile.
    pub zoom: u32,

    /// X coordinate of the tile.
    pub x: u32,

    /// Y coordinate of the tile.
    pub y: u32,
}

/// Error related to Mapbox vector tile (mvt) processing.
#[derive(Debug, thiserror::Error)]
pub enum MvtError {
    /// Business record is outside of the tile.
    #[error("business record is outside of the tile")]
    OutsideOfTile,
    /// Duplicate record ID.
    #[error("duplicate business record ID: {0}")]
    DuplicateRecordId(String),
}

/// Zigzag-encodes a given number.
///
/// See https://github.com/mapbox/vector-tile-spec/tree/master/2.1#432-parameter-integers
#[inline]
pub const fn zigzag(n: u32) -> u32 {
    (n << 1) ^ (n >> 31)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zigzag() {
        assert_eq!(zigzag(0), 0);
        assert_eq!(zigzag(1), 2);
        assert_eq!(zigzag(2), 4);
        assert_eq!(zigzag(4095), 8190);
        assert_eq!(zigzag(0xFFFFFFFE), 0xFFFFFFFD);
        assert_eq!(zigzag(0xFFFFFFFF), 0xFFFFFFFF);
    }
}
