import { useEffect, useMemo, useState } from 'react'
import { Segmented } from '../../components/ui'
import { computeCardStats, overallAgreement, type CardStat } from '../../lib/derive'
import { groupByRound } from '../../lib/hooks'
import { formatPercent } from '../../lib/utils'
import type { Participant, Placement, Session } from '../../types'
import { AgreementPanel } from '../viz/AgreementPanel'
import { Reveal1D } from '../viz/Reveal1D'
import { Reveal2D, type Mode2D } from '../viz/Reveal2D'

type Sort1D = 'theme' | 'median' | 'agreement'

export function RevealTurn({
  session,
  uid,
  participants,
  placements,
}: {
  session: Session
  uid: string
  participants: Participant[]
  placements: Placement[]
}) {
  const [viewRound, setViewRound] = useState(session.revealedUpTo)
  useEffect(() => setViewRound(session.revealedUpTo), [session.revealedUpTo])

  const [compare, setCompare] = useState(true)
  const [showDots, setShowDots] = useState(true)
  const [sort, setSort] = useState<Sort1D>('theme')
  const [mode, setMode] = useState<Mode2D>(session.cards.length > 6 ? 'grid' : 'all')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set())

  const byRound = useMemo(() => groupByRound(placements), [placements])

  const stats = useMemo(
    () => computeCardStats(session.cards, byRound.get(viewRound) ?? [], session.axisType),
    [session.cards, session.axisType, byRound, viewRound],
  )
  const prevStats = useMemo(() => {
    if (!compare || viewRound < 2) return undefined
    const prev = computeCardStats(
      session.cards,
      byRound.get(viewRound - 1) ?? [],
      session.axisType,
    )
    return new Map(prev.filter((s) => s.n > 0).map((s) => [s.card.id, s]))
  }, [compare, viewRound, session.cards, session.axisType, byRound])

  const sortedStats = useMemo(() => {
    if (session.axisType !== '1d' || sort === 'theme') return stats
    if (sort === 'median') return [...stats].sort((a, b) => b.med - a.med)
    return [...stats].sort((a, b) => a.agreement - b.agreement)
  }, [stats, sort, session.axisType])

  const rounds = Array.from({ length: session.revealedUpTo }, (_, i) => i + 1)
  const trend = useMemo(
    () =>
      rounds.map((r) => ({
        round: r,
        agreement: overallAgreement(
          computeCardStats(session.cards, byRound.get(r) ?? [], session.axisType),
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.cards, session.axisType, byRound, session.revealedUpTo],
  )

  const visibleCardIds = useMemo(
    () => new Set(session.cards.filter((c) => !hiddenCards.has(c.id)).map((c) => c.id)),
    [session.cards, hiddenCards],
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="font-display text-lg font-bold">全員の意見を開示</h2>
        <ConvergenceTrend trend={trend} />
      </div>

      {/* 名前表示中は人物ごとの色の凡例を出す */}
      {session.showNames && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {participants.map((p) => (
            <span
              key={p.uid}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-2 py-0.5 text-[11px] font-medium text-ink-soft"
            >
              <span
                className="inline-block size-2.5 rounded-full"
                style={{
                  backgroundColor: p.color,
                  outline: p.uid === uid ? '2px solid #21313a' : undefined,
                  outlineOffset: 1,
                }}
              />
              {p.name}
              {p.uid === uid && ' (自分)'}
            </span>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {rounds.length > 1 && (
          <Segmented
            size="sm"
            options={rounds.map((r) => ({ value: String(r), label: `R${r}` }))}
            value={String(viewRound)}
            onChange={(v) => setViewRound(Number(v))}
          />
        )}
        {session.axisType === '2d' && (
          <Segmented
            size="sm"
            options={[
              { value: 'all' as const, label: 'まとめて' },
              { value: 'single' as const, label: '1枚ずつ' },
              { value: 'grid' as const, label: '一覧' },
            ]}
            value={mode}
            onChange={setMode}
          />
        )}
        {session.axisType === '1d' && (
          <Segmented
            size="sm"
            options={[
              { value: 'theme' as const, label: 'カード順' },
              { value: 'median' as const, label: '中央値順' },
              { value: 'agreement' as const, label: '割れてる順' },
            ]}
            value={sort}
            onChange={setSort}
          />
        )}
        {session.axisType === '1d' && (
          <label className="flex cursor-pointer items-center gap-1.5 text-ink-soft">
            <input
              type="checkbox"
              checked={showDots}
              onChange={(e) => setShowDots(e.target.checked)}
              className="size-3.5 accent-ink"
            />
            個人ドット
          </label>
        )}
        {viewRound > 1 && (
          <label className="flex cursor-pointer items-center gap-1.5 text-ink-soft">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              className="size-3.5 accent-ink"
            />
            前ラウンドと比較
          </label>
        )}
      </div>

      {session.axisType === '2d' && mode === 'all' && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {session.cards.map((c) => {
            const visible = !hiddenCards.has(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setHiddenCards((prev) => {
                    const next = new Set(prev)
                    if (visible) next.add(c.id)
                    else next.delete(c.id)
                    return next
                  })
                }
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  visible
                    ? 'border-ink/15 bg-white text-ink'
                    : 'border-ink/10 bg-paper text-ink-faint line-through'
                }`}
                title="クリックで表示/非表示"
              >
                <span
                  className="mr-1 inline-block size-2 rounded-full"
                  style={{ backgroundColor: c.color, opacity: visible ? 1 : 0.3 }}
                />
                {c.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {session.axisType === '1d' ? (
            <Reveal1D
              stats={sortedStats}
              prevStats={prevStats}
              participants={participants}
              myUid={uid}
              showDots={showDots}
              showNames={session.showNames}
              axisLabel={session.axes.x.label}
              axisMinLabel={session.axes.x.minLabel}
              axisMaxLabel={session.axes.x.maxLabel}
            />
          ) : (
            <Reveal2D
              stats={sortedStats}
              prevStats={prevStats}
              participants={participants}
              myUid={uid}
              showNames={session.showNames}
              axes={session.axes}
              mode={mode}
              selectedCardId={selectedCardId}
              onSelectCard={(id) => {
                setSelectedCardId(id)
                if (mode === 'grid') setMode('single')
              }}
              visibleCardIds={visibleCardIds}
            />
          )}
          <p className="mt-2 text-[11px] text-ink-faint">
            {session.axisType === '1d'
              ? '横帯 = 最小〜最大の範囲、濃さ = 意見の集中度、太い縦線 = 中央値。'
              : '楕円 = 意見の散らばり (標準偏差楕円)、点 = 重心。'}
            {session.showNames ? ' ドットにカーソルを合わせると名前が出ます。' : ' 名前は匿名表示です。'}
            赤いドットはあなた自身の配置。
          </p>
        </div>
        <div>
          <AgreementPanel stats={stats} myUid={uid} axisType={session.axisType} />
        </div>
      </div>
    </div>
  )
}

function ConvergenceTrend({
  trend,
}: {
  trend: { round: number; agreement: number | null }[]
}) {
  const valid = trend.filter((t) => t.agreement !== null)
  if (!valid.length) return null
  return (
    <span className="flex items-center gap-1.5 font-mono text-xs text-ink-soft" title="全カード平均の合意度">
      合意度
      {valid.map((t, i) => (
        <span key={t.round} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-ink-faint">→</span>}
          <span className={i === valid.length - 1 ? 'font-bold text-ink' : ''}>
            R{t.round} {formatPercent(t.agreement!)}
          </span>
        </span>
      ))}
    </span>
  )
}

export type { CardStat }
