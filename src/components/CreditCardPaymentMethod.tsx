export function CreditCardPaymentMethod() {
  return (
    <fieldset className="money-payment-method">
      <legend>결제수단</legend>
      <label>
        <input type="radio" name="money-payment-method" value="CARD" checked readOnly />
        <span>
          <strong>신용카드</strong>
          <small>NHN KCP · 국내 신용카드 및 체크카드</small>
        </span>
      </label>
    </fieldset>
  );
}
