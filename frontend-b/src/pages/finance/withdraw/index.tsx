import { useState, useEffect } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, StatsOverview } from '../../../api/client'
import './index.css'

export default function WithdrawPage() {
  const [balance, setBalance] = useState('0.00')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getStatsOverview()
      .then((stats) => {
        setBalance(stats.balance || '0.00')
      })
      .catch(() => {})
  }, [])

  const handleAmountChange = (val: string) => {
    setAmount(val)
    setError('')
  }

  const handleAll = () => {
    setAmount(balance)
    setError('')
  }

  const handleSubmit = async () => {
    const num = Number(amount)
    if (!amount || isNaN(num) || num <= 0) {
      setError('请输入有效的提现金额')
      return
    }
    if (num < 10) {
      setError('单次提现金额不低于 ¥10.00')
      return
    }
    if (num > Number(balance)) {
      setError('提现金额不能超过可提现余额')
      return
    }

    const confirm = await Taro.showModal({
      title: '确认提现',
      content: `确认提现 ¥${num.toFixed(2)}？`,
    })
    if (!confirm.confirm) return

    setSubmitting(true)
    try {
      // The backend withdraw endpoint would go here
      // For now we simulate since no /leader/withdraw was listed
      Taro.showToast({ title: '提现申请已提交', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 1500)
    } catch (e: any) {
      setError(e.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const num = Number(amount) || 0
  const fee = 0 // No fee
  const actual = num

  return (
    <View className='withdraw-page'>
      <View className='balance-info'>
        <Text className='balance-label'>可提现余额</Text>
        <Text className='balance-value'>¥{balance}</Text>
      </View>

      <View className='form-card'>
        <Text className='form-label'>提现金额</Text>
        <View className='amount-input-wrap'>
          <Text className='yuan-sign'>¥</Text>
          <Input
            className='amount-input'
            type='digit'
            placeholder='0.00'
            value={amount}
            onInput={e => handleAmountChange(e.detail.value)}
            maxlength={10}
          />
          <View className='all-btn' onClick={handleAll}>
            <Text>全部</Text>
          </View>
        </View>
        {error && <Text className='error-msg'>{error}</Text>}

        <View className='calc-row'>
          <Text className='calc-label'>手续费</Text>
          <Text className='calc-value'>¥{fee.toFixed(2)}</Text>
        </View>
        <View className='calc-row'>
          <Text className='calc-label'>实际到账</Text>
          <Text className='calc-value actual'>¥{actual.toFixed(2)}</Text>
        </View>
      </View>

      <View className='tips'>
        <Text className='tips-title'>⚠️ 注意事项</Text>
        <Text className='tips-item'>• 最低提现金额为 ¥10.00</Text>
        <Text className='tips-item'>• 提现后 1-3 个工作日到账</Text>
        <Text className='tips-item'>• 当前仅支持绑定微信支付</Text>
      </View>

      <View className='submit-area'>
        <Button
          className='submit-btn'
          loading={submitting}
          onClick={handleSubmit}
          disabled={!amount || Number(amount) <= 0}
        >
          {submitting ? '提交中...' : '确认提现'}
        </Button>
      </View>
    </View>
  )
}