/**
 * Firestore セキュリティルールのテスト。
 * Firestore エミュレーター (127.0.0.1:8080) が起動しているときのみ実行される。
 *   npm run emulators を起動した状態で npm test
 *   または: npx firebase emulators:exec --project demo-consensus --only firestore "npx vitest run"
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const emulatorUp = await fetch('http://127.0.0.1:8080')
  .then(() => true)
  .catch(() => false)

describe.skipIf(!emulatorUp)('firestore security rules', () => {
  let env: RulesTestEnvironment
  const SID = 'session1'

  const base = {
    title: 'テスト',
    axisType: '1d',
    axes: { x: { label: '優先度', minLabel: '低', maxLabel: '高' } },
    cards: [{ id: 'c1', label: 'カード1', color: '#2a78d6' }],
    createdBy: 'alice',
    phase: 'input',
    round: 1,
    revealedUpTo: 0,
    showNames: false,
  }

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-consensus-rules',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    })
  })

  afterAll(async () => {
    await env?.cleanup()
  })

  beforeEach(async () => {
    await env.clearFirestore()
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'sessions', SID), base)
    })
  })

  const asUser = (uid: string) => env.authenticatedContext(uid).firestore()

  it('未認証はセッションを読めない', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'sessions', SID)))
  })

  it('認証済みならセッションを読める', async () => {
    await assertSucceeds(getDoc(doc(asUser('bob'), 'sessions', SID)))
  })

  it('作成者以外はフェーズを変更できない', async () => {
    await assertFails(updateDoc(doc(asUser('bob'), 'sessions', SID), { phase: 'reveal' }))
    await assertSucceeds(
      updateDoc(doc(asUser('alice'), 'sessions', SID), { phase: 'reveal', revealedUpTo: 1 }),
    )
  })

  it('参加者は入力フェーズ中に cards 配列のみ更新できる', async () => {
    const ref = doc(asUser('bob'), 'sessions', SID)
    await assertSucceeds(
      updateDoc(ref, {
        cards: [
          { id: 'c1', label: 'カード1', color: '#2a78d6' },
          { id: 'c2', label: '追加カード', color: '#eb6834' },
        ],
      }),
    )
    // cards 以外を同時に触るのは不可
    await assertFails(updateDoc(ref, { cards: [], title: '書き換え' }))
    // 開示フェーズでは cards も不可
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'sessions', SID), { phase: 'reveal', revealedUpTo: 1 })
    })
    await assertFails(
      updateDoc(ref, { cards: [{ id: 'c3', label: 'x', color: '#fff' }] }),
    )
  })

  it('入力フェーズ中は自分の placement を書ける', async () => {
    await assertSucceeds(
      setDoc(doc(asUser('bob'), 'sessions', SID, 'placements', '1_bob'), {
        uid: 'bob',
        round: 1,
        positions: { c1: { x: 0.5, y: 0.5 } },
      }),
    )
  })

  it('他人の uid では placement を書けない', async () => {
    await assertFails(
      setDoc(doc(asUser('bob'), 'sessions', SID, 'placements', '1_alice'), {
        uid: 'alice',
        round: 1,
        positions: {},
      }),
    )
  })

  it('現在ラウンド以外の placement は書けない', async () => {
    await assertFails(
      setDoc(doc(asUser('bob'), 'sessions', SID, 'placements', '2_bob'), {
        uid: 'bob',
        round: 2,
        positions: {},
      }),
    )
  })

  it('存在しない placement の getDoc は permission エラーにならない (not-found 扱い)', async () => {
    const snap = await assertSucceeds(
      getDoc(doc(asUser('bob'), 'sessions', SID, 'placements', '1_bob')),
    )
    expect(snap.exists()).toBe(false)
  })

  it('未開示のうちは他人の placement を読めない', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'sessions', SID, 'placements', '1_alice'), {
        uid: 'alice',
        round: 1,
        positions: { c1: { x: 0.2, y: 0.5 } },
      })
    })
    // 直接読むのも、開示済みを装ったクエリも失敗する
    await assertFails(getDoc(doc(asUser('bob'), 'sessions', SID, 'placements', '1_alice')))
    await assertFails(
      getDocs(
        query(collection(asUser('bob'), 'sessions', SID, 'placements'), where('round', '<=', 1)),
      ),
    )
    // 自分のものは読める
    await assertSucceeds(getDoc(doc(asUser('alice'), 'sessions', SID, 'placements', '1_alice')))
  })

  it('開示後は他人の placement を読める', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'sessions', SID, 'placements', '1_alice'), {
        uid: 'alice',
        round: 1,
        positions: { c1: { x: 0.2, y: 0.5 } },
      })
      await updateDoc(doc(ctx.firestore(), 'sessions', SID), {
        phase: 'reveal',
        revealedUpTo: 1,
      })
    })
    const snap = await getDocs(
      query(collection(asUser('bob'), 'sessions', SID, 'placements'), where('round', '<=', 1)),
    )
    expect(snap.docs.length).toBe(1)
  })

  it('開示フェーズでは placement を書き換えられない (凍結)', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'sessions', SID), {
        phase: 'reveal',
        revealedUpTo: 1,
      })
    })
    await assertFails(
      setDoc(doc(asUser('bob'), 'sessions', SID, 'placements', '1_bob'), {
        uid: 'bob',
        round: 1,
        positions: { c1: { x: 0.9, y: 0.5 } },
      }),
    )
  })

  it('合意ボードは合意フェーズ中のみ参加者が書ける', async () => {
    const boardRef = (u: string) => doc(asUser(u), 'sessions', SID, 'consensus', 'board')
    // input フェーズ: 参加者は書けない (作成者は初期化のため書ける)
    await assertFails(setDoc(boardRef('bob'), { positions: {}, lastMovedBy: {} }))
    await assertSucceeds(setDoc(boardRef('alice'), { positions: {}, lastMovedBy: {} }))
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'sessions', SID), { phase: 'consensus' })
    })
    await assertSucceeds(setDoc(boardRef('bob'), { positions: {}, lastMovedBy: {} }))
  })

  it('participants は自分のドキュメントのみ書ける', async () => {
    await assertSucceeds(
      setDoc(doc(asUser('bob'), 'sessions', SID, 'participants', 'bob'), {
        uid: 'bob',
        name: 'ボブ',
        color: '#2a78d6',
        readyRound: 0,
      }),
    )
    await assertFails(
      setDoc(doc(asUser('bob'), 'sessions', SID, 'participants', 'carol'), {
        uid: 'carol',
        name: 'なりすまし',
        color: '#2a78d6',
        readyRound: 0,
      }),
    )
  })
})
