import pytest
from unittest.mock import MagicMock, patch

from sqlmodel import select

from app.backend_pre_start import init, logger


def test_init_db_connection_success():
    """
    Verifies that init() successfully connects to the database
    when the session.exec() call is successful.
    """
    mock_engine = MagicMock()
    mock_session_instance = MagicMock()
    # Configure session.exec() to return a mock result, simulating a successful query
    mock_session_instance.exec.return_value = MagicMock()

    # Patch sqlmodel.Session as it's imported in backend_pre_start.py
    # Also patch the logger.error method to assert its call status
    with patch("app.backend_pre_start.Session", return_value=mock_session_instance) as mock_session_class, \
         patch.object(logger, "error") as mock_logger_error:
        
        init(mock_engine)

        # Assert that Session was instantiated with the provided engine
        mock_session_class.assert_called_once_with(mock_engine)
        # Assert that session.exec() was called with the expected query
        mock_session_instance.exec.assert_called_once_with(select(1))
        # Assert that no error was logged
        mock_logger_error.assert_not_called()


def test_init_db_connection_failure():
    """
    Verifies that init() raises an exception and logs an error
    when the database connection fails (session.exec() raises an exception).
    """
    mock_engine = MagicMock()
    mock_session_instance = MagicMock()
    # Configure session.exec() to raise an exception, simulating a DB connection failure
    db_error = Exception("Simulated database connection error")
    mock_session_instance.exec.side_effect = db_error

    # Patch sqlmodel.Session and logger.error
    with patch("app.backend_pre_start.Session", return_value=mock_session_instance) as mock_session_class, \
         patch.object(logger, "error") as mock_logger_error:
        
        # Assert that init() raises the expected exception
        with pytest.raises(Exception) as excinfo:
            init(mock_engine)

        # Assert that Session was instantiated with the provided engine
        mock_session_class.assert_called_once_with(mock_engine)
        # Assert that session.exec() was called with the expected query
        mock_session_instance.exec.assert_called_once_with(select(1))
        # Assert that the error was logged
        mock_logger_error.assert_called_once_with(db_error)
        # Assert the type and message of the raised exception
        assert excinfo.type is Exception
        assert str(excinfo.value) == str(db_error)