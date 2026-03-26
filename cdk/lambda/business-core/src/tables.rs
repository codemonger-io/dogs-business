//! DynamoDB tables.

use aws_sdk_dynamodb::{
    error::SdkError,
    operation::{
        delete_item::DeleteItemError,
        get_item::GetItemError,
        query::QueryError,
    },
    types::AttributeValue,
};
use aws_smithy_async::future::pagination_stream::PaginationStream;
use core::pin::Pin;
use core::task::{Context, Poll};
use derive_builder::Builder;
use futures::{future, stream::{self, Stream, TryStreamExt as _}};
use pin_project::pin_project;
use std::collections::HashMap;
use std::marker::{Send, Sync};

use crate::mvt::TileCoordinates;
use crate::types::{
    BusinessRecord,
    BusinessRecordBuilder,
    BusinessType,
    GeolocationCoordinates,
    HumanDogFriendship,
};

/// Resource table.
#[derive(Debug)]
pub struct ResourceTable {
    /// DynamoDB client.
    client: aws_sdk_dynamodb::Client,
    /// Table name.
    table_name: String,
}

impl ResourceTable {
    /// Creates with given client, and table name.
    pub fn new(
        client: aws_sdk_dynamodb::Client,
        table_name: impl Into<String>,
    ) -> Self {
        Self {
            client,
            table_name: table_name.into(),
        }
    }

    /// Extends the table capability with the GSI for querying by dog ID.
    pub fn with_dog_index(
        self,
        dog_index_name: impl Into<String>,
    ) -> ResourceTableWithDogIndex {
        ResourceTableWithDogIndex {
            underlying: self,
            dog_index_name: dog_index_name.into(),
        }
    }

    /// Returns the relationship between a given user and dog.
    pub async fn get_user_dog_relationship(
        &self,
        user_id: &str,
        dog_id: &str,
    ) -> Result<Option<UserDogRelationship>, TableError> {
        let res = self
            .client
            .get_item()
            .table_name(&self.table_name)
            .key("pk", AttributeValue::S(format!("friend-of#{user_id}")))
            .key("sk", AttributeValue::S(format!("dog#{dog_id}")))
            .send()
            .await?;
        res.item
            .map(|_| Ok(UserDogRelationship::Friend))
            .transpose()
    }

    /// Queries dog friends of a given user.
    ///
    /// Returns a [`Stream`](https://docs.rs/futures/latest/futures/stream/trait.Stream.html) of the human-dog friendships.
    pub fn get_dog_friends_of_user(
        &self,
        user_id: impl Into<String>,
    ) -> impl Stream<Item = Result<HumanDogFriendship, TableError>> {
        let paginator = self
            .client
            .query()
            .table_name(&self.table_name)
            .key_condition_expression("#pk = :pk AND begins_with(#sk, :skPrefix)")
            .expression_attribute_names("#pk", "pk")
            .expression_attribute_names("#sk", "sk")
            .expression_attribute_values(":pk", AttributeValue::S(format!("friend-of#{}", user_id.into())))
            .expression_attribute_values(":skPrefix", AttributeValue::S("dog#".to_string()))
            .into_paginator()
            .send();
        PaginationStreamExt(paginator)
            .and_then(|output| {
                let items = output
                    .items
                    .unwrap_or_default()
                    .into_iter()
                    .map(Self::parse_friendship_item);
                future::ok(stream::iter(items))
            })
            .try_flatten()
    }

    fn parse_friendship_item(
        item: HashMap<String, AttributeValue>,
    ) -> Result<HumanDogFriendship, TableError> {
        let user_id = item
            .get("pk")
            .ok_or_else(|| TableError::item_error("pk (user ID) is missing"))
            .and_then(|v| v.as_s().map_err(|_| TableError::item_error("pk (user ID) must be a string")))
            .and_then(|s| s.strip_prefix("friend-of#").ok_or_else(|| TableError::item_error("pk (user ID) must start with 'friend-of#'")))?;
        let dog_id = item
            .get("dogId")
            .ok_or_else(|| TableError::item_error("dogId is missing"))
            .and_then(|v| v.as_s().map_err(|_| TableError::item_error("dogId must be a string")))?;
        let is_guardian = item
            .get("isGuardian")
            .ok_or_else(|| TableError::item_error("isGuardian is missing"))
            .and_then(|v| v.as_bool().map_err(|_| TableError::item_error("isGuardian must be a boolean")))?;
        Ok(HumanDogFriendship {
            user_id: user_id.to_string(),
            dog_id: dog_id.to_string(),
            is_guardian: *is_guardian,
        })
    }
}

