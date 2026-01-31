//! Authorize a map tile request.
//!
//! ## Environment variables
//!
//! ## Input
//!
//! See [`ApiGatewayCustomAuthorizerRequestTypeRequest`](https://docs.rs/aws_lambda_events/latest/aws_lambda_events/event/apigw/struct.ApiGatewayCustomAuthorizerRequestTypeRequest.html).
//!
//! ## Output
//!
//! See [`ApiGatewayCustomAuthorizerResponse`](https://docs.rs/aws_lambda_events/latest/aws_lambda_events/event/apigw/struct.ApiGatewayCustomAuthorizerResponse.html).

use aws_lambda_events::event::{
    apigw::{
        ApiGatewayCustomAuthorizerRequestTypeRequest,
        ApiGatewayCustomAuthorizerResponse,
    },
    iam::{IamPolicyEffect, IamPolicyStatement},
};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use std::sync::Arc;

/// Shared state that lives while the Lambda instance is alive.
struct SharedState {
}

impl SharedState {
    /// Creates a new `SharedState`.
    async fn new() -> Result<Self, Error> {
        Ok(Self {})
    }
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<ApiGatewayCustomAuthorizerRequestTypeRequest>,
) -> Result<ApiGatewayCustomAuthorizerResponse, Error> {
    tracing::info!("authorizing tile request: method={:?}, path={:?}", event.payload.http_method, event.payload.path);

    let mut response = ApiGatewayCustomAuthorizerResponse::default();
    response.principal_id = Some("user".to_string());

    // TODO: validate the request

    // configures the policy
    let policy_document = &mut response.policy_document;
    policy_document.version = Some("2012-10-17".to_string());
    let mut statement = IamPolicyStatement::default();
    if let Some(method_arn) = &event.payload.method_arn {
        // (allows everything for now)
        statement.effect = IamPolicyEffect::Allow;
        statement.action.push("execute-api:Invoke".to_string());
        statement.resource.push(method_arn.clone());
    } else {
        // no method ARN, deny everything
        statement.effect = IamPolicyEffect::Deny;
        statement.action.push("*".to_string());
        statement.resource.push("*".to_string());
    }
    policy_document.statement.push(statement);

    Ok(response)
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
