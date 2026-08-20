import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import type { DriveStep } from 'driver.js'
import { Button, Field, InfoTip, Input, Panel, Spinner } from '../../components/ui'
import { getTemplate } from '../../data/templates'
import { getMyTemplate, saveMyTemplate } from '../../lib/templateStore'
import { createSession } from '../../lib/db'
import { useAuthUid } from '../../lib/firebase'
import { startTour, useTour } from '../../lib/tour'
import { colorAt, hashString, randomId } from '../../lib/utils'
import type { AxisDef, AxisType, Quadrants } from '../../types'

interface CardDraft {
  key: string
  label: string
}

const DEFAULT_X: AxisDef = { label: '優先度', minLabel: '低い', maxLabel: '高い' }
const DEFAULT_Y: AxisDef = { label: '', minLabel: '低い', maxLabel: '高い' }
const EMPTY_AXIS: AxisDef = { label: '', minLabel: '', maxLabel: '' }
const EMPTY_QUAD: Quadrants = { tl: '', tr: '', bl: '', br: '' }

/** UI上のボードタイプ。4象限はデータ上は 2d + quadrants */
type BoardKind = '1d' | '2d' | 'quad'

const CREATE_TOUR: DriveStep[] = [
  {
    popover: {
      title: 'テーマ作成へようこそ',
      description:
        'ここで作るテーマが議論の場になります。作成すると招待URLが発行され、メンバーはログイン不要で参加できます。',
    },
  },
  {
    element: '[data-tour="create-basic"]',
    popover: {
      title: '名前とテーマ',
      description:
        'あなたの表示名と、みんなで合意したい議題を入力します。各項目の i アイコンにも説明があります。',
    },
  },
  {
    element: '[data-tour="create-axis"]',
    popover: {
      title: 'タイプ = ボードの形',
      description:
        '1次元軸は「優先度が高い⇔低い」の一直線、2次元軸は「価値×コスト」のような平面、4象限はSWOT分析のように4つの区画へ仕分けるボードです。',
    },
  },
  {
    element: '[data-tour="create-cards"]',
    popover: {
      title: 'カード = 議論の要素',
      description:
        '参加者はこのカードを軸の上にドラッグして意見を表明します。議論したい要素を1枚ずつ追加してください。',
    },
  },
  {
    element: '[data-tour="create-submit"]',
    popover: {
      title: '作成して招待',
      description: '作成すると招待URLとQRコードが発行されます。あなたはファシリテーターとして進行役になります。',
    },
  },
]

interface Preset {
  heading: string
  tagline?: string
  title: string
  axisType: AxisType
  axes: { x: AxisDef; y?: AxisDef }
  quadrants?: Quadrants
  gameMode?: boolean
  cards: { label: string }[]
  templateId?: string
}

