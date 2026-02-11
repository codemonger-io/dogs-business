import * as path from 'node:path';
import {
  Duration,
  Size,
  aws_apigateway as apigw,
  aws_cognito as cognito,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { RustFunction } from 'cargo-lambda-cdk';
import { Construct } from 'constructs';
import {
  makeIntegrationResponsesAllowCors,
  makeMethodResponsesAllowCors,
} from '@codemonger-io/cdk-cors-utils';
import { RestApiWithSpec, augmentAuthorizer } from '@codemonger-io/cdk-rest-api-with-spec';
import type { GhostStringParameter } from '@codemonger-io/cdk-ghost-string-parameter';
import { composeMappingTemplate } from '@codemonger-io/mapping-template-compose';

import type { BusinessRecordTable } from './business-record-table';
import {
  INDEXED_ZOOM_LEVELS,
  TILE_INDEX_NAME_PREFIX,
} from './business-record-table';

/**
 * Safety margin in seconds to update tile access tokens before they actually
 * expire.
 *
 * @beta
 */
export const TILE_ACCESS_TOKEN_SAFETY_MARGIN_SECONDS = 5 * 60; // 5 minutes

/**
 * `max-age` in `Cache-Control` of a tile access token.
 *
 * @remarks
 *
 * The server-side safety margin (5 mins) minus client-side safety margin
 * (supposed to be 1 min).
 *
 * @beta
 */
export const TILE_ACCESS_TOKEN_CACHE_TTL_SECONDS = 4 * 60; // 4 minutes

/**
 * Props for {@link MapApi}.
 *
 * @beta
 */
export interface MapApiProps {
  /** Base path of the Dog's Business Map API. */
  readonly basePath: string;

  /**
   * Allowed origins.
   *
   * @remarks
   *
   * No CORS preflight is performed if empty.
   */
  readonly allowOrigins: string[];

  /** Business record table. */
  readonly businessRecordTable: BusinessRecordTable;

  /** User pool for authentication. */
  readonly userPool: cognito.UserPool;

  /** SSM parameter for the secret key to sign tile access tokens. */
  readonly tileAccessTokenSecretParameter: GhostStringParameter;
}

/**
 * CDK construct that provisions the Dog's Business Map API.
 *
 * @beta
 */
export class MapApi extends Construct {
  /** Lambda function to get a tile access token. */
  readonly getTileAccessTokenLambda: lambda.IFunction;

  /** Lambda function to authorize a tile request. */
  readonly authorizeTileRequestLambda: lambda.IFunction;

  /** Lambda function to obtain a tile. */
  readonly getTileLambda: lambda.IFunction;

  /** API Gateway REST API. */
  readonly api: RestApiWithSpec;

  constructor(scope: Construct, id: string, readonly props: MapApiProps) {
    super(scope, id);

    const {
      allowOrigins,
      basePath,
      businessRecordTable,
      userPool,
      tileAccessTokenSecretParameter,
    } = props;
    const authManifestPath = path.join('lambda', 'map-auth', 'Cargo.toml');
    const tileManifestPath = path.join('lambda', 'map-api', 'Cargo.toml');

    // Lambda functions
    // - get a tile access token
    this.getTileAccessTokenLambda = new RustFunction(this, 'GetTileAccessToken', {
      description: 'Get a map tile access token',
      manifestPath: authManifestPath,
      binaryName: 'get-tile-access-token',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        TILE_ACCESS_TOKEN_SECRET_PARAMETER_PATH: tileAccessTokenSecretParameter.parameterName,
        TILE_ACCESS_TOKEN_SAFETY_MARGIN_SECONDS: `${TILE_ACCESS_TOKEN_SAFETY_MARGIN_SECONDS}`,
      },
    });
    tileAccessTokenSecretParameter.grantRead(this.getTileAccessTokenLambda);
    // - authorize a tile request
    this.authorizeTileRequestLambda = new RustFunction(this, 'AuthorizeTileRequest', {
      description: 'Authorize a map tile request',
      manifestPath: authManifestPath,
      binaryName: 'authorize-tile-request',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
    });
    // - get a tile
    this.getTileLambda = new RustFunction(this, 'GetTileLambda', {
      description: 'Get a map tile of business records',
      manifestPath: tileManifestPath,
      binaryName: 'get-tile',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        BUSINESS_RECORD_TABLE_NAME: businessRecordTable.table.tableName,
        INDEXED_ZOOM_LEVELS: INDEXED_ZOOM_LEVELS.join(','),
        TILE_INDEX_NAME_PREFIX,
      },
    });
    businessRecordTable.table.grantReadData(this.getTileLambda);

    // REST API
    this.api = new RestApiWithSpec(this, 'MapApi', {
      description: "Dog's Business Map API",
      openApiInfo: {
        version: '0.1.0',
      },
      openApiOutputPath: path.join('openapi', 'map-api.json'),
      binaryMediaTypes: ['application/vnd.mapbox-vector-tile'],
      minCompressionSize: Size.kibibytes(4),
      defaultCorsPreflightOptions: allowOrigins.length > 0 ? {
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: ['GET', 'POST'],
        allowOrigins,
        maxAge: Duration.days(1),
      } : undefined,
      endpointConfiguration: {
        // REGIONAL because the API is intended to be delivered through
        // CloudFront
        types: [apigw.EndpointType.REGIONAL],
      },
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

    // Cognito authorizer
    const cognitoAuthorizer = augmentAuthorizer(
      new apigw.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
        cognitoUserPools: [userPool],
      }),
      {
        description: 'Authorizer that authenticates users by ID tokens issued by the Cognito user pool',
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
      },
    );
    // authorizer for tiles
    const tileAuthorizer = augmentAuthorizer(
      new apigw.RequestAuthorizer(this, 'Authorizer', {
        handler: this.authorizeTileRequestLambda,
        authorizerName: 'MapTileAccessAuthorizer',
        identitySources: [apigw.IdentitySource.header('Authorization')],
        resultsCacheTtl: Duration.seconds(TILE_ACCESS_TOKEN_CACHE_TTL_SECONDS),
      }),
      {
        description: 'Authorizer that validates tile access tokens',
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'tileAccessToken',
      },
    );

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

    // gets to the base path
    const root = basePath
      .split('/')
      .filter((p) => p.length > 0)
      .reduce(
        (resource, part) => resource.addResource(part),
        this.api.root,
      );

    // /tile-access-token
    const accessToken = root.addResource('tile-access-token');
    // - GET
    accessToken.addMethod(
      'GET',
      new apigw.LambdaIntegration(this.getTileAccessTokenLambda, {
        proxy: false,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': '{}',
        },
        integrationResponses: makeIntegrationResponsesAllowCors([
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Cache-Control': `'max-age=${TILE_ACCESS_TOKEN_CACHE_TTL_SECONDS}, s-maxage=${TILE_ACCESS_TOKEN_CACHE_TTL_SECONDS}'`,
            },
          },
        ]),
      }),
      {
        description: 'Obtain a tile access token',
        authorizer: cognitoAuthorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'Tile access token has successfully been obtained',
            responseParameters: {
              'method.response.header.Cache-Control': true,
            },
          },
        ]),
      },
    );

    // tile endpoints
    // /tile
    const tile = root.addResource('tile');
    // /tile/{z}
    const tileZ = tile.addResource('{z}');
    // /tile/{z}/{x}
    const tileZX = tileZ.addResource('{x}');
    // /tile/{z}/{x}/{y}
    const tileZXY = tileZX.addResource('{y}');
    // /tile/{z}/{x}/{y}/tile.mvt
    const tileMvt = tileZXY.addResource('tile.mvt');
    // - GET
    tileMvt.addMethod(
      'GET',
      new apigw.LambdaIntegration(this.getTileLambda, {
        proxy: false,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': composeMappingTemplate([
            // zoom, x, y should be numbers
            ['zoom', '$util.escapeJavaScript($input.params("z"))'],
            ['x', '$util.escapeJavaScript($input.params("x"))'],
            ['y', '$util.escapeJavaScript($input.params("y"))'],
          ]),
        },
        integrationResponses: makeIntegrationResponsesAllowCors([
          {
            statusCode: '200',
            contentHandling: apigw.ContentHandling.CONVERT_TO_BINARY,
            responseParameters: {
              'method.response.header.Content-Type': "'application/vnd.mapbox-vector-tile'",
            },
          },
        ]),
      }),
      {
        description: 'Obtain a map tile at a given zoom level, x, and y coordinates',
        authorizer: tileAuthorizer,
        authorizationType: apigw.AuthorizationType.CUSTOM,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'Map tile in the Mapbox vector tile format',
            responseParameters: {
              'method.response.header.Content-Type': true,
            },
          },
        ]),
      },
    );
  }

  /** Returns the base path of the API. */
  get basePath(): string {
    return this.props.basePath;
  }

  /** Internal URL of the Dog's Business Map API. */
  get internalUrl(): string {
    return this.api.urlForPath(this.props.basePath);
  }
}
