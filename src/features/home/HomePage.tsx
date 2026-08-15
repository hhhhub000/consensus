import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '../../components/ui'
import { TEMPLATES } from '../../data/templates'
import { listRoomHistory } from '../../lib/sessionHistory'
import {
  deleteMyTemplate,
  listMyTemplates,
  type MyTemplate,
} from '../../lib/templateStore'

const STEPS = [
  {
    num: '1',
    title: '一人で考える',
    body: '他の人の意見が見えない状態で、カードを軸の上に置く。先に自分の考えを固める。',
  },
  {
    num: '2',
    title: 'メンバーと共有する',
    body: 'ファシリテーターの合図で全員の配置を同時にオープン。声の大きさは関係ない。',
  },
  {
    num: '3',
    title: 'ズレを見て、話す',
    body: '意見のバラツキと合意度が数字と分布で見える。割れているカードから議論を始める。',
  },
] as const

export default function HomePage() {
  return (
    <div className="animate-fade-up min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="font-display text-lg font-bold tracking-wide">Consensus</span>
        <Link
          to="/create"
          className="rounded-lg border border-ink/20 bg-white/70 px-4 py-2 text-sm font-medium hover:border-ink/40"
        >
          白紙から作る
        </Link>
      </header>

      <section className="graph-paper border-y border-grid-strong">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:items-center md:py-20">
          <div>
            <h1 className="font-display text-4xl font-bold leading-snug tracking-wide md:text-5xl">
              まず、ひとりで考える。
              <br />
              それから、開示する。
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-8 text-ink-soft md:text-base">
              話し合いから始めると、意見は最初の発言に引っ張られます。Consensus
              は「先に各自の考えを配置 →
              一斉開示」の順番を強制することで、同調圧力のかかっていない生の意見分布から合意形成を始められるボードです。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#templates"
                className="rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white shadow-card transition-colors hover:bg-accent-deep"
              >
                テンプレートから始める
              </a>
              <Link
                to="/create"
                className="rounded-lg border border-ink/25 bg-white/80 px-6 py-3 text-sm font-bold hover:border-ink/50"
              >
                自分でテーマを作る
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-soft">
              ログイン不要・URLを共有するだけで参加できます
            </p>
          </div>
          <HeroBoard />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.num} className="rounded-xl border border-ink/10 bg-surface p-6 shadow-card">
              <span className="font-display text-2xl font-bold text-accent">{s.num}</span>
              <h2 className="mt-2 font-display text-lg font-bold">{s.title}</h2>
              <p className="mt-2 text-[15px] leading-7 text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <RoomHistoryLinks />

      <MyTemplatesSection />

      <section id="templates" className="mx-auto max-w-5xl px-4 pb-20">
        <h2 className="font-display text-2xl font-bold">テンプレート</h2>
        <p className="mt-1 text-[15px] text-ink-soft">
          選ぶとテーマ・軸・カードが入った状態で編集画面が開きます。
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <Link
              key={t.id}
              to={`/create?template=${t.id}`}
              className="group rounded-xl border border-ink/10 bg-surface p-5 shadow-card transition-shadow hover:shadow-lift"
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl">{t.emoji}</span>
                <Badge>
                  {t.quadrants ? '4象限' : t.axisType === '1d' ? '1次元' : '2次元'} ・{' '}
                  {t.cards.length}枚
                </Badge>
              </div>
              <h3 className="mt-3 font-display text-lg font-bold group-hover:text-accent-deep">
                {t.name}
              </h3>
              <p className="mt-1 text-[13px] leading-6 text-ink-soft">{t.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-grid-strong py-8 text-center text-xs text-ink-faint">
        Consensus — 意見を並べて、合意をつくる
      </footer>
    </div>
  )
}

/** 過去に作成/参加したルームへの入口 (履歴が無ければ非表示) */
function RoomHistoryLinks() {
  const [history] = useState(() => listRoomHistory())
  const created = history.filter((h) => h.role === 'creator')
  const joined = history.filter((h) => h.role === 'participant')
  if (!created.length && !joined.length) return null

  const preview = (titles: string[]) => {
    const head = titles.slice(0, 3).join('、')
    return titles.length > 3 ? `${head} など` : head
  }

  const card = (
    to: string,
    emoji: string,
    label: string,
    items: { title: string }[],
  ) => (
    <Link
      to={to}
      className="group rounded-xl border border-ink/10 bg-surface p-5 shadow-card transition-shadow hover:shadow-lift"
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl">{emoji}</span>
        <Badge>{items.length}件</Badge>
      </div>
      <h3 className="mt-3 font-display text-lg font-bold group-hover:text-accent-deep">
        {label}
      </h3>
      <p className="mt-1 line-clamp-1 text-[13px] leading-6 text-ink-soft">
        {preview(items.map((i) => i.title))}
      </p>
    </Link>
  )

  return (
    <section className="mx-auto max-w-5xl px-4 pt-10">
      <h2 className="font-display text-2xl font-bold">過去のルーム</h2>
      <p className="mt-1 text-[15px] text-ink-soft">
        このブラウザで作成・参加したルームの履歴です。途中のルームにも戻れます。
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {created.length > 0 &&
          card('/rooms?tab=created', '🕘', '過去作成したルーム', created)}
        {joined.length > 0 &&
          card('/rooms?tab=joined', '🚪', '過去参加したルーム', joined)}
      </div>
    </section>
  )
}

