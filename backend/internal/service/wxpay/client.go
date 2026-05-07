package wxpay

import (
	"bytes"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Client struct {
	AppID    string
	MchID    string
	ApiKey   string
	CertPath string
	KeyPath  string
	BaseURL  string
}

type ClientConfig struct {
	AppID    string
	MchID    string
	ApiKey   string
	CertPath string
	KeyPath  string
}

func NewClient(cfg ClientConfig) *Client {
	return &Client{
		AppID:    cfg.AppID,
		MchID:    cfg.MchID,
		ApiKey:   cfg.ApiKey,
		CertPath: cfg.CertPath,
		KeyPath:  cfg.KeyPath,
		BaseURL:  "https://api.mch.weixin.qq.com",
	}
}

func NewClientFromViper() *Client {
	return &Client{
		AppID:    viper.GetString("wechat.app_id"),
		MchID:    viper.GetString("wechat.mch_id"),
		ApiKey:   viper.GetString("wechat.api_key"),
		CertPath: viper.GetString("wechat.cert_path"),
		KeyPath:  viper.GetString("wechat.key_path"),
		BaseURL:  "https://api.mch.weixin.qq.com",
	}
}

// UnifiedOrder 统一下单
func (c *Client) UnifiedOrder(req *UnifiedOrderRequest) (*UnifiedOrderResponse, error) {
	req.AppID = c.AppID
	req.MchID = c.MchID
	req.NonceStr = generateNonceStr()
	req.SignType = "MD5"
	req.TimeStart = time.Now().Format("20060102150405")

	// 生成签名
	req.Sign = c.Sign(req)

	// 序列化为XML
	xmlData, err := xml.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("xml marshal error: %w", err)
	}

	// 发送请求
	httpReq, _ := http.NewRequest("POST", c.BaseURL+"/pay/unifiedorder", bytes.NewReader(xmlData))
	httpReq.Header.Set("Content-Type", "text/xml; charset=utf-8")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("http request error: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var unifiedResp UnifiedOrderResponse
	if err := xml.Unmarshal(body, &unifiedResp); err != nil {
		return nil, fmt.Errorf("xml unmarshal error: %w", err)
	}

	return &unifiedResp, nil
}

// Sign 生成签名
func (c *Client) Sign(req interface{}) string {
	// 使用反射获取所有字段
	fields := make(map[string]string)

	switch r := req.(type) {
	case *UnifiedOrderRequest:
		fields["appid"] = r.AppID
		fields["mch_id"] = r.MchID
		fields["nonce_str"] = r.NonceStr
		fields["body"] = r.Body
		fields["out_trade_no"] = r.OutTradeNo
		fields["total_fee"] = strconv.Itoa(r.TotalFee)
		fields["spbill_create_ip"] = r.SpbillCreateIP
		fields["notify_url"] = r.NotifyURL
		fields["trade_type"] = r.TradeType
	default:
		return ""
	}

	// 按字典序排序并拼接
	keys := make([]string, 0, len(fields))
	for k := range fields {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var signStr strings.Builder
	for _, k := range keys {
		if fields[k] != "" {
			signStr.WriteString(k + "=" + fields[k] + "&")
		}
	}
	signStr.WriteString("key=" + c.ApiKey)

	// MD5签名并转大写
	hash := md5.Sum([]byte(signStr.String()))
	return strings.ToUpper(hex.EncodeToString(hash[:]))
}

// OrderQuery 查询订单
func (c *Client) OrderQuery(transactionID, outTradeNo string) (*OrderQueryResponse, error) {
	req := OrderQueryRequest{
		AppID:    c.AppID,
		MchID:    c.MchID,
		NonceStr: generateNonceStr(),
		SignType: "MD5",
	}
	if transactionID != "" {
		req.TransactionID = transactionID
	} else {
		req.OutTradeNo = outTradeNo
	}
	req.Sign = c.Sign(req)

	xmlData, _ := xml.Marshal(req)
	httpReq, _ := http.NewRequest("POST", c.BaseURL+"/pay/orderquery", bytes.NewReader(xmlData))
	httpReq.Header.Set("Content-Type", "text/xml; charset=utf-8")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result OrderQueryResponse
	xml.Unmarshal(body, &result)
	return &result, nil
}

// Refund 申请退款
func (c *Client) Refund(req *RefundRequest) (*RefundResponse, error) {
	// 退款需要使用证书，后续实现
	return nil, fmt.Errorf("refund not implemented, need certificate")
}

// CloseOrder 关闭订单
func (c *Client) CloseOrder(outTradeNo string) error {
	req := CloseOrderRequest{
		AppID:      c.AppID,
		MchID:      c.MchID,
		NonceStr:   generateNonceStr(),
		OutTradeNo: outTradeNo,
	}
	req.Sign = c.Sign(req)

	xmlData, _ := xml.Marshal(req)
	httpReq, _ := http.NewRequest("POST", c.BaseURL+"/pay/closeorder", bytes.NewReader(xmlData))
	httpReq.Header.Set("Content-Type", "text/xml; charset=utf-8")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

// JSAPIPayParams 生成JSAPI调起支付的参数
func (c *Client) JSAPIPayParams(appID, prepayID string) map[string]string {
	nonceStr := generateNonceStr()
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)

	signStr := fmt.Sprintf("appId=%s&nonceStr=%s&package=prepay_id=%s&signType=MD5&timeStamp=%s&key=%s",
		appID, nonceStr, prepayID, timestamp, c.ApiKey)
	hash := md5.Sum([]byte(signStr))
	paySign := strings.ToUpper(hex.EncodeToString(hash[:]))

	return map[string]string{
		"appId":     appID,
		"timeStamp": timestamp,
		"nonceStr":  nonceStr,
		"package":   "prepay_id=" + prepayID,
		"signType":  "MD5",
		"paySign":   paySign,
	}
}

func generateNonceStr() string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("%d%d", time.Now().UnixNano(), time.Now().Unix())))
	return hex.EncodeToString(hash[:])[:32]
}

