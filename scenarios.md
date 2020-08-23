# Scenarios

## Requesting an app

1. A `user` requests a `server` for an `app`.
2. The `server` returns an `app` to the `user`.

## Starting an app

1. [Requesting an app](#requesting-an-app)
2. A `user` starts the `app`.
3. The `app` queries the `server` for the `event history` of the `user`.
4. The `app` obtains the `current location` of the `user`.
5. The `app` shows a `map` around the `current location`.
6. The `app` shows a `location marker` at the `current location` on the `map`.
7. The `app` shows `pees` and `poos` in the `event history` on the `map`.
8. The `app` shows an `event control` at the `current location` on the `map`.
9. The `event control` provides the following buttons,
    - A `pee button`
    - A `poo button`
    - A `close button`

## Placing a poo

1. [Showing an event control](#showing-an-event-control)
2. The `user` presses the `poo button` on the `event control`.
3. The `app` places a `poo` at the `current location` of the `user`.
4. The `app` appends the `poo` to the `event history`.
5. The `app` hides the `event control`.
   Similar to the step 3 of the scenario [Hiding an event control](#hiding-an-event-control).

## Placing a pee

1. [Showing an event control](#showing-an-event-control)
2. The `user` presses a `pee button` on the `event control`.
3. The `app` places a `pee` at the `current location` of the `user`.
4. The `app` appends the `pee` to the `event history`.
5. The `app` hides the `event control`.
   Similar to the step 3 of the scenario [Hiding an event control](#hiding-an-event-control).

## Hiding an event control

1. [Starting an app](#starting-an-app)
2. The `user` clicks the `close button` on the `event control`.
3. The `app` hides the `event control`.

### Derivative scenarios

- 2-A: Clicking the `location marker`
    1. The `user` clicks the `location marker` on the `map`.
    2. Start from the step 3 of the main scenario.

## Showing an event control

1. [Hiding an event control](#hiding-an-event-control)
2. The `user` clicks the `location marker` on the `map`.
3. The `app` shows the `event control` again.
4. Similar to the step 9 of the scenario [Staring an app](#starting-an-app).