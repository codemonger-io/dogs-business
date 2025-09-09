//! DynamoDB tables.

use aws_sdk_dynamodb::{
    error::SdkError,
    operation::{get_item::GetItemError, query::QueryError},
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

use crate::types::{
    BusinessRecord,
    BusinessRecordBuilder,
    BusinessType,
    GeolocationCoordinates,
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
    dog_index_name: Option<String>,
}

impl BusinessRecordTable {
    /// Queries business records carried out by a given dog.
    ///
    /// Returns a [`TableError::BadConfiguration`] if no GSI name for dog IDs
    /// is configured.
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
                    .ok_or_else(|| TableError::item_error("dogId is missing"))
                    .and_then(|v| v.as_s().map_err(|_| TableError::item_error("dogId must be a string")))?,
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

