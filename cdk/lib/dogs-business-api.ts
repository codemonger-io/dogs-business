import * as path from 'node:path';
import {
  Duration,
  aws_apigateway as apigw,
  aws_cognito as cognito,
  aws_lambda as lambda,
} from 'aws-cdk-lib'
import { RustFunction } from 'cargo-lambda-cdk';
import { Construct } from 'constructs';
import {
  makeIntegrationResponsesAllowCors,
  makeMethodResponsesAllowCors,
} from '@codemonger-io/cdk-cors-utils';
import { RestApiWithSpec, augmentAuthorizer } from '@codemonger-io/cdk-rest-api-with-spec';
import { composeMappingTemplate } from '@codemonger-io/mapping-template-compose';

import type { SsmParameters } from './ssm-parameters';

/**
 * Props for {@link DogsBusinessApi}.
 *
 * @beta
 */
export interface DogsBusinessApiProps {
  /** Base path. */
  readonly basePath: string;

  /**
   * Allowed origins.
   *
   * @remarks
   *
   * No CORS preflight is performed if empty.
   */
  readonly allowOrigins: string[];

  /** User pool for authentication. */
  readonly userPool: cognito.UserPool;

  /** Parameters in AWS Systems Manager Parameter Store. */
  readonly ssmParameters: SsmParameters;
}

/**
 * CDK construct that provisions the Dog's Business API.
 *
 * @beta
 */
export class DogsBusinessApi extends Construct {
  /** Lambda function to obtain user information. */
  readonly getUserInfoLambda: lambda.IFunction;

  /** API Gateway REST API. */
  readonly api: RestApiWithSpec;

  constructor(scope: Construct, id: string, readonly props: DogsBusinessApiProps) {
    super(scope, id);

    const {
      allowOrigins,
      basePath,
      ssmParameters,
      userPool,
    } = props;
    const manifestPath = path.join('lambda', 'dogs-business-api', 'Cargo.toml');

    // Lambda functions
    // - get user information
    this.getUserInfoLambda = new RustFunction(this, 'GetUserInfoLambda', {
      manifestPath,
      binaryName: 'get-user-info',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        MAPBOX_ACCESS_TOKEN_PARAMETER_PATH: ssmParameters.mapboxAccessTokenParameterPath,
      }
    });
    ssmParameters.mapboxAccessTokenParameter.grantRead(this.getUserInfoLambda);

    // REST API
    this.api = new RestApiWithSpec(this, 'DogsBusinessApi', {
      description: "Dog's Business API",
      openApiInfo: {
        version: '0.1.0',
      },
      openApiOutputPath: path.join('openapi', 'dogs-business-api.json'),
      defaultCorsPreflightOptions: allowOrigins.length > 0 ? {
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: ['GET', 'POST'],
        allowOrigins,
        maxAge: Duration.days(1),
      } : undefined,
      deploy: true,
      deployOptions: {
        description: 'Default deployment',
        stageName: 'default',
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        // TODO: determine proper limits
        throttlingRateLimit: 100,
        throttlingBurstLimit: 100,
        tracingEnabled: true,
      },
    });

    // suppresses CORS errors caused when the gateway responds with errors
    // before reaching the integrations
    if (allowOrigins.length > 0) {
      this.api.addGatewayResponse('Unauthorized', {
        type: apigw.ResponseType.DEFAULT_4XX,
        responseHeaders: {
          'Access-Control-Allow-Origin': "'*'",
        },
      });
      this.api.addGatewayResponse('InternalServerError', {
        type: apigw.ResponseType.DEFAULT_5XX,
        responseHeaders: {
          'Access-Control-Allow-Origin': "'*'",
        },
      });
    }

    // user pool authorizer
    const authorizer = augmentAuthorizer(
      new apigw.CognitoUserPoolsAuthorizer(this, 'UserPoolAuthorizer', {
        cognitoUserPools: [userPool],
      }),
      {
        description: 'Authorizer that authenticates users by ID tokens issued by the Cognito user pool',
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
      },
    );

    // gets to the base path
    const root = basePath
      .split('/')
      .filter((p) => p.length > 0)
      .reduce(
        (resource, part) => resource.addResource(part),
        this.api.root,
      );

    // user endpoints
    const user = root.addResource('user');
    // /user
    // - GET
    user.addMethod(
      'GET',
      new apigw.LambdaIntegration(this.getUserInfoLambda, {
        proxy: false,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': composeMappingTemplate([
            ['userId', '"$context.authorizer.claims["cognito:username"]"'],
          ]),
        },
        integrationResponses: makeIntegrationResponsesAllowCors([
          {
            statusCode: '200',
          },
        ]),
      }),
      {
        description: 'Obtain the user information associated with the ID token',
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'User information has successfully been obtained',
          },
        ]),
      },
    );
  }

  /** Internal URL of the Dog's Business API. */
  get internalUrl(): string {
    return this.api.urlForPath(this.props.basePath);
  }
}
