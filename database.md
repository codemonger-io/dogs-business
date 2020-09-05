# Database Description

The IndexedDB database of this application is named `DogsBusinessDb`.
Here the structure of `DogsBusinessDb` is described.

## Version 1

### Stores

#### dog

```js
{
    dogId: 1,
    name: 'name',
    sex: 'female' | 'male' | 'n/a',
    dateOfBirth: '2018-05-23'
}
```

`dogId` (1, 2, ...) is the key of a dog and automatically assigned by IndexedDB.

`name` is the name of of the dog.

`sex` is the sex of the dog.
It may take one of 'female', 'male' and 'n/a'.

`dateOfBirth` is the date of birth of the dog.
Its format is `YYYY-MM-DD`.
It may be `undefined` if it is not given.

#### business-record

```js
{
    recordId: 1,
    dogId: 1,
    type: 'pee' | 'poo',
    location: {
        longitude: 1.0,
        latitude: 1.0
    },
    date: '2020-08-27'
}
```

`recordId` (1, 2, ...) is the key of a business record and automatically assigned by IndexedDB.

`dogId` is the ID of the dog that had the business.

`type` is the type of the business.

`location` is the location where the business happened.
- `longitude` is the longitude of the location.
- `latitude` is the latitude of the location.

`date` is the date when the business happened.
Its format is `YYYY-MM-DD`.

## Version 2

### Stores

In addition to the stores of the version 2, there will be the following store.

#### user

```js
{
    userId: 1,
    account: {},
    mapboxAccessToken: 'access token'
}
```

There should be only one entry in the `user` store.

`userId` is always `1`.

`accountId` is an object depending on the account type.
- [Offline account](README.md#offline-account)

    ```js
    {
        type: 'offline'
    }
    ```

- [Online device account](README.md#online-device-account)

    ```js
    {
        type: 'device',
        privateKey: '',
        publicKey: ''
    }
    ```

- [Online personal account](README.md#online-personal-account)

    ```js
    {
        type: 'personal',
        email: '',
        token: {}
    }
    ```

`mapboxAccessToken` is a token to access the map data hosted by Mapbox.