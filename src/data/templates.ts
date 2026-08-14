import type { AxisDef, AxisType } from '../types'

export interface Template {
  id: string
  name: string
  emoji: string
  tagline: string
  axisType: AxisType
  axes: { x: AxisDef; y?: AxisDef }
  cards: { label: string; description?: string }[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'nasa',
    name: 'NASAゲーム',
    emoji: '🌕',
    tagline: '月面に不時着。母船まで320km、持っていく物資の優先度は?',
    axisType: '1d',
    axes: { x: { label: '優先度', minLabel: '低い', maxLabel: '高い' } },
    cards: [
      { label: '酸素ボンベ (2本)' },
      { label: '水 (19L)' },
      { label: '宇宙食' },
      { label: '月から見た星座図' },
      { label: 'ソーラー式FM送受信機' },
      { label: 'ナイロンロープ (15m)' },
      { label: '救急箱 (注射針入り)' },
      { label: 'パラシュート (絹製)' },
      { label: '救命いかだ' },
      { label: '磁気コンパス' },
      { label: 'マッチの入った箱' },
      { label: '粉ミルク (1箱)' },
      { label: '携帯用暖房器' },
      { label: '45口径ピストル (2丁)' },
      { label: '照明弾' },
    ],
  },
  {
    id: 'moving',
    name: '引っ越し先の条件',
    emoji: '🏠',
    tagline: '次の住まい、何を優先する? 「譲れない×金で解決できない」が真の制約',
    axisType: '2d',
    axes: {
      x: { label: 'こだわり', minLabel: '妥協できる', maxLabel: '妥協できない' },
      y: { label: '解決手段', minLabel: 'お金で解決できる', maxLabel: 'お金で解決できない' },
    },
    cards: [
      { label: '家賃' },
      { label: '駅からの距離' },
      { label: '築年数' },
      { label: '広さ・間取り' },
      { label: '日当たり' },
      { label: '治安' },
      { label: '周辺の店 (スーパー等)' },
      { label: '通勤・通学時間' },
      { label: '階数' },
      { label: '設備 (バス・トイレ別等)' },
      { label: '騒音の少なさ' },
      { label: 'きれいさ' },
    ],
  },
  {
    id: 'dinner',
    name: '今夜の晩御飯',
    emoji: '🍲',
    tagline: '食べたい気持ちと、作る手間。今夜の落としどころは?',
    axisType: '2d',
    axes: {
      x: { label: '食べたい度', minLabel: '低い', maxLabel: '高い' },
      y: { label: '手間・コスト', minLabel: '小さい', maxLabel: '大きい' },
    },
    cards: [
      { label: 'カレー' },
      { label: '寿司' },
      { label: '焼肉' },
      { label: 'ラーメン' },
      { label: 'パスタ' },
      { label: '鍋' },
      { label: '餃子' },
      { label: 'ハンバーグ' },
      { label: '刺身と味噌汁' },
      { label: 'テイクアウトピザ' },
    ],
  },
  {
    id: 'island',
    name: '無人島サバイバル',
    emoji: '🏝️',
    tagline: '漂流して無人島へ。救助まで1週間、持ち物の優先度は?',
    axisType: '1d',
    axes: { x: { label: '優先度', minLabel: '低い', maxLabel: '高い' } },
    cards: [
      { label: 'ナイフ' },
      { label: 'ライター' },
      { label: '手鏡' },
      { label: 'ロープ (20m)' },
      { label: 'ブルーシート' },
      { label: '釣り道具' },
      { label: '鍋' },
      { label: '懐中電灯' },
      { label: '救急セット' },
      { label: '虫除けスプレー' },
      { label: 'ホイッスル' },
      { label: '双眼鏡' },
    ],
  },
  {
    id: 'backlog',
    name: '機能優先度マトリクス',
    emoji: '🧭',
    tagline: 'ユーザー価値×実装コストで次に作る機能を合意する (カードは編集して使ってください)',
    axisType: '2d',
    axes: {
      x: { label: 'ユーザー価値', minLabel: '低い', maxLabel: '高い' },
      y: { label: '実装コスト', minLabel: '低い', maxLabel: '高い' },
    },
    cards: [
      { label: '検索機能' },
      { label: 'ダークモード' },
      { label: 'プッシュ通知' },
      { label: 'CSVエクスポート' },
      { label: 'モバイル対応' },
      { label: '多言語対応' },
      { label: 'オンボーディング改善' },
      { label: 'パフォーマンス改善' },
    ],
  },
  {
    id: 'workstyle',
    name: '働き方の価値観',
    emoji: '⚖️',
    tagline: '「重要なのに満たされていない」象限にチームの課題が浮かぶ',
    axisType: '2d',
    axes: {
      x: { label: '重要度', minLabel: '低い', maxLabel: '高い' },
      y: { label: '現状の満足度', minLabel: '低い', maxLabel: '高い' },
    },
    cards: [
      { label: '給与・待遇' },
      { label: '裁量・自由度' },
      { label: '成長機会' },
      { label: 'ワークライフバランス' },
      { label: 'チームの雰囲気' },
      { label: '評価の納得感' },
      { label: '仕事の意義' },
      { label: 'リモートワーク' },
      { label: '職場環境・設備' },
      { label: '雇用の安定性' },
    ],
  },
  {
    id: 'bousai',
    name: '防災グッズの優先度',
    emoji: '🎒',
    tagline: '非常持ち出し袋に入れる物、家族で優先度を揃えておく',
    axisType: '1d',
    axes: { x: { label: '優先度', minLabel: '低い', maxLabel: '高い' } },
    cards: [
      { label: '飲料水' },
      { label: '非常食' },
      { label: 'モバイルバッテリー' },
      { label: '現金 (小銭)' },
      { label: '携帯ラジオ' },
      { label: '簡易トイレ' },
      { label: '救急セット' },
      { label: '懐中電灯' },
      { label: '軍手' },
      { label: 'ウェットティッシュ' },
      { label: '毛布・防寒具' },
      { label: 'ホイッスル' },
    ],
  },
]

export function getTemplate(id: string | null | undefined): Template | undefined {
  return TEMPLATES.find((t) => t.id === id)
}