/// Resource table with the GSI for querying by dog ID.
#[derive(Debug)]
pub struct ResourceTableWithDogIndex {
    /// Underlying resource table.
    underlying: ResourceTable,
    /// GSI name for querying by dog ID.
    dog_index_name: String,
}

impl ResourceTableWithDogIndex {
    /// Queries human friends of a given dog.
    ///
    /// Returns a [`Stream`](https://docs.rs/futures/latest/futures/stream/trait.Stream.html) of the human-dog friendships.
    pub fn get_human_friends_of_dog(
        &self,
        dog_id: impl Into<String>,
    ) -> impl Stream<Item = Result<HumanDogFriendship, TableError>> {
        let paginator = self
            .client
            .query()
            .table_name(&self.table_name)
            .index_name(&self.dog_index_name)
            .key_condition_expression("#dogId = :dogId AND #pk BETWEEN :pkStart AND :pkStop")
            .expression_attribute_names("#dogId", "dogId")
            .expression_attribute_names("#pk", "pk")
            .expression_attribute_values(":dogId", AttributeValue::S(dog_id.into()))
            .expression_attribute_values(":pkStart", AttributeValue::S("friend-of#".into()))
            .expression_attribute_values(":pkStop", AttributeValue::S("friend-of#~".into()))
            .into_paginator()
            .send();
        PaginationStreamExt(paginator)
            .and_then(|output| {
                let items = output
                    .items
                    .unwrap_or_default()
                    .into_iter()
                    .map(ResourceTable::parse_friendship_item);
                future::ok(stream::iter(items))
            })
            .try_flatten()
    }
}

impl std::ops::Deref for ResourceTableWithDogIndex {
    type Target = ResourceTable;

    fn deref(&self) -> &Self::Target {
        &self.underlying
    }
}

/// Business record table.
#[derive(Builder, Clone)]
#[builder(setter(into), pattern = "owned")]
pub struct BusinessRecordTable {
    /// DynamoDB client.
    client: aws_sdk_dynamodb::Client,
    /// Table name.
    table_name: String,
    /// GSI name for querying by dog ID.
    ///
    /// Builder: `None` by default.
    #[builder(default)]
    dog_index_name: Option<String>,
    /// Prefix of the GSI names for querying by map tiles at specific zoom level.
    ///
    /// Builder: `None` by default.
    #[builder(default)]
    tile_index_name_prefix: Option<String>,
}

impl BusinessRecordTable {
    /// Queries business records carried out by a given dog.
    ///
    /// Fails with a [`TableError::BadConfiguration`] if no GSI name for dog
    /// IDs is configured.
    pub fn query_by_dog_id(
        &self,
        dog_id: impl Into<String>,
        max_records: usize,
    ) -> Result<impl Stream<Item = Result<BusinessRecord, TableError>>, TableError> {
        let dog_index_name = self
            .dog_index_name
            .as_ref()
            .ok_or_else(|| TableError::BadConfiguration("dog index name must be set".into()))?;
        let paginator = self
            .client
            .query()
            .table_name(&self.table_name)
            .index_name(dog_index_name)
            .key_condition_expression("#dogId = :dogId")
            .expression_attribute_names("#dogId", "dogId")
            .expression_attribute_values(":dogId", AttributeValue::S(dog_id.into()))
            .scan_index_forward(false) // newest first
            .limit(max_records as i32)
            .into_paginator()
            .send();
        let records = PaginationStreamExt(paginator)
            .and_then(|output| {
                let items = output
                    .items
                    .unwrap_or_default()
                    .into_iter()
                    .map(Self::parse_business_record_item);
                future::ok(stream::iter(items))
            })
            .try_flatten();
        Ok(records)
    }

