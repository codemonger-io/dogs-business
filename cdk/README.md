# Dog's Business CDK

Provisions AWS resources for Dog's Business.
All the AWS resources are described with [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/).

## Setting AWS_PROFILE

Please configure your [`AWS_PROFILE`](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html) environment variable.
Here is an example in my case:

```sh
export AWS_PROFILE=dogsbusiness-jp
```

## Configuring toolkit stack name

You can choose any toolkit stack name you like, or leave it as default.
Here is an example in my case:

```sh
TOOLKIT_STACK_NAME=dogs-business-toolkit
```

## Configuring bootstrap qualifier

I strongly recommend setting a non-default bootstrap qualifier if you choose a custom toolkit stack name.
Please refer to <https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-custom-synth> for more details.
Here is an example in my case:

```sh
BOOTSTRAP_QUALIFIER=dogsbz2023
```

## Bootstrapping

You have to bootstrap the toolkit stack if you have not done it yet.
Remove `--toolkit-stack-name $TOOLKIT_STACK_NAME` option if you choose the default toolkit stack name.

```sh
pnpm cdk bootstrap --toolkit-stack-name $TOOLKIT_STACK_NAME --qualifier $BOOTSTRAP_QUALIFIER
```

## Synthesizing CloudFormation template

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

## Post deployment

### Obtaining the internal URL of the distribution

```sh
aws cloudformation describe-stacks --stack-name dogs-business-$DEPLOYMENT_STAGE --query "Stacks[0].Outputs[?OutputKey=='DistributionInternalUrl'].OutputValue" --output text
```

### Name of the S3 bucket for the contents

```sh
aws cloudformation describe-stacks --stack-name dogs-business-$DEPLOYMENT_STAGE --query "Stacks[0].Outputs[?OutputKey=='ContentsBucketName'].OutputValue" --output text
```