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
import { RestApiWithSpec } from '@codemonger-io/cdk-rest-api-with-spec';
import { composeMappingTemplate } from '@codemonger-io/mapping-template-compose';

import type { BusinessRecordTable } from './business-record-table';
import { INDEXED_ZOOM_LEVELS } from './business-record-table';

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
}

/**
 * CDK construct that provisions the Dog's Business Map API.
 *
 * @beta
 */
export class MapApi extends Construct {
  /** Lambda function to obtain a tile. */
  readonly getTileLambda: lambda.IFunction;

  /** API Gateway REST API. */
  readonly api: RestApiWithSpec;

  constructor(scope: Construct, id: string, readonly props: MapApiProps) {
    super(scope, id);

    const { allowOrigins, basePath, businessRecordTable, userPool } = props;
    const manifestPath = path.join('lambda', 'map-api', 'Cargo.toml');

    // Lambda functions
    // - get a tile
    this.getTileLambda = new RustFunction(this, 'GetTileLambda', {
      manifestPath,
      binaryName: 'get-tile',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        BUSINESS_RECORD_TABLE_NAME: businessRecordTable.table.tableName,
        INDEXED_ZOOM_LEVELS: INDEXED_ZOOM_LEVELS.join(','),
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

    // gets to the base path
    const root = basePath
      .split('/')
      .filter((p) => p.length > 0)
      .reduce(
        (resource, part) => resource.addResource(part),
        this.api.root,
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

  /** Internal URL of the Dog's Business Map API. */
  get internalUrl(): string {
    return this.api.urlForPath(this.props.basePath);
  }
}
