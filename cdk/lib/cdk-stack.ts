import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { PassquitoCore } from '@codemonger-io/passquito-cdk-construct';

import type { DeploymentStage } from './deployment-stage';
import { Distribution } from './distribution';
import { DogsBusinessApi } from './dogs-business-api';

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
      allowOrigins: ['http://localhost:5174'],
    });
    const dogsBusinessApi = new DogsBusinessApi(this, 'DogsBusinessApi', {
      basePath: '/dogs-business-api',
      allowOrigins: ['http://localhost:5174'],
      userPool: passquito.userPool.userPool,
    })
    const distribution = new Distribution(this, 'Distribution', {
      deploymentStage,
    });

    new CfnOutput(this, 'DistributionInternalUrl', {
      description: 'Internal URL of the distribution',
      value: distribution.internalUrl,
    });
    new CfnOutput(this, 'DogsBusinessApiInternalUrl', {
      description: "Internal URL of the Dog's Business API",
      value: dogsBusinessApi.internalUrl,
    });
    new CfnOutput(this, 'ContentsBucketName', {
      description: 'Name of the S3 bucket for the contents',
      value: distribution.contentsBucket.bucketName,
    });
    new CfnOutput(this, 'RelyingPartyOriginParameterPath', {
      description: 'SSM parameter path for the relying party origin for the Passkey authentication',
      value: passquito.rpOriginParameterPath,
    });
    new CfnOutput(this, 'CredentialsApiInternalUrl', {
      description: 'Internal (API Gateway) URL of the credentials API',
      value: passquito.credentialsApiInternalUrl,
    });
  }
}
