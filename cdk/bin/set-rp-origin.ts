/**
 * Configures the relying party origin.
 *
 * @remarks
 *
 * Obtains the domain name of the CloudFront distribution for the app contents
 * from the CloudFormation stack and stores it to Parameter Store on AWS
 * Systems Manager.
 */

import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import type { DeploymentStage } from '../lib/deployment-stage';
import { DEPLOYMENT_STAGES } from '../lib/deployment-stage';
import { getStackOutputs } from '../lib/stack-outputs';

async function run(deploymentStage: DeploymentStage, originUrl?: string) {
  console.log(`obtaining stack outputs for ${deploymentStage}`);
  const stackOutputs = await getStackOutputs(deploymentStage);
  if (stackOutputs == null) {
    console.error(`did you deploy the stack for ${deploymentStage}?`);
    return;
  }
  if (stackOutputs.rpOriginParameterPath == null) {
    console.error('missing parameter path for the relying party origin in stack outputs');
    return;
  }
  await setSsmParameter(
    stackOutputs.rpOriginParameterPath,
    originUrl || `https://${stackOutputs.appDistributionDomainName}`,
  );
}

async function setSsmParameter(parameterName: string, value: string) {
  console.log(`putting parameter: ${parameterName} = ${value}`);
  const client = new SSMClient({});
  await client.send(new PutParameterCommand({
    Name: parameterName,
    Value: value,
    Type: 'String',
    Overwrite: true,
  }));
}

yargs(hideBin(process.argv))
  .command(
    '$0 [origin]',
    'set relying party (RP) origin SSM parameter',
    (yargs) => yargs
      .option('s', {
        alias: 'stage',
        describe: 'deployment stage name',
        default: 'development' as DeploymentStage,
        choices: DEPLOYMENT_STAGES,
      })
      .positional('origin', {
        describe: 'RP origin URL. Use the URL of the CloudFront distribution for the app contents by default',
        type: 'string',
        default: undefined,
      }),
    async ({ s: deploymentStage, origin }) => {
      try {
        await run(deploymentStage, origin);
      } catch (err) {
        console.error(err);
      }
    },
  )
  .help()
  .argv;