export default function CreatePage() {
  const [params] = useSearchParams()
  const preset = useMemo<Preset | undefined>(() => {
    const template = getTemplate(params.get('template'))
    if (template) {
      return {
        heading: `${template.emoji} ${template.name}`,
        tagline: template.tagline,
        title: template.name,
        axisType: template.axisType,
        axes: template.axes,
        quadrants: template.quadrants,
        gameMode: template.gameMode,
        cards: template.cards,
        templateId: template.id,
      }
    }
    const mine = getMyTemplate(params.get('my'))
    if (mine) {
      return {
        heading: `📌 ${mine.title}`,
        tagline: 'マイテンプレートから作成',
        title: mine.title,
        axisType: mine.axisType,
        axes: mine.axes,
        quadrants: mine.quadrants,
        gameMode: mine.gameMode,
        cards: mine.cards,
      }
    }
    return undefined
  }, [params])
  const uid = useAuthUid()
  const navigate = useNavigate()

  const [name, setName] = useState(() => localStorage.getItem('consensus:name') ?? '')
  const [title, setTitle] = useState(preset?.title ?? '')
  const [boardKind, setBoardKind] = useState<BoardKind>(
    preset ? (preset.quadrants ? 'quad' : preset.axisType) : '1d',
  )
  const [axisX, setAxisX] = useState<AxisDef>(
    preset?.axes.x && preset.axes.x.minLabel ? preset.axes.x : DEFAULT_X,
  )
  const [axisY, setAxisY] = useState<AxisDef>(
    preset?.axes.y && preset.axes.y.minLabel ? preset.axes.y : DEFAULT_Y,
  )
  const [quadrants, setQuadrants] = useState<Quadrants>(preset?.quadrants ?? EMPTY_QUAD)
  const [gameMode, setGameMode] = useState(preset?.gameMode ?? false)
  const [cards, setCards] = useState<CardDraft[]>(() =>
    (preset?.cards ?? [{ label: '' }, { label: '' }, { label: '' }]).map((c) => ({
      key: randomId(6),
      label: c.label,
    })),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState(false)

  useTour('create', () => CREATE_TOUR)

  if (!uid) return <Spinner label="接続中..." />

  const validCards = cards.filter((c) => c.label.trim())
  const quadComplete = [quadrants.tl, quadrants.tr, quadrants.bl, quadrants.br].every((v) =>
    v.trim(),
  )
  const boardOk = boardKind === 'quad' ? quadComplete : Boolean(axisX.minLabel.trim())
  const canSubmit =
    !submitting && name.trim() && title.trim() && validCards.length >= 2 && boardOk
  const canSave = Boolean(title.trim()) && validCards.length >= 2 && boardOk

  // BoardKind をデータモデル (axisType + quadrants) に変換
  const boardConfig = () => ({
    axisType: (boardKind === '1d' ? '1d' : '2d') as AxisType,
    axes:
      boardKind === '2d'
        ? { x: axisX, y: axisY }
        : boardKind === 'quad'
          ? { x: EMPTY_AXIS, y: EMPTY_AXIS }
          : { x: axisX },
    quadrants:
      boardKind === 'quad'
        ? {
            tl: quadrants.tl.trim(),
            tr: quadrants.tr.trim(),
            bl: quadrants.bl.trim(),
            br: quadrants.br.trim(),
          }
        : undefined,
    gameMode,
  })

  const saveAsMyTemplate = () => {
    if (!canSave) return
    saveMyTemplate({
      title: title.trim(),
      ...boardConfig(),
      cards: validCards.map((c) => ({ label: c.label.trim() })),
    })
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2500)
  }

  // 作成ボタンが押せない理由の一覧 (ボタン直上に表示し、クリックで該当箇所へ移動)
  const missing: { key: string; label: string; targetId: string }[] = []
  if (!name.trim())
    missing.push({ key: 'name', label: 'あなたの表示名', targetId: 'field-name' })
  if (!title.trim()) missing.push({ key: 'title', label: 'テーマ名', targetId: 'field-title' })
  if (boardKind === 'quad' && !quadComplete)
    missing.push({ key: 'quad', label: '象限の名前 (4つすべて)', targetId: 'field-axis' })
  if (boardKind !== 'quad' && !axisX.minLabel.trim())
    missing.push({ key: 'axis', label: '軸の両端ラベル', targetId: 'field-axis' })
  if (validCards.length < 2)
    missing.push({
      key: 'cards',
      label: `カードを2枚以上 (現在${validCards.length}枚)`,
      targetId: 'field-cards',
    })

  const jumpTo = (targetId: string) => {
    const el = document.getElementById(targetId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // スクロール後、対象内の最初の「空の」入力欄にフォーカス
    setTimeout(() => {
      const inputs = [...el.querySelectorAll<HTMLInputElement>('input:not([type="checkbox"])')]
      const target = inputs.find((i) => !i.value.trim()) ?? inputs[0]
      target?.focus({ preventScroll: true })
    }, 400)
  }

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      localStorage.setItem('consensus:name', name.trim())
      const id = await createSession(
        {
          title: title.trim(),
          ...boardConfig(),
          cards: validCards.map((c, i) => ({
            id: randomId(8),
            label: c.label.trim(),
            color: colorAt(i),
          })),
          templateId: preset?.templateId,
        },
        uid,
        name.trim(),
        colorAt(hashString(uid)),
      )
      navigate(`/s/${id}`)
    } catch (e) {
      console.error(e)
      setError('作成に失敗しました。通信環境を確認してもう一度お試しください。')
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-up mx-auto max-w-2xl px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="font-display text-lg font-bold">
          ホンネセンサス
        </Link>
        <span className="flex items-center gap-3 text-xs text-ink-faint">
          テーマ作成
          <button
            type="button"
            onClick={() => startTour('create', CREATE_TOUR, true)}
            className="rounded-md border border-ink/15 bg-white/70 px-2 py-1 font-medium text-ink-soft hover:border-ink/40"
          >
            ? 使い方
          </button>
        </span>
      </header>

      <h1 className="font-display text-2xl font-bold">{preset?.heading ?? '新しいテーマ'}</h1>
      {preset?.tagline && <p className="mt-1 text-sm text-ink-soft">{preset.tagline}</p>}

      <div className="mt-6 space-y-6">
        <Panel className="space-y-4 p-5" data-tour="create-basic">
          <div id="field-name">
          <Field
            label="あなたの表示名"
            hint="参加者に表示される名前です"
            tip={
              <>
                開示のときに「誰の意見か」を判別するための名前です。
                ログインは不要で、この名前だけで参加者を区別します。ニックネームでOK。
              </>
            }
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: たろう"
              maxLength={20}
            />
          </Field>
          </div>
          <div id="field-title">
          <Field
            label="テーマ名"
            tip={
              <>
                みんなで合意したい議題です。
                <span className="mt-1 block text-white/70">
                  例:「次のオフサイトの行き先」「新機能の優先順位」「今夜の晩御飯」
                </span>
              </>
            }
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 次のオフサイトの行き先"
              maxLength={60}
            />
          </Field>
          </div>
        </Panel>

        <Panel className="space-y-4 p-5" data-tour="create-axis" id="field-axis">
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink-soft">
            タイプ
            <InfoTip align="left">
              カードをどんなボードに置くかを選びます。
              <span className="mt-1 block text-white/70">1次元軸: 1つの基準で並べる (例: 優先度)</span>
              <AxisExample1D />
              <span className="mt-2 block text-white/70">2次元軸: 2つの基準の平面 (例: 価値 × コスト)</span>
              <AxisExample2D />
              <span className="mt-2 block text-white/70">4象限: 4つの区画に仕分け (例: SWOT分析)</span>
            </InfoTip>
          </span>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { kind: '1d', name: '1次元軸', desc: '1つの基準で並べる', icon: <TypeIcon1D /> },
                { kind: '2d', name: '2次元軸', desc: '2つの基準の平面', icon: <TypeIcon2D /> },
                { kind: 'quad', name: '4象限', desc: 'SWOTなど4区画に仕分け', icon: <TypeIconQuad /> },
              ] as const
            ).map((k) => (
              <button
                key={k.kind}
                type="button"
                onClick={() => setBoardKind(k.kind)}
                aria-pressed={boardKind === k.kind}
                className={`rounded-lg border p-2 text-left transition-colors ${
                  boardKind === k.kind
                    ? 'border-accent bg-white ring-1 ring-accent'
                    : 'border-ink/15 bg-white/60 hover:border-ink/40'
                }`}
              >
                {k.icon}
                <span className="mt-1.5 block text-[13px] font-bold">{k.name}</span>
                <span className="block text-[11px] leading-4 text-ink-soft">{k.desc}</span>
              </button>
            ))}
          </div>

          {boardKind !== 'quad' && (
            <AxisEditor
              title={boardKind === '2d' ? '横軸 (X)' : '軸'}
              axis={axisX}
              onChange={setAxisX}
            />
          )}
          {boardKind === '2d' && <AxisEditor title="縦軸 (Y)" axis={axisY} onChange={setAxisY} />}
          {boardKind === 'quad' && (
            <QuadrantEditor value={quadrants} onChange={setQuadrants} />
          )}
        </Panel>

        <Panel className="p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={gameMode}
              onChange={(e) => setGameMode(e.target.checked)}
              className="mt-1 size-4 accent-accent"
            />
            <span>
              <span className="flex items-center gap-1.5 text-[13px] font-bold">
                🎮 ゲームモード
                <InfoTip align="left">
                  合意ボードを作る代わりに「開示 → 再入力」を繰り返して意見の一致そのものを目指すモードです。
                  終了時に一致度や収束の伸びをスコアとランクで発表します。
                  価値観のすりあわせゲーム (ito など) のような遊び方に向いています。
                </InfoTip>
              </span>
              <span className="mt-0.5 block text-[13px] leading-6 text-ink-soft">
                合意フェーズなし。ラウンドを重ねて全員の感覚の一致を目指し、最後にスコアを発表します
              </span>
            </span>
          </label>
        </Panel>

        <Panel className="p-5" data-tour="create-cards" id="field-cards">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink-soft">
              カード ({validCards.length}枚)
              <InfoTip align="left">
                議論したい要素を1枚ずつカードにします。参加者はこのカードを軸の上に
                ドラッグして自分の意見を表明します。
                <span className="mt-1 block text-white/70">
                  例: テーマ「引っ越し先の条件」なら「家賃」「駅からの距離」「治安」…
                </span>
              </InfoTip>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCards((cs) => [...cs, { key: randomId(6), label: '' }])}
            >
              + 追加
            </Button>
          </div>
          <ul className="space-y-2">
            {cards.map((c, i) => (
              <li key={c.key} className="flex items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: colorAt(i) }}
                  aria-hidden
                />
                <Input
                  value={c.label}
                  onChange={(e) =>
                    setCards((cs) =>
                      cs.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)),
                    )
                  }
                  placeholder={`カード ${i + 1}`}
                  maxLength={30}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="このカードを削除"
                  onClick={() => setCards((cs) => cs.filter((x) => x.key !== c.key))}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-faint">
            議論したい要素を1枚ずつカードにします。2枚以上必要です。
          </p>
        </Panel>

        {error && <p className="text-sm font-medium text-accent-deep">{error}</p>}

        {/* 作成に足りない項目のガイド (クリックで該当フィールドへ移動) */}
        {missing.length > 0 && (
          <div className="rounded-lg border border-accent/30 bg-accent-soft/40 px-4 py-3">
            <p className="text-[13px] font-bold text-accent-deep">
              作成にはあと{missing.length}項目の入力が必要です
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {missing.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => jumpTo(m.targetId)}
                  className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-white px-3 py-1 text-[13px] font-medium text-accent-deep hover:bg-accent-soft"
                >
                  ↑ {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="accent"
            size="lg"
            disabled={!canSubmit}
            onClick={submit}
            data-tour="create-submit"
          >
            {submitting ? '作成中...' : 'テーマを作成して招待URLを発行'}
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={!canSave}
            onClick={saveAsMyTemplate}
            title="このテーマ設定 (テーマ名・軸・カード) をこのブラウザに保存し、ホームからいつでも呼び出せるようにします"
          >
            {savedMsg ? '保存しました ✓' : 'マイテンプレートとして保存'}
          </Button>
        </div>
        <p className="text-[13px] text-ink-soft">
          「マイテンプレート」はこのブラウザ内に保存され、ホーム画面から再利用できます。
        </p>
      </div>
    </div>
  )
}

function AxisEditor({
  title,
  axis,
  onChange,
}: {
  title: string
  axis: AxisDef
  onChange: (a: AxisDef) => void
}) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white/50 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-soft">
        {title}
        <InfoTip align="left">
          「軸の名前」は基準そのもの、「小さい側 / 大きい側」は軸の両端に表示されるラベルです。
          いま入力中の値だとこうなります:
          <AxisPreview axis={axis} />
        </InfoTip>
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Field label="軸の名前">
          <Input
            value={axis.label}
            onChange={(e) => onChange({ ...axis, label: e.target.value })}
            placeholder="例: 優先度"
            maxLength={20}
          />
        </Field>
        <Field label="小さい側">
          <Input
            value={axis.minLabel}
            onChange={(e) => onChange({ ...axis, minLabel: e.target.value })}
            placeholder="例: 低い"
            maxLength={20}
          />
        </Field>
        <Field label="大きい側">
          <Input
            value={axis.maxLabel}
            onChange={(e) => onChange({ ...axis, maxLabel: e.target.value })}
            placeholder="例: 高い"
            maxLength={20}
          />
        </Field>
      </div>
    </div>
  )
}

