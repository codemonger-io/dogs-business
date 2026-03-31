# What is a passkey?

## General description

A *passkey* is __one of the methods for an *application* to authenticate a *user* without using a *password*.__
A *passkey* relies on a pair of a *private key* and a *public key* instead of a *password*.
A *private key* is used to make a *signature* to prove that the *user* is genuine.
A *public key* can be used to verify that a given *signature* was actually made by the exact *user*.
As a *public key* cannot reproduce a *signature* of the *user*, *users* can safely share *public keys* with the *application*.
In general, an *authentication server* that conducts authentication stores *public keys*.
A private key is stored in a secure storage of the *user*'s device, and the *application* cannot obtain the *private key*.
A *permission* of the *user* is required to make a *signature* with the *private key*.
How to grant this *permission* is up to the *user*'s device and its security configuration, though *biometric authentication*, e.g., fingerprint recognition and facial recognition, is generally used.
Since *biometric authentication* is only used to grant *permission* to make a *signature*, no biometric data, like fingerprints and facial data, can escape from the secure storage of the device.
Therefore, __*applications* and *authentication servers* NEVER collect fingerprints, facial data, or other biometric data.__

## Usage in this app

*This app* requires a *user* to create a *passkey* for sign-up.
As does making a *signature*, the creation of a *passkey* requires *permission* from the *user*.
The *user*'s device creates a *passkey* once the *user* grants its creation, and then *this app* registers the *public key* and related information, e.g., username, to the *authentication server*.
After finishing the creation and registration of the *passkey*, the *user* can sign in to *this app*.
__Only the *user* who created the *passkey* and *this app* can use it.__