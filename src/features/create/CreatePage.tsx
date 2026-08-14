import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button, Field, InfoTip, Input, Panel, Segmented, Spinner } from '../../components/ui'
import { getTemplate } from '../../data/templates'
import { createSession } from '../../lib/db'
import { useAuthUid } from '../../lib/firebase'
import { colorAt, hashString, randomId } from '../../lib/utils'
import type { AxisDef, AxisType } from '../../types'

interface CardDraft {
  key: string
  label: string
}

const DEFAULT_X: AxisDef = { label: '優先度', minLabel: '低い', maxLabel: '高い' }
const DEFAULT_Y: AxisDef = { label: '', minLabel: '低い', maxLabel: '高い' }

export default function CreatePage() {
  const [params] = useSearchParams()
  const template = useMemo(() => getTemplate(params.get('template')), [params])
  const uid = useAuthUid()
  const navigate = useNavigate()

  const [name, setName] = useState(() => localStorage.getItem('consensus:name') ?? '')
  const [title, setTitle] = useState(template?.name ?? '')
  const [axisType, setAxisType] = useState<AxisType>(template?.axisType ?? '1d')
  const [axisX, setAxisX] = useState<AxisDef>(template?.axes.x ?? DEFAULT_X)
  const [axisY, setAxisY] = useState<AxisDef>(template?.axes.y ?? DEFAULT_Y)
  const [cards, setCards] = useState<CardDraft[]>(() =>
    (template?.cards ?? [{ label: '' }, { label: '' }, { label: '' }]).map((c) => ({
      key: randomId(6),
      label: c.label,
    })),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!uid) return <Spinner label="接続中..." />

  const validCards = cards.filter((c) => c.label.trim())
  const canSubmit =
    !submitting && name.trim() && title.trim() && validCards.length >= 2 && axisX.minLabel.trim()

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      localStorage.setItem('consensus:name', name.trim())
      const id = await createSession(
        {
          title: title.trim(),
          axisType,
          axes: axisType === '2d' ? { x: axisX, y: axisY } : { x: axisX },
          cards: validCards.map((c, i) => ({
            id: randomId(8),
            label: c.label.trim(),
            color: colorAt(i),
          })),
          templateId: template?.id,
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
          Consensus
        </Link>
        <span className="text-xs text-ink-faint">テーマ作成</span>
      </header>

      <h1 className="font-display text-2xl font-bold">
        {template ? `${template.emoji} ${template.name}` : '新しいテーマ'}
      </h1>
      {template && <p className="mt-1 text-sm text-ink-soft">{template.tagline}</p>}

      <div className="mt-6 space-y-6">
        <Panel className="space-y-4 p-5">
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
        </Panel>

        <Panel className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink-soft">
              軸
              <InfoTip align="left">
                カードを並べる「ものさし」です。
                <span className="mt-1 block text-white/70">
                  1軸: 1つの基準で横一列に並べる (例: 優先度)
                </span>
                <AxisExample1D />
                <span className="mt-2 block text-white/70">
                  2軸: 2つの基準で平面に置く (例: 価値 × コスト)
                </span>
                <AxisExample2D />
              </InfoTip>
            </span>
            <Segmented
              options={[
                { value: '1d' as const, label: '1軸' },
                { value: '2d' as const, label: '2軸' },
              ]}
              value={axisType}
              onChange={setAxisType}
              size="sm"
            />
          </div>
          <AxisEditor
            title={axisType === '2d' ? '横軸 (X)' : '軸'}
            axis={axisX}
            onChange={setAxisX}
          />
          {axisType === '2d' && (
            <AxisEditor title="縦軸 (Y)" axis={axisY} onChange={setAxisY} />
          )}
        </Panel>

        <Panel className="p-5">
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

        <div className="flex items-center gap-3">
          <Button variant="accent" size="lg" disabled={!canSubmit} onClick={submit}>
            {submitting ? '作成中...' : 'テーマを作成して招待URLを発行'}
          </Button>
        </div>
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
