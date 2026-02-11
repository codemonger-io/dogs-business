//! Library part of the `map-auth` applications.

/// Binary representation of a tile access token.
///
/// ```
/// | Expiration time (64 bits) | HMAC-SHA256 (256 bits) |
/// ```
///
/// The expiration time is represented as the number of seconds elapsed since
/// 00:00:00 UTC on January 1, 1970 (UNIX epoch).
///
/// The HMAC-SHA256 is a SHA-256 hash computed over the expiration time using
/// the secret key.
pub type TileAccessTokenBytes = [u8; 40];

/// Extension trait for byte arrays regarding Base64 encoding.
pub trait ByteArrayExt {
    /// Initializes a byte array filled with zeros.
    fn zeros() -> Self;

    /// Validates a given length of a Base64-encoded sequence.
    ///
    /// `len` should also count paddings.
    fn validate_base64_encoded_length(len: usize) -> bool;
}

impl<const N: usize> ByteArrayExt for [u8; N] {
    #[inline]
    fn zeros() -> Self {
        [0u8; N]
    }

    #[inline]
    fn validate_base64_encoded_length(len: usize) -> bool {
        len == (N + 2) / 3 * 4
    }
}

/// Extension trait for [`TileAccessTokenBytes`].
pub trait TileAccessTokenBytesExt {
    /// Extracts the expiration time and the signature from the token.
    ///
    /// Returns a pair of (expiration time, signature).
    fn get_parts(&self) -> ([u8; 8], &[u8]);
}

impl TileAccessTokenBytesExt for TileAccessTokenBytes {
    #[inline]
    fn get_parts(&self) -> ([u8; 8], &[u8]) {
        let (expires_at, signature) = self.split_at(8);
        (expires_at.try_into().unwrap(), signature)
    }
}