    /// Queries public business records in a map tile at a given location.
    ///
    /// Fails with a [`TableError::BadConfiguration`] if no GSI name prefix for
    /// map tiles at specific zoom levels is configured.
    ///
    /// Fails if the zoom level is not indexed.
    pub fn query_by_tile(
        &self,
        coordinates: &TileCoordinates,
        max_records: usize,
    ) -> Result<impl Stream<Item = Result<BusinessRecord, TableError>>, TableError> {
        let tile_index_name = self
            .tile_index_name_prefix
            .as_ref()
            .map(|prefix| format!("{}{}", prefix, coordinates.zoom))
            .ok_or_else(|| TableError::BadConfiguration("tile index name prefix must be set".into()))?;
        let paginator = self
            .client
            .query()
            .table_name(&self.table_name)
            .index_name(tile_index_name)
            .key_condition_expression("#tileAtZ = :tileXY")
            .expression_attribute_names("#tileAtZ", format!("tileAtZ{}", coordinates.zoom))
            .expression_attribute_values(
                ":tileXY",
                AttributeValue::S(format!("public#{}/{}", coordinates.x, coordinates.y))
            )
            .scan_index_forward(false) // newest first
            .limit(max_records as i32)
            .into_paginator()
            .send();
        let records = PaginationStreamExt(paginator)
            .and_then(|output| {
                let items = output
                    .items
                    .unwrap_or_default()
                    .into_iter()
                    .map(Self::parse_business_record_item);
                future::ok(stream::iter(items))
            })
            .try_flatten();
        Ok(records)
    }

    /// Deletes a business record identified by a given record ID and made by
    /// one of given dogs.
    pub async fn delete_made_by_dogs(
        &self,
        record_id: impl Into<String>,
        dog_ids: &[impl AsRef<str>],
    ) -> Result<(), TableError> {
        // conditionally deletes the private record first
        // if any private record is deleted, unconditionally deletes the public record
        let record_id = record_id.into();
        let dog_ids_expression = (0..dog_ids.len())
            .map(|i| format!(":dogId{i}"))
            .collect::<Vec<_>>()
            .join(",");
        let mut command = self.client
            .delete_item()
            .table_name(&self.table_name)
            .key("pk", AttributeValue::S(record_id.clone()))
            .key("sk", AttributeValue::S("private".to_string()))
            .condition_expression(format!("#dogId IN ({dog_ids_expression})"))
            .expression_attribute_names("#dogId", "dogId");
        for (i, dog_id) in dog_ids.iter().enumerate() {
            command = command.expression_attribute_values(
                format!(":dogId{i}"),
                AttributeValue::S(dog_id.as_ref().to_string()),
            )
        }
        command.send().await?;

        self.client
            .delete_item()
            .table_name(&self.table_name)
            .key("pk", AttributeValue::S(record_id))
            .key("sk", AttributeValue::S("public".to_string()))
            .send()
            .await?;

        Ok(())
    }

