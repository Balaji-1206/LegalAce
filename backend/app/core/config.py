from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URL: str
    DATABASE_NAME: str

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o"

    # Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # FAISS / Law Corpus
    FAISS_INDEX_PATH: str = "faiss_index"
    LAW_CORPUS_PATH: str = "data/indian_law_corpus.json"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
