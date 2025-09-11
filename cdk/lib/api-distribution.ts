import {
  Duration,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import type { DeploymentStage } from './deployment-stage';
import type { MapApi } from './map-api';
import type { ResourceApi } from './resource-api';

/** Properties for {@link ApiDistribution}. */
export interface ApiDistributionProps {
  /** Deployment stage. */
  readonly deploymentStage: DeploymentStage;

  /** Dog's Business Resource API. */
  readonly resourceApi: ResourceApi;

  /** Dog's Business Map API. */
  readonly mapApi: MapApi;
}

/**
 * CDK construct that provisions a CloudFront distribution for Dog's Business
 * APIs.
 */
export class ApiDistribution extends Construct {
  /** CloudFront distribution. */
  readonly distribution: cloudfront.IDistribution;

  constructor(scope: Construct, id: string, readonly props: ApiDistributionProps) {
    super(scope, id);

    const { deploymentStage, mapApi, resourceApi } = props;

    // cache policy for the Resource API
    const resourceApiCachePolicy = new cloudfront.CachePolicy(
      this,
      'ResourceApiCachePolicy',
      {
        comment: 'cache policy for the Dog\'s Business Resource API',
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          'Authorization',
        ),
      },
    );

    // cache policy for the Map API
    const mapApiCachePolicy = new cloudfront.CachePolicy(
      this,
      'MapApiCachePolicy',
      {
        comment: 'cache policy for the Dog\'s Business Map API',
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          'X-Api-Key',
        ),
        minTtl: Duration.minutes(5),
        maxTtl: Duration.minutes(15),
        defaultTtl: Duration.minutes(5),
      },
    );

    // ResponseHeadersPolicy to allow CORS
    const corsHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      'CorsHeadersPolicy',
      {
        comment: 'response headers policy to allow CORS requests to the Dog\'s Business APIs',
        corsBehavior: {
          accessControlAllowHeaders: [
            // wildcard (`*`) won't match Authorization!
            'Authorization',
            '*',
          ],
          accessControlAllowMethods: ['ALL'],
          // TODO: specify exact origins
          accessControlAllowOrigins: ['*'],
          accessControlAllowCredentials: false,
          originOverride: true,
        },
      },
    );

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'Dog\'s Business APIs',
      // routes to the Resource API by default
      defaultBehavior: {
        origin:  new origins.RestApiOrigin(resourceApi.api),
        cachePolicy: resourceApiCachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        responseHeadersPolicy: corsHeadersPolicy,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      },
      additionalBehaviors: {
        [`${mapApi.basePath.replace(/\/$/, '')}/*`]: {
          origin: new origins.RestApiOrigin(mapApi.api),
          cachePolicy: mapApiCachePolicy,
          responseHeadersPolicy: corsHeadersPolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        },
      },
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableLogging: true,
    });
  }

  /** URL of the Resource API. */
  get resourceApiUrl(): string {
    return `https://${this.distribution.distributionDomainName}${this.props.resourceApi.basePath}`;
  }

  /** URL of the Map API. */
  get mapApiUrl(): string {
    return `https://${this.distribution.distributionDomainName}${this.props.mapApi.basePath}`;
  }
}
