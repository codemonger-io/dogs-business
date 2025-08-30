//! MVT for symbols.

use std::collections::{HashMap, HashSet};

use crate::{BusinessRecord, LonLat};
use crate::mvt::{zigzag, MvtError, TileCoordinates};
use crate::protos::{
    PropertyValue,
    vector_tile::{Tile, tile::{Feature, GeomType, Layer}},
};
use crate::web_mercator::{
    latitude_from_y_at_zoom,
    longitude_from_x_at_zoom,
    tiles_per_edge_at_zoom,
    x_from_longitude_at_zoom,
    y_from_latitude_at_zoom,
    MAX_ZOOM,
};

/// Vector tile version.
pub const VECTOR_TILE_VERSION: u32 = 2;

/// Tile extent.
pub const TILE_EXTENT: u32 = 4096;

/// Layer name.
pub const LAYER_NAME: &str = "business_records";

/// Buffer for business records in a vector tile.
///
/// Use this buffer to build a vector tile which contains business records.
pub struct BusinessRecordBuffer {
    /// Tile coordinates.
    coordinates: TileCoordinates,

    /// Range of longitudes that the tile covers.
    lon_range: std::ops::Range<f64>,

    /// Range of latitudes that the tile covers.
    lat_range: std::ops::Range<f64>,

    /// Records in the buffer.
    records: Vec<BusinessRecord>,

    /// Unique record IDs within the tile.
    record_ids: HashSet<String>,

    /// String values and frequencies within the tile.
    string_values: HashMap<String, u64>,

    /// `i64` values and frequencies within the tile.
    i64_values: HashMap<i64, u64>,
}

impl BusinessRecordBuffer {
    /// Creates a new [`BusinessRecordBuffer`] for given tile coordinates.
    pub fn new(coordinates: TileCoordinates) -> Self {
        let min_longitude = longitude_from_x_at_zoom(coordinates.x, coordinates.zoom);
        let max_longitude = longitude_from_x_at_zoom(coordinates.x + 1, coordinates.zoom);
        let min_latitude = latitude_from_y_at_zoom(coordinates.y + 1, coordinates.zoom);
        let max_latitude = latitude_from_y_at_zoom(coordinates.y, coordinates.zoom);
        Self {
            coordinates,
            lon_range: min_longitude..max_longitude,
            lat_range: min_latitude..max_latitude,
            records: Vec::new(),
            record_ids: HashSet::new(),
            string_values: HashMap::new(),
            i64_values: HashMap::new(),
        }
    }

    /// Appends a given business record to the buffer.
    ///
    /// May return the following error:
    /// - [`MvtError::OutsideOfTile`]: if the tile does not contain the
    ///   record's location
    /// - [`MvtError::DuplicateRecordId`]: if the record's ID is already in the
    ///   buffer
    pub fn append_business_record(&mut self, record: BusinessRecord) -> Result<(), MvtError> {
        if self.contains_location(&record.location) {
            self.add_record_id(record.record_id.clone())?;
            self.add_string_value(record.dog_id.clone());
            self.add_string_value(record.business_type.clone().to_string());
            self.add_i64_value(record.timestamp);
            self.records.push(record);
            Ok(())
        } else {
            Err(MvtError::OutsideOfTile)
        }
    }

    /// Returns if the tile contains a given location.
    #[inline]
    fn contains_location(&self, location: &LonLat<f64>) -> bool {
        self.lon_range.contains(location.longitude()) &&
            self.lat_range.contains(location.latitude())
    }

    /// Adds a record ID to the buffer.
    ///
    /// Record IDs must be unique within the tile.
    #[inline]
    fn add_record_id(&mut self, record_id: String) -> Result<(), MvtError> {
        // we cannot simply do `record_ids.insert(record_id)`,
        // because doing so takes the ownership of the string and we won't
        // be able to return it in case of a duplication error
        if let Some(duplicate_id) = self.record_ids.replace(record_id) {
            Err(MvtError::DuplicateRecordId(duplicate_id))
        } else {
            Ok(())
        }
    }

    /// Adds a string value.
    ///
    /// More frequent values shall be assigned lower value indices.
    #[inline]
    fn add_string_value(&mut self, value: String) {
        self.string_values
            .entry(value)
            .and_modify(|freq| *freq += 1)
            .or_insert(1);
    }

