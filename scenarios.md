# Scenarios

## Starting the app

### Main

**Summary**: a `user` starts the `app`.

1. A `user` boots the `app`.
2. The `app` loads the `user data` from the `local database`.

### Derivative

#### 2-A. The `user` starts the `app` for the first time

**Summary**: the `app` asks the `user` to sign in because their is no `user data` in the `local database`.

1. [Asking sign-in](#asking-sign-in).
2. Resume from the step 2 of the main scenario.

## Asking sign-in

**Precondition**: a `user` has booted the `app` (see the scenario [Starting the app](#starting-the-app)).

### Main

**Summary**: the `app` asks the `user` to sign in, and the `user` does so.

1. The `app` shows `sign-in options` to the `user`.
   `sign-in options` contains the following actions,
    - Sign-in
    - Sign-up
    - Continue with an offline account
2. The `user` chooses Sign-in.
3. The `app` asks `user`'s `credential`.
   A `credential` is made of `email`, and `password`.
4. The `user` inputs her/his `credential`.
5. The `app` asks the `server` if the `credential` is valid.
6. The `server` authenticates the `credential`.
7. The `server` issues an `access token` to the `app`.
8. The `app` hides the `sign-in options`.
9. The `app` obtains the `user data` from the `server`.
10. The `app` caches the `user data` in the `local database`.

### Derivatives

#### 2-A: The `user` chooses Sign-up

1. [Signing up](#signing-up)
2. Resume from the step 2 of the main scenario.

#### 2-B: The `user` chooses Continue with an offline account

1. [Initializaing an offline user account](#initializing-an-offline-user-account)
2. Resume from the step 10 of the main scenario.

#### 6-A: The `user` signs in for the first time

**Summary**: the `user` has to set a new `password` since the received `password` is temporary.

1. The `app` asks the `user` for a new `password`.
2. The `user` inputs a new `password`.
3. The `user` confirms the `password`.
4. The `app` sends the `password` to the `server`.
5. The `server` changes the `password` of the `user`.
6. Resume from the step 7 of the main scenario.

## Signing up

**Precondition**: a `user` has choosen to sign up (see the scenario [Asking sign-in](#asking-sign-in)).

### Main

**Summary**: the `app` asks the `user` to sign up, and the `user` does so.

1. The `app` shows `sign-up form` to the `user`.
2. The `sign-up form` asks the `user` to input an `email`.
3. The `user` inputs the `email`.
4. The `user` clicks the `sign-up button` on the `sign-up form`.
5. The `app` asks the `server` to register the `email`.
6. The `server` adds the `email` to the `user pool`.
7. The `server` initializes `user data` associated with the `email`.
    - no `dog friends`
    - an empty `business records`
8. The `server` generates a temporary `password` for the `user`.
9. The `server` sends the `password` to the `email`.
10. The `user` receives the `password`.

## Initializing an offline user account

**Precondition**: a `user` has choosen to continue with an offline account (see the scenario [Asking sign-in](#asking-sign-in)).

### Main

**Summary**: the `app` initializes empty `user data`.

1. The `app` initializes `user data` with
    - no `dog friends`
    - an empty `business records`

## Starting the service

**Precondition**: a `user` has started the `app` (see the scenario [Starting the app](#starting-the-app)).

### Main

1. The `app` obtains the `current location` of the `user`.
2. The `app` shows a `map` around the `current location`.
3. The `app` shows a `location marker` at the `current location` on the `map`.
4. The `app` obtains `dog friends` from the `user data`.
5. The `app` selects the first `dog` in the `dog friends` &rightarrow; `selected dog`.
6. The `app` obtains the `business records` of the `selected dog` from the `user data`.
7. The `app` shows `pees`, and `poos` in the `business records` on the `map`.
8. The `app` shows a `business menu` at the `current location` on the `map`.
9. The `business menu` provides the following interfaces,
    - A `pee button`
    - A `poo button`
    - A `close button`

### Derivative scenarios

#### 5-A. There is no `dog friend`

**Summary**: the `app` asks the `user` to add a new `dog friend` because there is no `dog friend`.

1. [Adding the first dog friend](#adding-the-first-dog-friend)
2. Resume from the step 5 of the main scenario.

#### 7-A. There are `business records` overlapping each other on the `map`

1. The `app` shows the latest `business record` among the overlapping `business records` on the `map`.
2. Resume from the step 8 of the main scenario.

## Updating the current location

**Precondition**: the service has started (see the scenario [Starting the service](#starting-the-service)).

### Main

1. The `app` periodically obtains the `current location` of the `user`.
2. The `app` moves the `location marker` to the `current location` on the `map`.

## Placing a poo

**Precondition**: a `business menu` is shown (see the scenarios [Starting the service](#starting-the-service), and [Showing a business menu](#showing-a-business-menu)).

### Main

**Summary**: a `user` records a `poo` at the `current location`.

1. A `user` clicks the `poo button` on the `business menu`.
2. The `app` places a `poo` at the `current location` of the `user`.
3. The `app` appends the `poo` to the `business records`.
4. The `app` hides the `business menu`.
5. The `app` shows a 'please clean up' message for a few seconds.

## Placing a pee

**Precondition**: a `business menu` is shown (see the scenarios [Starting the service](#starting-the-service), and [Showing a business menu](#showing-a-business-menu)).

### Main

**Summary**: a `user` records a `pee` at the `current location`.

1. A `user` clicks a `pee button` on the `business menu`.
2. The `app` places a `pee` at the `current location` of the `user`.
3. The `app` appends the `pee` to the `business records`.
4. The `app` hides the `business menu`.
5. The `app` shows a 'please clean up' message for a few seconds.

## Hiding a business menu

**Precondition**: a `business menu` is shown (see the scenarios [Starting the service](#starting-the-service), and [Showing a business menu](#showing-a-business-menu)).

### Main

1. The `user` clicks the `close button` on the `business menu`.
2. The `app` hides the `business menu`.

### Derivative scenarios

#### 1-A. Clicking the `location marker`

**Summary**: clicking the `location marker` toggles the `business menu`.

1. The `user` clicks the `location marker` on the `map`.
2. The `app` hides the `business menu`.

## Showing a business menu

**Precondition**: a `business menu` is not shown (see the scenario [Hiding a business menu](#hiding-a-business-menu)).

### Main

1. The `user` clicks the `location marker` on the `map`.
2. The `app` shows the `business menu`.

## Centering the current location

**Precondition**: the service has started (see the scenario [Starting the service](#starting-the-service)).

### Main

1. The `user` clicks the `centering button` on the `map`.
2. The `app` obtains the `current location` of the `user`.
3. The `app` centers the `current location` on the `map`.

## Viewing business records at a point

**Precondition**: the service has started (see the scenario [Starting the service](#starting-the-service)).

### Main

**Summary**: since overlapping multiple `business records` are aggregated to a single representative `business record`, the `app` summarizes those aggregated `business records` when the representative `business record` is clicked.

1. The `user` clicks a `business record` on the `map`.
2. The `app` selects the clicked `business record` &rightarrow; `selected business record`
3. The `app` queries the `user data` for `business records` overlapping with the `selected business record` &rightarrow; `overlapping business records`.
   The `overlapping business records` also include the `selected business record`.
4. The `app` shows a `business statistics popup` at the `selected business record`.
5. The `business statistics popup` shows a `business record bar chart` indicating the following information,
    - The percentage of `pee` records.
    - The percentage of `poo` records.
6. The `business statistics popup` also shows a `business record list link`.

## Listing business records at a point

**Precondition**: a `business statistics popup` is shown (see the scenario [Viewing business records at a point](#viewing-business-records-at-a-point)).

### Main

1. The `user` clicks the `business record list link`.
2. The `app` shows a `business record list` on top of the `map`.
3. The `business record list` lists the `overlapping business records`.
4. The `business record list` has a `close button`.

## Selecting a business record in a business record list

**Precondition**: a `business record list` is shown (see the scenario [Listing business records at a point](#listing-business-records-at-a-point)).

### Main

1. The `user` clicks a `list item` in the `business record list` &rightarrow; `clicked list item`.
2. The `app` centers the `business record` of the `clicked list item` on the `map`.
3. The `app` shows a `delete button` beside the `clicked list item`.

## Deleting a business record in a business record list

**Precondition**: a `business record list` is shown, and a `business record` is selected on it (see the scenario [Selecting a business record in a business record list](#selecting-a-business-record-in-a-business-record-list)).

### Main

1. The `user` clicks the `delete button` of a `list item` to delete.
2. The `app` confirms that the `user` really wants to delete the `business record` of the `list item`.
3. The `user` answers yes to the `app`.
4. The `app` deletes the `business record` from the `user data`.

## Hiding a business record list

**Precondition**: a `business record list` is shown (see the scenario [Listing business records at a point](#listing-business-records-at-a-point)).

### Main

1. The `user` clicks the `close button` of the `business record list`.
2. The `app` closes the `business record list`.

## Adding the first dog friend

**Precondition**: the `app` has started, but there is no `dog friend` to show (see the derivative scenario [There is no `dog friend`](#5-a-there-is-no-dog-friend)).

### Main

**Summary**: the `user` fills the profile of a new `dog friend`, and adds it to her/his `dog friends`.

1. The `app` shows a `dog profile dialog`.
2. The `dog profile dialog` asks the `user` to fill the following optional `dog profile` attributes,
    - Dog's name
    - Dog's sex
    - Dog's date of birth
3. The `user` fills the `dog profile`.
4. The `user` confirms the `dog profile`.
5. The `app` adds the `dog profile` to the `dog friends` in the `user data`.
6. The `app` saves the `user data` in the `local database`.
7. The `app` closes the `dog profile dialog`.

## Editing dog profile

**Precondition**: the `app` has started the service (see the scenario [Starting the service](#starting-the-service)).

### Main

**Summary**: the `user` updates the profile of her/his `dog friend`.

1. The `user` selects the `edit dog profile` menu item.
2. The `app` shows a `dog profile dialog`.
3. The `dog profile dialog` asks the `user` to fill the following `dog profile` attributes,
    - Dog's name
    - Dog's sex
    - Dog's date of birth
4. The `user` updates the `dog profile`.
5. The `user` submits the `updated dog profile`.
6. The `app` updates the `dog profile` in the `dog friends` in the `user data`.
7. The `app` saves the `user data` in the `local database`.
8. The `app` closes the `dog profile dialog`.