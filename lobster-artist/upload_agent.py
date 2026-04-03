"""Upload Agent — 上傳設計圖到龍蝦藝術網"""

import json
import httpx
import os


LOBSTER_API_URL = os.environ.get("LOBSTER_API_URL", "https://ls-site-seven.vercel.app")
LOBSTER_API_KEY = os.environ.get("LOBSTER_API_KEY", "")


def upload_design(
    image_path: str,
    title: str,
    title_en: str = "",
    description: str = "",
    tags: list[str] = [],
    price: int = 1280,
    ai_metadata: dict = {}
) -> dict:
    """上傳設計圖到龍蝦藝術網 API

    API 欄位對應：
      - title: 商品名稱
      - description: 商品描述
      - price: 售價（整數 NT$）
      - tags: JSON array string，如 '["street","minimal"]'
      - source: "lobster"（龍蝦 Agent 上傳）
      - ai_metadata: JSON string，記錄生成資訊
      - design_image: 設計圖檔案（PNG）
    """

    if not LOBSTER_API_KEY:
        raise ValueError("LOBSTER_API_KEY 環境變數未設定")

    headers = {
        "Authorization": f"Bearer {LOBSTER_API_KEY}"
    }

    # 組合描述（中英文名稱 + 描述）
    full_description = description
    if title_en:
        full_description = f"{title_en}\n\n{description}" if description else title_en

    with open(image_path, "rb") as f:
        files = {
            "design_image": (os.path.basename(image_path), f, "image/png")
        }
        data = {
            "title": title,
            "description": full_description,
            "price": str(price),
            "tags": json.dumps(tags),
            "source": "lobster",
            "ai_metadata": json.dumps(ai_metadata) if ai_metadata else "",
        }

        response = httpx.post(
            f"{LOBSTER_API_URL}/api/products",
            headers=headers,
            files=files,
            data=data,
            timeout=60.0
        )

    if response.status_code == 201:
        result = response.json()
        print(f"  上傳成功: {result['id']} — {title}")
        return result
    else:
        print(f"  上傳失敗 ({response.status_code}): {response.text}")
        raise Exception(f"Upload failed: {response.status_code} — {response.text}")
