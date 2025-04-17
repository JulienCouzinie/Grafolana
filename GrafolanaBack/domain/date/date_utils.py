import datetime

def unix_to_rfc3339(timestamp: int) -> str:
    return datetime.datetime.fromtimestamp(timestamp / 1000, datetime.timezone.utc).isoformat()

def rfc3339_to_unix_ms(timestamp: str) -> int:
    dt = datetime.datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
    return int(dt.timestamp() * 1000)