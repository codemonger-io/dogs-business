import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import type { DeploymentStage } from './deployment-stage';
import { Distribution } from './distribution';

export interface CdkStackProps extends StackProps {
  /** Deployment stage. */
  readonly deploymentStage: DeploymentStage;
}

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    const { deploymentStage } = props;

    const distribution = new Distribution(this, 'Distribution', {
      deploymentStage,
    });

    new CfnOutput(this, 'DistributionInternalUrl', {
      description: 'Internal URL of the distribution',
      value: distribution.internalUrl,
    });
    new CfnOutput(this, 'ContentsBucketName', {
      description: 'Name of the S3 bucket for the contents',
      value: distribution.contentsBucket.bucketName,
    });
  }
}
