import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import type { DeploymentStage } from './deployment-stage';

/** Indexed zoom levels. */
export const INDEXED_ZOOM_LEVELS = [0, 3, 6, 10, 15, 16, 17, 18];

/** Name of the global secondary index for querying by dog IDs. */
export const DOG_INDEX_NAME = 'DogIndex';

/**
 * Properties for {@link BusinessRecordTable}.
 *
 * @beta
 */
export interface BusinessRecordTableProps {
  /** Deployment stage. */
  readonly deploymentStage: DeploymentStage;
}

/**
 * CDK construct which provisions a DynamoDB table for business records.
 *
 * @beta
 */
export class BusinessRecordTable extends Construct {
  /**
   * DynamoDB table for business records.
   *
   * @remarks
   *
   * ## Table structure
   *
   * Primary keys:
   * - `pk`: (string) partition key
   * - `sk`: (string) sort key
   *
   * ### Public business reccords
   *
   * - `pk`: "{recordId}"
   *   - `recordId`: unique ID of the business record
   * - `sk`: "public"
   * - `maskedDogId`: (string) semi-unique ID of the dog who carried out the
   *   business. used to calculate the anonymity level in map tiles.
   * - `isAdvocated`: (boolean) whether the dog who carried out the business
   *   opted in to be an advocate of the app. visible at any anonymity level.
   * - `timestamp`: (number) timestamp represented as the number of hours
   *   elapsed since 00:00:00 on January 1, 1970 UTC
   * - `businessType`: (string) type of the business. "pee" or "poo".
   * - `longitude`: (number) longitude of the location of the business record
   * - `latitude`: (number) latitude of the location of the business record
   * - `tileAtZ{0-22}`: (string) tile coordinates at zoom level {0-22} in the
   *   format of "public#{x}/{y}".
   *   - `x`: x coordinate of the tile
   *   - `y`: y coordinate of the tile
   *
   *   Not all of them are indexed by GSIs but should be calculated in case we
   *   want to change which zoom levels to index in the future.
   *
   * ### Private business records
   *
   * - `pk`: "{recordId}"
   *   - `recordId`: unique ID of the business record
   * - `sk`: "private"
   * - `dogId`: (string) unique ID of the dog who carried out the business
   * - `timestamp`: (number) timestamp represented as the number of seconds
   *   elapsed since 00:00:00 on January 1, 1970 UTC
   * - `businessType`: (string) type of the business. "pee" or "poo".
   * - `longitude`: (number) longitude of the location of the business record
   * - `latitude`: (number) latitude of the location of the business record
   * - `tileAtZ{0-22}`: (string) tile coordinates at zoom level {0-22} in the
   *   format of "dog#{dogId}#{x}/{y}".
   *   - `dogId`: unique ID of the dog who carried out the business. same as
   *     the `dogId` attribute.
   *   - `x`: x coordinate of the tile
   *   - `y`: y coordinate of the tile
   *
   * ### Global secondary indices
   *
   * There are two types of global secondary indices (GSIs):
   * - GSIs for map tile requests
   * - GSI for business records of a specific dog
   *
   * #### GSIs for map tile requests
   *
   * To boost query performance for business records in a specific map tile at
   * a specific zoom level, precalculates and indexes the tile coordinates of
   * each business record at various zoom levels. Since there is a quota on the
   * number of GSIs allowed per table, creates GSIs for only chosen zoom
   * levels (map tile GSIs). Tiles at lower zoom levels can cover those at
   * higher zoom levels. Creates the map tile GSIs for the following zoom
   * levels:
   * - 0: also covers zoom levels 1, and 2
   *   - `tileAtZ0`: (string) partition key
   * - 3: also covers zoom levels 4, and 5
   *   - `tileAtZ3`: (string) partition key
   * - 6: also covers zoom levels 7 to 9
   *   - `tileAtZ6`: (string) partition key
   * - 10: also covers zoom levels 11 to 14
   *   - `tileAtZ10`: (string) partition key
   * - 15
   *   - `tileAtZ15`: (string) partition key
   * - 16
   *   - `tileAtZ16`: (string) partition key
   * - 17
   *   - `tileAtZ17`: (string) partition key
   * - 18: also covers zoom levels 19 to 22
   *   - `tileAtZ18`: (string) partition key
   *
   * Every partition key for the map tile GSIs has the format which varies by
   * the scope:
   * - "public#{x}/{y}": for public records
   *   - `x`: x coordinate of the tile
   *   - `y`: y coordinate of the tile
   * - "dog#{dogId}#{x}/{y}" for private records
   *   - `dogId`: unique ID of the dog who carried out the business
   *   - `x`: x coordinate of the tile
   *   - `y`: y coordinate of the tile
   *
   * Every map tile GSI has the same numeric sort key:
   * - `timestamp`: precision varies based on the scope
   *   - for public records, number of hours elapsed since 00:00:00 on
   *     January 1, 1970 UTC
   *   - for private records, number of seconds elapsed since 00:00:00 on
   *     January 1, 1970 UTC
   *
   * Every map tile GSI has the following projected attributes:
   * - `dogId`: (string) unique ID of the dog who carried out the business,
   *   which is missing in public records
   * - `maskedDogId`: (string) semi-unique ID of the dog who carried out the
   *   business, which is missing in private records
   * - `isAdvocated`: (boolean) whether the business record is visible at any
   *   anonymity level, which is missing in private records
   * - `businessType`: (string) type of the business. "pee" or "poo".
   * - `longitude`: (number) longitude of the location of the business record
   * - `latitude`: (number) latitude of the location of the business record
   *
   * #### Global secondary index for business records of a specific dog
   *
   * Primary keys:
   * - `dogId`: (string) partition key. unique ID of the dog who carried out
   *   the business
   * - `timestamp`: (number) sort key. number of seconds elapsed since
   *   00:00:00 on January 1, 1970 UTC
   */
  readonly table: dynamodb.TableV2;

  constructor(scope: Construct, id: string, props: BusinessRecordTableProps) {
    super(scope, id);

    this.table = new dynamodb.TableV2(this, 'BusinessRecordTable', {
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      // TODO: on-demand for production
      billing: dynamodb.Billing.provisioned({
        readCapacity: dynamodb.Capacity.fixed(2),
        writeCapacity: dynamodb.Capacity.autoscaled({
          maxCapacity: 2,
        }),
      }),
      // TODO: enable point-in-time recovery for production
    });

    // adds a global secondary index for business records of a specific dog
    this.table.addGlobalSecondaryIndex({
      indexName: DOG_INDEX_NAME,
      partitionKey: {
        name: 'dogId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: [
        'businessType',
        'longitude',
        'latitude',
      ],
    });

    // adds global secondary indices for map tile requests
    for (const zoom of INDEXED_ZOOM_LEVELS) {
      this.table.addGlobalSecondaryIndex({
        indexName: `TileZ${zoom}Index`,
        partitionKey: {
          name: `tileAtZ${zoom}`,
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: 'timestamp',
          type: dynamodb.AttributeType.NUMBER,
        },
        projectionType: dynamodb.ProjectionType.INCLUDE,
        nonKeyAttributes: [
          'dogId',
          'maskedDogId',
          'isAdvocated',
          'businessType',
          'longitude',
          'latitude',
        ],
      });
    }
  }
}
