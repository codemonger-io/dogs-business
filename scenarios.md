# Scenarios

## Requesting an app

1. A `user` requests a `server` for an `app`.
2. The `server` returns an `app` to the `user`.

## Initializing an offline user account

1. [Requesting an app](#requesting-an-app)
2. The `user` starts the `app`.
3. The `app` asks the `user` for `user information` including
    - her/his dog's name (optional)
    - her/his dog's sex (optional)
    - her/his dog's date of birth (optional)
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
- 6-A: When there are `business records` overlapping each other on the `map`
    1. The `app` shows the latest `business record` among the overlapping `business records` on the `map`.
    2. Start from the step 7 of the main scenario.

## Updating the current location

1. [Starting an app](#starting-an-app)
2. The `app` periodically obtains the `current location` of the `user`.
3. The `app` moves the `location marker` to the `current location` on the `map`.

## Placing a poo

1. [Starting an app](#starting-an-app)
2. The `user` clicks the `poo button` on the `business menu`.
3. The `app` places a `poo` at the `current location` of the `user`.
4. The `app` appends the `poo` to the `business records`.
5. The `app` hides the `business menu`.
   Similar to the step 3 of the scenario [Hiding a business menu](#hiding-a-business-menu).
6. The `app` shows a 'please clean up after your dog' message for a few seconds.

## Placing a pee

1. [Starting an app](#starting-an-app)
2. The `user` clicks a `pee button` on the `business menu`.
3. The `app` places a `pee` at the `current location` of the `user`.
4. The `app` appends the `pee` to the `business records`.
5. The `app` hides the `business menu`.
   Similar to the step 3 of the scenario [Hiding a business menu](#hiding-a-business-menu).
6. The `app` shows a 'please clean up after your dog' message for a few seconds.

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

## Centering the current location

1. [Starting an app](#starting-an-app)
2. The `user` clicks the `centering button` on the `map`.
3. The `app` obtains the `current location` of the `user`.
4. The `app` centers the `current location` on the `map`.

## Viewing business records at a point

1. [Starting an app](#starting-an-app)
2. The `user` clicks a `business record` on the `map`.
3. The `app` selects the clicked `business record`. &rightarrow; `selected business record`
4. The `app` queries the `user account` for `business records` overlapping with the `selected business record`.
   The `overlapping business records` include the `selected business record`.
5. The `app` shows a `business statistics popup` at the `selected business record`.
6. The `business statistics popup` shows a `business record bar chart` indicating the following information,
    - The percentage of `pee` records.
    - The percentage of `poo` records.
7. The `business statistics popup` also shows a `business record list link`.

## Listing business records at a point

1. [Viewing business records at a point](#viewing-business-records-at-a-point)
2. The `user` clicks the `business record list link`.
3. The `app` shows a `business record list` on top of the `map`.
4. The `business record list` lists the `overlapping business records`.
5. The `business record list` has a `close button`.

## Selecting a business record in a business record list

1. [Listing business records at a point](#listing-business-records-at-a-point)
2. The `user` clicks a `list item` in the `business record list`.
3. The `app` centers the `business record` of the `clicked list item` on the `map`.
4. The `app` shows a `delete button` beside the `clicked list item`.

## Deleting a business record in a business record list

1. [Selecting a business record in a business record list](#selecting-a-business-record-in-a-business-record-list)
2. The `user` clicks the `delete button` of a `list item` to delete.
3. The `app` confirms that the `user` really wants to delete the `business record` of the `list item`.
4. The `user` answers yes to the `app`.
5. The `app` deletes the `business record` from the `user account`.

## Hiding a business record list

1. [Listing business records at a point](#listing-business-records-at-a-point)
2. The `user` clicks the `close button` of the `business record list`.
3. The `app` closes the `business record list`.