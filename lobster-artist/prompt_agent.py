"""Prompt Agent — 根據風格庫生成設計 prompt"""

import json
import random
from datetime import datetime
from anthropic import Anthropic

client = Anthropic()


def load_styles():
    with open("styles.json") as f:
        return json.load(f)["styles"]


def generate_prompt(style_id: str = None) -> dict:
    """生成一個設計 prompt，回傳結構化資料"""
    styles = load_styles()

    # 選風格：指定或隨機
    if style_id:
        style = next(s for s in styles if s["id"] == style_id)
    else:
        style = random.choice(styles)

    # 選主題和色調
    theme = random.choice(style["themes"])
    color_mood = random.choice(style["color_moods"])

    # 用 Claude 生成完整、有創意的 prompt
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": f"""你是一個 T-shirt 設計的 AI 藝術總監。
請根據以下條件生成一個圖片生成 prompt（英文），用於 Flux Pro 模型。

風格：{style["name"]}
主題：{theme}
色調：{color_mood}

要求：
1. Prompt 必須是英文
2. 設計適合印在 T-shirt 上（構圖集中、背景乾淨）
3. 加入 2-3 個創意細節讓設計獨特
4. 整體 prompt 控制在 80 字以內

同時幫設計取一個中文名字和英文名字。

回傳格式（純 JSON，不要 markdown）：
{{"prompt": "...", "title_zh": "...", "title_en": "...", "description": "..."}}"""
        }]
    )

    result = json.loads(response.content[0].text)

    # 組合完整 prompt
    full_prompt = f"{style['prompt_prefix']} {result['prompt']} {style['prompt_suffix']}"

    return {
        "full_prompt": full_prompt,
        "title_zh": result["title_zh"],
        "title_en": result["title_en"],
        "description": result.get("description", ""),
        "style_id": style["id"],
        "theme": theme,
        "color_mood": color_mood,
        "timestamp": datetime.now().isoformat()
    }
