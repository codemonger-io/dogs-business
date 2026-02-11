import { Construct } from 'constructs';
import { GhostStringParameter } from '@codemonger-io/cdk-ghost-string-parameter';

import type { DeploymentStage } from './deployment-stage';

/** Prefix of the parameter names. */
export const PARAMETER_NAME_PREFIX = '/dogs-business/';

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

  /** Secret key to sign map tile access tokens. */
  readonly tileAccessTokenSecretParameter: GhostStringParameter;

  constructor(scope: Construct, id: string, props: SsmParametersProps) {
    super(scope, id);

    const { deploymentStage } = props;

    this.mapboxAccessTokenParameter = new GhostStringParameter(this, {
      parameterName: `${PARAMETER_NAME_PREFIX}${deploymentStage}/MAPBOX_ACCESS_TOKEN`,
    });
    this.tileAccessTokenSecretParameter = new GhostStringParameter(this, {
      parameterName: `${PARAMETER_NAME_PREFIX}${deploymentStage}/TILE_ACCESS_TOKEN_SECRET`,
    });
  }

  /** Parameter path for the Mapbox access token for online accounts. */
  get mapboxAccessTokenParameterPath(): string {
    return this.mapboxAccessTokenParameter.parameterName;
  }

  /** Parameter path for the tile access token secret. */
  get tileAccessTokenSecretParameterPath(): string {
    return this.tileAccessTokenSecretParameter.parameterName;
  }
}
