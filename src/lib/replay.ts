import { useCallback, useEffect, useRef, useState } from 'react'

/** 1ラウンドあたりの表示時間 (ms)。ドットのスライド (0.7s) が終わって少し眺められる長さ */
export const REPLAY_STEP_MS = 1700

/** OS の「視差効果を減らす」設定。true のときリプレイ再生は提供しない */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export interface Replay {
  /** 再生中か */
  playing: boolean
  /** 再生中に表示しているラウンド (停止中は 0) */
  round: number
  /** 全ラウンド数 */
  total: number
  /** 再生のたびに増える。key に混ぜると同じラウンドでもアニメーションを再実行できる */
  runId: number
  /** 1ラウンドあたりの表示時間 (ms) */
  stepMs: number
  /** リプレイを提供できるか (2ラウンド以上あり、視差効果の低減が無効) */
  enabled: boolean
  start: () => void
  stop: () => void
}

/**
 * R1 → R2 → … と全ラウンドを順に送るリプレイ再生。
 * 表示ラウンドの保持は呼び出し側に任せ、ここは進行だけを持つ (onRound で通知)。
 * 最終ラウンドは stepMs だけ表示してから停止し、盤面はそのラウンドのまま残る。
 */
export function useReplay(
  totalRounds: number,
  onRound: (round: number) => void,
  stepMs = REPLAY_STEP_MS,
): Replay {
  const reduced = useReducedMotion()
  const [round, setRound] = useState(0)
  const [runId, setRunId] = useState(0)

  // onRound は毎レンダー変わりうるので ref 経由で呼ぶ (タイマーを張り直さないため)
  const onRoundRef = useRef(onRound)
  onRoundRef.current = onRound

  useEffect(() => {
    if (round === 0) return
    onRoundRef.current(round)
    const t = window.setTimeout(
      () => setRound((r) => (r >= totalRounds ? 0 : r + 1)),
      stepMs,
    )
    return () => window.clearTimeout(t)
    // runId を含めることで「同じラウンドから再生し直す」場合も再実行される
  }, [round, runId, totalRounds, stepMs])

  // ラウンド数が減った (別セッションを開いた等) 場合は止める
  useEffect(() => {
    if (round > totalRounds) setRound(0)
  }, [round, totalRounds])

  const start = useCallback(() => {
    setRunId((i) => i + 1)
    setRound(1)
  }, [])
  const stop = useCallback(() => setRound(0), [])

  return {
    playing: round > 0,
    round,
    total: totalRounds,
    runId,
    stepMs,
    enabled: !reduced && totalRounds >= 2,
    start,
    stop,
  }
}
