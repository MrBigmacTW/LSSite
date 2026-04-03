"""Image Agent — 呼叫 Flux Pro 生成設計圖"""

import replicate
import httpx
import os
from datetime import datetime
from pathlib import Path


def generate_image(prompt: str, output_dir: str = "./outputs") -> str:
    """呼叫 Flux Pro 生成設計圖，回傳本地檔案路徑"""

    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # 呼叫 Flux Pro via Replicate
    output = replicate.run(
        "black-forest-labs/flux-1.1-pro",
        input={
            "prompt": prompt,
            "width": 1024,
            "height": 1024,
            "num_inference_steps": 28,
            "guidance_scale": 3.5,
            "output_format": "png",
            "output_quality": 100,
        }
    )

    # output 是一個 URL（或 FileOutput），下載圖片
    image_url = output if isinstance(output, str) else str(output)

    response = httpx.get(image_url)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"design_{timestamp}.png"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "wb") as f:
        f.write(response.content)

    print(f"  圖片已儲存: {filepath} ({len(response.content) // 1024} KB)")
    return filepath
