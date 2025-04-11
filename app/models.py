from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime

Base = declarative_base()

class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, index=True)
    config = Column(Text)
    status = Column(String, default="starting")
    start_time = Column(DateTime, default=datetime.now)
    end_time = Column(DateTime, nullable=True)
    total_requests = Column(Integer, default=0)
    successful_requests = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    average_tps = Column(Float, default=0.0)
    peak_tps = Column(Float, default=0.0)
    p95_latency = Column(Float, default=0.0)

class MetricPoint(Base):
    __tablename__ = "metric_points"

    id = Column(Integer, primary_key=True, index=True)
    benchmark_run_id = Column(Integer, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    tokens_per_second = Column(Float, default=0.0)
    requests_per_second = Column(Float, default=0.0)
    latency = Column(Float, default=0.0)
    gpu_utilization = Column(Float, default=0.0)
    gpu_memory = Column(Float, default=0.0)
    gpu_temperature = Column(Float, default=0.0)

