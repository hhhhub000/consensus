import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { useEffect, useState } from 'react'

const env = import.meta.env

// 本番設定 (VITE_FIREBASE_*) が無ければ dev ではエミュレーターに接続する
export const useEmulator: boolean =
  env.VITE_USE_EMULATOR === 'true' || (!env.VITE_FIREBASE_API_KEY && env.DEV)

// 開発用: ?persona=x を付けるとタブごとに別の匿名ユーザーとして振る舞える
// (同一ブラウザで複数参加者をテストするため。本番ビルドでは無効)
let personaName: string | null = null
if (env.DEV) {
  const fromUrl = new URLSearchParams(location.search).get('persona')
  if (fromUrl) sessionStorage.setItem('consensus:persona', fromUrl)
  personaName = sessionStorage.getItem('consensus:persona')
}

const app = initializeApp(
  {
    apiKey: env.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo-consensus.firebaseapp.com',
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? 'demo-consensus',
    appId: env.VITE_FIREBASE_APP_ID ?? 'demo-app-id',
  },
  personaName ? `persona-${personaName}` : undefined,
)

export const auth = getAuth(app)
export const db = getFirestore(app)

if (useEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

let signInStarted = false

/** 匿名認証済みの uid。サインイン完了まで null。 */
export function useAuthUid(): string | null {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid)
      } else if (!signInStarted) {
        signInStarted = true
        signInAnonymously(auth).catch((e) => {
          signInStarted = false
          console.error('anonymous sign-in failed', e)
        })
      }
    })
    return unsub
  }, [])
  return uid
}
