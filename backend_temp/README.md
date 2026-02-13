backend/
├────.env
├────.gitignore
├────app.py
├────src/
│    ├────__init__.py
│    ├────config.py
│    ├────extensions.py


# 資料庫
uv run flask db init 建立資料庫的施工圖

uv run flask db migrate -m "描述你改了什麼"
# 例如: uv run flask db migrate -m "add email column"

uv run flask db upgrade

flask create-admin root_admin password123

uv run flask create-admin root_admin mhgV3X2RnXPPoNxEhBRdjcuYCFdc4UJjI8/iXW37waM=

```bash
$body = @{
    username = "root_admin"
    password = "mhgV3X2RnXPPoNxEhBRdjcuYCFdc4UJjI8/iXW37waM="
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json"
```
