import {
  RemovalPolicy,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import type { DeploymentStage } from './deployment-stage';
import * as servicePaths from './service-paths';

/** Properties for {@link Distribution}. */
export interface DistributionProps {
  /** Deployment stage. */
  readonly deploymentStage: DeploymentStage;
}

/**
 * CDK construct that provisions the resources necessary for contents
 * distribution.
 */
export class Distribution extends Construct {
  /**
   * S3 bucket for the contents.
   *
   * @remarks
   *
   * Contents of the app must be stored under the following path:
   * - `/app`
   */
  readonly contentsBucket: s3.Bucket;

  /** CloudFront distribution. */
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: DistributionProps) {
    super(scope, id);

    const { deploymentStage } = props;

    this.contentsBucket = new s3.Bucket(this, 'ContentsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `Dog's Business distribution (${deploymentStage})`,
      defaultBehavior: {
        origin: new origins.S3Origin(this.contentsBucket),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      },
      errorResponses: [
        {
          // all the unresolved paths go to the app index so that the SPA works
          // distribution will end up with 403 (not 404) if paths are invalid
          // in the contents bucket
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: servicePaths.appIndex,
        },
      ],
      enableLogging: true,
    });
  }

  /** Internal URL of the distribution. */
  get internalUrl(): string {
    return `https://${this.distribution.distributionDomainName}`;
  }
}
