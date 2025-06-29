#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';
import { DEPLOYMENT_STAGES } from '../lib/deployment-stage';

const app = new cdk.App();
for (const deploymentStage of DEPLOYMENT_STAGES) {
  new CdkStack(app, `dogs-business-${deploymentStage}`, {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    deploymentStage,
    tags: {
      deploymentStage,
      project: 'dogs-business',
    },
  });
}
