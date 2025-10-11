//! Obtains the map tile at given coordinates.
//!
//! ## Environment variables
//!
//! You have to configure the following environment varialbes:
//! - `BUSINESS_RECORD_TABLE_NAME`: name of the DynamoDB table that stores
//!   business records
//! - `INDEXED_ZOOM_LEVELS`: comma-separated zoom levels that are indexed. The
//!   zoom level 0 must be included.
//! - `TILE_INDEX_NAME_PREFIX`: prefix of the name of the global secondary
//!   index for tiles at specific zoom levels.
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
use futures::stream::TryStreamExt as _;
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use protobuf::Message as _;
use std::sync::Arc;

use business_core::{
    mvt::TileCoordinates,
    tables::BusinessRecordTableBuilder,
    types::BusinessRecord,
};
use map_api::mvt::{MvtError, symbol::BusinessRecordBuffer};
use map_api::protos::vector_tile::Tile;

/// Maximum number of business records per tile.
pub const MAX_RECORDS_PER_TILE: usize = 200;

/// Shared state.
struct SharedState {
    /// DynamoDB client.
    dynamodb_client: aws_sdk_dynamodb::Client,
    /// Name of the DynamoDB table that stores business records.
    business_record_table_name: String,
    /// Indexed zoom levels.
    indexed_zoom_levels: Vec<u32>,
    /// Prefix of the name of the GSI for tiles at specific zoom levels.
    tile_index_name_prefix: String,
}

impl SharedState {
    async fn new() -> Result<Self, Error> {
        // caches the table name
        let business_record_table_name = std::env::var("BUSINESS_RECORD_TABLE_NAME")
            .map_err(|_| "BUSINESS_RECORD_TABLE_NAME env is not set")?;

        // parses and caches the indexed zoom levels
        let indexed_zoom_levels = std::env::var("INDEXED_ZOOM_LEVELS")
            .map_err(|_| "INDEXED_ZOOM_LEVELS env is not set")?;
        let mut indexed_zoom_levels: Vec<u32> = indexed_zoom_levels
            .split(',')
            .map(|s| s.trim().parse::<u32>())
            .collect::<Result<_, _>>()?;
        indexed_zoom_levels.sort_unstable();
        indexed_zoom_levels
            .first()
            .ok_or("no zoom level is indexed")
            .and_then(|&z| if z == 0 {
                Ok(())
            } else {
                Err("zoom level 0 must be indexed")
            })?;

        // caches the index prefix
        let tile_index_name_prefix = std::env::var("TILE_INDEX_NAME_PREFIX")
            .map_err(|_| "TILE_INDEX_NAME_PREFIX env is not set")?;

        // caches the DynamoDB client
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);

        Ok(Self {
            dynamodb_client,
            business_record_table_name,
            indexed_zoom_levels,
            tile_index_name_prefix,
        })
    }
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<TileCoordinates>,
) -> Result<String, Error> {
    let coordinates = event.payload;

    tracing::info!("z: {}, x: {}, y: {}", coordinates.zoom, coordinates.x, coordinates.y);

    // finds the largest indexed zoom level that covers the requested zoom level
    let zoom_index = shared_state
        .indexed_zoom_levels
        .partition_point(|&z| z <= coordinates.zoom)
        .checked_sub(1)
        .unwrap(); // should not panic because zoom level 0 is always indexed
    let indexed_zoom = shared_state.indexed_zoom_levels[zoom_index];
    let indexed_coordinates = coordinates.zoom_out_to(indexed_zoom).unwrap();

    // fetches records
    let record_table = BusinessRecordTableBuilder::default()
        .client(shared_state.dynamodb_client.clone())
        .table_name(&shared_state.business_record_table_name)
        .tile_index_name_prefix(Some(shared_state.tile_index_name_prefix.clone()))
        .build()?;
    let records: Vec<BusinessRecord> = record_table.query_by_tile(&indexed_coordinates, MAX_RECORDS_PER_TILE)?
        .try_collect()
        .await?;

    // TODO: calculate the anonimity level and filter non-advocated records

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
