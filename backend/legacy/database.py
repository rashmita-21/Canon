from sqlalchemy import create_engine, Column, String, Integer, Text, JSON, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./canon.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class FactModel(Base):
    __tablename__ = "facts"
    id = Column(String, primary_key=True, index=True)
    fact = Column(String, nullable=False)
    value = Column(String, nullable=False)
    source = Column(String, nullable=False)
    owner = Column(String, nullable=False)
    validUntil = Column(String, nullable=False)
    status = Column(String, nullable=False)

class SavedItemModel(Base):
    __tablename__ = "saved_items"
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    intent = Column(String, nullable=True)
    channel = Column(String, nullable=False)
    author = Column(String, nullable=False)
    status = Column(String, nullable=False)
    version = Column(Integer, default=1)
    dependsOnFactIds = Column(JSON, default=list)
    findings = Column(JSON, default=list)
    revisions = Column(JSON, default=list)
    comments = Column(JSON, default=list)
    updatedAt = Column(String, nullable=False)

def init_db():
    Base.metadata.create_all(bind=engine)