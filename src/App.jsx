import { useEffect, useMemo, useRef, useState } from 'react'
import { ru } from 'date-fns/locale'
import DatePicker, { registerLocale } from 'react-datepicker'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'

const STORAGE_KEY = 'svidanka-invite-details'
const EMPTY_DETAILS = {
  date: '',
  time: '',
  plan: '',
}

const DATE_OPTIONS = [
  {
    id: 'cinema',
    emoji: '🎬',
    title: 'Кино',
    description: 'Уютный зал, вкусный попкорн и фильм, который будем обсуждать всю дорогу домой.',
  },
  {
    id: 'walk',
    emoji: '🌆',
    title: 'Прогулка',
    description: 'Спокойный вечер, красивые улицы и много времени, чтобы просто побыть рядом.',
  },
  {
    id: 'dinner',
    emoji: '🍝',
    title: 'Ужин',
    description: 'Вкусная еда, приятная атмосфера и разговоры без спешки.',
  },
  {
    id: 'surprise',
    emoji: '✨',
    title: 'Сюрприз',
    description: 'Я все продумал сам и обещаю, что будет тепло, мило и интересно.',
  },
]

const HEART_POSITIONS = [6, 14, 21, 30, 39, 48, 57, 66, 74, 83, 91]
const TIME_SLOT_OPTIONS = [
  { id: 'afternoon', time: '16:30', label: 'После работы', note: 'спокойное начало вечера' },
  { id: 'golden-hour', time: '18:00', label: 'На закате', note: 'идеально для прогулки' },
  { id: 'classic', time: '19:00', label: 'Классика', note: 'самое удобное время' },
  { id: 'cozy', time: '20:00', label: 'Уютный вечер', note: 'для ужина или кино' },
  { id: 'late', time: '21:00', label: 'Позже', note: 'если день загруженный' },
]

registerLocale('ru', ru)

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function createDateFromValue(value) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

function createDateTimeFromValues(dateValue, timeValue) {
  const baseDate = createDateFromValue(dateValue)

  if (!baseDate || !timeValue) {
    return null
  }

  const [hours, minutes] = timeValue.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
    0,
    0,
  )
}

function formatDateValue(date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
}