    /// Adds an `i64` value to the buffer.
    ///
    /// More frequent values shall be assigned lower value indices.
    #[inline]
    fn add_i64_value(&mut self, value: i64) {
        self.i64_values
            .entry(value)
            .and_modify(|freq| *freq += 1)
            .or_insert(1);
    }

    /// Calculates the feature ID for a business record at a given index.
    ///
    /// A feature ID bits layout depends on the zoom level:
    /// - z=0 → [i:59bits][00000]
    /// - z=1 → [i:57bits][x][y][00001]
    /// - z=2 → [i:55bits][xx][yy][00010]
    /// - z=3 → [i:53bits][xxx][yyy][00011]
    /// - ...
    /// - z=22 → [i:15bits][x:22bits][y:22bits][10110]
    ///
    /// This means the larger the zoom level, the less bits are available for
    /// features in a tile. However, it is reasonable, because the larger the
    /// zoom level, the less features should be present in a tile.
    ///
    /// A feature ID does not identify a business record but it guarantees
    /// - no two business records within a tile have the same feature ID
    /// - no two tiles have features with the same feature ID
    ///
    /// So you should not depend on feature IDs to identify business records,
    /// but use the `recordId` property instead.
    ///
    /// ### Panics
    ///
    /// - if the zoom level is greater than [`MAX_ZOOM`]
    /// - if the x coordinate is greater than or equal to the number of tiles
    ///   per edge at the zoom level
    /// - if the y coordinate is greater than or equal to the number of tiles
    ///   per edge at the zoom level
    /// - if `index` cannot be represented by the available bits for the
    ///   index at the zoom level
    #[inline]
    fn make_feature_id(&self, i: usize) -> u64 {
        assert!(self.coordinates.zoom <= MAX_ZOOM);
        assert!(self.coordinates.x < tiles_per_edge_at_zoom(self.coordinates.zoom) as u32);
        assert!(self.coordinates.y < tiles_per_edge_at_zoom(self.coordinates.zoom) as u32);
        const Z_BITS: u32 = 5;
        let x_bits = self.coordinates.zoom;
        let y_bits = self.coordinates.zoom;
        assert!((i as u64) < (1 << (u64::BITS - (x_bits + y_bits + Z_BITS))));
        ((i as u64) << (x_bits + y_bits + Z_BITS)) |
            ((self.coordinates.x as u64) << (y_bits + Z_BITS)) |
            ((self.coordinates.y as u64) << Z_BITS) |
            self.coordinates.zoom as u64
    }

    /// Calculates the u coordinate from longitude.
    ///
    /// There is no "u" coordinate in the Mapbox vector tile specification.
    /// In this program:
    /// - x coordinate is a result of applying the web mercator projection to
    ///   longitude without flooring
    /// - u coordinate is the local coordinate in the tile represented as
    ///   an integer in the range `[0, TILE_EXTENT)`; e.g., fractional part of
    ///   the x coordinate multiplied by the extent
    ///
    /// Undefined if `longitude` is outside of the tile.
    #[inline]
    fn u_from_longitude(&self, longitude: f64) -> u32 {
        let x = x_from_longitude_at_zoom(longitude, self.coordinates.zoom);
        let u = x - self.coordinates.x as f64;
        let u = ((TILE_EXTENT as f64) * u).floor();
        u as u32
    }

    /// Calculates the v coordinate from latitude.
    ///
    /// There is no "v" coordinate in the Mapbox vector tile specification.
    /// In this program:
    /// - y coordinate is a result of aplying the web mercator projection to
    ///   latitude without flooring
    /// - v coordinate is the local coordinate in the tile represented as
    ///   an integer in the range `[0, TILE_EXTENT)`; e.g., fractional part of
    ///   the y coordinate multiplied by the extent
    ///
    /// Undefined if `latitude` is outside of the tile.
    #[inline]
    fn v_from_latitude(&self, latitude: f64) -> u32 {
        let y = y_from_latitude_at_zoom(latitude, self.coordinates.zoom);
        let v = y - self.coordinates.y as f64;
        let v = ((TILE_EXTENT as f64) * v).floor();
        v as u32
    }
}

