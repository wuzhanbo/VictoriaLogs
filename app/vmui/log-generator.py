#!/usr/bin/env python3
import json
import time
import random
import sys
from datetime import datetime, timezone

LOG_FILE = sys.argv[1] if len(sys.argv) > 1 else "/tmp/app-logs.json"

LEVELS = ["DEBUG", "INFO", "WARN", "ERROR"]
SERVICES = ["api-gateway", "auth-service", "payment-service", "notification-service", "user-service"]
MESSAGES = [
    "User login successful",
    "Database query executed",
    "Cache miss for key",
    "Request processed",
    "Connection established",
    "Payment processed",
    "Email sent",
    "Invalid token received",
    "Rate limit exceeded",
    "Service health check passed",
]

# Realistic field names without number suffixes
REQUEST_FIELDS = ["headers", "body", "params", "query", "path", "method", "ip", "userAgent", "referrer"]
RESPONSE_FIELDS = ["status", "body", "headers", "size", "duration"]
METADATA_FIELDS = ["traceId", "spanId", "parentId", "sampled", "source", "environment", "version"]
USER_FIELDS = ["id", "name", "email", "role", "department", "tenant"]
DATABASE_FIELDS = ["query", "table", "rows", "duration", "connection"]
ERROR_FIELDS = ["type", "stack", "message", "code", "details"]

def generate_nested_object(field_type="request", depth=0, max_depth=4):
    """Generate nested JSON structure with realistic field names"""
    if depth >= max_depth:
        return random.choice([
            random.randint(1, 10000),
            round(random.random() * 1000, 2),
            random.choice(["active", "inactive", "pending", "completed", "failed"]),
            random.choice([True, False]),
            None
        ])
    
    if field_type == "request":
        fields = REQUEST_FIELDS
    elif field_type == "response":
        fields = RESPONSE_FIELDS
    elif field_type == "metadata":
        fields = METADATA_FIELDS
    elif field_type == "user":
        fields = USER_FIELDS
    elif field_type == "database":
        fields = DATABASE_FIELDS
    elif field_type == "error":
        fields = ERROR_FIELDS
    else:
        fields = ["data", "info", "details", "config"]
    
    result = {}
    for field in random.sample(fields, min(len(fields), random.randint(2, 4))):
        result[field] = generate_nested_object(field, depth + 1, max_depth)
    
    return result

def generate_message_object():
    """Generate a JSON string for the message field"""
    return json.dumps({
        "text": random.choice(MESSAGES),
        "type": random.choice(["info", "warn", "error", "debug"]),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request": generate_nested_object("request", 0, 3),
        "response": generate_nested_object("response", 0, 3),
        "metadata": generate_nested_object("metadata", 0, 3),
        "user": generate_nested_object("user", 0, 2),
        "details": {
            "code": random.randint(100, 999),
            "module": random.choice(["auth", "payment", "api", "db", "cache"]),
            "action": random.choice(["read", "write", "delete", "update"]),
            "result": random.choice(["success", "failure", "pending"]),
            "data": generate_nested_object("data", 0, 2)
        }
    })

def generate_log_entry():
    """Generate a log entry with nested message field"""
    
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": random.choice(LEVELS),
        "service": random.choice(SERVICES),
        "message": generate_message_object(),  # Nested JSON as message
        "user_id": random.randint(1, 10000),
        "request_id": f"req-{int(time.time())}-{random.randint(10000, 99999)}",
        "duration_ms": round(random.random() * 500, 2),
        "status_code": random.choice([200, 201, 400, 401, 500])
    }
    
    return entry

print(f"Generating logs to {LOG_FILE} with nested JSON in message field...")

while True:
    entry = generate_log_entry()
    
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")
    
    print(f"Generated: {json.dumps(entry)[:150]}...")
    time.sleep(2)