// ============ Request/Response Types ============

type UnifiedOrderRequest struct {
	AppID          string `xml:"appid"`
	MchID          string `xml:"mch_id"`
	NonceStr       string `xml:"nonce_str"`
	Sign           string `xml:"sign"`
	SignType       string `xml:"sign_type,omitempty"`
	Body           string `xml:"body"`
	Detail         string `xml:"detail,omitempty"`
	Attach         string `xml:"attach,omitempty"`
	OutTradeNo     string `xml:"out_trade_no"`
	TimeStart      string `xml:"time_start,omitempty"`
	TimeExpire     string `xml:"time_expire,omitempty"`
	TotalFee       int    `xml:"total_fee"`
	TotalFeeStr    string `xml:"-"`
	FeeType        string `xml:"fee_type,omitempty"`
	SpbillCreateIP string `xml:"spbill_create_ip"`
	Receipt        string `xml:"receipt,omitempty"`
	NotifyURL      string `xml:"notify_url"`
	TradeType      string `xml:"trade_type"`
	ProductID      string `xml:"product_id,omitempty"`
	LimitPay       string `xml:"limit_pay,omitempty"`
	OpenID         string `xml:"openid,omitempty"`
}

type UnifiedOrderResponse struct {
	ReturnCode string `xml:"return_code"`
	ReturnMsg  string `xml:"return_msg"`
	ResultCode string `xml:"result_code"`
	AppID      string `xml:"appid"`
	MchID      string `xml:"mch_id"`
	NonceStr   string `xml:"nonce_str"`
	Sign       string `xml:"sign"`
	TradeType  string `xml:"trade_type"`
	PrepayID   string `xml:"prepay_id"`
	CodeURL    string `xml:"code_url,omitempty"`
	MWebURL    string `xml:"mweb_url,omitempty"`
	ErrCode    string `xml:"err_code,omitempty"`
	ErrCodeDes string `xml:"err_code_des,omitempty"`
}

type OrderQueryRequest struct {
	AppID         string `xml:"appid"`
	MchID         string `xml:"mch_id"`
	NonceStr      string `xml:"nonce_str"`
	Sign          string `xml:"sign"`
	SignType      string `xml:"sign_type,omitempty"`
	TransactionID string `xml:"transaction_id,omitempty"`
	OutTradeNo    string `xml:"out_trade_no,omitempty"`
}

type OrderQueryResponse struct {
	ReturnCode     string `xml:"return_code"`
	ReturnMsg      string `xml:"return_msg"`
	ResultCode     string `xml:"result_code"`
	AppID          string `xml:"appid"`
	MchID          string `xml:"mch_id"`
	NonceStr       string `xml:"nonce_str"`
	Sign           string `xml:"sign"`
	TradeType      string `xml:"trade_type"`
	TradeState     string `xml:"trade_state"`
	BankType       string `xml:"bank_type"`
	TotalFee       int    `xml:"total_fee"`
	CashFee        int    `xml:"cash_fee"`
	TransactionID  string `xml:"transaction_id"`
	OutTradeNo     string `xml:"out_trade_no"`
	TimeEnd        string `xml:"time_end"`
	TradeStateDesc string `xml:"trade_state_desc"`
}

type RefundRequest struct {
	AppID         string `xml:"appid"`
	MchID         string `xml:"mch_id"`
	NonceStr      string `xml:"nonce_str"`
	Sign          string `xml:"sign"`
	TransactionID string `xml:"transaction_id,omitempty"`
	OutTradeNo    string `xml:"out_trade_no,omitempty"`
	OutRefundNo   string `xml:"out_refund_no"`
	TotalFee      int    `xml:"total_fee"`
	RefundFee     int    `xml:"refund_fee"`
	RefundDesc    string `xml:"refund_desc,omitempty"`
}

type RefundResponse struct {
	ReturnCode          string `xml:"return_code"`
	ReturnMsg           string `xml:"return_msg"`
	ResultCode          string `xml:"result_code"`
	AppID               string `xml:"appid"`
	MchID               string `xml:"mch_id"`
	NonceStr            string `xml:"nonce_str"`
	Sign                string `xml:"sign"`
	TransactionID       string `xml:"transaction_id"`
	OutTradeNo          string `xml:"out_trade_no"`
	OutRefundNo         string `xml:"out_refund_no"`
	RefundID            string `xml:"refund_id"`
	RefundFee           int    `xml:"refund_fee"`
	SettlementRefundFee int    `xml:"settlement_refund_fee"`
	TotalFee            int    `xml:"total_fee"`
	CashFee             int    `xml:"cash_fee"`
	CashRefundFee       int    `xml:"cash_refund_fee"`
}

type CloseOrderRequest struct {
	AppID      string `xml:"appid"`
	MchID      string `xml:"mch_id"`
	NonceStr   string `xml:"nonce_str"`
	Sign       string `xml:"sign"`
	OutTradeNo string `xml:"out_trade_no"`
}
