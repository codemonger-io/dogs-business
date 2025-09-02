//! Utilities related to the Web Mercator projection.

use std::f64::consts::PI;

/// Maximum zoom level.
pub const MAX_ZOOM: u32 = 22;

/// Calculates x coordinate from longitude at given zoom level.
///
/// `longitude` must be in degrees.
///
/// Formula: `x = (λ + π) * 2ᶻ / 2π` where `λ` is `longitude` in radians.
///
/// No flooring is applied to `x`.
///
/// Panics if `z` is greater than [`MAX_ZOOM`].
#[inline]
pub fn x_from_longitude_at_zoom(longitude: f64, z: u32) -> f64 {
    tiles_per_edge_at_zoom(z) * normalized_x_from_longitude(longitude)
}

/// Calculates normalized x coordinate from longitude.
///
/// Equivalent to the x coordinate at zoom level 0.
///
/// Formula: `x = (λ + π) / 2π` where `λ` is `longitude` in radians.
#[inline]
pub fn normalized_x_from_longitude(longitude: f64) -> f64 {
    (longitude + 180.0) / 360.0
}


/// Calculates y coordinate from latitude at given zoom level.
///
/// `latitude` must be in degrees.
///
/// Formula: `y = (π - ln(tan(π/4 + φ/2))) * 2ᶻ / 2π` where `φ` is `latitude`
/// in radians.
///
/// No flooring is applied to `y`.
///
/// Panics if `z` is greater than [`MAX_ZOOM`].
#[inline]
pub fn y_from_latitude_at_zoom(latitude: f64, z: u32) -> f64 {
    let φ = latitude.to_radians();
    let ln = (0.25 * PI + 0.5 * φ).tan().ln();
    tiles_per_edge_at_zoom(z) * (PI - ln) / (2.0 * PI)
}

/// Calculates normalized y coordinate from latitude.
///
/// Equivalent to the y coordinate at zoom level 0.
///
/// Formula: y = (π - ln(tan(π/4 + φ/2))) / 2π` where `φ` is `latitude` in
/// radians.
#[inline]
pub fn normalized_y_from_latitude(latitude: f64) -> f64 {
    let φ = latitude.to_radians();
    let ln = (0.25 * PI + 0.5 * φ).tan().ln();
    0.5 - ln / (2.0 * PI)
}

/// Calculates longitude from x coordinate at given zoom level.
///
/// Formula: `λ = x*2π/2ᶻ - π`
///
/// Returns `λ` in degrees.
///
/// Panics if `z` is greater than [`MAX_ZOOM`].
#[inline]
pub fn longitude_from_x_at_zoom(x: u32, z: u32) -> f64 {
    let λ = (x as f64) * two_pi_div_tiles_per_edge_at_zoom(z) - PI;
    λ.to_degrees()
}

/// Calculates latitude from y coordinate at given zoom level.
///
/// Formula: `φ = 2*atan(e^(π - y*2π/2ᶻ)) - π/2`
///
/// Returns `φ` in degrees.
///
/// Panics if `z` is greater than [`MAX_ZOOM`].
#[inline]
pub fn latitude_from_y_at_zoom(y: u32, z: u32) -> f64 {
    let exp = (PI - (y as f64) * two_pi_div_tiles_per_edge_at_zoom(z)).exp();
    let φ = 2.0 * exp.atan() - 0.5 * PI;
    φ.to_degrees()
}

/// Edge length in tiles at given zoom level.
///
/// `2^z` which is necessary to calculate:
/// - x coordinate from longitude
/// - y coordinate from latitude
///
/// The value is integer, but returned as `f64` because it is used in
/// floating-point arithmetic.
///
/// Panics if `z` is greater than [`MAX_ZOOM`].
#[inline]
pub const fn tiles_per_edge_at_zoom(z: u32) -> f64 {
    match z {
        0..=MAX_ZOOM => power_of_two(z),
        _ => panic!("zoom level is out of range"),
    }
}

