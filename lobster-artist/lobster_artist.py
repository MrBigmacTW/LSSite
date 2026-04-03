#!/usr/bin/env python3
"""
🦞 龍蝦藝術家 — AI 設計圖生成 Pipeline

用法：
  python lobster_artist.py -n 5              # 生 5 張隨機風格
  python lobster_artist.py -n 3 -s japanese  # 生 3 張日系風格
  python lobster_artist.py -n 1 --dry-run    # 只生圖不上傳
  python lobster_artist.py -n 5 --review     # 含 Claude Vision 審核
"""

import json
import os
import argparse
import time
from datetime import datetime
from prompt_agent import generate_prompt
from image_agent import generate_image
from upload_agent import upload_design


def run_pipeline(
    count: int = 5,
    style: str = None,
    skip_review: bool = True,
    dry_run: bool = False,
    price: int = 1280
):
    """執行一輪龍蝦藝術家 pipeline"""

    print(f"\n{'='*60}")
    print(f"🦞 龍蝦藝術家啟動 — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"   產出數量: {count} | 風格: {style or '隨機'} | 審核: {'跳過' if skip_review else '啟用'}")
    print(f"   售價: NT$ {price} | {'DRY RUN 模式' if dry_run else '正式上傳'}")
    print(f"{'='*60}\n")

    results = []

    for i in range(count):
        print(f"\n--- 第 {i+1}/{count} 張 ---")

        try:
            # Step 1: 生成 Prompt
            print("📝 生成設計概念...")
            prompt_data = generate_prompt(style_id=style)
            print(f"   風格: {prompt_data['style_id']}")
            print(f"   名稱: {prompt_data['title_zh']} / {prompt_data['title_en']}")
            print(f"   主題: {prompt_data['theme']} | 色調: {prompt_data['color_mood']}")

            # Step 2: 生成圖片
            print("🎨 生成設計圖...")
            image_path = generate_image(prompt_data["full_prompt"])

            # Step 3: 品質審核（可選）
            if not skip_review:
                print("🔍 品質審核中...")
                from review_agent import review_design
                review = review_design(image_path)
                print(f"   評分: {review['score']}/10 — {review['reason']}")
                if not review["pass"]:
                    print("   ⏭️  品質不足，跳過上傳")
                    results.append({"status": "rejected", **prompt_data, "review": review})
                    continue

            # Step 4: 上傳
            if dry_run:
                print("   🏃 Dry run — 跳過上傳")
                results.append({"status": "dry_run", **prompt_data, "image_path": image_path})
            else:
                print("📤 上傳至龍蝦藝術網...")
                upload_result = upload_design(
                    image_path=image_path,
                    title=prompt_data["title_zh"],
                    title_en=prompt_data["title_en"],
                    description=prompt_data["description"],
                    tags=[prompt_data["style_id"]],
                    price=price,
                    ai_metadata={
                        "prompt": prompt_data["full_prompt"],
                        "model": "flux-1.1-pro",
                        "style": prompt_data["style_id"],
                        "theme": prompt_data["theme"],
                        "color_mood": prompt_data["color_mood"],
                        "generated_at": prompt_data["timestamp"]
                    }
                )
                results.append({"status": "uploaded", **prompt_data, "product_id": upload_result["id"]})

            # 避免 API rate limit
            time.sleep(2)

        except Exception as e:
            print(f"   ❌ 錯誤: {e}")
            results.append({"status": "error", "error": str(e)})

    # 總結
    print(f"\n{'='*60}")
    print(f"🦞 本輪完成！")
    uploaded = len([r for r in results if r["status"] == "uploaded"])
    rejected = len([r for r in results if r["status"] == "rejected"])
    errors = len([r for r in results if r["status"] == "error"])
    dry = len([r for r in results if r["status"] == "dry_run"])
    print(f"   上傳: {uploaded} | 退回: {rejected} | 測試: {dry} | 錯誤: {errors}")
    print(f"{'='*60}\n")

    # 儲存執行記錄
    os.makedirs("logs", exist_ok=True)
    log_file = f"logs/run_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"📋 執行記錄: {log_file}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="🦞 龍蝦藝術家 — AI 設計圖生成 Pipeline")
    parser.add_argument("-n", "--count", type=int, default=5, help="生成數量（預設 5）")
    parser.add_argument("-s", "--style", type=str, help="指定風格 ID（不指定則隨機）")
    parser.add_argument("-p", "--price", type=int, default=1280, help="售價 NT$（預設 1280）")
    parser.add_argument("--review", action="store_true", help="啟用 Claude Vision 審核")
    parser.add_argument("--dry-run", action="store_true", help="只生圖不上傳")
    args = parser.parse_args()

    run_pipeline(
        count=args.count,
        style=args.style,
        skip_review=not args.review,
        dry_run=args.dry_run,
        price=args.price
    )
