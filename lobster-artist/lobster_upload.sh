#!/bin/bash

# ============================================
# 🦞 龍蝦藝術家 - 自動生成並上傳腳本
# KIE Seedream 生圖 → 下載 → 上傳龍蝦藝術網
#
# 用法：
#   ./lobster_upload.sh                    # 跑預設 3 張
#   ./lobster_upload.sh -n 5              # 跑 5 張
#   ./lobster_upload.sh -s street         # 指定街頭風格
#   ./lobster_upload.sh -n 3 -s japanese  # 3 張日系風格
# ============================================

set -euo pipefail

# ===== 設定（環境變數優先，否則用預設值）=====
KIE_API_KEY="${KIE_API_KEY:?請設定 KIE_API_KEY 環境變數}"
KIE_API_URL="https://api.kie.ai/api/v1/jobs"
LOBSTER_API_URL="${LOBSTER_API_URL:-https://ls-site-seven.vercel.app/api/products}"
LOBSTER_TOKEN="${LOBSTER_API_KEY:?請設定 LOBSTER_API_KEY 環境變數}"
OUTPUT_DIR="./lobster_output"
LOG_DIR="./logs"

# ===== 參數解析 =====
COUNT=3
STYLE=""
PRICE=1280

while getopts "n:s:p:" opt; do
    case $opt in
        n) COUNT=$OPTARG ;;
        s) STYLE=$OPTARG ;;
        p) PRICE=$OPTARG ;;
        *) echo "用法: $0 [-n 數量] [-s 風格] [-p 價格]"; exit 1 ;;
    esac
done

mkdir -p "$OUTPUT_DIR" "$LOG_DIR"

# ===== 風格 Prompt 前綴 =====
declare -A STYLE_PREFIX
STYLE_PREFIX[japanese]="Japanese ukiyo-e style illustration, traditional woodblock print aesthetic,"
STYLE_PREFIX[street]="Urban street art style, graffiti-inspired, bold graphic, spray paint texture,"
STYLE_PREFIX[minimal]="Minimalist line art, single continuous line drawing, elegant simplicity,"
STYLE_PREFIX[illustration]="Hand-drawn illustration style, whimsical character design, storybook quality,"
STYLE_PREFIX[retro]="Retro vintage style, 70s-80s aesthetic, nostalgic color palette,"
STYLE_PREFIX[nature]="Nature-inspired art, botanical illustration meets modern design,"
STYLE_PREFIX[abstract]="Abstract modern art, geometric shapes and organic forms, contemporary style,"
STYLE_PREFIX[typography]="Typographic art, creative lettering, text as visual element,"

PROMPT_SUFFIX="centered composition, pure design for apparel print, no text, no logo, no words, white background, highly detailed, 1024x1024, PNG"

# ===== 主題庫 =====
JAPANESE_THEMES=("koi fish swimming in circle" "samurai warrior with katana" "dragon among clouds" "crane flying over waves" "cherry blossom branch" "oni mask with flowers" "daruma doll" "tanuki with umbrella" "mount fuji at sunset" "geisha silhouette")
STREET_THEMES=("skull with roses" "boombox with music notes" "sneaker with wings" "graffiti wildcat" "masked character" "skateboard with flames" "neon cityscape" "pixel art arcade" "spray can character" "breakdancer")
MINIMAL_THEMES=("cat face portrait" "mountain landscape" "coffee cup steam" "bicycle" "plant in pot" "geometric fox" "moon phases" "abstract hand" "wave line" "eye detail")
ILLUSTRATION_THEMES=("whale in space" "mushroom forest" "robot gardening" "fox reading books" "octopus chef" "bear astronaut" "owl librarian" "penguin adventure" "cat wizard" "sloth on cloud")
RETRO_THEMES=("sunset palm trees" "retro car" "vinyl record" "roller skates" "arcade machine" "cassette tape" "vintage TV" "surf culture" "space rocket" "diner neon sign")
NATURE_THEMES=("monstera leaves" "coral reef" "butterfly collection" "mushroom varieties" "wildflower bouquet" "crystal formation" "feather arrangement" "cactus garden" "moth and moon" "tree rings")
ABSTRACT_THEMES=("overlapping circles" "fluid marble" "color blocks" "wave patterns" "spiral forms" "fragmented geometry" "dot matrix" "brushstroke explosion" "topographic lines" "color gradient")
TYPOGRAPHY_THEMES=("kanji calligraphy" "stacked letters" "letter portrait" "graffiti lettering" "pixel font art" "3D text illusion" "deconstructed alphabet" "word art spiral" "bold type block" "script flow")