/** 4象限のラベル編集 (2×2 のボードと同じ配置で入力) */
function QuadrantEditor({
  value,
  onChange,
}: {
  value: Quadrants
  onChange: (q: Quadrants) => void
}) {
  const fields = [
    { key: 'tl', label: '左上', placeholder: '例: 強み' },
    { key: 'tr', label: '右上', placeholder: '例: 弱み' },
    { key: 'bl', label: '左下', placeholder: '例: 機会' },
    { key: 'br', label: '右下', placeholder: '例: 脅威' },
  ] as const
  return (
    <div className="rounded-lg border border-ink/10 bg-white/50 p-3">
      <p className="mb-2 text-xs font-bold text-ink-soft">象限の名前 (ボードの4区画に表示)</p>
      <div className="relative grid grid-cols-2 gap-2">
        {/* 十字のガイド線 */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-grid-strong" aria-hidden />
        <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-grid-strong" aria-hidden />
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <Input
              value={value[f.key]}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              maxLength={20}
            />
          </Field>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-ink-soft">
        4つすべて入力してください。軸のラベルは不要です — 象限の名前だけで伝わります。
      </p>
    </div>
  )
}

/* ---- タイプ選択ボタンのイメージ図 ---- */

function TypeIcon1D() {
  return (
    <svg viewBox="0 0 96 52" className="block w-full rounded-md bg-paper" aria-hidden>
      <line x1={8} y1={38} x2={88} y2={38} stroke="#c9d3d0" strokeWidth={2} />
      <polygon points="8,38 88,38 88,30" fill="#21313a" opacity="0.08" />
      <rect x={12} y={16} width={20} height={10} rx={3} fill="#fff" stroke="#dde4e2" />
      <rect x={12} y={16} width={3} height={10} rx={1.5} fill="#eb6834" />
      <rect x={42} y={16} width={20} height={10} rx={3} fill="#fff" stroke="#dde4e2" />
      <rect x={42} y={16} width={3} height={10} rx={1.5} fill="#1baf7a" />
      <rect x={68} y={16} width={20} height={10} rx={3} fill="#fff" stroke="#dde4e2" />
      <rect x={68} y={16} width={3} height={10} rx={1.5} fill="#2a78d6" />
    </svg>
  )
}

function TypeIcon2D() {
  return (
    <svg viewBox="0 0 96 52" className="block w-full rounded-md bg-paper" aria-hidden>
      <line x1={48} y1={4} x2={48} y2={48} stroke="#c9d3d0" strokeWidth={1.5} />
      <line x1={6} y1={26} x2={90} y2={26} stroke="#c9d3d0" strokeWidth={1.5} />
      <rect x={58} y={8} width={20} height={10} rx={3} fill="#fff" stroke="#dde4e2" />
      <rect x={58} y={8} width={3} height={10} rx={1.5} fill="#2a78d6" />
      <rect x={16} y={20} width={20} height={10} rx={3} fill="#fff" stroke="#dde4e2" />
      <rect x={16} y={20} width={3} height={10} rx={1.5} fill="#eb6834" />
      <rect x={52} y={34} width={20} height={10} rx={3} fill="#fff" stroke="#dde4e2" />
      <rect x={52} y={34} width={3} height={10} rx={1.5} fill="#1baf7a" />
    </svg>
  )
}

function TypeIconQuad() {
  return (
    <svg viewBox="0 0 96 52" className="block w-full rounded-md bg-paper" aria-hidden>
      <rect x={4} y={3} width={43} height={22} rx={2} fill="#2a78d6" opacity="0.12" />
      <rect x={49} y={3} width={43} height={22} rx={2} fill="#eb6834" opacity="0.12" />
      <rect x={4} y={27} width={43} height={22} rx={2} fill="#1baf7a" opacity="0.12" />
      <rect x={49} y={27} width={43} height={22} rx={2} fill="#eda100" opacity="0.12" />
      <line x1={48} y1={2} x2={48} y2={50} stroke="#c9d3d0" strokeWidth={1.5} />
      <line x1={3} y1={26} x2={93} y2={26} stroke="#c9d3d0" strokeWidth={1.5} />
      <rect x={14} y={9} width={16} height={8} rx={2.5} fill="#fff" stroke="#dde4e2" />
      <rect x={62} y={31} width={16} height={8} rx={2.5} fill="#fff" stroke="#dde4e2" />
    </svg>
  )
}

/* ---- ツールチップ内のミニ図解 ---- */

const EX_CHIP_COLORS = ['#2a78d6', '#eb6834', '#1baf7a']

function ExampleChip({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={26} height={12} rx={3} fill="#ffffff" />
      <rect x={x} y={y} width={3.5} height={12} rx={1.5} fill={color} />
    </g>
  )
}

/** 1軸の例: 横一列にカードを並べる */
function AxisExample1D() {
  return (
    <svg viewBox="0 0 200 46" className="mt-1 block w-full rounded bg-white/10" aria-hidden>
      <line x1={10} y1={32} x2={190} y2={32} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.2} />
      <ExampleChip x={26} y={12} color={EX_CHIP_COLORS[1]} />
      <ExampleChip x={92} y={12} color={EX_CHIP_COLORS[2]} />
      <ExampleChip x={152} y={12} color={EX_CHIP_COLORS[0]} />
      <text x={10} y={42} fontSize={8} fill="#ffffff" fillOpacity={0.75}>
        ← 低い
      </text>
      <text x={190} y={42} fontSize={8} fill="#ffffff" fillOpacity={0.75} textAnchor="end">
        高い →
      </text>
    </svg>
  )
}

