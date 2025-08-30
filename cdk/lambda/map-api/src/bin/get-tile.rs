//! Obtains the map tile at given coordinates.
//!
//! ## Environment variables
//!
//! ## Input
//!
//! Input must be a JSON object with the following fields:
//! - `zoom`: (number) zoom level of the tile
//! - `x`: (number) x coordinate of the tile
//! - `y`: (number) y coordinate of the tile
//!
//! ## Output
//!
//! Output is Base64-encoded Mapbox vector tile (mvt) data.
//! The API Gateway has to convert it to binary.
//!
//! Please note that a Lambda function behind API Gateway cannot return raw
//! binary data.

use base64::engine::{general_purpose::STANDARD as base64_engine, Engine as _};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use protobuf::Message;
use serde::Deserialize;
use std::sync::Arc;

use map_api::{BusinessRecordBuilder, BusinessType, LonLat};
use map_api::mvt::{
    MvtError,
    TileCoordinates,
    symbol::BusinessRecordBuffer,
};
use map_api::protos::vector_tile::Tile;

// Shared state.
struct SharedState;

impl SharedState {
    async fn new() -> Result<Self, Error> {
        Ok(Self)
    }
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<TileCoordinates>,
) -> Result<String, Error> {
    let coordinates = event.payload;

    tracing::info!("z: {}, x: {}, y: {}", coordinates.zoom, coordinates.x, coordinates.y);

    let records = vec![
        BusinessRecordBuilder::default()
            .record_id("00000000000000000000001")
            .dog_id("00000000000000000000001")
            .business_type(BusinessType::Pee)
            .timestamp(1_753_488_486)
            .location(LonLat(139.3644, 35.4394))
            .build()
            .unwrap(),
        BusinessRecordBuilder::default()
            .record_id("00000000000000000000002")
            .dog_id("00000000000000000000001")
            .business_type(BusinessType::Poo)
            .timestamp(1_753_488_487)
            .location(LonLat(139.7671, 35.6813))
            .build()
            .unwrap(),
    ];

    let mut mvt_buffer = BusinessRecordBuffer::new(coordinates);
    for (i, record) in records.into_iter().enumerate() {
        match mvt_buffer.append_business_record(record) {
            Ok(_) => tracing::info!("added business record: {i}"),
            Err(MvtError::OutsideOfTile) =>
                tracing::info!("business record is outside of the tile"),
            Err(MvtError::DuplicateRecordId(record_id)) => {
                tracing::error!("duplicate record ID: {record_id}");
                return Err("internal error".into());
            }
        }
    }

    let tile: Tile = mvt_buffer.into();

    // prints the layer for a debugging purpose
    let layer = &tile.layers[0];
    tracing::info!("layer version: {:?}", layer.version);
    tracing::info!("layer name: {:?}", layer.name);
    tracing::info!("layer # of features: {}", layer.features.len());
    tracing::info!("layer # of keys: {}", layer.keys.len());
    tracing::info!("layer # of values: {}", layer.values.len());
    tracing::info!("layer extent: {:?}", layer.extent);
    for (i, key) in layer.keys.iter().enumerate() {
        tracing::info!("key[{i}]: {key}");
    }
    for (i, value) in layer.values.iter().enumerate() {
        if let Some(s) = value.string_value.as_ref() {
            tracing::info!("value[{i}]: {s}");
        } else if let Some(i) = value.int_value.as_ref() {
            tracing::info!("value[{i}]: {i}");
        } else {
            tracing::info!("value[{i}]: other!");
        }
    }
    for (i, feature) in layer.features.iter().enumerate() {
        tracing::info!("feature[{}] id: {:?}", i, feature.id);
        tracing::info!("feature[{}] # of tags: {}", i, feature.tags.len());
        tracing::info!("feature[{}] type: {:?}", i, feature.type_);
        tracing::info!("feature[{}] # of geometry: {}", i, feature.geometry.len());
        for (j, geometry) in feature.geometry.iter().enumerate() {
            tracing::info!("feature[{}] geometry[{}]: {}", i, j, geometry);
        }
        for (j, key_value) in feature.tags.chunks(2).enumerate() {
            let key_i = key_value[0];
            let value_i = key_value[1];
            tracing::info!(
                "feature[{}] tag[{}]: {} → {}",
                i,
                j,
                layer.keys[key_i as usize],
                {
                    let value = &layer.values[value_i as usize];
                    if let Some(s) = value.string_value.as_ref() {
                        s.clone()
                    } else if let Some(i) = value.int_value.as_ref() {
                        i.to_string()
                    } else {
                        "other".to_string()
                    }
                },
            );
        }
    }

    let tile_bytes = tile
        .write_to_bytes()
        .map_err(|e| {
            tracing::error!("failed to serialize map tile vector tile: {e}");
            "internal error"
        })?;
    tracing::info!("map tile size: {} bytes", tile_bytes.len());
    let tile_b64 = base64_engine.encode(tile_bytes);

    Ok(tile_b64)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        // disable printing the name of the module in every log line.
        .with_target(false)
        // disabling time is handy because CloudWatch will add the ingestion time.
        .without_time()
        .init();

    let shared_state = Arc::new(SharedState::new().await?);
    run(service_fn(|req| async {
        function_handler(shared_state.clone(), req).await
    })).await
}
