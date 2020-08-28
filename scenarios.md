# Scenarios

## Requesting an app

1. A `user` requests a `server` for an `app`.
2. The `server` returns an `app` to the `user`.

## Initializing an user account

1. [Requesting an app](#requesting-an-app)
2. The `user` starts the `app`.
3. The `app` asks the `user` for `user information` including
    - his/her dog's name (optional)
    - his/her dog's sex (optional)
    - his/her dog's date of birth (optional)
4. The `user` inputs `user information`.
5. The `app` initializes an `user account` with
    - the `user information`
    - an empty `business records`
6. The `app` saves the `user account` in the `local database`.

## Loading the user account

1. [Requesting an app](#requesting-an-app)
2. The `user` starts the `app`.
3. The `app` loads the `user account` from the `local database`.

## Starting an app

1. [Loading the user account](#loading-the-user-account)
2. The `app` obtains the `business records` from the `user account`.
3. The `app` obtains the `current location` of the `user`.
4. The `app` shows a `map` around the `current location`.
5. The `app` shows a `location marker` at the `current location` on the `map`.
6. The `app` shows `pees` and `poos` in the `business records` on the `map`.
7. The `app` shows an `business menu` at the `current location` on the `map`.
8. The `business menu` provides the following interfaces,
    - A `pee button`
    - A `poo button`
    - A `close button`

### Derivative scenarios

- 1-A: Starting for the first time
    1. [Initializing an offline user account](#initializing-an-offline-user-account)
    2. Start from the step 2 of the main scenario.

## Placing a poo

1. [Starting an app](#starting-an-app)
2. The `user` presses the `poo button` on the `business menu`.
3. The `app` places a `poo` at the `current location` of the `user`.
4. The `app` appends the `poo` to the `business records`.
5. The `app` hides the `business menu`.
   Similar to the step 3 of the scenario [Hiding a business menu](#hiding-a-business-menu).

## Placing a pee

1. [Starting an app](#starting-an-app)
2. The `user` presses a `pee button` on the `business menu`.
3. The `app` places a `pee` at the `current location` of the `user`.
4. The `app` appends the `pee` to the `business records`.
5. The `app` hides the `business menu`.
   Similar to the step 3 of the scenario [Hiding a business menu](#hiding-a-business-menu).

## Hiding a business menu

1. [Starting an app](#starting-an-app)
2. The `user` clicks the `close button` on the `business menu`.
3. The `app` hides the `business menu`.

### Derivative scenarios

- 2-A: Clicking the `location marker`
    1. The `user` clicks the `location marker` on the `map`.
    2. Start from the step 3 of the main scenario.

## Showing a business menu

1. [Hiding a business menu](#hiding-a-business-menu)
2. The `user` clicks the `location marker` on the `map`.
3. The `app` shows the `business menu` again.
4. Similar to the step 8 of the scenario [Starting an app](#starting-an-app).