import { Check, CreditCard, Landmark, Radio, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { GlassButton } from './GlassButton'
import { ModalSheet } from './ModalSheet'

type PaymentMethod = 'visa' | 'sbp' | 'mir-pay'
type PaymentStatus = 'choice' | 'processing' | 'success'

const methods: Array<{
  id: PaymentMethod
  title: string
  description: string
  icon: typeof CreditCard
}> = [
  { id: 'visa', title: 'VISA •••• 4242', description: 'Привязанная карта', icon: CreditCard },
  { id: 'sbp', title: 'СБП', description: 'Оплата по номеру телефона', icon: Landmark },
  { id: 'mir-pay', title: 'Mir Pay', description: 'Оплата одним касанием', icon: Radio },
]

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

export function PaymentSheet({
  open,
  onClose,
  onConfirmed,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onConfirmed: () => Promise<void>
  onSuccess: () => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('visa')
  const [status, setStatus] = useState<PaymentStatus>('choice')
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    if (status === 'processing') return
    setStatus('choice')
    setError(null)
    onClose()
  }

  const pay = async () => {
    setStatus('processing')
    setError(null)
    await delay(1_500)
    try {
      await onConfirmed()
      setStatus('success')
      await delay(650)
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
      title={status === 'choice' ? 'Оплата сервиса' : 'Создаём календарь'}
      onClose={close}
    >
      {status === 'choice' ? (
        <div className="payment-sheet">
          <div className="payment-price">
            <span>Подготовка календаря</span>
            <strong>99 ₽</strong>
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
            Оплатить 99 ₽
          </GlassButton>
        </div>
      ) : (
        <div className={`payment-progress payment-progress--${status}`} aria-live="polite">
          <div className="payment-progress__mark">
            {status === 'success' ? <Check size={32} /> : <span />}
          </div>
          <h3>
            {status === 'success' ? 'Оплата подтверждена' : 'Ещё чуть-чуть — календарь будет готов'}
          </h3>
          <p>
            {status === 'success'
              ? 'Всё готово, открываем ваш календарь.'
              : 'Подтверждаем оплату сервиса и сохраняем выбранное время.'}
          </p>
        </div>
      )}
    </ModalSheet>
  )
}
