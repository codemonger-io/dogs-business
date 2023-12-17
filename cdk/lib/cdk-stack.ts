import { Stack, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { DeploymentStage } from './deployment-stage';

export interface CdkStackProps extends StackProps {
  /** Deployment stage. */
  readonly deploymentStage: DeploymentStage;
}

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);
  }
}
