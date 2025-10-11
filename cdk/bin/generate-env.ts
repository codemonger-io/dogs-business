/**
 * Generates the configuration file for the client.
 *
 * @remarks
 *
 * Obtains the necessary configuration values from the CloudFormation stack
 * and generates the `.env.${deploymentStage}` file for the client, where
 * `${deploymentStage}` is the deployment stage name.
 */

import * as fs from 'node:fs/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import type { DeploymentStage } from '../lib/deployment-stage';
import { DEPLOYMENT_STAGES } from '../lib/deployment-stage';
import { getStackOutputs } from '../lib/stack-outputs';

async function run(deploymentStage: DeploymentStage, outputPath: string) {
  const stackOutputs = await getStackOutputs(deploymentStage);
  if (stackOutputs == null) {
    throw new Error(`did you deploy the CloudFormation stack for ${deploymentStage}?`);
  }
  if (
    stackOutputs.credentialsApiInternalUrl == null ||
    stackOutputs.resourceApiInternalUrl == null ||
    stackOutputs.mapApiInternalUrl == null
  ) {
    throw new Error('missing stack outputs');
  }
  console.log(`generating ${outputPath} for ${deploymentStage}`);
  await fs.writeFile(
    outputPath,
    `VITE_CREDENTIALS_API_BASE_URL=${stackOutputs.credentialsApiInternalUrl}

VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL=${stackOutputs.resourceApiInternalUrl}

VITE_DOGS_BUSINESS_MAP_API_BASE_URL=${stackOutputs.mapApiInternalUrl}
`
  );
  console.log('done!');
}

yargs(hideBin(process.argv))
  .command(
    '$0 [stage]',
    'generate the .env.{stage} file for the client',
    (yargs) => yargs
      .option('o', {
        alias: 'output',
        describe: 'path to the output .env file',
        type: 'string',
        default: undefined,
      })
      .positional('stage', {
        describe: 'name of the deployment stage where the CloudFormation stack is deployed',
        choices: DEPLOYMENT_STAGES,
      }),
    async ({ stage, o: output }) => {
      try {
        if (stage == null) {
          throw new Error('missing deployment stage');
        }
        await run(stage, output ?? `../client/.env.${stage}`);
      } catch (err) {
        console.error(err);
      }
    },
  )
  .help()
  .argv;
