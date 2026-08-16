import type { AxisDef, AxisType, Quadrants } from '../types'

export interface Template {
  id: string
  name: string
  emoji: string
  tagline: string
  axisType: AxisType
  axes: { x: AxisDef; y?: AxisDef }
  quadrants?: Quadrants
  gameMode?: boolean
  cards: { label: string; description?: string }[]
}

const EMPTY_AXIS: AxisDef = { label: '', minLabel: '', maxLabel: '' }

/**
 * 並び順は系統ごとに隣り合うように:
 * ゲーム系 (2) → 日常系 (5) → ビジネス系 (2) の計9種
 */
export const TEMPLATES: Template[] = [
  /* ---- ゲーム系 ---- */
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
  /* ---- ゲームモード系 (ito 風: 主観の感覚をすり合わせるお題) ---- */
  {
    id: 'strongest-animal',
    name: '最強動物決定戦',
    emoji: '🦁',
    tagline: '素手のタイマンで最強はどれ? 直感の「強さ」の感覚をすり合わせる',
    axisType: '1d',
    gameMode: true,
    axes: { x: { label: '強さ', minLabel: '弱い', maxLabel: '強い' } },
    cards: [
      { label: 'ゴリラ' },
      { label: 'ヒグマ' },
      { label: 'ライオン' },
      { label: 'カバ' },
      { label: 'ワニ' },
      { label: 'オオカミ' },
      { label: 'イノシシ' },
      { label: 'カンガルー' },
      { label: 'ダチョウ' },
      { label: 'アナコンダ' },
      { label: '猛牛' },
      { label: '人間 (格闘家)' },
    ],
  },
  {
    id: 'motehou',
    name: 'モテると思う行動',
    emoji: '💘',
    tagline: 'どの行動がいちばんモテる? 恋愛観の個人差があらわになる定番お題',
    axisType: '1d',
    gameMode: true,
    axes: { x: { label: 'モテ度', minLabel: 'モテない', maxLabel: 'モテる' } },
    cards: [
      { label: 'さりげなく車道側を歩く' },
      { label: '手料理をふるまう' },
      { label: '店員さんに丁寧' },
      { label: '字がきれい' },
      { label: '動物に好かれる' },
      { label: '筋トレが日課' },
      { label: '早起きで朝活' },
      { label: '傘をさっと差し出す' },
      { label: '会計がスマート' },
      { label: '笑顔で聞き上手' },
      { label: 'カラオケがうまい' },
      { label: '方向音痴' },
    ],
  },
  {
    id: 'shiawase',
    name: '幸せを感じる瞬間',
    emoji: '🍀',
    tagline: '小さな幸せ、どれがいちばん大きい? 幸福の感覚をすり合わせる',
    axisType: '1d',
    gameMode: true,
    axes: { x: { label: '幸福度', minLabel: '小さい', maxLabel: '大きい' } },
    cards: [
      { label: '布団に入った瞬間' },
      { label: '給料日' },
      { label: '揚げたてのポテト' },
      { label: '湯船に浸かる' },
      { label: '金曜日の夜' },
      { label: '二度寝' },
      { label: '推しの新情報' },
      { label: '旅行の前夜' },
      { label: '猫を撫でる' },
      { label: '探し物が見つかる' },
      { label: 'おろしたての靴下' },
      { label: '誰もいない家' },
    ],
  },

  /* ---- 日常系 ---- */
  {
    id: 'moving',
    name: '引っ越し先の条件',
    emoji: '🏠',
    tagline: '次の住まい、何を優先する? 全部は叶わないから優先度を揃える',
    axisType: '1d',
    axes: { x: { label: '優先度', minLabel: '低い', maxLabel: '高い' } },
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
    id: 'travel',
    name: '旅行プランの優先度',
    emoji: '✈️',
    tagline: '次の旅行、何を優先する? やりたいこと×費用で全員の理想を見える化',
    axisType: '2d',
    axes: {
      x: { label: 'やりたい度', minLabel: '低い', maxLabel: '高い' },
      y: { label: '費用・手間', minLabel: '小さい', maxLabel: '大きい' },
    },
    cards: [
      { label: '温泉' },
      { label: 'グルメ・名物料理' },
      { label: '観光名所めぐり' },
      { label: '自然・絶景' },
      { label: 'テーマパーク' },
      { label: 'ショッピング' },
      { label: 'のんびり滞在' },
      { label: 'アクティビティ体験' },
      { label: '美術館・博物館' },
      { label: '夜景・ナイトライフ' },
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

  /* ---- ビジネス系 ---- */
  {
    id: 'swot',
    name: 'SWOT分析',
    emoji: '📊',
    tagline: '事業や組織の要素を 強み/弱み/機会/脅威 の4象限へ仕分けする定番フレームワーク (カードは編集して使ってください)',
    axisType: '2d',
    axes: { x: EMPTY_AXIS, y: EMPTY_AXIS },
    quadrants: { tl: '強み', tr: '弱み', bl: '機会', br: '脅威' },
    cards: [
      { label: '技術力' },
      { label: 'ブランド認知' },
      { label: '顧客基盤' },
      { label: '資金力' },
      { label: '開発スピード' },
      { label: '市場の成長性' },
      { label: '競合の動き' },
      { label: '規制の変化' },
      { label: '人材確保' },
      { label: '価格競争' },
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
]

export function getTemplate(id: string | null | undefined): Template | undefined {
  return TEMPLATES.find((t) => t.id === id)
}
