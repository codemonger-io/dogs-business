# Dog's Business Client

The client web app for Dog's Business.
This is a single page application powered by [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/), [Vue.js](https://vuejs.org), and [Buefy](https://buefy.org/).

## Configurations

You have to configure the environment variables described in the following subsections.
You can find an example configuration in [`.env.example`](./.env.example).

### Configuring the base URL of the Credentials API

You have to configure the environment variable `VITE_CREDENTIALS_API_BASE_URL` to the base URL of the Credentials API.

### Configuring the base URL of the Dog's Business API

You have to configure the environment variable `VITE_DOGS_BUSINESS_API_BASE_URL` to the base URL of the Dog's Business API.

### Configuring the Mapbox access token

You have to configure the environment variable `VITE_MAPBOX_GUEST_ACCESS_TOKEN` to the Mapbox access token for guests.

## Running dev server

1. Copy the configuration for the localhost:

    ```sh
    cp src/configs/mapbox-config.localhost.ts src/configs/mapbox-config.ts
    ```

2. Start the dev server:

    ```sh
    pnpm dev
    ```

3. Open `http://localhost:5174` in your browser.

## Unit testing

```sh
pnpm test:unit
```

## Linting

```sh
pnpm lint
```

## Deploying to AWS

You have to deploy the [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/) stack first.
Please see the [`/cdk` folder](../cdk) for more details.

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

   Note that you have to prepare your own `src/configs/mapbox-config.$DEPLOYMENT_STAGE.ts`.

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