# Dog's Business CDK

Provisions AWS resources for Dog's Business.

## Setting AWS_PROFILE

```sh
export AWS_PROFILE=dogsbusiness-jp
```

## Configuring toolkit stack name

```sh
TOOLKIT_STACK_NAME=dogs-business-toolkit
```

## Configuring bootstrap qualifier

See <https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-custom-synth>.

```sh
BOOTSTRAP_QUALIFIER=dogsbz2023
```

## Bootstrapping

```sh
pnpm cdk bootstrap --toolkit-stack-name $TOOLKIT_STACK_NAME --qualifier $BOOTSTRAP_QUALIFIER
```

## Synthesizing

```sh
pnpm cdk synth -c "@aws-cdk/core:bootstrapQualifier=$BOOTSTRAP_QUALIFIER"
```

Production:

```sh
pnpm cdk synth -c "@aws-cdk/core:bootstrapQualifier=$BOOTSTRAP_QUALIFIER" -c "dogs-business:deployment-stage=production"
```

## Deploying

```sh
pnpm cdk deploy -c "@aws-cdk/core:bootstrapQualifier=$BOOTSTRAP_QUALIFIER"
```

Production:

```sh
pnpm cdk deploy -c "@aws-cdk/core:bootstrapQualifier=$BOOTSTRAP_QUALIFIER" -c "dogs-business:deployment-stage=production"
```

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
