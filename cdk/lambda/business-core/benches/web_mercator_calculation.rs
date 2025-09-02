use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion};
use std::f64::consts::PI;
use std::hint::black_box;

use business_core::web_mercator::{
    latitude_from_y_at_zoom,
    longitude_from_x_at_zoom,
    x_from_longitude_at_zoom,
    y_from_latitude_at_zoom,
};

#[inline]
fn x_from_longitude_at_zoom_open(longitude: f64, z: u32) -> f64 {
    let λ = longitude.to_radians();
    power_of_two(z) * (λ + PI) / (2.0 * PI)
}

#[inline]
fn y_from_latitude_at_zoom_open(latitude: f64, z: u32) -> f64 {
    let φ = latitude.to_radians();
    let ln = (0.25 * PI + 0.5 * φ).tan().ln();
    power_of_two(z) * (PI - ln) / (2.0 * PI)
}

#[inline]
fn longitude_from_x_at_zoom_open(x: u32, z: u32) -> f64 {
    let λ = (x as f64) * two_pi_div_tiles_per_edge_at_zoom_open(z) - PI;
    λ.to_degrees()
}

#[inline]
fn latitude_from_y_at_zoom_open(y: u32, z: u32) -> f64 {
    let exp = (PI - (y as f64) * two_pi_div_tiles_per_edge_at_zoom_open(z)).exp();
    let φ = 2.0 * exp.atan() - 0.5 * PI;
    φ.to_degrees()
}

#[inline]
fn two_pi_div_tiles_per_edge_at_zoom_open(z: u32) -> f64 {
    2.0 * PI / power_of_two(z)
}

#[inline]
const fn power_of_two(n: u32) -> f64 {
    assert!(n + 1 < std::f64::MANTISSA_DIGITS);
    (1 << n) as f64
}

fn bench_x_from_longitude_at_zoom(c: &mut Criterion) {
    let mut group = c.benchmark_group("x_from_longitude_at_zoom");
    group.bench_function(
        BenchmarkId::new("open", "longitude=139.3644 at z=12"),
        |b| b.iter(|| x_from_longitude_at_zoom_open(black_box(139.3644), black_box(12))),
    );
    group.bench_function(
        BenchmarkId::new("ranged", "longitude=139.3644 at z=12"),
        |b| b.iter(|| x_from_longitude_at_zoom(black_box(139.3644), black_box(12))),
    );
    group.finish();
}

fn bench_y_from_latitude_at_zoom(c: &mut Criterion) {
    let mut group = c.benchmark_group("y_from_latitude_at_zoom");
    group.bench_function(
        BenchmarkId::new("open", "latitude=35.4394 at z=12"),
        |b| b.iter(|| y_from_latitude_at_zoom_open(black_box(35.4394), black_box(12))),
    );
    group.bench_function(
        BenchmarkId::new("ranged", "latitude=35.4394 at z=12"),
        |b| b.iter(|| y_from_latitude_at_zoom(black_box(139.3644), black_box(12))),
    );
    group.finish();
}

fn bench_longitude_from_x_at_zoom(c: &mut Criterion) {
    let mut group = c.benchmark_group("longitude_from_x_at_zoom");
    group.bench_function(
        BenchmarkId::new("open", "x=2099 at z=16"),
        |b| b.iter(|| longitude_from_x_at_zoom_open(black_box(2099), black_box(16))),
    );
    group.bench_function(
        BenchmarkId::new("ranged", "x=2099 at z=16"),
        |b| b.iter(|| longitude_from_x_at_zoom(black_box(2099), black_box(16))),
    );
    group.finish();
}

fn bench_latitude_from_y_at_zoom(c: &mut Criterion) {
    let mut group = c.benchmark_group("latitude_from_y_at_zoom");
    group.bench_function(
        BenchmarkId::new("open", "y=15 at z=5"),
        |b| b.iter(|| latitude_from_y_at_zoom_open(black_box(15), black_box(5))),
    );
    group.bench_function(
        BenchmarkId::new("ranged", "y=15 at z=5"),
        |b| b.iter(|| latitude_from_y_at_zoom(black_box(15), black_box(5))),
    );
    group.finish();
}

criterion_group!(benches_x_from_longitude, bench_x_from_longitude_at_zoom);
criterion_group!(benches_y_from_latitude, bench_y_from_latitude_at_zoom);
criterion_group!(benches_longitude_from_x, bench_longitude_from_x_at_zoom);
criterion_group!(benches_latitude_from_y, bench_latitude_from_y_at_zoom);
criterion_main!(
    benches_x_from_longitude,
    benches_y_from_latitude,
    benches_longitude_from_x,
    benches_latitude_from_y,
);
