import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useEffect } from 'react'

const doneKey = (key: string) => `consensus:tour:${key}`

/**
 * 吹き出しガイドツアーを開始する。
 * 一度最後まで見た/閉じたツアーは localStorage に記録し、force 指定がない限り再表示しない。
 */
export function startTour(key: string, steps: DriveStep[], force = false) {
  if (!force && localStorage.getItem(doneKey(key))) return
  // すでにツアー表示中なら何もしない (StrictMode の二重実行対策)
  if (document.querySelector('.driver-active-element, .driver-overlay')) return
  // 対象要素が画面に存在するステップだけに絞る
  const valid = steps.filter(
    (s) => !s.element || (typeof s.element === 'string' && document.querySelector(s.element)),
  )
  if (!valid.length) return
  const d = driver({
    steps: valid,
    showProgress: valid.length > 1,
    progressText: '{{current}} / {{total}}',
    nextBtnText: '次へ',
    prevBtnText: '戻る',
    doneBtnText: '完了',
  })
  d.drive()
  // 一度表示したら既読扱い (閉じ方によらず次回から自動表示しない)
  localStorage.setItem(doneKey(key), 'done')
}

/** マウント時に (未読なら) ツアーを自動開始するフック */
export function useTour(key: string, getSteps: () => DriveStep[], ready = true) {
  useEffect(() => {
    if (!ready || localStorage.getItem(doneKey(key))) return
    const t = setTimeout(() => startTour(key, getSteps()), 600)
    return () => clearTimeout(t)
    // getSteps は毎レンダー変わるため意図的に依存から外す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready])
}