impl From<BusinessRecordBuffer> for Tile {
    fn from(mut buffer: BusinessRecordBuffer) -> Self {
        // drains string values with frequencies
        let string_value_freqs: Vec<(PropertyValue, u64)> = buffer
            .string_values
            .drain()
            .map(|(value, n)| (value.into(), n))
            .collect::<>();
        // drains `i64` values with frequencies
        let i64_value_freqs: Vec<(PropertyValue, u64)> = buffer
            .i64_values
            .drain()
            .map(|(value, n)| (value.into(), n))
            .collect::<>();
        // sorts values by frequency in descending order
        let mut values_sorted_by_freq =
            [string_value_freqs, i64_value_freqs].concat();
        values_sorted_by_freq.sort_by_key(|(_, n)| std::cmp::Reverse(*n));
        // extracts values in sorted order and appends record IDs to the end
        let values_sorted_by_freq: Vec<PropertyValue> = values_sorted_by_freq
            .into_iter()
            .map(|(value, _)| value)
            .chain(buffer.record_ids.iter().map(|id| id.clone().into()))
            .collect::<>();

        // builds value → index maps per type
        let string_value_to_index: HashMap<&String, u32> = values_sorted_by_freq
            .iter()
            .enumerate()
            .map(|(i, value)| value.get_string().map(|s| (s, i as u32)))
            .flatten()
            .collect::<>();
        let i64_value_to_index: HashMap<i64, u32> = values_sorted_by_freq
            .iter()
            .enumerate()
            .map(|(i, value)| value.get_i64().map(|n| (n, i as u32)))
            .flatten()
            .collect::<>();

        // builds the layer
        let mut layer = Layer::new();
        // - configures the basic parameters
        layer.set_version(VECTOR_TILE_VERSION);
        layer.set_name(LAYER_NAME.to_string());
        layer.set_extent(TILE_EXTENT);
        // - builds features
        layer.features = buffer
            .records
            .iter()
            .enumerate()
            .map(|(i, record)| {
                let mut feature = Feature::new();
                feature.set_id(buffer.make_feature_id(i));
                feature.set_type(GeomType::POINT);
                feature.geometry = vec![
                    9, // MoveTo(1) | (Count(1) << 3)
                    zigzag(buffer.u_from_longitude(*record.location.longitude())),
                    zigzag(buffer.v_from_latitude(*record.location.latitude())),
                ];
                feature.tags = vec![
                    PROPERTY_KEY_RECORD_ID.0,
                    *string_value_to_index.get(&record.record_id).unwrap(),
                    PROPERTY_KEY_DOG_ID.0,
                    *string_value_to_index.get(&record.dog_id).unwrap(),
                    PROPERTY_KEY_BUSINESS_TYPE.0,
                    *string_value_to_index.get(&record.business_type.to_string()).unwrap(),
                    PROPERTY_KEY_TIMESTAMP.0,
                    *i64_value_to_index.get(&record.timestamp).unwrap(),
                ];
                feature
            })
            .collect::<>();
        // - copies the keys. but no keys if there are no features
        if layer.features.len() > 0 {
            layer.keys = [
                PROPERTY_KEY_RECORD_ID,
                PROPERTY_KEY_DOG_ID,
                PROPERTY_KEY_BUSINESS_TYPE,
                PROPERTY_KEY_TIMESTAMP,
            ]
                .into_iter()
                .enumerate()
                .map(|(i, key)| {
                    // makes sure that the property keys are correctly indexed
                    assert_eq!(key.0, i as u32);
                    key.1.to_string()
                })
                .collect::<>();
        }
        // - finally, moves the values
        layer.values = values_sorted_by_freq
            .into_iter()
            .map(Into::into)
            .collect::<>();

        // wraps the layer in a tile
        let mut tile = Tile::new();
        tile.layers.push(layer);

        tile
    }
}

/// Key index and name for the `recordId` property.
const PROPERTY_KEY_RECORD_ID: (u32, &str) = (0, "recordId");
/// Key index and name for the `dogId` property.
const PROPERTY_KEY_DOG_ID: (u32, &str) = (1, "dogId");
/// Key index and name for the `businessType` property.
const PROPERTY_KEY_BUSINESS_TYPE: (u32, &str) = (2, "businessType");
/// Key index and name for the `timestamp` property.
const PROPERTY_KEY_TIMESTAMP: (u32, &str) = (3, "timestamp");