/** 2軸の例: 平面にカードを置く */
function AxisExample2D() {
  return (
    <svg viewBox="0 0 200 90" className="mt-1 block w-full rounded bg-white/10" aria-hidden>
      <line x1={100} y1={6} x2={100} y2={78} stroke="#ffffff" strokeOpacity={0.4} strokeWidth={1} />
      <line x1={14} y1={44} x2={186} y2={44} stroke="#ffffff" strokeOpacity={0.4} strokeWidth={1} />
      <ExampleChip x={128} y={16} color={EX_CHIP_COLORS[0]} />
      <ExampleChip x={44} y={30} color={EX_CHIP_COLORS[1]} />
      <ExampleChip x={112} y={58} color={EX_CHIP_COLORS[2]} />
      <text x={186} y={54} fontSize={8} fill="#ffffff" fillOpacity={0.75} textAnchor="end">
        価値 →
      </text>
      <text x={104} y={14} fontSize={8} fill="#ffffff" fillOpacity={0.75}>
        ↑ コスト
      </text>
    </svg>
  )
}

/** 入力中の軸ラベルがどこに表示されるかのライブプレビュー */
function AxisPreview({ axis }: { axis: AxisDef }) {
  const min = axis.minLabel.trim() || '(小さい側)'
  const max = axis.maxLabel.trim() || '(大きい側)'
  const label = axis.label.trim() || '(軸の名前)'
  return (
    <svg viewBox="0 0 220 44" className="mt-1 block w-full rounded bg-white/10" aria-hidden>
      <line x1={10} y1={22} x2={210} y2={22} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.2} />
      <text x={10} y={38} fontSize={9} fill="#ffffff" fillOpacity={0.85}>
        ← {min}
      </text>
      <text x={210} y={38} fontSize={9} fill="#ffffff" fillOpacity={0.85} textAnchor="end">
        {max} →
      </text>
      <text x={110} y={12} fontSize={9} fontWeight={700} fill="#ffffff" textAnchor="middle">
        {label}
      </text>
    </svg>
  )
}
