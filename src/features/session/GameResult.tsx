import { useMemo } from 'react'
import { Link } from 'react-router'
import { computeCardStats, overallAgreement } from '../../lib/derive'
import { groupByRound } from '../../lib/hooks'
import { clamp, formatPercent } from '../../lib/utils'
import type { Participant, Placement, Session } from '../../types'
import { AgreementPanel } from '../viz/AgreementPanel'
import { ReplaySection } from '../viz/ReplaySection'
import { ShiftPanel } from '../viz/ShiftPanel'

/**
 * ゲームモードの結果発表。
 * 総合スコア = 最終一致度(%) + 収束ボーナス (R1からの改善幅 × 0.5)、上限100
 */
export function GameResult({
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
  const byRound = useMemo(() => groupByRound(placements), [placements])
  const rounds = session.revealedUpTo

  const result = useMemo(() => {
    const finalStats = computeCardStats(
      session.cards,
      byRound.get(rounds) ?? [],
      session.axisType,
    )
    const final = overallAgreement(finalStats) ?? 0
    const first =
      rounds > 1
        ? (overallAgreement(
            computeCardStats(session.cards, byRound.get(1) ?? [], session.axisType),
          ) ?? final)
        : final
    const improvement = rounds > 1 ? final - first : 0
    const finalPlacements = byRound.get(rounds) ?? []
    const coverage = finalPlacements.length
      ? finalPlacements.reduce(
          (a, p) => a + Object.keys(p.positions).length / session.cards.length,
          0,
        ) / finalPlacements.length
      : 0
    const score = clamp(Math.round(final * 100 + Math.max(0, improvement) * 100 * 0.5), 0, 100)
    const rank = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : 'C'
    return { finalStats, final, first, improvement, coverage, score, rank }
  }, [session.cards, session.axisType, byRound, rounds])

  const trend = useMemo(
    () =>
      Array.from({ length: rounds }, (_, i) => i + 1)
        .map((r) => ({
          round: r,
          agreement: overallAgreement(
            computeCardStats(session.cards, byRound.get(r) ?? [], session.axisType),
          ),
        }))
        .filter((t) => t.agreement !== null),
    [session.cards, session.axisType, byRound, rounds],
  )

  const rankColor =
    result.rank === 'S'
      ? 'text-accent'
      : result.rank === 'A'
        ? 'text-ink'
        : result.rank === 'B'
          ? 'text-ink-soft'
          : 'text-ink-faint'

  return (
    <div>
      <div className="animate-fade-up rounded-xl border border-ink/10 bg-surface p-6 text-center shadow-card">
        <p className="text-sm font-bold tracking-widest text-ink-soft">🎮 ゲーム結果</p>
        <div className="mt-2 flex items-baseline justify-center gap-4">
          <span className={`font-display text-6xl font-bold ${rankColor}`}>{result.rank}</span>
          <span className="font-mono text-5xl font-bold text-ink">
            {result.score}
            <span className="text-xl text-ink-soft"> 点</span>
          </span>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          参加{participants.length}人 ・ {rounds}ラウンドで
          {result.improvement > 0.005
            ? `一致度を ${Math.round(result.improvement * 100)}pt 引き上げました`
            : '感覚のすりあわせに挑みました'}
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          スコア = 最終一致度 + 収束ボーナス (R1からの改善幅 × 0.5)
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="最終一致度" value={formatPercent(result.final)} />
        <Metric
          label="収束 (R1→最終)"
          value={
            rounds > 1
              ? `${result.improvement >= 0 ? '+' : ''}${Math.round(result.improvement * 100)}pt`
              : '—'
          }
        />
        <Metric label="ラウンド数" value={String(rounds)} />
        <Metric label="カード配置率" value={formatPercent(result.coverage)} />
      </div>

      {trend.length > 1 && (
        <p className="mt-3 text-center font-mono text-sm text-ink-soft">
          {trend.map((t) => `R${t.round} ${formatPercent(t.agreement!)}`).join(' → ')}
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AgreementPanel stats={result.finalStats} myUid={uid} axisType={session.axisType} />
        <div className="space-y-4">
          <div className="rounded-xl border border-ink/10 bg-surface p-4 shadow-card">
            <h3 className="font-display text-base font-bold">ふりかえり</h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-ink-soft">
              <li>
                いちばん感覚が揃ったカード:{' '}
                <b className="text-ink">
                  {[...result.finalStats]
                    .filter((s) => s.n >= 2)
                    .sort((a, b) => b.agreement - a.agreement)[0]?.card.label ?? '—'}
                </b>
              </li>
              <li>
                最後まで割れたカード:{' '}
                <b className="text-ink">
                  {[...result.finalStats]
                    .filter((s) => s.n >= 2)
                    .sort((a, b) => a.agreement - b.agreement)[0]?.card.label ?? '—'}
                </b>
              </li>
            </ul>
          </div>
          {rounds > 1 && (
            <ShiftPanel
              cards={session.cards}
              prevPlacements={byRound.get(rounds - 1) ?? []}
              currPlacements={byRound.get(rounds) ?? []}
              axisType={session.axisType}
              round={rounds}
            />
          )}
          <Link
            to="/"
            className="block rounded-lg border border-ink/15 bg-white/70 px-4 py-2.5 text-center text-sm font-medium hover:border-ink/40"
          >
            新しいテーマで遊ぶ
          </Link>
        </div>
      </div>

      <ReplaySection
        session={session}
        uid={uid}
        participants={participants}
        placements={placements}
      />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-surface p-4 text-center shadow-card">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-ink">{value}</p>
    </div>
  )
}
