from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME")

if not MONGO_URL:
    raise ValueError("MONGODB_URL is not set in the .env file")

if not DATABASE_NAME:
    raise ValueError("DATABASE_NAME is not set in the .env file")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DATABASE_NAME]