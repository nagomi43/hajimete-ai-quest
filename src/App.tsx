import { useEffect, useMemo, useState } from 'react'
import './App.css'

type MissionCategory = 'play' | 'daily' | 'sns' | 'work' | 'business'
type MissionFilter = MissionCategory | 'all'
type GameStep = 'home' | 'reveal' | 'answer' | 'result' | 'complete'

type MissionField = {
  key: string
  label: string
  placeholder: string
}

type Mission = {
  id: string
  title: string
  category: MissionCategory
  level: 1 | 2 | 3
  exp: number
  enemyName: string
  description: string
  fields: MissionField[]
  makePrompt: (answers: Record<string, string>) => string
}

type Pet = {
  id: string
  name: string
  kind: 'slime' | 'robot' | 'bat' | 'fluff'
  description: string
  stages: [string, string, string]
}

type HistoryItem = {
  missionId: string
  missionTitle: string
  createdPrompt: string
  createdAt: string
}

type Progress = {
  exp: number
  clearedCount: number
  completedMissionIds: string[]
  history: HistoryItem[]
  selectedPetId: string
}

const STORAGE_KEY = 'hajimete-ai-quest-progress'

const pets: Pet[] = [
  {
    id: 'slime',
    name: 'スライム',
    kind: 'slime',
    description: 'ぷるぷる育つ、はじめての相棒。',
    stages: ['ベビー', 'ヤング', 'キング'],
  },
  {
    id: 'robot',
    name: 'AIロボ',
    kind: 'robot',
    description: 'お願い文を集める小さなロボ。',
    stages: ['ミニ', 'ナビ', 'ガーディアン'],
  },
  {
    id: 'bat',
    name: 'こわくないコウモリ',
    kind: 'bat',
    description: '苦手な気持ちを楽しさに変える。',
    stages: ['ちび', 'ウィング', 'スター'],
  },
  {
    id: 'fluff',
    name: 'もこもこ',
    kind: 'fluff',
    description: 'ほめて伸びる、やさしい相棒。',
    stages: ['まる', 'ふわ', 'クラウン'],
  },
]

const missionFilters: {
  id: MissionFilter
  label: string
  description: string
}[] = [
  { id: 'all', label: 'おまかせ', description: '迷ったらここ。いろいろ出ます。' },
  { id: 'daily', label: '日常', description: '返信、予定、やること整理。' },
  { id: 'work', label: '業務', description: '自己紹介、説明文、言葉づくり。' },
  { id: 'sns', label: 'SNS', description: '投稿、プロフィール、発信ネタ。' },
  { id: 'business', label: 'お店・副業', description: '紹介文、商品名、CM台本。' },
  { id: 'play', label: 'クリエイティブ', description: 'まずは遊んでAIに慣れる。' },
]

