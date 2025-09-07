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

impl TileCoordinates {
    /// Creates a new `TileCoordinates` that zooms out to a given level.
    ///
    /// Returns `None` if `new_zoom` is larger than the current zoom level.
    pub fn zoom_out_to(&self, new_zoom: u32) -> Option<Self> {
        if new_zoom > self.zoom {
            return None;
        }
        let mut x = self.x;
        let mut y = self.y;
        let mut zoom = self.zoom;
        while zoom > new_zoom {
            x /= 2;
            y /= 2;
            zoom -= 1;
        }
        Some(Self { zoom, x, y })
    }
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
    fn test_zoom_out() {
        // z = 1 → 0
        let coords = TileCoordinates { zoom: 1, x: 1, y: 1 };
        let new_coords = coords.zoom_out_to(0).unwrap();
        assert_eq!(new_coords.zoom, 0);
        assert_eq!(new_coords.x, 0);
        assert_eq!(new_coords.y, 0);

        // z = 12 → 10
        let coords = TileCoordinates { zoom: 12, x: 1234, y: 3333 };
        let new_coords = coords.zoom_out_to(10).unwrap();
        assert_eq!(new_coords.zoom, 10);
        assert_eq!(new_coords.x, 308);
        assert_eq!(new_coords.y, 833);

        // z = 16 → 16
        let coords = TileCoordinates { zoom: 16, x: 58138, y: 25860 };
        let new_coords = coords.zoom_out_to(16).unwrap();
        assert_eq!(new_coords.zoom, 16);
        assert_eq!(new_coords.x, 58138);
        assert_eq!(new_coords.y, 25860);

        // z = 0 → 1
        let coords = TileCoordinates { zoom: 0, x: 0, y: 0 };
        assert!(coords.zoom_out_to(1).is_none());
    }

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