function formatTimeValue(date) {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`
}

function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  )
}

function getRoundedFutureTime() {
  const nextTime = new Date()
  nextTime.setMinutes(nextTime.getMinutes() + 30)
  nextTime.setSeconds(0, 0)

  const roundedMinutes = Math.ceil(nextTime.getMinutes() / 30) * 30

  if (roundedMinutes === 60) {
    nextTime.setHours(nextTime.getHours() + 1, 0, 0, 0)
  } else {
    nextTime.setMinutes(roundedMinutes, 0, 0)
  }

  return nextTime
}

function createSuggestedDate(daysFromNow, hours, minutes) {
  const suggestion = new Date()
  suggestion.setDate(suggestion.getDate() + daysFromNow)
  suggestion.setHours(hours, minutes, 0, 0)

  const minTime = getRoundedFutureTime()

  if (suggestion < minTime) {
    suggestion.setDate(suggestion.getDate() + 1)
  }

  return suggestion
}

function getAvailableTimeSlots(date) {
  if (!date) {
    return []
  }

  const minimumTime = getRoundedFutureTime()
  const isCurrentDay = isSameDay(date, minimumTime)

  return TIME_SLOT_OPTIONS.filter((slot) => {
    if (!isCurrentDay) {
      return true
    }

    const [hours, minutes] = slot.time.split(':').map(Number)
    const comparedTime = new Date(date)
    comparedTime.setHours(hours, minutes, 0, 0)

    return comparedTime >= minimumTime
  })
}

function normalizeSelectedDateTime(dateTime) {
  if (!dateTime) {
    return null
  }

  const currentTime = formatTimeValue(dateTime)
  const availableSlots = getAvailableTimeSlots(dateTime)

  if (availableSlots.length === 0) {
    return dateTime
  }

  const preferredTime =
    availableSlots.find((slot) => slot.time === currentTime)?.time ?? availableSlots[0].time

  if (preferredTime === currentTime) {
    return dateTime
  }

  const [hours, minutes] = preferredTime.split(':').map(Number)
  const normalizedDateTime = new Date(dateTime)
  normalizedDateTime.setHours(hours, minutes, 0, 0)

  return normalizedDateTime
}

function readStoredDetails() {
  if (typeof window === 'undefined') {
    return EMPTY_DETAILS
  }

  try {
    const savedDetails = window.localStorage.getItem(STORAGE_KEY)

    if (!savedDetails) {
      return EMPTY_DETAILS
    }

    return { ...EMPTY_DETAILS, ...JSON.parse(savedDetails) }
  } catch {
    return EMPTY_DETAILS
  }
}

function capitalizeFirstLetter(value) {
  if (!value) {
    return value
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDate(value) {
  if (!value) {
    return 'Дата пока не выбрана'
  }

  const parsedDate = createDateFromValue(value)

  if (!parsedDate) {
    return 'Дата пока не выбрана'
  }

  const formattedDate = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate)

  return capitalizeFirstLetter(formattedDate)
}

function formatTime(value) {
  if (!value) {
    return 'Время пока не выбрано'
  }

  return value.slice(0, 5)
}

function getPlanDetails(planId) {
  return DATE_OPTIONS.find((option) => option.id === planId)
}

function PageShell({ step, title, subtitle, children }) {
  return (
    <main className="page-shell">
      <section className="card">
        <span className="step-badge">{step}</span>
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
        {children}
      </section>
    </main>
  )
}

function WelcomePage() {
  const navigate = useNavigate()
  const playgroundRef = useRef(null)
  const yesButtonRef = useRef(null)
  const noButtonRef = useRef(null)
  const [buttonPosition, setButtonPosition] = useState(null)
  const [escapeTick, setEscapeTick] = useState(0)

  const moveNoButton = () => {
    const playground = playgroundRef.current
    const yesButton = yesButtonRef.current
    const noButton = noButtonRef.current

    if (!playground || !yesButton || !noButton) {
      return
    }

    const buttonWidth = noButton.offsetWidth
    const buttonHeight = noButton.offsetHeight
    const maxX = Math.max(playground.clientWidth - buttonWidth, 0)
    const maxY = Math.max(playground.clientHeight - buttonHeight, 0)
    const safePadding = 18
    const safeZone = {
      left: Math.max((playground.clientWidth - yesButton.offsetWidth) / 2 - safePadding, 0),
      right: Math.min(
        (playground.clientWidth + yesButton.offsetWidth) / 2 + safePadding,
        playground.clientWidth,
      ),
      top: Math.max((playground.clientHeight - yesButton.offsetHeight) / 2 - safePadding, 0),
      bottom: Math.min(
        (playground.clientHeight + yesButton.offsetHeight) / 2 + safePadding,
        playground.clientHeight,
      ),
    }

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const nextPosition = {
        x: Math.random() * maxX,
        y: Math.random() * maxY,
      }
      const overlapsYesButton =
        nextPosition.x < safeZone.right &&
        nextPosition.x + buttonWidth > safeZone.left &&
        nextPosition.y < safeZone.bottom &&
        nextPosition.y + buttonHeight > safeZone.top

      if (!overlapsYesButton) {
        setButtonPosition(nextPosition)
        setEscapeTick((currentTick) => currentTick + 1)
        return
      }
    }

    setButtonPosition({
      x: maxX,
      y: maxY,
    })
    setEscapeTick((currentTick) => currentTick + 1)
  }

  const handleNoButtonTap = (event) => {
    event.preventDefault()
    event.stopPropagation()
    moveNoButton()
  }

  return (
    <PageShell
      step="Шаг 1 из 4"
      title="Очень важный вопрос"
      subtitle="Обещаю быть милым и пунктуальным и сделать так, чтобы этот вечер запомнился."
    >
      <div className="hero-copy">
        <h2>Ты пойдешь со мной на свидание?</h2>
        <p className="helper-text">Кажется, правильный ответ здесь только один.</p>
      </div>

      <div className="choice-playground" ref={playgroundRef}>
        <button
          ref={yesButtonRef}
          type="button"
          className="primary-button"
          onClick={() => navigate('/schedule')}
        >
          Да
        </button>

        <button
          ref={noButtonRef}
          type="button"
          className={`secondary-button runaway-button ${buttonPosition ? `runaway-button--active runaway-button--panic-${escapeTick % 2 === 0 ? 'a' : 'b'}` : ''}`}
          onMouseEnter={moveNoButton}
          onFocus={moveNoButton}
          onTouchStart={handleNoButtonTap}
          onClick={handleNoButtonTap}
          style={
            buttonPosition
              ? {
                  left: `${buttonPosition.x}px`,
                  top: `${buttonPosition.y}px`,
                  transform: 'none',
                }
              : undefined
          }
        >
          Нет
        </button>

        <span
          aria-hidden="true"
          className={`secondary-button runaway-placeholder ${buttonPosition ? 'runaway-placeholder--visible' : ''}`}
        >
          Нет
        </span>
      </div>
    </PageShell>
  )
}

function SchedulePage({ date, time, onSave }) {
  const navigate = useNavigate()
  const [selectedDateTime, setSelectedDateTime] = useState(() =>
    normalizeSelectedDateTime(
      createDateTimeFromValues(date, time) ?? createSuggestedDate(1, 19, 0),
    ),
  )
  const canContinue = Boolean(selectedDateTime)
  const today = useMemo(() => new Date(), [])

  const selectedDate = selectedDateTime ? formatDateValue(selectedDateTime) : ''
  const selectedTime = selectedDateTime ? formatTimeValue(selectedDateTime) : ''
  const availableTimeSlots = useMemo(
    () => getAvailableTimeSlots(selectedDateTime),
    [selectedDateTime],
  )

  const handleDateChange = (nextDate) => {
    if (!nextDate) {
      return
    }

    const currentTime = selectedDateTime ? formatTimeValue(selectedDateTime) : ''
    const nextAvailableSlots = getAvailableTimeSlots(nextDate)
    const preferredTime =
      nextAvailableSlots.find((slot) => slot.time === currentTime)?.time ??
      nextAvailableSlots[0]?.time ??
      '19:00'
    const [hours, minutes] = preferredTime.split(':').map(Number)
    const nextDateTime = new Date(nextDate)

    nextDateTime.setHours(hours, minutes, 0, 0)
    setSelectedDateTime(normalizeSelectedDateTime(nextDateTime))
  }

  const handleTimeSelect = (timeValue) => {
    if (!selectedDateTime) {
      return
    }

    const [hours, minutes] = timeValue.split(':').map(Number)
    const nextDateTime = new Date(selectedDateTime)
    nextDateTime.setHours(hours, minutes, 0, 0)
    setSelectedDateTime(nextDateTime)
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!canContinue) {
      return
    }

    onSave({
      date: formatDateValue(selectedDateTime),
      time: formatTimeValue(selectedDateTime),
    })
    navigate('/plan')
  }

  return (
    <PageShell
      step="Шаг 2 из 4"
      title="Когда тебе удобно?"
      subtitle="Сначала выбери день, потом просто ткни в удобный слот по времени."
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="schedule-layout">
          <div className="datepicker-panel">
            <div className="panel-heading">
              <h2>1. Выбери день</h2>
              <p>Выбери подходящую дату в календаре ниже.</p>
            </div>

            <div className="datepicker-card">
              <DatePicker
                inline
                locale="ru"
                selected={selectedDateTime}
                onChange={handleDateChange}
                minDate={today}
                dateFormat="d MMMM yyyy"
                calendarStartDay={1}
              />
            </div>
          </div>

          <aside className="schedule-side-panel">
            <div className="time-chip-section">
              <h2>2. Выбери время</h2>

              <div className="time-slot-grid">
                {availableTimeSlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    className={`time-slot-card ${selectedTime === slot.time ? 'time-slot-card--selected' : ''}`}
                    onClick={() => handleTimeSelect(slot.time)}
                  >
                    <span className="time-slot-time">{slot.time}</span>
                    <strong>{slot.label}</strong>
                    <span className="time-slot-note">{slot.note}</span>
                  </button>
                ))}
              </div>

              {availableTimeSlots.length === 0 ? (
                <div className="selection-tip selection-tip--warning">
                  <strong>На этот день свободных слотов уже нет</strong>
                  <p>Попробуй выбрать другой день, и я покажу доступное время.</p>
                </div>
              ) : null}
            </div>

            <div className="preview-box">
              <span className="preview-label">Предварительный план</span>
              <strong>{formatDate(selectedDate)}</strong>
              <span>Начало в {formatTime(selectedTime)}</span>
              <span className="selection-status">
                {selectedDateTime ? 'Все готово, можно идти дальше' : 'Сначала выбери день и время'}
              </span>
            </div>
          </aside>
        </div>

        <div className="action-row">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/')}
          >
            Назад
          </button>
          <button type="submit" className="primary-button" disabled={!canContinue}>
            Дальше
          </button>
        </div>
      </form>
    </PageShell>
  )
}

function PlanPage({ selectedPlan, onSave }) {
  const navigate = useNavigate()

  const handleContinue = () => {
    if (!selectedPlan) {
      return
    }

    navigate('/summary')
  }

  return (
    <PageShell
      step="Шаг 3 из 4"
      title="Какое свидание тебе ближе?"
      subtitle="Выбирай формат вечера. Я превращу его в маленькое приключение."
    >
      <div className="plans-grid">
        {DATE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`plan-card ${selectedPlan === option.id ? 'plan-card--selected' : ''}`}
            onClick={() => onSave({ plan: option.id })}
          >
            <span className="plan-emoji">{option.emoji}</span>
            <strong>{option.title}</strong>
            <span>{option.description}</span>
          </button>
        ))}
      </div>

      <div className="action-row">
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/schedule')}
        >
          Назад
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!selectedPlan}
          onClick={handleContinue}
        >
          Посмотреть итог
        </button>
      </div>
    </PageShell>
  )
}

function SummaryPage({ details, onReset }) {
  const navigate = useNavigate()
  const selectedPlan = useMemo(() => getPlanDetails(details.plan), [details.plan])
  const telegramMessage = useMemo(
    () =>
      [
        'Я согласна на свидание 💖',
        '',
        `📅 Когда: ${formatDate(details.date)}`,
        `🕖 Во сколько: ${formatTime(details.time)}`,
        `✨ Формат: ${selectedPlan?.title ?? 'Сюрприз'}`,
        `💌 План: ${selectedPlan?.description ?? 'Красивый вечер, который точно захочется повторить.'}`,
        '',
        'Жду этот вечер ☺️',
      ].join('\n'),
    [details.date, details.time, selectedPlan],
  )
  
  const telegramShareUrl = useMemo(
    () => `https://t.me/share/url?text=${encodeURIComponent(telegramMessage)}`,
    [telegramMessage],
  )
  const handleTelegramShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Планы свидания',
          text: telegramMessage,
        })
        return
      } catch (error) {
        if (error?.name === 'AbortError') {
          return
        }
      }
    }

    window.open(telegramShareUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <PageShell
      step="Шаг 4 из 4"
      title="Ура, свидание состоится!"
      subtitle="Осталось только дождаться этого вечера и провести его незабываемо."
    >
      <div className="summary-layout">
        <div className="summary-card">
          <h2>Наш план</h2>
          <dl className="summary-list">
            <div>
              <dt>Когда</dt>
              <dd>{formatDate(details.date)}</dd>
            </div>
            <div>
              <dt>Во сколько</dt>
              <dd>{formatTime(details.time)}</dd>
            </div>
            <div>
              <dt>Формат</dt>
              <dd>{selectedPlan?.title ?? 'Сюрприз'}</dd>
            </div>
            <div>
              <dt>Что нас ждет</dt>
              <dd>{selectedPlan?.description ?? 'Красивый вечер, который точно захочется повторить.'}</dd>
            </div>
          </dl>
        </div>

        <div className="celebration-card">
          <div className="hearts-cloud" aria-hidden="true">
            {HEART_POSITIONS.map((position, index) => (
              <span
                key={`${position}-${index}`}
                className="heart"
                style={{
                  '--delay': `${index * 0.45}s`,
                  '--left': `${position}%`,
                  '--size': `${1 + (index % 3) * 0.35}rem`,
                }}
              >
                ❤
              </span>
            ))}
          </div>

          <div className="celebration-copy">
            <p className="celebration-title">Я уже рад этому вечеру</p>
            <p>
              Спасибо за твое "да". Обещаю много улыбок, легкости и приятных
              впечатлений.
            </p>
          </div>
        </div>
      </div>

      <div className="action-row">
        <button
          type="button"
          className="telegram-button"
          onClick={handleTelegramShare}
        >
          Поделиться в Telegram
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/plan')}
        >
          Изменить выбор
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            onReset()
            navigate('/')
          }}
        >
          Начать заново
        </button>
      </div>

    </PageShell>
  )
}

function App() {
  const [details, setDetails] = useState(readStoredDetails)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(details))
  }, [details])

  const saveDetails = (nextDetails) => {
    setDetails((currentDetails) => ({ ...currentDetails, ...nextDetails }))
  }

  const resetDetails = () => {
    setDetails(EMPTY_DETAILS)
  }

  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route
        path="/schedule"
        element={
          <SchedulePage
            date={details.date}
            time={details.time}
            onSave={saveDetails}
          />
        }
      />
      <Route
        path="/plan"
        element={
          details.date && details.time ? (
            <PlanPage selectedPlan={details.plan} onSave={saveDetails} />
          ) : (
            <Navigate to="/schedule" replace />
          )
        }
      />
      <Route
        path="/summary"
        element={
          details.date && details.time && details.plan ? (
            <SummaryPage details={details} onReset={resetDetails} />
          ) : (
            <Navigate to="/plan" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