#[cfg(test)]
mod tests {
    use super::*;

    use crate::{BusinessRecordBuilder, BusinessType};
    use crate::protos::vector_tile::tile::Value;

    const TOKYO: LonLat<f64> = LonLat(139.7670506677, 35.6814709332);
    const PITTSBURGH: LonLat<f64> = LonLat(-80.0078430744, 40.4417106826);
    const BUENOS_AIRES: LonLat<f64> = LonLat(-58.381645119, -34.6035270547);
    const CAIRNS: LonLat<f64> = LonLat(145.9737840892, -16.7596021497);

    #[test]
    fn test_business_record_buffer_contains_location() {
        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 0,
            x: 0,
            y: 0,
        });
        assert!(buffer.contains_location(&TOKYO));
        assert!(buffer.contains_location(&PITTSBURGH));
        assert!(buffer.contains_location(&BUENOS_AIRES));
        assert!(buffer.contains_location(&CAIRNS));

        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 1,
            x: 1,
            y: 0,
        });
        assert!(buffer.contains_location(&TOKYO));
        assert!(!buffer.contains_location(&PITTSBURGH));
        assert!(!buffer.contains_location(&BUENOS_AIRES));
        assert!(!buffer.contains_location(&CAIRNS));

        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 2,
            x: 1,
            y: 2,
        });
        assert!(!buffer.contains_location(&TOKYO));
        assert!(!buffer.contains_location(&PITTSBURGH));
        assert!(buffer.contains_location(&BUENOS_AIRES));
        assert!(!buffer.contains_location(&CAIRNS));

        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 10,
            x: 927,
            y: 560,
        });
        assert!(!buffer.contains_location(&TOKYO));
        assert!(!buffer.contains_location(&PITTSBURGH));
        assert!(!buffer.contains_location(&BUENOS_AIRES));
        assert!(buffer.contains_location(&CAIRNS));

        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 22,
            x: 1164993,
            y: 1581136,
        });
        assert!(!buffer.contains_location(&TOKYO));
        assert!(buffer.contains_location(&PITTSBURGH));
        assert!(!buffer.contains_location(&BUENOS_AIRES));
        assert!(!buffer.contains_location(&CAIRNS));

        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 16,
            x: 32768,
            y: 32768,
        });
        assert!(!buffer.contains_location(&TOKYO));
        assert!(!buffer.contains_location(&PITTSBURGH));
        assert!(!buffer.contains_location(&BUENOS_AIRES));
        assert!(!buffer.contains_location(&CAIRNS));
    }

    #[test]
    fn test_business_record_buffer_append_business_record_ok() {
        let mut buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 0,
            x: 0,
            y: 0,
        });
        assert!(
            buffer
                .append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("test_record_1")
                        .dog_id("dog_1")
                        .business_type(BusinessType::Pee)
                        .location(TOKYO.clone())
                        .timestamp(1_755_317_141)
                        .build()
                        .unwrap(),
                )
                .is_ok()
        );
        assert!(
            buffer
                .append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("test_record_2")
                        .dog_id("dog_2")
                        .business_type(BusinessType::Poo)
                        .location(PITTSBURGH.clone())
                        .timestamp(1_755_317_142)
                        .build()
                        .unwrap(),
                )
                .is_ok()
        );
    }

    #[test]
    fn test_business_record_buffer_append_business_record_outside_of_tile() {
        let mut buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 1,
            x: 1,
            y: 0,
        });
        assert!(
            buffer
                .append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("test_record_1")
                        .dog_id("dog_1")
                        .business_type(BusinessType::Pee)
                        .location(TOKYO.clone())
                        .timestamp(1_755_317_141)
                        .build()
                        .unwrap(),
                )
                .is_ok()
        );
        assert!(
            matches!(
                buffer.append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("test_record_2")
                        .dog_id("dog_2")
                        .business_type(BusinessType::Poo)
                        .location(PITTSBURGH.clone())
                        .timestamp(1_755_317_142)
                        .build()
                        .unwrap(),
                ),
                Err(MvtError::OutsideOfTile),
            ),
        );
    }

    #[test]
    fn test_business_record_buffer_append_business_record_duplicate_record_id() {
        let mut buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 0,
            x: 0,
            y: 0,
        });
        assert!(
            buffer
                .append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("duplicate_record_id")
                        .dog_id("dog_1")
                        .business_type(BusinessType::Pee)
                        .location(TOKYO.clone())
                        .timestamp(1_755_317_141)
                        .build()
                        .unwrap(),
                )
                .is_ok()
        );
        assert!(
            matches!(
                buffer.append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("duplicate_record_id")
                        .dog_id("dog_2")
                        .business_type(BusinessType::Poo)
                        .location(PITTSBURGH.clone())
                        .timestamp(1_755_317_142)
                        .build()
                        .unwrap(),
                ),
                Err(MvtError::DuplicateRecordId(s)) if s == "duplicate_record_id",
            ),
        );
    }

    #[test]
    fn test_business_record_buffer_make_feature_id() {
        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 0,
            x: 0,
            y: 0,
        });
        assert_eq!(buffer.make_feature_id(0), 0);
        assert_eq!(buffer.make_feature_id(1), 0x20);
        assert_eq!(buffer.make_feature_id(0xFFFFFFFF), 0x1FFFFFFFE0); // 32bits should be safe, although, theoretically, fewer bits are possible

        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 1,
            x: 0,
            y: 0,
        });
        assert_eq!(buffer.make_feature_id(0), 1);
        assert_eq!(buffer.make_feature_id(1), 0x81);
        assert_eq!(buffer.make_feature_id(0xFFFFFFFF), 0x7FFFFFFF81); // 32bits should be safe, although, theoretically, fewer bits are possible

        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 1,
            x: 1,
            y: 0,
        });
        assert_eq!(buffer.make_feature_id(0), 0x41);
        assert_eq!(buffer.make_feature_id(1), 0xC1);
        assert_eq!(buffer.make_feature_id(0xFFFFFFFF), 0x7FFFFFFFC1); // 32bits should be safe, although, theoretically, fewer bits are possible

        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 1,
            x: 0,
            y: 1,
        });
        assert_eq!(buffer.make_feature_id(0), 0x21);
        assert_eq!(buffer.make_feature_id(1), 0xA1);
        assert_eq!(buffer.make_feature_id(0xFFFFFFFF), 0x7FFFFFFFA1); // 32bits should be safe, although, theoretically, fewer bits are possible

        // maximum feature ID
        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 22,
            x: 0x3FFFFF,
            y: 0x3FFFFF,
        });
        assert_eq!(buffer.make_feature_id(0), 0x1FFFFFFFFFFF6);
        assert_eq!(buffer.make_feature_id(1), 0x3FFFFFFFFFFF6);
        assert_eq!(buffer.make_feature_id(0x7FFF), 0xFFFFFFFFFFFFFFF6); // 15bits are left for the index part
    }

    #[test]
    fn test_business_record_buffer_u_from_longitude() {
        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 0,
            x: 0,
            y: 0,
        });
        assert_eq!(buffer.u_from_longitude(*TOKYO.longitude()), 3638);
        assert_eq!(buffer.u_from_longitude(*PITTSBURGH.longitude()), 1137);
        assert_eq!(buffer.u_from_longitude(*BUENOS_AIRES.longitude()), 1383);
        assert_eq!(buffer.u_from_longitude(*CAIRNS.longitude()), 3708);

        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 16,
            x: 58211,
            y: 25806,
        });
        assert_eq!(buffer.u_from_longitude(*TOKYO.longitude()), 3338);

        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 22,
            x: 1164993,
            y: 1581136,
        });
        assert_eq!(buffer.u_from_longitude(*PITTSBURGH.longitude()), 270);
    }

    #[test]
    fn test_business_record_buffer_v_from_latitude() {
        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 0,
            x: 0,
            y: 0,
        });
        assert_eq!(buffer.v_from_latitude(*TOKYO.latitude()), 1612);
        assert_eq!(buffer.v_from_latitude(*PITTSBURGH.latitude()), 1544);
        assert_eq!(buffer.v_from_latitude(*BUENOS_AIRES.latitude()), 2468);
        assert_eq!(buffer.v_from_latitude(*CAIRNS.latitude()), 2241);

        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 16,
            x: 58211,
            y: 25806,
        });
        assert_eq!(buffer.v_from_latitude(*TOKYO.latitude()), 2387);

        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 22,
            x: 1164993,
            y: 1581136,
        });
        assert_eq!(buffer.v_from_latitude(*PITTSBURGH.latitude()), 674);
    }

    #[test]
    fn test_business_record_buffer_into_tile_earth() {
        let mut buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 0,
            x: 0,
            y: 0,
        });
        assert!(
            buffer
                .append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("test_record_1")
                        .dog_id("dog_1")
                        .business_type(BusinessType::Pee)
                        .location(TOKYO.clone())
                        .timestamp(1_755_317_141)
                        .build()
                        .unwrap(),
                )
                .is_ok(),
        );
        assert!(
            buffer
                .append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("test_record_2")
                        .dog_id("dog_2")
                        .business_type(BusinessType::Poo)
                        .location(PITTSBURGH.clone())
                        .timestamp(1_755_317_142)
                        .build()
                    .unwrap(),
                )
                .is_ok(),
        );
        assert!(
            buffer
                .append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("test_record_3")
                        .dog_id("dog_3")
                        .business_type(BusinessType::Poo)
                        .location(BUENOS_AIRES.clone())
                        .timestamp(1_755_317_142)
                        .build()
                        .unwrap(),
                )
                .is_ok(),
        );
        assert!(
            buffer
                .append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("test_record_4")
                        .dog_id("dog_3")
                        .business_type(BusinessType::Poo)
                        .location(CAIRNS.clone())
                        .timestamp(1_597_562_418)
                        .build()
                        .unwrap(),
                )
                .is_ok(),
        );

        assert_eq!(buffer.i64_values.len(), 3);
        assert_eq!(*buffer.i64_values.get(&1_755_317_141).unwrap(), 1);
        assert_eq!(*buffer.i64_values.get(&1_755_317_142).unwrap(), 2);
        assert_eq!(*buffer.i64_values.get(&1_597_562_418).unwrap(), 1);

        // 4 distinct business record IDs
        // 2 distinct business types
        // 3 distinct dog IDs
        // 3 distinct timestamps
        const NUM_VALUES: usize = 4 + 2 + 3 + 3;

        let tile: Tile = buffer.into();
        assert_eq!(tile.layers.len(), 1);

        let layer = &tile.layers[0];
        assert_eq!(layer.version.unwrap(), 2);
        assert_eq!(layer.name.as_ref().unwrap(), "business_records");
        assert_eq!(layer.extent.unwrap(), 4096);
        assert_eq!(layer.keys.len(), 4);
        assert_eq!(layer.values.len(), NUM_VALUES);
        assert_eq!(layer.features.len(), 4);

        let keys = &layer.keys;
        assert_eq!(keys[0], "recordId");
        assert_eq!(keys[1], "dogId");
        assert_eq!(keys[2], "businessType");
        assert_eq!(keys[3], "timestamp");

        // values are sorted by frequency in descending order
        // no guarantee about the order of values with the same frequency
        let values = &layer.values;
        // - 3 times
        let i_poo = values[0..=0].iter().position(expect_string("poo")).unwrap() as u32;
        // - twice
        let i_dog_3 = values[1..=2].iter().position(expect_string("dog_3")).unwrap() as u32 + 1;
        let i_1_755_317_142 = values[1..=2].iter().position(expect_int(1_755_317_142)).unwrap() as u32 + 1;
        // - once
        let i_pee = values[3..=7].iter().position(expect_string("pee")).unwrap() as u32 + 3;
        let i_dog_1 = values[3..=7].iter().position(expect_string("dog_1")).unwrap() as u32 + 3;
        let i_dog_2 = values[3..=7].iter().position(expect_string("dog_2")).unwrap() as u32 + 3;
        let i_1_755_317_141 = values[3..=7].iter().position(expect_int(1_755_317_141)).unwrap() as u32 + 3;
        let i_1_597_562_418 = values[3..=7].iter().position(expect_int(1_597_562_418)).unwrap() as u32 + 3;
        // - record IDs are guaranteed to be at the end
        let i_test_record_1 = values[8..=11].iter().position(expect_string("test_record_1")).unwrap() as u32 + 8;
        let i_test_record_2 = values[8..=11].iter().position(expect_string("test_record_2")).unwrap() as u32 + 8;
        let i_test_record_3 = values[8..=11].iter().position(expect_string("test_record_3")).unwrap() as u32 + 8;
        let i_test_record_4 = values[8..=11].iter().position(expect_string("test_record_4")).unwrap() as u32 + 8;

        let features = &layer.features;
        // features[0]
        assert_eq!(features[0].id.unwrap(), 0);
        assert!(matches!(features[0].type_.unwrap().unwrap(), GeomType::POINT));
        assert_eq!(features[0].tags, vec![
            0, i_test_record_1,
            1, i_dog_1,
            2, i_pee,
            3, i_1_755_317_141,
        ]);
        assert_eq!(features[0].geometry, vec![
            9,
            7276,
            3224,
        ]);
        // features[1]
        assert_eq!(features[1].id.unwrap(), 0x20);
        assert!(matches!(features[1].type_.unwrap().unwrap(), GeomType::POINT));
        assert_eq!(features[1].tags, vec![
            0, i_test_record_2,
            1, i_dog_2,
            2, i_poo,
            3, i_1_755_317_142,
        ]);
        assert_eq!(features[1].geometry, vec![
            9,
            2274,
            3088,
        ]);
        // features[2]
        assert_eq!(features[2].id.unwrap(), 0x40);
        assert!(matches!(features[2].type_.unwrap().unwrap(), GeomType::POINT));
        assert_eq!(features[2].tags, vec![
            0, i_test_record_3,
            1, i_dog_3,
            2, i_poo,
            3, i_1_755_317_142,
        ]);
        assert_eq!(features[2].geometry, vec![
            9,
            2766,
            4936,
        ]);
        // features[3]
        assert_eq!(features[3].id.unwrap(), 0x60);
        assert!(matches!(features[3].type_.unwrap().unwrap(), GeomType::POINT));
        assert_eq!(features[3].tags, vec![
            0, i_test_record_4,
            1, i_dog_3,
            2, i_poo,
            3, i_1_597_562_418,
        ]);
        assert_eq!(features[3].geometry, vec![
            9,
            7416,
            4482,
        ]);
    }

    #[test]
    fn test_business_record_buffer_into_tile_around_tokyo() {
        const SHINJUKU_STATION: LonLat<f64> = LonLat(139.7005541230, 35.6898188583);
        const KAMATA_STATION: LonLat<f64> = LonLat(139.7160516389, 35.5626801098);

        let mut buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 10,
            x: 909,
            y: 403,
        });
        assert!(
            buffer
                .append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("tokyo_station")
                        .dog_id("dog_1")
                        .business_type(BusinessType::Pee)
                        .location(TOKYO.clone())
                        .timestamp(1_755_317_141)
                        .build()
                        .unwrap(),
                )
                .is_ok(),
        );
        assert!(
            buffer
                .append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("shinjuku_station")
                        .dog_id("dog_2")
                        .business_type(BusinessType::Pee)
                        .location(SHINJUKU_STATION.clone())
                        .timestamp(1_755_317_141)
                        .build()
                        .unwrap(),
                )
                .is_ok(),
        );
        assert!(
            buffer
                .append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("kamata_station")
                        .dog_id("dog_3")
                        .business_type(BusinessType::Poo)
                        .location(KAMATA_STATION.clone())
                        .timestamp(1_755_317_141)
                        .build()
                        .unwrap(),
                )
                .is_ok(),
        );
        assert!(
            buffer
                .append_business_record(
                    BusinessRecordBuilder::default()
                        .record_id("point_state_park")
                        .dog_id("dog_4")
                        .business_type(BusinessType::Poo)
                        .location(PITTSBURGH.clone())
                        .timestamp(1_755_317_142)
                        .build()
                        .unwrap(),
                )
                .is_err(), // outside of the tile
        );

        // 3 distinct record IDs
        // 2 distinct business types
        // 3 distinct dog IDs
        // 1 distinct timestamp
        const NUM_VALUES: usize = 3 + 2 + 3 + 1;

        let tile: Tile = buffer.into();
        assert_eq!(tile.layers.len(), 1);

        let layer = &tile.layers[0];
        assert_eq!(layer.version.unwrap(), 2);
        assert_eq!(layer.name.as_ref().unwrap(), "business_records");
        assert_eq!(layer.extent.unwrap(), 4096);
        assert_eq!(layer.keys.len(), 4);
        assert_eq!(layer.values.len(), NUM_VALUES);
        assert_eq!(layer.features.len(), 3);

        let keys = &layer.keys;
        assert_eq!(keys[0], "recordId");
        assert_eq!(keys[1], "dogId");
        assert_eq!(keys[2], "businessType");
        assert_eq!(keys[3], "timestamp");

        // values are sorted by frequency in descending order
        // no guarantee about the order of values with the same frequency
        let values = &layer.values;
        // - 3 times
        let i_1_755_317_141 = values[0..=0].iter().position(expect_int(1_755_317_141)).unwrap() as u32;
        // - twice
        let i_pee = values[1..=2].iter().position(expect_string("pee")).unwrap() as u32 + 1;
        // - once
        let i_poo = values[2..=5].iter().position(expect_string("poo")).unwrap() as u32 + 2;
        let i_dog_1 = values[2..=5].iter().position(expect_string("dog_1")).unwrap() as u32 + 2;
        let i_dog_2 = values[2..=5].iter().position(expect_string("dog_2")).unwrap() as u32 + 2;
        let i_dog_3 = values[2..=5].iter().position(expect_string("dog_3")).unwrap() as u32 + 2;
        // - record IDs are guaranteed to be at the end
        let i_tokyo_station = values[6..=8].iter().position(expect_string("tokyo_station")).unwrap() as u32 + 6;
        let i_shinjuku_station = values[6..=8].iter().position(expect_string("shinjuku_station")).unwrap() as u32 + 6;
        let i_kamata_station = values[6..=8].iter().position(expect_string("kamata_station")).unwrap() as u32 + 6;

        let features = &layer.features;
        const BASE_FEATURE_ID: u64 = (909 << 15) | (403 << 5) | 10;
        // features[0]
        assert_eq!(features[0].id.unwrap(), BASE_FEATURE_ID);
        assert!(matches!(features[0].type_.unwrap().unwrap(), GeomType::POINT));
        assert_eq!(features[0].tags, vec![
            0, i_tokyo_station,
            1, i_dog_1,
            2, i_pee,
            3, i_1_755_317_141,
        ]);
        assert_eq!(features[0].geometry, vec![
            9,
            4584,
            1866,
        ]);
        // features[1]
        assert_eq!(features[1].id.unwrap(), BASE_FEATURE_ID + (1 << 25));
        assert!(matches!(features[1].type_.unwrap().unwrap(), GeomType::POINT));
        assert_eq!(features[1].tags, vec![
            0, i_shinjuku_station,
            1, i_dog_2,
            2, i_pee,
            3, i_1_755_317_141,
        ]);
        assert_eq!(features[1].geometry, vec![
            9,
            3034,
            1626,
        ]);
        // features[2]
        assert_eq!(features[2].id.unwrap(), BASE_FEATURE_ID + (2 << 25));
        assert!(matches!(features[2].type_.unwrap().unwrap(), GeomType::POINT));
        assert_eq!(features[2].tags, vec![
            0, i_kamata_station,
            1, i_dog_3,
            2, i_poo,
            3, i_1_755_317_141,
        ]);
        assert_eq!(features[2].geometry, vec![
            9,
            3394,
            5270,
        ]);
    }

    #[test]
    fn test_business_record_buffer_into_tile_empty() {
        let buffer = BusinessRecordBuffer::new(TileCoordinates {
            zoom: 16,
            x: 58138,
            y: 25860,
        });

        let tile: Tile = buffer.into();
        assert_eq!(tile.layers.len(), 1);

        let layer = &tile.layers[0];
        assert_eq!(layer.version.unwrap(), 2);
        assert_eq!(layer.name.as_ref().unwrap(), "business_records");
        assert_eq!(layer.extent.unwrap(), 4096);
        assert_eq!(layer.keys.len(), 0);
        assert_eq!(layer.values.len(), 0);
        assert_eq!(layer.features.len(), 0);
    }

    /// Returns a closure that expects a `Value` is a static string value.
    #[inline]
    fn expect_string(s: &'static str) -> impl Fn(&Value) -> bool {
        move |v| v.string_value.as_ref().is_some_and(|v| v == s)
    }

    /// Returns a closure that expects a `Value` is an int value.
    #[inline]
    fn expect_int(i: i64) -> impl Fn(&Value) -> bool{
        move |v| v.int_value.as_ref().is_some_and(|&v| v == i)
    }
}
