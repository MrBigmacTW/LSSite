"""Review Agent — Claude Vision 品質初篩（可選）"""

import json
import base64
from anthropic import Anthropic

client = Anthropic()


def review_design(image_path: str) -> dict:
    """用 Claude Vision 初篩設計品質"""

    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_data,
                    },
                },
                {
                    "type": "text",
                    "text": """你是 T-shirt 設計品質審核員。評估這張設計圖是否適合印在 T-shirt 上。

評分標準：
1. 構圖：主體是否集中、適合胸前印刷區域
2. 背景：是否乾淨（白/透明），無雜亂元素
3. 美感：設計是否有吸引力、風格明確
4. 印刷性：色彩對比是否足夠、細節是否太密

回傳純 JSON：
{"pass": true/false, "score": 1-10, "reason": "一句話說明"}"""
                }
            ]
        }]
    )

    return json.loads(response.content[0].text)
