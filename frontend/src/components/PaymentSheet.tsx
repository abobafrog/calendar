import { Check, CreditCard, Landmark, Radio, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { GlassButton } from './GlassButton'
import { ModalSheet } from './ModalSheet'

export type PaymentMethod = 'visa' | 'sbp' | 'mir_pay'
type PaymentPurpose = 'busy' | 'donation'
type PaymentStatus = 'choice' | 'processing' | 'success'

const progressMessages: Record<PaymentPurpose, Array<{ title: string; description: string }>> = {
  busy: [
    { title: 'Готовим безопасную оплату', description: 'Проверяем способ и данные операции.' },
    { title: 'Связываемся с банком', description: 'Ждём подтверждение демонстрационной оплаты.' },
    { title: 'Оплачиваем создание занятости', description: 'Закрепляем выбранные интервалы.' },
    { title: 'Ещё чуть-чуть — занятость будет готова', description: 'Сохраняем дело в календаре.' },
  ],
  donation: [
    { title: 'Готовим безопасную оплату', description: 'Проверяем сумму и выбранный способ.' },
    { title: 'Связываемся с банком', description: 'Ждём подтверждение демонстрационной оплаты.' },
    { title: 'Передаём пожертвование', description: 'Записываем вашу поддержку в историю.' },
    { title: 'Ещё чуть-чуть — почти готово', description: 'Завершаем операцию и обновляем итог.' },
  ],
}

const methods: Array<{
  id: PaymentMethod
  title: string
  description: string
  icon: typeof CreditCard
}> = [
  {
    id: 'visa',
    title: 'Карта «Виза» •••• 4242',
    description: 'Привязанная карта',
    icon: CreditCard,
  },
  { id: 'sbp', title: 'СБП', description: 'Оплата по номеру телефона', icon: Landmark },
  { id: 'mir_pay', title: 'Мир Пэй', description: 'Оплата одним касанием', icon: Radio },
]

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

export function PaymentSheet({
  open,
  onClose,
  onConfirmed,
  onSuccess,
  amount = 99,
  purpose = 'busy',
}: {
  open: boolean
  onClose: () => void
  onConfirmed: (method: PaymentMethod) => Promise<void>
  onSuccess: () => void
  amount?: number
  purpose?: PaymentPurpose
}) {
  const [method, setMethod] = useState<PaymentMethod>('visa')
  const [status, setStatus] = useState<PaymentStatus>('choice')
  const [progressIndex, setProgressIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const messages = progressMessages[purpose]
  const formattedAmount = new Intl.NumberFormat('ru-RU').format(amount)

  const close = () => {
    if (status === 'processing') return
    setStatus('choice')
    setProgressIndex(0)
    setError(null)
    onClose()
  }

  const pay = async () => {
    setStatus('processing')
    setProgressIndex(0)
    setError(null)
    for (let index = 1; index < messages.length; index += 1) {
      await delay(650)
      setProgressIndex(index)
    }
    await delay(650)
    try {
      await onConfirmed(method)
      setStatus('success')
      await delay(650)
      setStatus('choice')
      setProgressIndex(0)
      setError(null)
      onSuccess()
    } catch (paymentError) {
      setStatus('choice')
      setError(
        paymentError instanceof Error ? paymentError.message : 'Не удалось подтвердить оплату',
      )
    }
  }

  return (
    <ModalSheet
      open={open}
      title={
        status === 'choice'
          ? purpose === 'busy'
            ? 'Оплата создания занятости'
            : 'Пожертвование проекту'
          : purpose === 'busy'
            ? 'Создаём занятость'
            : 'Принимаем пожертвование'
      }
      onClose={close}
    >
      {status === 'choice' ? (
        <div className="payment-sheet">
          <div className="payment-price">
            <span>{purpose === 'busy' ? 'Создание занятости' : 'Поддержка проекта'}</span>
            <strong>{formattedAmount} ₽</strong>
          </div>
          <div className="payment-methods" role="radiogroup" aria-label="Способ оплаты">
            {methods.map((item) => {
              const Icon = item.icon
              const selected = item.id === method
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={selected ? 'is-active' : ''}
                  onClick={() => setMethod(item.id)}
                >
                  <span className="payment-method__icon">
                    <Icon size={19} />
                  </span>
                  <span className="payment-method__text">
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                  <i>{selected && <Check size={14} />}</i>
                </button>
              )
            })}
          </div>
          {error && <p className="payment-error">{error}</p>}
          <div className="payment-security">
            <ShieldCheck size={16} />
            <span>Это демонстрационная оплата — деньги не списываются</span>
          </div>
          <GlassButton variant="primary" className="payment-submit" onClick={() => void pay()}>
            Оплатить {formattedAmount} ₽
          </GlassButton>
        </div>
      ) : (
        <div className={`payment-progress payment-progress--${status}`} aria-live="polite">
          <div className="payment-progress__mark">
            {status === 'success' ? <Check size={32} /> : <span />}
          </div>
          <h3>{status === 'success' ? 'Оплата подтверждена' : messages[progressIndex].title}</h3>
          <p>
            {status === 'success'
              ? purpose === 'busy'
                ? 'Всё готово, добавляем занятость в календарь.'
                : 'Спасибо! Пожертвование добавлено в историю.'
              : messages[progressIndex].description}
          </p>
        </div>
      )}
    </ModalSheet>
  )
}