const missions: Mission[] = [
  {
    id: 'nickname',
    title: 'AIにあだ名をつけてもらおう',
    category: 'play',
    level: 1,
    exp: 10,
    enemyName: 'むずかしそうオバケ',
    description: '好きなものや性格から、楽しいAI冒険者ネームを作ります。',
    fields: [
      { key: 'favorite', label: '好きなもの', placeholder: '例：コーヒー、ゲーム、散歩' },
      { key: 'personality', label: '性格', placeholder: '例：のんびり、明るい、慎重' },
      { key: 'thing', label: '仕事や趣味', placeholder: '例：整体、料理、動画づくり' },
    ],
    makePrompt: (a) =>
      `あなたは初心者にやさしい言葉の達人です。次の人に、楽しいAI冒険者ネーム、称号、ひとこと自己紹介を3案作ってください。\n\n好きなもの：${a.favorite}\n性格：${a.personality}\n仕事や趣味：${a.thing}\n\n条件：むずかしい言葉は使わず、少しワクワクする雰囲気にしてください。`,
  },
  {
    id: 'rpg-character',
    title: '自分をRPGキャラ化しよう',
    category: 'play',
    level: 1,
    exp: 10,
    enemyName: 'プロンプトこわいスライム',
    description: 'あなたの特徴を、ゆるいRPGキャラ設定に変えます。',
    fields: [
      { key: 'strength', label: '得意なこと', placeholder: '例：人の話を聞く、細かい作業' },
      { key: 'weakness', label: '苦手なこと', placeholder: '例：文章を書く、早起き' },
      { key: 'mood', label: 'なりたい雰囲気', placeholder: '例：やさしい、頼れる、面白い' },
    ],
    makePrompt: (a) =>
      `次の情報をもとに、私をRPGのキャラクターとして紹介してください。\n\n得意なこと：${a.strength}\n苦手なこと：${a.weakness}\nなりたい雰囲気：${a.mood}\n\n作ってほしいもの：キャラ名、職業、必殺技、紹介文、最初のミッション。初心者でも笑えるやさしい表現にしてください。`,
  },
  {
    id: 'praise',
    title: 'AIにほめてもらおう',
    category: 'play',
    level: 1,
    exp: 10,
    enemyName: 'あとでやるゾンビ',
    description: '今日の小さな頑張りを、AIに明るくほめてもらいます。',
    fields: [
      { key: 'did', label: '今日やったこと', placeholder: '例：朝起きた、仕事に行った、片付けた' },
      { key: 'feeling', label: '今の気分', placeholder: '例：疲れた、少しうれしい、眠い' },
    ],
    makePrompt: (a) =>
      `私は今日「${a.did}」をしました。今の気分は「${a.feeling}」です。\n\nAI初心者にもやさしい言葉で、少し元気が出るようにほめてください。最後に明日の小さな一歩を1つだけ提案してください。`,
  },
  {
    id: 'line-reply',
    title: 'LINE返信をやさしくしよう',
    category: 'daily',
    level: 1,
    exp: 10,
    enemyName: 'ことばカチコチ岩',
    description: '短いメモを、相手に伝わるやさしい返信文へ整えます。',
    fields: [
      { key: 'rough', label: '返信したい内容', placeholder: '例：今日は行けない。また誘ってね' },
      { key: 'person', label: '相手', placeholder: '例：友だち、家族、お客さん' },
      { key: 'tone', label: '雰囲気', placeholder: '例：やさしく、丁寧に、明るく' },
    ],
    makePrompt: (a) =>
      `次の返信を、${a.person}に送るための${a.tone}文章に整えてください。\n\n返信したい内容：${a.rough}\n\n短めを3案、少し丁寧を2案ください。`,
  },
  {
    id: 'todo',
    title: '明日の行動プランを作ろう',
    category: 'daily',
    level: 1,
    exp: 10,
    enemyName: '予定ぐちゃぐちゃ雲',
    description: 'やることを、明日動きやすい順番に並べます。',
    fields: [
      { key: 'tasks', label: 'やりたいこと', placeholder: '例：買い物、資料作成、運動、連絡' },
      { key: 'time', label: '使える時間', placeholder: '例：午前だけ、2時間、夜30分' },
    ],
    makePrompt: (a) =>
      `明日の行動プランを作ってください。\n\nやりたいこと：${a.tasks}\n使える時間：${a.time}\n\n条件：無理なくできる順番にして、最初の一歩をとても小さくしてください。`,
  },
  {
    id: 'sns-post',
    title: '今日のSNS投稿を作ろう',
    category: 'sns',
    level: 2,
    exp: 15,
    enemyName: 'ネタ切れゴブリン',
    description: 'テーマを入れるだけで、投稿文のたたき台を作ります。',
    fields: [
      { key: 'theme', label: '投稿テーマ', placeholder: '例：肩こり、朝活、AI初心者' },
      { key: 'reader', label: '届けたい人', placeholder: '例：50代女性、忙しい会社員' },
      { key: 'tone', label: '雰囲気', placeholder: '例：やさしい、元気、専門的すぎない' },
    ],
    makePrompt: (a) =>
      `SNS投稿文を作ってください。\n\nテーマ：${a.theme}\n届けたい人：${a.reader}\n雰囲気：${a.tone}\n\n条件：読みやすく、共感から始めて、最後に小さな行動を促してください。短めを3案ください。`,
  },
  {
    id: 'profile',
    title: 'プロフィール文を改善しよう',
    category: 'sns',
    level: 2,
    exp: 15,
    enemyName: '自己紹介まよい霧',
    description: 'いまの自己紹介を、伝わりやすく整えます。',
    fields: [
      { key: 'current', label: '今のプロフィール', placeholder: '例：整体師です。健康情報を発信しています' },
      { key: 'target', label: '届けたい人', placeholder: '例：肩こりに悩む人、子育て中の人' },
      { key: 'good', label: '強み', placeholder: '例：やさしく説明できる、経験10年' },
    ],
    makePrompt: (a) =>
      `プロフィール文を改善してください。\n\n今のプロフィール：${a.current}\n届けたい人：${a.target}\n強み：${a.good}\n\n条件：短い版、親しみやすい版、信頼感がある版を作ってください。`,
  },
  {
    id: 'shop-intro',
    title: 'お店の紹介文を作ろう',
    category: 'business',
    level: 2,
    exp: 15,
    enemyName: '集客わからんドラゴン',
    description: 'お店やサービスの魅力を、初めての人向けに伝えます。',
    fields: [
      { key: 'shop', label: 'お店やサービス名', placeholder: '例：やさしい整体院' },
      { key: 'feature', label: '特徴', placeholder: '例：個室、女性向け、説明が丁寧' },
      { key: 'customer', label: '来てほしい人', placeholder: '例：肩こりで悩む50代女性' },
    ],
    makePrompt: (a) =>
      `お店の紹介文を作ってください。\n\n名前：${a.shop}\n特徴：${a.feature}\n来てほしい人：${a.customer}\n\n条件：初めて見る人にも安心感が伝わるように、短い紹介文、SNS用、チラシ用の3種類をください。`,
  },
  {
    id: 'catchcopy',
    title: 'キャッチコピーを作ろう',
    category: 'work',
    level: 2,
    exp: 15,
    enemyName: 'ひらめき空っぽ箱',
    description: '仕事や活動を短く伝える言葉を作ります。',
    fields: [
      { key: 'what', label: '何をしている？', placeholder: '例：整体、Web制作、料理教室' },
      { key: 'forWhom', label: '誰のため？', placeholder: '例：疲れている人、初心者、親子' },
      { key: 'value', label: 'うれしい変化', placeholder: '例：体が軽くなる、自信がつく' },
    ],
    makePrompt: (a) =>
      `キャッチコピーを10個作ってください。\n\n何をしている：${a.what}\n誰のため：${a.forWhom}\nうれしい変化：${a.value}\n\n条件：短く、覚えやすく、初心者にも伝わる言葉にしてください。`,
  },
  {
    id: 'cm',
    title: '15秒CM台本を作ろう',
    category: 'business',
    level: 3,
    exp: 20,
    enemyName: '宣伝むずかし山',
    description: '商品やサービスを、短い動画の台本にします。',
    fields: [
      { key: 'product', label: '紹介したいもの', placeholder: '例：肩こり整体、AI講座、焼き菓子' },
      { key: 'appeal', label: '一番の魅力', placeholder: '例：やさしい、早い、初心者向け' },
      { key: 'viewer', label: '見てほしい人', placeholder: '例：忙しい人、AIが苦手な人' },
    ],
    makePrompt: (a) =>
      `15秒CMの台本を作ってください。\n\n紹介したいもの：${a.product}\n一番の魅力：${a.appeal}\n見てほしい人：${a.viewer}\n\n条件：場面、ナレーション、画面テキストを分けて、3案ください。`,
  },
]

