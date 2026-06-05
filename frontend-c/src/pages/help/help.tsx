import { View, Text, ScrollView } from '@tarojs/components'
import './index.css'

const FAQS = [
  {
    q: '如何参与团购?',
    a: '在活动详情页面选择商品数量和提货方式，填写收货信息后即可参团。成团后您会收到通知。',
  },
  {
    q: '成团失败会怎样?',
    a: '如果活动截止时未达到最低成团人数，订单将自动取消，款项会原路退回。',
  },
  {
    q: '如何提货?',
    a: '成团后，您会收到提货通知。凭提货码到团长指定地点提货即可。',
  },
  {
    q: '支持退款吗?',
    a: '在提货前可以申请退款。提货后如有问题请联系客服处理。',
  },
  {
    q: '如何成为团长?',
    a: '在"我的"页面点击"申请团长"，填写相关信息提交审核即可。',
  },
]

export default function Help() {
  return (
    <View className='help-page'>
      <ScrollView scrollY className='help-scroll'>
        {FAQS.map((item, idx) => (
          <View key={idx} className='faq-item'>
            <Text className='faq-q'>Q{idx + 1}: {item.q}</Text>
            <Text className='faq-a'>A: {item.a}</Text>
          </View>
        ))}

        <View className='contact-section'>
          <Text className='section-title'>联系客服</Text>
          <Text className='contact-text'>如有其他问题，请联系客服：400-XXX-XXXX</Text>
          <Text className='contact-text'>工作时间：9:00-21:00</Text>
        </View>
      </ScrollView>
    </View>
  )
}