/** テーマ作成画面で保存したマイテンプレートの一覧 (無ければ非表示) */
function MyTemplatesSection() {
  const [items, setItems] = useState<MyTemplate[]>(() => listMyTemplates())
  if (!items.length) return null

  const remove = (t: MyTemplate) => {
    if (!confirm(`マイテンプレート「${t.title}」を削除しますか?`)) return
    deleteMyTemplate(t.id)
    setItems(listMyTemplates())
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pb-4">
      <h2 className="font-display text-2xl font-bold">マイテンプレート</h2>
      <p className="mt-1 text-[15px] text-ink-soft">
        テーマ作成画面で保存した、あなた専用のテンプレートです (このブラウザ内に保存)。
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <div
            key={t.id}
            className="group relative rounded-xl border border-ink/10 bg-surface p-5 shadow-card transition-shadow hover:shadow-lift"
          >
            <Link to={`/create?my=${t.id}`} className="block">
              <div className="flex items-start justify-between pr-8">
                <span className="text-3xl">📌</span>
                <Badge>
                  {t.quadrants ? '4象限' : t.axisType === '1d' ? '1次元' : '2次元'} ・{' '}
                  {t.cards.length}枚
                </Badge>
              </div>
              <h3 className="mt-3 font-display text-lg font-bold group-hover:text-accent-deep">
                {t.title}
              </h3>
              <p className="mt-1 text-[13px] leading-6 text-ink-soft">
                {new Date(t.savedAt).toLocaleDateString('ja-JP')} 保存 ・{' '}
                {t.quadrants
                  ? `${t.quadrants.tl} / ${t.quadrants.tr} / ${t.quadrants.bl} / ${t.quadrants.br}`
                  : `軸: ${t.axes.x.label}${t.axes.y ? ` × ${t.axes.y.label}` : ''}`}
              </p>
            </Link>
            <button
              type="button"
              aria-label={`「${t.title}」を削除`}
              onClick={() => remove(t)}
              className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-ink-faint hover:bg-accent-soft hover:text-accent-deep"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

/** ヒーロー: 2軸ボードに分布楕円が浮かぶ装飾 SVG */
function HeroBoard() {
  return (
    <svg
      viewBox="0 0 240 240"
      className="mx-auto w-full max-w-xs rounded-xl border border-ink/10 bg-surface shadow-lift"
      role="img"
      aria-label="2軸ボード上の意見分布のイメージ"
    >
      <g stroke="#dde4e2" strokeWidth="1">
        {Array.from({ length: 14 }, (_, i) => (
          <line key={`v${i}`} x1={i * 17 + 10} y1={0} x2={i * 17 + 10} y2={240} />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 17 + 10} x2={240} y2={i * 17 + 10} />
        ))}
      </g>
      <line x1={120} y1={12} x2={120} y2={228} stroke="#c9d3d0" strokeWidth="1.5" />
      <line x1={12} y1={120} x2={228} y2={120} stroke="#c9d3d0" strokeWidth="1.5" />
      <ellipse cx={165} cy={75} rx={42} ry={26} transform="rotate(-18 165 75)" fill="#2a78d6" opacity="0.14" stroke="#2a78d6" strokeOpacity="0.5" />
      <ellipse cx={80} cy={150} rx={30} ry={44} transform="rotate(12 80 150)" fill="#eb6834" opacity="0.14" stroke="#eb6834" strokeOpacity="0.5" />
      <ellipse cx={150} cy={175} rx={24} ry={16} fill="#1baf7a" opacity="0.16" stroke="#1baf7a" strokeOpacity="0.5" />
      <circle cx={165} cy={75} r={4} fill="#2a78d6" stroke="#fff" strokeWidth="1.5" />
      <circle cx={80} cy={150} r={4} fill="#eb6834" stroke="#fff" strokeWidth="1.5" />
      <circle cx={150} cy={175} r={4} fill="#1baf7a" stroke="#fff" strokeWidth="1.5" />
      <circle cx={190} cy={60} r={3} fill="#d8492b" stroke="#fff" strokeWidth="1.5" />
      <circle cx={148} cy={88} r={3} fill="#fff" stroke="#21313a" strokeWidth="1.2" />
      <circle cx={172} cy={92} r={3} fill="#fff" stroke="#21313a" strokeWidth="1.2" />
    </svg>
  )
}