const initialProgress: Progress = {
  exp: 0,
  clearedCount: 0,
  completedMissionIds: [],
  history: [],
  selectedPetId: 'slime',
}

function getLevel(exp: number) {
  if (exp >= 250) return 5
  if (exp >= 150) return 4
  if (exp >= 80) return 3
  if (exp >= 30) return 2
  return 1
}

function getTitle(clearedCount: number) {
  if (clearedCount >= 20) return 'AIと仲よしマスター'
  if (clearedCount >= 10) return 'AIミッション冒険者'
  if (clearedCount >= 5) return 'お願い文の使い手'
  if (clearedCount >= 3) return 'AIあそび見習い'
  if (clearedCount >= 1) return 'AIできた人'
  return 'AIはじめの一歩'
}

function getNextLevelExp(exp: number) {
  const thresholds = [30, 80, 150, 250]
  return thresholds.find((threshold) => exp < threshold) ?? 250
}

function getPetStage(clearedCount: number) {
  if (clearedCount >= 8) return 2
  if (clearedCount >= 3) return 1
  return 0
}

function getCategoryPromptHint(category: MissionCategory) {
  const hints: Record<MissionCategory, string> = {
    play: '初心者でも楽しく試せるように、明るくワクワクする表現にしてください。',
    daily: '相手に失礼がなく、やさしく自然な日常の言葉にしてください。',
    sns: '読みやすく、最初の一文で興味を持ってもらえる文章にしてください。',
    work: '仕事で使えるように、分かりやすく、丁寧で信頼感のある文章にしてください。',
    business: 'はじめて見る人にも魅力が伝わるように、安心感と行動したくなる理由を入れてください。',
  }
  return hints[category]
}

