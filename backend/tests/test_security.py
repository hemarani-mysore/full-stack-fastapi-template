import pytest

# Assuming verify_password is also in security.py as per the gap description
from app.core.security import get_password_hash, verify_password
from app.crud import DUMMY_HASH  # For timing attack prevention test


def test_get_password_hash_valid_password():
    """
    Verifies that get_password_hash returns a non-empty string for a valid password
    and that it starts with a known hash prefix (Argon2 or Bcrypt).
    """
    password = "testpassword123"
    hashed_password = get_password_hash(password)
    assert isinstance(hashed_password, str)
    assert len(hashed_password) > 0
    # Check for common hash prefixes from pwdlib's Argon2 and Bcrypt hashers
    assert hashed_password.startswith("$argon2") or hashed_password.startswith("$2a$")


def test_get_password_hash_empty_password():
    """
    Verifies that get_password_hash can handle an empty string password
    and returns a valid hash.
    """
    password = ""
    hashed_password = get_password_hash(password)
    assert isinstance(hashed_password, str)
    assert len(hashed_password) > 0
    assert hashed_password.startswith("$argon2") or hashed_password.startswith("$2a$")


def test_get_password_hash_none_password_raises_type_error():
    """
    Verifies that get_password_hash raises a TypeError when given None as input,
    as it expects a string.
    """
    with pytest.raises(TypeError):
        get_password_hash(None)


def test_verify_password_correct_password():
    """
    Verifies that verify_password returns True when the plain password matches its hash.
    """
    password = "securepassword456"
    hashed_password = get_password_hash(password)
    assert verify_password(password, hashed_password) is True


def test_verify_password_incorrect_password():
    """
    Verifies that verify_password returns False when the plain password does not match its hash.
    """
    password = "correctpassword"
    wrong_password = "incorrectpassword"
    hashed_password = get_password_hash(password)
    assert verify_password(wrong_password, hashed_password) is False


def test_verify_password_empty_password_correct_hash():
    """
    Verifies that verify_password returns True for an empty string password
    when compared against its own hash.
    """
    password = ""
    hashed_password = get_password_hash(password)
    assert verify_password(password, hashed_password) is True


def test_verify_password_empty_password_incorrect_hash():
    """
    Verifies that verify_password returns False for an empty string password
    when compared against a hash of a non-empty password.
    """
    password = ""
    hashed_password_of_other_password = get_password_hash("some_other_password")
    assert verify_password(password, hashed_password_of_other_password) is False


def test_verify_password_empty_hash():
    """
    Verifies that verify_password returns False when the hashed_password is an empty string,
    as an empty string is not a valid hash.
    """
    password = "testpassword"
    empty_hash = ""
    assert verify_password(password, empty_hash) is False


def test_verify_password_invalid_hash_format():
    """
    Verifies that verify_password returns False when the hashed_password is not in a valid
    hash format, preventing errors from malformed input.
    """
    password = "testpassword"
    invalid_hash = "not_a_valid_hash_format_at_all"
    assert verify_password(password, invalid_hash) is False


@pytest.mark.parametrize(
    "plain_password, hashed_password",
    [
        (None, "some_valid_hash"),
        ("some_password", None),
        (None, None),
    ],
)
def test_verify_password_none_inputs_raises_type_error(plain_password, hashed_password):
    """
    Verifies that verify_password raises a TypeError when given None for either
    the plain_password or hashed_password arguments.
    """
    with pytest.raises(TypeError):
        verify_password(plain_password, hashed_password)


def test_verify_password_with_dummy_hash():
    """
    Verifies that verify_password correctly handles comparison with DUMMY_HASH,
    returning False for any real password, and does not raise an error.
    This is crucial for timing attack prevention when a user is not found.
    """
    # Test with a regular password
    password = "any_user_password_that_does_not_match_dummy_hash"
    assert verify_password(password, DUMMY_HASH) is False

    # Test with an empty password
    assert verify_password("", DUMMY_HASH) is False

    # Test with a different password
    assert verify_password("another_random_password", DUMMY_HASH) is False

    # Ensure it doesn't raise an error for a valid hash format but incorrect password
    # (The DUMMY_HASH is a valid Argon2 hash of a random string)
    assert verify_password("the_actual_password_for_dummy_hash", DUMMY_HASH) is False
    # Note: We don't know the actual password for DUMMY_HASH, but the point is
    # that any *attempt* to verify against it should return False for security.