    fn parse_business_record_item(
        item: HashMap<String, AttributeValue>,
    ) -> Result<BusinessRecord, TableError> {
        BusinessRecordBuilder::default()
            .record_id(
                item.get("pk")
                    .ok_or_else(|| TableError::item_error("pk (record ID) is missing"))
                    .and_then(|v| v.as_s().map_err(|_| TableError::item_error("pk (record ID) must be a string")))?
            )
            .dog_id(
                item.get("dogId")
                    .map(|v| v.as_s().map_err(|_| TableError::item_error("dogId must be a string")))
                    .transpose()?
                    .cloned(),
            )
            .business_type(
                item.get("businessType")
                    .ok_or_else(|| TableError::item_error("businessType is missing"))
                    .and_then(|v| v.as_s().map_err(|_| TableError::item_error("businessType must be a string")))
                    .and_then(|s| match s {
                        s if s == "pee" => Ok(BusinessType::Pee),
                        s if s == "poo" => Ok(BusinessType::Poo),
                        _ => Err(TableError::item_error("invalid businessType")),
                    })?,
            )
            .timestamp(
                item.get("timestamp")
                    .ok_or_else(|| TableError::item_error("timestamp is missing"))
                    .and_then(|v| v.as_n().map_err(|_| TableError::item_error("timestamp must be a number")))
                    .and_then(|n| n.parse::<i64>().map_err(|_| TableError::item_error("invalid timestamp")))?,
            )
            .location(GeolocationCoordinates {
                longitude: item
                    .get("longitude")
                    .ok_or_else(|| TableError::item_error("longitude is missing"))
                    .and_then(|v| v.as_n().map_err(|_| TableError::item_error("longitude must be a number")))
                    .and_then(|n| n.parse::<f64>().map_err(|_| TableError::item_error("invalid longitude")))?,
                latitude: item
                    .get("latitude")
                    .ok_or_else(|| TableError::item_error("latitude is missing"))
                    .and_then(|v| v.as_n().map_err(|_| TableError::item_error("latitude must be a number")))
                    .and_then(|n| n.parse::<f64>().map_err(|_| TableError::item_error("invalid latitude")))?,
            })
            .build()
            .map_err(|e| TableError::item_error(format!("failed to build BusinessRecord: {e}")))
    }
}

/// Relationship between a user and a dog.
#[derive(Clone, Debug)]
pub enum UserDogRelationship {
    /// User is a friend of the dog.
    Friend,
}

/// Error related to table operations.
#[derive(Debug, thiserror::Error)]
pub enum TableError {
    /// Item parsing error.
    #[error("item error: {0}")]
    ItemError(String),
    /// Rate limited.
    #[error("rate limited: {0}")]
    RateLimited(Box<dyn std::error::Error + Send + Sync>),
    /// Configuration error.
    #[error("bad configuration: {0}")]
    BadConfiguration(Box<dyn std::error::Error + Send + Sync>),
    /// Internal error.
    #[error("internal error: {0}")]
    InternalError(Box<dyn std::error::Error + Send + Sync>),
    /// `SdkError` other than `ServiceError`.
    #[error("non-service error: {0}")]
    NonServiceError(Box<dyn std::error::Error + Send + Sync>),
}

impl TableError {
    /// Creates an item error with a given message.
    pub fn item_error(message: impl Into<String>) -> Self {
        TableError::ItemError(message.into())
    }
}

impl<E, R> From<SdkError<E, R>> for TableError
where
    E: std::error::Error + Send + Sync + 'static,
    R: std::fmt::Debug + Send + Sync + 'static,
    TableError: From<E>,
{
    fn from(e: SdkError<E, R>) -> Self {
        match e {
            SdkError::ServiceError(e) => TableError::from(e.into_err()),
            _ => TableError::NonServiceError(e.into()),
        }
    }
}

/// Macro to facilitate implementation of `From` for DynamoDB service errors.
macro_rules! impl_from_dynamodb_service_error {
    ($error_type:ty) => {
        impl From<$error_type> for TableError {
            fn from(e: $error_type) -> Self {
                use $error_type::*;
                match e {
                    ProvisionedThroughputExceededException(_) |
                    RequestLimitExceeded(_) |
                    ThrottlingException(_) => TableError::RateLimited(e.into()),
                    InvalidEndpointException(_) |
                    ResourceNotFoundException(_) => TableError::BadConfiguration(e.into()),
                    _ => TableError::InternalError(e.into()),
                }
            }
        }
    };
}

impl_from_dynamodb_service_error!(DeleteItemError);
impl_from_dynamodb_service_error!(GetItemError);
impl_from_dynamodb_service_error!(QueryError);

#[pin_project]
struct PaginationStreamExt<T>(PaginationStream<T>);

impl<T> Stream for PaginationStreamExt<T> {
    type Item = T;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.project();
        this.0.poll_next(cx)
    }
}