function makeDetailedPrompt(mission: Mission, answers: Record<string, string>) {
  const answerLines = mission.fields
    .map((field) => `- ${field.label}：${answers[field.key] || '未入力'}`)
    .join('\n')
  const draftPrompt = mission.makePrompt(answers)

  return `あなたは、AI初心者にも分かりやすく文章を整えるサポート役です。
次の内容をもとに、目的に合った文章やアイデアを作ってください。

【今回やりたいこと】
${mission.title}

【目的】
${mission.description}

【入力した内容】
${answerLines}

【作ってほしいもの】
上の内容を使って、すぐに使える完成形を作ってください。
ただ短く答えるだけではなく、理由や使い方が分かるように、少し詳しく説明してください。

【出力してほしい形】
1. まず、完成版を1つ作ってください。
2. 次に、別案を2つ出してください。
3. それぞれの案について「どんな場面で使いやすいか」を一言で説明してください。
4. 最後に、もっと良くするために追加で考えるとよいポイントを3つ教えてください。

【文章の雰囲気】
${getCategoryPromptHint(mission.category)}
難しい言葉は避けて、AI初心者でもそのまま使える自然な文章にしてください。

【追加の下書き条件】
${draftPrompt}`
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? ({ ...initialProgress, ...JSON.parse(raw) } as Progress) : initialProgress
  } catch {
    return initialProgress
  }
}

