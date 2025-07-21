import { Construct } from 'constructs';
import { GhostStringParameter } from '@codemonger-io/cdk-ghost-string-parameter';

import type { DeploymentStage } from './deployment-stage';

/**
 * Props for {@link SsmParameters}.
 *
 * @beta
 */
export interface SsmParametersProps {
  /** Deployment staged. */
  readonly deploymentStage: DeploymentStage;
}

/**
 * CDK construct that declares parameters in AWS Systems Manager Parameter
 * Store.
 *
 * @remarks
 *
 * This construct won't actually provision parameters.
 *
 * @beta
 */
export class SsmParameters extends Construct {
  /** Mapbox access token for online accounts. */
  readonly mapboxAccessTokenParameter: GhostStringParameter;

  constructor(scope: Construct, id: string, props: SsmParametersProps) {
    super(scope, id);

    const { deploymentStage } = props;

    this.mapboxAccessTokenParameter = new GhostStringParameter(this, {
      parameterName: `/dogs-business/${deploymentStage}/MAPBOX_ACCESS_TOKEN`,
    });
  }

  /** Parameter path for the Mapbox access token for online accounts. */
  get mapboxAccessTokenParameterPath(): string {
    return this.mapboxAccessTokenParameter.parameterName;
  }
}
