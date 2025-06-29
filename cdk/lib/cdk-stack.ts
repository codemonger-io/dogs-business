import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { PassquitoCore } from '@codemonger-io/passquito-cdk-construct';

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

    const passquito = new PassquitoCore(this, 'Passquito', {
      ssmParametersProps: {
        group: 'dogs-business',
        config: deploymentStage,
      },
      allowOrigins: ['http://localhost:5173'],
    });
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