function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [currentMission, setCurrentMission] = useState<Mission>(missions[0])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [createdPrompt, setCreatedPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [step, setStep] = useState<GameStep>('home')
  const [selectedMissionFilter, setSelectedMissionFilter] = useState<MissionFilter>('all')
  const [showPetSettings, setShowPetSettings] = useState(false)

  const level = getLevel(progress.exp)
  const nextLevelExp = getNextLevelExp(progress.exp)
  const title = getTitle(progress.clearedCount)
  const progressPercent = Math.min(100, Math.round((progress.exp / nextLevelExp) * 100))
  const selectedPet = pets.find((pet) => pet.id === progress.selectedPetId) ?? pets[0]
  const petStage = getPetStage(progress.clearedCount)

  const categoryLabel = useMemo(
    () =>
      ({
        play: 'クリエイティブ',
        daily: '日常',
        sns: 'SNS',
        work: '業務',
        business: 'お店・副業',
      }) satisfies Record<MissionCategory, string>,
    [],
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  function drawMission() {
    const filteredMissions =
      selectedMissionFilter === 'all'
        ? missions
        : missions.filter((mission) => mission.category === selectedMissionFilter)
    const pool = filteredMissions.filter((mission) => mission.id !== currentMission.id)
    const source = pool.length > 0 ? pool : filteredMissions.length > 0 ? filteredMissions : missions
    const next = source[Math.floor(Math.random() * source.length)] ?? missions[0]
    setCurrentMission(next)
    setAnswers({})
    setCreatedPrompt('')
    setCopied(false)
    setCleared(false)
    setStep('reveal')
  }

  function updateAnswer(key: string, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  function buildPrompt() {
    const filledAnswers = currentMission.fields.reduce<Record<string, string>>((result, field) => {
      result[field.key] = answers[field.key]?.trim() || '未入力'
      return result
    }, {})
    setCreatedPrompt(makeDetailedPrompt(currentMission, filledAnswers))
    setCopied(false)
    setCleared(false)
    setStep('result')
  }

  async function copyPrompt() {
    if (!createdPrompt) return
    try {
      await navigator.clipboard.writeText(createdPrompt)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  function clearMission() {
    if (!createdPrompt || cleared) return
    const item: HistoryItem = {
      missionId: currentMission.id,
      missionTitle: currentMission.title,
      createdPrompt,
      createdAt: new Date().toISOString(),
    }

    setProgress((current) => ({
      exp: current.exp + currentMission.exp,
      clearedCount: current.clearedCount + 1,
      completedMissionIds: Array.from(new Set([...current.completedMissionIds, currentMission.id])),
      history: [item, ...current.history].slice(0, 8),
      selectedPetId: current.selectedPetId,
    }))
    setCleared(true)
    setStep('complete')
  }

  function resetProgress() {
    setProgress(initialProgress)
    setCreatedPrompt('')
    setCopied(false)
    setCleared(false)
    setStep('home')
  }

  function selectPet(petId: string) {
    setProgress((current) => ({ ...current, selectedPetId: petId }))
  }

  function goAnswer() {
    setStep('answer')
  }

  function goHome() {
    setStep('home')
  }

  return (
    <main className="app-shell">
      <div className="phone-app">
        <header className="top-status" aria-label="プレイヤー情報">
          <button className="home-button" type="button" onClick={goHome} aria-label="ホームへ戻る">
            はじめ
          </button>
          <div>
            <span>Lv.{level}</span>
            <strong>{title}</strong>
          </div>
          <div>
            <span>EXP</span>
            <strong>{progress.exp}</strong>
          </div>
        </header>

        <div className="meter" aria-label={`次のレベルまで ${Math.max(0, nextLevelExp - progress.exp)} EXP`}>
          <div style={{ width: `${progressPercent}%` }} />
        </div>

        <section className={`screen-card step-${step}`} key={step}>
          {step === 'home' && (
            <>
              <p className="eyebrow">AIこわくない村</p>
              <PixelScene />
              <MissionFilterChooser
                filters={missionFilters}
                selectedFilter={selectedMissionFilter}
                onSelect={setSelectedMissionFilter}
              />
              <PetCompactBar
                pet={selectedPet}
                stage={petStage}
                clearedCount={progress.clearedCount}
                onToggle={() => setShowPetSettings((current) => !current)}
                expanded={showPetSettings}
              />
              {showPetSettings && (
                <PetChooser
                  pets={pets}
                  selectedPet={selectedPet}
                  stage={petStage}
                  clearedCount={progress.clearedCount}
                  onSelect={selectPet}
                />
              )}
              <button className="primary-button big-action home-gacha-button" type="button" onClick={drawMission}>
                ガチャを回す
              </button>
            </>
          )}

          {step === 'reveal' && (
            <>
              <p className="eyebrow">ミッション発見！</p>
              <MissionCard mission={currentMission} categoryLabel={categoryLabel[currentMission.category]} />
              <div className="battle-callout">
                <EnemySprite />
                <div>
                  <strong>{currentMission.enemyName}があらわれた！</strong>
                  <p>質問に答えて、むずかしい気持ちを小さくしよう。</p>
                </div>
              </div>
              <div className="pet-support">
                <PetSprite pet={selectedPet} stage={petStage} />
                <p>
                  {selectedPet.name}が応援中。クリアすると相棒の成長に近づきます。
                </p>
              </div>
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={drawMission}>
                  もう一度ガチャ
                </button>
                <button className="primary-button" type="button" onClick={goAnswer}>
                  ミッションへ進む
                </button>
              </div>
            </>
          )}

          {step === 'answer' && (
            <>
              <p className="eyebrow">質問に答える</p>
              <h2>{currentMission.title}</h2>
              <div className="field-list">
                {currentMission.fields.map((field) => (
                  <label key={field.key}>
                    <span>{field.label}</span>
                    <input
                      value={answers[field.key] ?? ''}
                      onChange={(event) => updateAnswer(field.key, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  </label>
                ))}
              </div>
              <div className="button-row sticky-actions">
                <button className="secondary-button" type="button" onClick={() => setStep('reveal')}>
                  戻る
                </button>
                <button className="primary-button" type="button" onClick={buildPrompt}>
                  AIへのお願い文を作る
                </button>
              </div>
            </>
          )}

          {step === 'result' && (
            <>
              <p className="eyebrow">できあがり</p>
              <h2>ChatGPTに貼るお願い文</h2>
              <textarea readOnly value={createdPrompt} />
              <div className="button-row sticky-actions">
                <button className="secondary-button" type="button" onClick={copyPrompt}>
                  {copied ? 'コピーできた！' : 'コピーする'}
                </button>
                <button className="primary-button" type="button" onClick={clearMission}>
                  できた！
                </button>
              </div>
            </>
          )}

          {step === 'complete' && (
            <>
              <p className="eyebrow">ミッション成功！</p>
              <div className="clear-scene">
                <PetSprite pet={selectedPet} stage={petStage} celebratory />
                <h2>EXP +{currentMission.exp}</h2>
                <p>{currentMission.title} をクリアしました。</p>
                <strong>
                  {selectedPet.name}：{selectedPet.stages[petStage]}
                </strong>
              </div>
              <ProgressSummary progress={progress} resetProgress={resetProgress} />
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={() => setStep('result')}>
                  お願い文を見る
                </button>
                <button className="primary-button" type="button" onClick={drawMission}>
                  次のガチャへ
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function MissionCard({
  mission,
  categoryLabel,
}: {
  mission: Mission
  categoryLabel: string
}) {
  return (
    <article className="mission-card">
      <div className="card-topline">
        <span>{categoryLabel}</span>
        <span>Lv.{mission.level}</span>
        <span>EXP +{mission.exp}</span>
      </div>
      <h2>{mission.title}</h2>
      <p>{mission.description}</p>
    </article>
  )
}

function ProgressSummary({
  progress,
  resetProgress,
}: {
  progress: Progress
  resetProgress: () => void
}) {
  return (
    <aside className="progress-card">
      <h2>できた記録</h2>
      <p>クリア数は {progress.clearedCount} 回です。</p>
      <div className="history-list">
        {progress.history.length === 0 ? (
          <p>まだ記録はありません。最初のミッションをクリアしよう。</p>
        ) : (
          progress.history.slice(0, 3).map((item) => (
            <div className="history-item" key={`${item.missionId}-${item.createdAt}`}>
              <strong>{item.missionTitle}</strong>
              <span>{new Date(item.createdAt).toLocaleDateString('ja-JP')}</span>
            </div>
          ))
        )}
      </div>
      <button className="text-button" type="button" onClick={resetProgress}>
        記録をリセット
      </button>
    </aside>
  )
}

function MissionFilterChooser({
  filters,
  selectedFilter,
  onSelect,
}: {
  filters: typeof missionFilters
  selectedFilter: MissionFilter
  onSelect: (filter: MissionFilter) => void
}) {
  return (
    <section className="category-panel" aria-label="AIの使い道を選ぶ">
      <div className="section-heading">
        <h2>今日はどんなAI冒険をする？</h2>
        <p>まだ分からない人は「おまかせ」でOK。</p>
      </div>
      <div className="category-grid">
        {filters.map((filter) => (
          <button
            className={`category-option ${filter.id === selectedFilter ? 'selected' : ''}`}
            type="button"
            key={filter.id}
            onClick={() => onSelect(filter.id)}
          >
            <strong>{filter.label}</strong>
            <span>{filter.description}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function PetCompactBar({
  pet,
  stage,
  clearedCount,
  onToggle,
  expanded,
}: {
  pet: Pet
  stage: number
  clearedCount: number
  onToggle: () => void
  expanded: boolean
}) {
  const nextEvolution = stage === 0 ? 3 : stage === 1 ? 8 : null
  const nextText = nextEvolution
    ? `あと ${Math.max(0, nextEvolution - clearedCount)} 回で進化`
    : '最終進化'

  return (
    <button className="pet-compact-bar" type="button" onClick={onToggle}>
      <PetSprite pet={pet} stage={stage} small />
      <span>
        <strong>
          {pet.name}・{pet.stages[stage]}
        </strong>
        <small>{nextText}</small>
      </span>
      <b>{expanded ? '閉じる' : '相棒変更'}</b>
    </button>
  )
}

function PetChooser({
  pets,
  selectedPet,
  stage,
  clearedCount,
  onSelect,
}: {
  pets: Pet[]
  selectedPet: Pet
  stage: number
  clearedCount: number
  onSelect: (petId: string) => void
}) {
  const nextEvolution = stage === 0 ? 3 : stage === 1 ? 8 : null

  return (
    <section className="pet-panel" aria-label="相棒ペット">
      <div className="pet-main">
        <PetSprite pet={selectedPet} stage={stage} />
        <div>
          <p className="pet-label">いまの相棒</p>
          <h2>
            {selectedPet.name}・{selectedPet.stages[stage]}
          </h2>
          <p>{selectedPet.description}</p>
          <div className="growth-track" aria-label="成長段階">
            {selectedPet.stages.map((stageName, index) => (
              <span className={index <= stage ? 'active' : ''} key={stageName}>
                Lv.{index === 0 ? 1 : index === 1 ? 3 : 8} {stageName}
              </span>
            ))}
          </div>
          {nextEvolution ? (
            <p className="next-evolution">あと {Math.max(0, nextEvolution - clearedCount)} 回クリアで進化。</p>
          ) : (
            <p className="next-evolution">最終進化！すごい相棒です。</p>
          )}
        </div>
      </div>

      <div className="pet-options">
        {pets.map((pet) => (
          <button
            className={`pet-option ${pet.id === selectedPet.id ? 'selected' : ''}`}
            type="button"
            key={pet.id}
            onClick={() => onSelect(pet.id)}
          >
            <PetSprite pet={pet} stage={stage} small />
            <span>{pet.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function PixelScene() {
  return (
    <div className="top-visual" aria-label="はじめてAIクエストのトップ画像">
      <img src={`${import.meta.env.BASE_URL}assets/top-quest-screen.png`} alt="はじめてAIクエストのトップ画面" />
    </div>
  )
}

function PetSprite({
  pet,
  stage,
  small = false,
  celebratory = false,
}: {
  pet: Pet
  stage: number
  small?: boolean
  celebratory?: boolean
}) {
  return (
    <div
      className={`pet-sprite pet-${pet.kind} pet-stage-${stage + 1} ${small ? 'small' : ''} ${
        celebratory ? 'celebratory' : ''
      }`}
      aria-hidden="true"
    >
      <span className="pet-eye left" />
      <span className="pet-eye right" />
      <span className="pet-mouth" />
      {stage >= 1 && <span className="pet-spark one" />}
      {stage >= 2 && <span className="pet-crown" />}
    </div>
  )
}

function EnemySprite({ defeated = false }: { defeated?: boolean }) {
  return (
    <div className={`enemy-sprite ${defeated ? 'defeated' : ''}`} aria-hidden="true">
      <span />
      <span />
    </div>
  )
}

export default App
