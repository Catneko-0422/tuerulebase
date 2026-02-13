import re

def validate_password_strength(password):
    """
    驗證密碼強度：
    1. 長度至少 8 碼
    2. 包含大寫與小寫字母
    """
    if len(password) < 8:
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"[A-Z]", password):
        return False
    return True