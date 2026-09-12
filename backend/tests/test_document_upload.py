import pytest
from app.modules.chatbot.api import ALLOWED_CHAT_DOC_EXTENSIONS, MAX_CHAT_DOC_SIZE
from app.modules.chatbot.document_parser import extract_text_from_file


def test_allowed_chat_document_extensions():
    assert ".pdf" in ALLOWED_CHAT_DOC_EXTENSIONS
    assert ".docx" in ALLOWED_CHAT_DOC_EXTENSIONS
    assert ".txt" in ALLOWED_CHAT_DOC_EXTENSIONS
    assert ".exe" not in ALLOWED_CHAT_DOC_EXTENSIONS
    assert ".bin" not in ALLOWED_CHAT_DOC_EXTENSIONS


def test_max_chat_document_size():
    assert MAX_CHAT_DOC_SIZE == 10 * 1024 * 1024


def test_extract_text_from_txt_file():
    content = "This is a rental agreement contract between tenant and owner.".encode("utf-8")
    extracted = extract_text_from_file("lease.txt", content)
    assert "rental agreement" in extracted
