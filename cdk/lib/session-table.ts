import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import type { DeploymentStage } from './deployment-stage';

/**
 * Props for {@link SessionTable}.
 *
 * @beta
 */
export interface SessionTableProps {
  /** Deployment stage. */
  readonly deploymentStage: DeploymentStage;
}

/**
 * CDK construct to provision a DynamoDB table for sessions.
 *
 * @beta
 */
export class SessionTable extends Construct {
  /**
   * DynamoDB table for session.
   *
   * @remarks
   *
   * ## Table structure
   *
   * Primary keys:
   * - `pk`: (string) partition key
   * - `sk`: (timestamp) sort key. time of expiration
   *
   * Time to live (TTL) attribute:
   * - `sk`: (timestamp) time of expiration
   *
   * ### Common types
   *
   * - `timestamp`: (number) timestamp represented as the number of seconds
   *   elapsed since 00:00:00 on January 1, 1970 UTC.
   *
   * ### Map tile access tokens
   *
   * - `pk`: "tile-access-token#global"
   * - `sk`: expiration time of the token
   * - `token`: (string) tile access token
   * - `createdAt`: (timestamp) time of creation
   */
  readonly table: dynamodb.TableV2;

  constructor(scope: Construct, id: string, props: SessionTableProps) {
    super(scope, id);

    this.table = new dynamodb.TableV2(this, 'SessionTable', {
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.NUMBER,
      },
      timeToLiveAttribute: 'sk',
      // TODO: increase the caps for production
      billing: dynamodb.Billing.onDemand({
        maxReadRequestUnits: 2,
        maxWriteRequestUnits: 2,
      }),
    });
  }
}
