/**
 * POC 固定模板：白 T 正面置中
 * 模板底圖：public/templates/short_sleeve_front_white.png
 *
 * printArea 座標需依實際模板尺寸調整。
 * 這裡是「合理猜測」的初版，第一次測試後再校正。
 *
 * 假設模板圖約 1200x1500，胸口印製區置中：
 *   x = 400, y = 380, width = 400, height = 500
 */

export const POC_WHITE_TEE_TEMPLATE = {
  slug: "poc_short_sleeve_white_front",
  imagePath: "/templates/short_sleeve_front_white.png",
  printArea: {
    x: 400,
    y: 380,
    width: 400,
    height: 500,
  },
};
