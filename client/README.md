# Dog's Business Client

This template should help get you started developing with Vue 3 in Vite.

## Deploying to AWS

You have to deploy the CDK stack first.
Please see [../cdk](../cdk).

1. Choose the deployment stage.

   Development:

    ```sh
    DEPLOYMENT_STAGE=development
    ```

   Production:

    ```sh
    DEPLOYMENT_STAGE=production
    ```

2. Configure the app:

    ```sh
    cp src/configs/mapbox-config.$DEPLOYMENT_STAGE.ts src/configs/mapbox-config.ts
    ```

3. Build the production bundle:

    ```sh
    pnpm build
    ```

4. Configure AWS_PROFILE:

    ```sh
    export AWS_PROFILE=dogsbusiness-jp
    ```

5. Obtain the S3 bucket name:

    ```sh
    CONTENTS_BUCKET_NAME=`aws cloudformation describe-stacks --stack-name dogs-business-$DEPLOYMENT_STAGE --query "Stacks[0].Outputs[?OutputKey=='ContentsBucketName'].OutputValue" --output text`
    ```

6. Copy the contents to the S3 bucket:

    ```sh
    aws s3 sync dist/ s3://$CONTENTS_BUCKET_NAME/app
    ```