/// `2π / 2ᶻ` which is necessary to calculate longitude and latitude from
/// x and y coordinates.
#[inline]
pub const fn two_pi_div_tiles_per_edge_at_zoom(z: u32) -> f64 {
    match z {
        0..=MAX_ZOOM => 2.0 * std::f64::consts::PI / power_of_two(z),
        _ => panic!("zoom level is out of range"),
    }
}

/// Power of two.
///
/// Undefined if `n + 1` is greater than or equal to the number of mantissa
/// digits in `f64`.
#[inline]
pub const fn power_of_two(n: u32) -> f64 {
    assert!(n + 1 < std::f64::MANTISSA_DIGITS);
    (1u64 << n) as f64
}

#[cfg(test)]
mod tests {
    use super::*;

    macro_rules! assert_approx_eq {
        ($a:expr, $b:expr, $e:expr) => {
            assert!(($a - $b).abs() < $e, "Expected {} to be approximately equal to {} within {}", $a, $b, $e);
        };
    }

    #[test]
    fn test_x_from_longitude_at_zoom_0_to_22() {
        const EPSILON: f64 = 1e-5; // 5-digit precision is enough for our use case. because the tile extent is 4096
        const LONGITUDE_1: f64 = 139.7670506677;
        const LONGITUDE_2: f64 = -80.0078645321;

        // z = 0
        let z = 0;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 0.5, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 1.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 0.888242, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 0.277756, EPSILON);
        // z = 1
        let z = 1;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 1.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 2.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 1.776484, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 0.555512, EPSILON);
        // z = 2
        let z = 2;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 2.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 4.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 3.552967, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 1.111024, EPSILON);
        // z = 3
        let z = 3;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 4.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 8.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 7.105934, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 2.222047, EPSILON);
        // z = 4
        let z = 4;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 8.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 16.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 14.211869, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 4.444095, EPSILON);
        // z = 5
        let z = 5;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 16.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 32.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 28.423738, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 8.888190, EPSILON);
        // z = 6
        let z = 6;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 32.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 64.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 56.847476, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 17.776380, EPSILON);
        // z = 7
        let z = 7;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 64.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 128.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 113.694951, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 35.552759, EPSILON);
        // z = 8
        let z = 8;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 128.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 256.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 227.389903, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 71.105519, EPSILON);
        // z = 9
        let z = 9;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 256.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 512.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 454.779805, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 142.211037, EPSILON);
        // z = 10
        let z = 10;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 512.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 1024.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 909.559611, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 284.422074, EPSILON);
        // z = 11
        let z = 11;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 1024.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 2048.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 1819.119222, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 568.844148, EPSILON);
        // z = 12
        let z = 12;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 2048.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 4096.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 3638.238443, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 1137.688297, EPSILON);
        // z = 13
        let z = 13;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 4096.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 8192.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 7276.476886, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 2275.376594, EPSILON);
        // z = 14
        let z = 14;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 8192.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 16384.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 14552.953773, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 4550.753188, EPSILON);
        // z = 15
        let z = 15;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 16384.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 32768.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 29105.907545, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 9101.506375, EPSILON);
        // z = 16
        let z = 16;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 32768.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 65536.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 58211.815090, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 18203.012750, EPSILON);
        // z = 17
        let z = 17;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 65536.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 131072.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 116423.630181, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 36406.025500, EPSILON);
        // z = 18
        let z = 18;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 131072.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 262144.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 232847.260362, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 72812.051000, EPSILON);
        // z = 19
        let z = 19;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 262144.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 524288.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 465694.520724, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 145624.102001, EPSILON);
        // z = 20
        let z = 20;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 524288.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 1048576.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 931389.041447054, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 291248.204001, EPSILON);
        // z = 21
        let z = 21;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 1048576.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 2097152.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 1862778.082894, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 582496.408002, EPSILON);
        // z = 22
        let z = 22;
        assert_approx_eq!(x_from_longitude_at_zoom(0.0, z), 2097152.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(-180.0, z), 0.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(180.0, z), 4194304.0, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_1, z), 3725556.165788, EPSILON);
        assert_approx_eq!(x_from_longitude_at_zoom(LONGITUDE_2, z), 1164992.816005, EPSILON);
    }

    #[test]
    fn test_normalized_x_from_latitude() {
        const EPSILON: f64 = 1e-12; // higher precision is required, because it will be scaled
        const LONGITUDE_1: f64 = 139.7670506677;
        const LONGITUDE_2: f64 = -80.0078645321;

        assert_approx_eq!(normalized_x_from_longitude(0.0), 0.5, EPSILON);
        assert_approx_eq!(normalized_x_from_longitude(-180.0), 0.0, EPSILON);
        assert_approx_eq!(normalized_x_from_longitude(180.0), 1.0, EPSILON);
        assert_approx_eq!(normalized_x_from_longitude(LONGITUDE_1), 0.8882418074103, EPSILON);
        assert_approx_eq!(normalized_x_from_longitude(LONGITUDE_2), 0.2777559318553, EPSILON);
    }

    #[test]
    fn test_y_from_latitude_at_zoom_0_to_22() {
        const EPSILON: f64 = 1e-5; // 5-digit precision is enough for our use case. because the tile extent is 4096
        const MAX_LATITUDE: f64 = 85.051128779807; // ← 2*atan(e^π) - π/2
        const LATITUDE_1: f64 = 35.6813663563;
        const LATITUDE_2: f64 = -58.3815431064;

        // z = 0
        let z = 0;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 0.5, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 1.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 0.393778, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 0.700821, EPSILON);
        // z = 1
        let z = 1;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 1.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 2.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 0.787555, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 1.401642, EPSILON);
        // z = 2
        let z = 2;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 2.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 4.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 1.575110, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 2.803283, EPSILON);
        // z = 3
        let z = 3;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 4.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 8.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 3.150220, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 5.606567, EPSILON);
        // z = 4
        let z = 4;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 8.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 16.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 6.300441, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 11.213133, EPSILON);
        // z = 5
        let z = 5;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 16.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 32.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 12.600882, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 22.426267, EPSILON);
        // z = 6
        let z = 6;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 32.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 64.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 25.201764, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 44.852534, EPSILON);
        // z = 7
        let z = 7;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 64.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 128.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 50.403528, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 89.705068, EPSILON);
        // z = 8
        let z = 8;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 128.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 256.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 100.807056, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 179.410135, EPSILON);
        // z = 9
        let z = 9;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 256.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 512.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 201.614112, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 358.820271, EPSILON);
        // z = 10
        let z = 10;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 512.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 1024.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 403.228223, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 717.640541, EPSILON);
        // z = 11
        let z = 11;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 1024.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 2048.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 806.456446, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 1435.281083, EPSILON);
        // z = 12
        let z = 12;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 2048.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 4096.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 1612.912893, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 2870.562166, EPSILON);
        // z = 13
        let z = 13;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 4096.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 8192.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 3225.825786, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 5741.124332, EPSILON);
        // z = 14
        let z = 14;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 8192.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 16384.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 6451.651572, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 11482.248663, EPSILON);
        // z = 15
        let z = 15;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 16384.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 32768.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 12903.303144, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 22964.497327, EPSILON);
        // z = 16
        let z = 16;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 32768.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 65536.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 25806.606287, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 45928.994654, EPSILON);
        // z = 17
        let z = 17;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 65536.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 131072.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 51613.212574, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 91857.989307, EPSILON);
        // z = 18
        let z = 18;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 131072.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 262144.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 103226.425148, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 183715.978614, EPSILON);
        // z = 19
        let z = 19;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 262144.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 524288.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 206452.850296, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 367431.957229, EPSILON);
        // z = 20
        let z = 20;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 524288.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 1048576.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 412905.700593, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 734863.914458, EPSILON);
        // z = 21
        let z = 21;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 1048576.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 2097152.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 825811.401186, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 1469727.828916, EPSILON);
        // z = 22
        let z = 22;
        assert_approx_eq!(y_from_latitude_at_zoom(0.0, z), 2097152.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(MAX_LATITUDE, z), 0.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(-MAX_LATITUDE, z), 4194304.0, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_1, z), 1651622.802371, EPSILON);
        assert_approx_eq!(y_from_latitude_at_zoom(LATITUDE_2, z), 2939455.657831, EPSILON);
    }

    #[test]
    fn test_normalized_y_from_latitude() {
        const EPSILON: f64 = 1e-12; // higher precision is required, because it will be scaled
        const MAX_LATITUDE: f64 = 85.051128779807; // ← 2*atan(e^π) - π/2
        const LATITUDE_1: f64 = 35.6813663563;
        const LATITUDE_2: f64 = -58.3815431064;

        assert_approx_eq!(normalized_y_from_latitude(0.0), 0.5, EPSILON);
        assert_approx_eq!(normalized_y_from_latitude(MAX_LATITUDE), 0.0, EPSILON);
        assert_approx_eq!(normalized_y_from_latitude(-MAX_LATITUDE), 1.0, EPSILON);
        assert_approx_eq!(normalized_y_from_latitude(LATITUDE_1), 0.3937775617532, EPSILON);
        assert_approx_eq!(normalized_y_from_latitude(LATITUDE_2), 0.7008208412721, EPSILON);
    }

    #[test]
    fn longitude_from_x_at_zoom_0_to_22() {
        const EPSILON: f64 = 1e-10; // 10-digit precision looks enough for our use case.

        // z = 0
        let z = 0;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(1, z), 180.0, EPSILON);
        // z = 1
        let z = 1;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(1, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(2, z), 180.0, EPSILON);
        // z = 2
        let z = 2;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(1, z), -90.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(2, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(3, z), 90.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(4, z), 180.0, EPSILON);
        // z = 3
        let z = 3;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(2, z), -90.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(4, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(7, z), 135.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(8, z), 180.0, EPSILON);
        // z = 4
        let z = 4;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(4, z), -90.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(8, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(14, z), 135.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(16, z), 180.0, EPSILON);
        // z = 5
        let z = 5;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(8, z), -90.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(16, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(28, z), 135.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(32, z), 180.0, EPSILON);
        // z = 6
        let z = 6;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(17, z), -84.375, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(32, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(56, z), 135.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(64, z), 180.0, EPSILON);
        // z = 7
        let z = 7;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(35, z), -81.5625, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(64, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(113, z), 137.8125, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(128, z), 180.0, EPSILON);
        // z = 8
        let z = 8;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(71, z), -80.15625, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(128, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(227, z), 139.21875, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(256, z), 180.0, EPSILON);
        // z = 9
        let z = 9;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(142, z), -80.15625, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(256, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(454, z), 139.21875, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(512, z), 180.0, EPSILON);
        // z = 10
        let z = 10;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(284, z), -80.15625, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(512, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(909, z), 139.5703125, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(1024, z), 180.0, EPSILON);
        // z = 11
        let z = 11;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(568, z), -80.15625, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(1024, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(1819, z), 139.74609375, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(2048, z), 180.0, EPSILON);
        // z = 12
        let z = 12;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(1137, z), -80.068359375, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(2048, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(3638, z), 139.74609375, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(4096, z), 180.0, EPSILON);
        // z = 13
        let z = 13;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(2275, z), -80.0244140625, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(4096, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(7276, z), 139.74609375, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(8192, z), 180.0, EPSILON);
        // z = 14
        let z = 14;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(4550, z), -80.0244140625, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(8192, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(14552, z), 139.74609375, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(16384, z), 180.0, EPSILON);
        // z = 15
        let z = 15;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(9101, z), -80.01342773438, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(16384, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(29105, z), 139.75708007813, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(32768, z), 180.0, EPSILON);
        // z = 16
        let z = 16;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(18203, z), -80.00793457031, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(32768, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(58211, z), 139.76257324219, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(65536, z), 180.0, EPSILON);
        // z = 17
        let z = 17;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(36406, z), -80.00793457031, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(65536, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(116423, z), 139.76531982422, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(131072, z), 180.0, EPSILON);
        // z = 18
        let z = 18;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(72812, z), -80.00793457031, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(131072, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(232847, z), 139.76669311523438, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(262144, z), 180.0, EPSILON);
        // z = 19
        let z = 19;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(145624, z), -80.00793457031, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(262144, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(465694, z), 139.76669311523438, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(524288, z), 180.0, EPSILON);
        // z = 20
        let z = 20;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(291248, z), -80.00793457031, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(524288, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(931389, z), 139.76703643799, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(1048576, z), 180.0, EPSILON);
        // z = 21
        let z = 21;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(582496, z), -80.00793457031, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(1048576, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(1862778, z), 139.76703643799, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(2097152, z), 180.0, EPSILON);
        // z = 22
        let z = 22;
        assert_approx_eq!(longitude_from_x_at_zoom(0, z), -180.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(1164992, z), -80.00793457031, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(2097152, z), 0.0, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(3725556, z), 139.76703643799, EPSILON);
        assert_approx_eq!(longitude_from_x_at_zoom(4194304, z), 180.0, EPSILON);
    }

    #[test]
    fn latitude_from_y_at_zoom_0_to_22() {
        const EPSILON: f64 = 1e-10; // 10-digit precision looks enough for our use case.
        const MAX_LATITUDE: f64 = 85.051128779807; // ← 2*atan(e^π) - π/2

        // z = 0
        let z = 0;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(1, z), -MAX_LATITUDE, EPSILON);
        // z = 1
        let z = 1;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(1, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(2, z), -MAX_LATITUDE, EPSILON);
        // z = 2
        let z = 2;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(1, z), 66.51326044311, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(2, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(3, z), -66.51326044311, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(4, z), -MAX_LATITUDE, EPSILON);
        // z = 3
        let z = 3;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(3, z), 40.97989806962, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(4, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(5, z), -40.97989806962, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(8, z), -MAX_LATITUDE, EPSILON);
        // z = 4
        let z = 4;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(6, z), 40.97989806962, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(8, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(9, z), -21.94304553344, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(16, z), -MAX_LATITUDE, EPSILON);
        // z = 5
        let z = 5;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(12, z), 40.97989806962, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(16, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(18, z), -21.94304553344, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(32, z), -MAX_LATITUDE, EPSILON);
        // z = 6
        let z = 6;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(25, z), 36.59788913307, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(32, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(36, z), -21.94304553344, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(64, z), -MAX_LATITUDE, EPSILON);
        // z = 7
        let z = 7;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(50, z), 36.59788913307, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(64, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(71, z), -19.31114335506, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(128, z), -MAX_LATITUDE, EPSILON);
        // z = 8
        let z = 8;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(100, z), 36.59788913307, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(128, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(141, z), -17.97873309556, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(256, z), -MAX_LATITUDE, EPSILON);
        // z = 9
        let z = 9;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(201, z), 36.03133177633, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(256, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(281, z), -17.30868788677, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(512, z), -MAX_LATITUDE, EPSILON);
        // z = 10
        let z = 10;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(403, z), 35.74651225992, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(512, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(561, z), -16.97274102000, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(1024, z), -MAX_LATITUDE, EPSILON);
        // z = 11
        let z = 11;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(806, z), 35.74651225992, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(1024, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(1121, z), -16.80454107638, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(2048, z), -MAX_LATITUDE, EPSILON);
        // z = 12
        let z = 12;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(1612, z), 35.74651225992, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(2048, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(2242, z), -16.80454107638, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(4096, z), -MAX_LATITUDE, EPSILON);
        // z = 13
        let z = 13;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(3225, z), 35.71083783530, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(4096, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(4483, z), -16.76246771794, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(8192, z), -MAX_LATITUDE, EPSILON);
        // z = 14
        let z = 14;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(6451, z), 35.69299463210, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(8192, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(8966, z), -16.76246771794, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(16384, z), -MAX_LATITUDE, EPSILON);
        // z = 15
        let z = 15;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(12903, z), 35.68407153314, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(16384, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(17932, z), -16.76246771794, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(32768, z), -MAX_LATITUDE, EPSILON);
        // z = 16
        let z = 16;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(25806, z), 35.68407153314, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(32768, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(35864, z), -16.76246771794, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(65536, z), -MAX_LATITUDE, EPSILON);
        // z = 17
        let z = 17;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(51613, z), 35.68184060244, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(65536, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(71727, z), -16.75983782378, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(131072, z), -MAX_LATITUDE, EPSILON);
        // z = 18
        let z = 18;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(103226, z), 35.68184060244, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(131072, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(143454, z), -16.75983782378, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(262144, z), -MAX_LATITUDE, EPSILON);
        // z = 19
        let z = 19;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(206452, z), 35.68184060244, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(262144, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(286908, z), -16.75983782378, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(524288, z), -MAX_LATITUDE, EPSILON);
        // z = 20
        let z = 20;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(412905, z), 35.68156173172, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(524288, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(573816, z), -16.75983782378, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(1048576, z), -MAX_LATITUDE, EPSILON);
        // z = 21
        let z = 21;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(825811, z), 35.68142229599, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(1048576, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(1147631, z), -16.75967345418, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(2097152, z), -MAX_LATITUDE, EPSILON);
        // z = 22
        let z = 22;
        assert_approx_eq!(latitude_from_y_at_zoom(0, z), MAX_LATITUDE, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(1651622, z), 35.68142229599, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(2097152, z), 0.0, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(2295262, z), -16.75967345418, EPSILON);
        assert_approx_eq!(latitude_from_y_at_zoom(4194304, z), -MAX_LATITUDE, EPSILON);
    }

    #[test]
    fn test_tiles_per_edge_at_zoom() {
        // should exactly match because they are integers
        assert_eq!(tiles_per_edge_at_zoom(0), 1.0);
        assert_eq!(tiles_per_edge_at_zoom(1), 2.0);
        assert_eq!(tiles_per_edge_at_zoom(2), 4.0);
        assert_eq!(tiles_per_edge_at_zoom(3), 8.0);
        assert_eq!(tiles_per_edge_at_zoom(4), 16.0);
        assert_eq!(tiles_per_edge_at_zoom(5), 32.0);
        assert_eq!(tiles_per_edge_at_zoom(6), 64.0);
        assert_eq!(tiles_per_edge_at_zoom(7), 128.0);
        assert_eq!(tiles_per_edge_at_zoom(8), 256.0);
        assert_eq!(tiles_per_edge_at_zoom(9), 512.0);
        assert_eq!(tiles_per_edge_at_zoom(10), 1024.0);
        assert_eq!(tiles_per_edge_at_zoom(11), 2048.0);
        assert_eq!(tiles_per_edge_at_zoom(12), 4096.0);
        assert_eq!(tiles_per_edge_at_zoom(13), 8192.0);
        assert_eq!(tiles_per_edge_at_zoom(14), 16384.0);
        assert_eq!(tiles_per_edge_at_zoom(15), 32768.0);
        assert_eq!(tiles_per_edge_at_zoom(16), 65536.0);
        assert_eq!(tiles_per_edge_at_zoom(17), 131072.0);
        assert_eq!(tiles_per_edge_at_zoom(18), 262144.0);
        assert_eq!(tiles_per_edge_at_zoom(19), 524288.0);
        assert_eq!(tiles_per_edge_at_zoom(20), 1048576.0);
        assert_eq!(tiles_per_edge_at_zoom(21), 2097152.0);
        assert_eq!(tiles_per_edge_at_zoom(22), 4194304.0);
    }
}