# ===== 函數：隨機選一個風格 =====
random_style() {
    local styles=("japanese" "street" "minimal" "illustration" "retro" "nature" "abstract" "typography")
    echo "${styles[$((RANDOM % ${#styles[@]}))]}"
}

# ===== 函數：根據風格隨機選主題 =====
random_theme() {
    local style=$1
    local themes
    case $style in
        japanese) themes=("${JAPANESE_THEMES[@]}") ;;
        street) themes=("${STREET_THEMES[@]}") ;;
        minimal) themes=("${MINIMAL_THEMES[@]}") ;;
        illustration) themes=("${ILLUSTRATION_THEMES[@]}") ;;
        retro) themes=("${RETRO_THEMES[@]}") ;;
        nature) themes=("${NATURE_THEMES[@]}") ;;
        abstract) themes=("${ABSTRACT_THEMES[@]}") ;;
        typography) themes=("${TYPOGRAPHY_THEMES[@]}") ;;
        *) themes=("${JAPANESE_THEMES[@]}") ;;
    esac
    echo "${themes[$((RANDOM % ${#themes[@]}))]}"
}

# ===== 函數：生成中文標題 =====
generate_title() {
    local theme=$1
    # 簡單的主題→中文對照
    echo "$theme" | sed \
        -e 's/koi fish swimming in circle/錦鯉迴旋/' \
        -e 's/samurai warrior with katana/武士之魂/' \
        -e 's/dragon among clouds/雲中龍/' \
        -e 's/crane flying over waves/鶴舞浪間/' \
        -e 's/cherry blossom branch/櫻花枝/' \
        -e 's/oni mask with flowers/鬼面花/' \
        -e 's/daruma doll/達摩不倒翁/' \
        -e 's/mount fuji at sunset/富士夕照/' \
        -e 's/skull with roses/骷髏玫瑰/' \
        -e 's/boombox with music notes/音爆/' \
        -e 's/sneaker with wings/飛翼球鞋/' \
        -e 's/whale in space/星際鯨魚/' \
        -e 's/mushroom forest/蘑菇森林/' \
        -e 's/robot gardening/園藝機器人/' \
        -e 's/fox reading books/閱讀狐狸/' \
        -e 's/octopus chef/章魚大廚/' \
        -e 's/monstera leaves/龜背芋/' \
        -e 's/coral reef/珊瑚礁/' \
        -e 's/butterfly collection/蝶之標本/' \
        -e 's/overlapping circles/圓之交響/' \
        -e 's/fluid marble/流體大理石/' \
        -e "s/.*/$theme/"  # fallback: 用英文
}

# ===== 函數：KIE 建立生成任務 =====
kie_create() {
    local prompt="$1"
    local response
    response=$(curl -s -X POST "${KIE_API_URL}/createTask" \
        -H "Authorization: Bearer $KIE_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"model\": \"seedream/4.5-text-to-image\",
            \"input\": {
                \"prompt\": \"$prompt\",
                \"aspect_ratio\": \"1:1\",
                \"quality\": \"basic\"
            }
        }")

    local task_id
    task_id=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['taskId'])" 2>/dev/null)

    if [ -z "$task_id" ]; then
        echo "ERROR: $response" >&2
        return 1
    fi
    echo "$task_id"
}

# ===== 函數：KIE 輪詢結果 =====
kie_poll() {
    local task_id="$1"
    local max=60
    local i=0

    while [ $i -lt $max ]; do
        local response
        response=$(curl -s "${KIE_API_URL}/recordInfo?taskId=${task_id}" \
            -H "Authorization: Bearer $KIE_API_KEY")

        local state
        state=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['state'])" 2>/dev/null || echo "unknown")

        if [ "$state" = "success" ]; then
            local url
            url=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; r=json.loads(d['resultJson']); print(r['resultUrls'][0])" 2>/dev/null)
            echo "$url"
            return 0
        elif [ "$state" = "failed" ]; then
            echo "FAILED" >&2
            return 1
        fi

        printf "   ⏳ %s (%d/%d)\r" "$state" "$((i+1))" "$max" >&2
        i=$((i + 1))
        sleep 5
    done

    echo "TIMEOUT" >&2
    return 1
}

# ===== 函數：上傳到龍蝦藝術網 =====
lobster_upload() {
    local image="$1" title="$2" desc="$3" style="$4"
    curl -s -X POST "$LOBSTER_API_URL" \
        -H "Authorization: Bearer $LOBSTER_TOKEN" \
        -F "title=$title" \
        -F "description=$desc" \
        -F "price=$PRICE" \
        -F "tags=[\"$style\"]" \
        -F "source=lobster" \
        -F "design_image=@$image"
}

# ===== 主流程 =====
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/run_${TIMESTAMP}.log"

echo ""
echo "============================================"
echo "🦞 龍蝦藝術家 啟動"
echo "   數量: $COUNT | 風格: ${STYLE:-隨機} | 售價: NT\$$PRICE"
echo "   時間: $(date '+%Y-%m-%d %H:%M')"
echo "============================================"
echo ""

SUCCESS=0
FAILED=0

for i in $(seq 1 $COUNT); do
    # 選風格和主題
    current_style="${STYLE:-$(random_style)}"
    theme=$(random_theme "$current_style")
    title=$(generate_title "$theme")
    prefix="${STYLE_PREFIX[$current_style]}"
    prompt="${prefix} ${theme}, ${PROMPT_SUFFIX}"
    filename="design_${TIMESTAMP}_${i}.png"

    echo "--- [$i/$COUNT] $title ($current_style) ---"
    echo "   主題: $theme"

    # Step 1: 建立任務
    echo "   📤 KIE 生成中..."
    task_id=$(kie_create "$prompt") || { echo "   ❌ 建立任務失敗"; FAILED=$((FAILED+1)); continue; }
    echo "   Task: $task_id"

    # Step 2: 等待結果
    image_url=$(kie_poll "$task_id") || { echo "   ❌ 生成失敗"; FAILED=$((FAILED+1)); continue; }
    echo "   🖼️ 生成完成"

    # Step 3: 下載
    curl -s -L -o "${OUTPUT_DIR}/${filename}" "$image_url"
    local_size=$(wc -c < "${OUTPUT_DIR}/${filename}")
    echo "   📥 已下載 (${local_size} bytes)"

    # Step 4: 上傳
    echo "   🦞 上傳中..."
    result=$(lobster_upload "${OUTPUT_DIR}/${filename}" "$title" "${prefix} ${theme}" "$current_style")
    mockups=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('mockups',0))" 2>/dev/null || echo "?")
    echo "   ✅ 上傳成功！Mockup: ${mockups} 張"

    SUCCESS=$((SUCCESS+1))

    # 記錄 log
    echo "{\"title\":\"$title\",\"style\":\"$current_style\",\"theme\":\"$theme\",\"taskId\":\"$task_id\"}" >> "$LOG_FILE"

    sleep 2
done

echo ""
echo "============================================"
echo "🦞 完成！成功: $SUCCESS | 失敗: $FAILED"
echo "============================================"
echo ""
echo "下一步："
echo "  1. 到後台審核: https://ls-site-seven.vercel.app/admin/review"
echo "  2. 帳號: admin / changeme"
echo "  3. 好的點「上架」，不好的點「退回」"
echo ""
echo "📋 Log: $LOG_FILE"
echo "🖼️ 圖片: $OUTPUT_DIR/"
