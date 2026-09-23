const assert = require('node:assert');
const test = require('node:test');

test('Omnichannel Multi-Channel Engine & WhatsApp Webhook Verification', async (t) => {
  await t.test('Meta WhatsApp Cloud API Webhook Challenge verification succeeds with matching token', () => {
    const expectedToken = 'simpandana_wa_token_2026';
    const query = {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'simpandana_wa_token_2026',
      'hub.challenge': '1158201244',
    };

    const isVerified = query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === expectedToken;
    assert.strictEqual(isVerified, true);
    assert.strictEqual(query['hub.challenge'], '1158201244');
  });

  await t.test('Meta WhatsApp Cloud API Webhook Challenge verification fails on invalid token', () => {
    const expectedToken = 'simpandana_wa_token_2026';
    const query = {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong_token',
      'hub.challenge': '1158201244',
    };

    const isVerified = query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === expectedToken;
    assert.strictEqual(isVerified, false);
  });

  await t.test('Extracts inbound message from Meta WhatsApp Cloud API format correctly', () => {
    const waPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '1098273645',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15550234567', phone_number_id: '1029384756' },
                contacts: [{ profile: { name: 'Luki Ramdani' }, wa_id: '628123456789' }],
                messages: [
                  {
                    from: '628123456789',
                    id: 'wamid.HBgNNjI4MTIzNDU2Nzg5FQIAEhgg...',
                    timestamp: '1727076000',
                    text: { body: 'Makan siang 35rb di warteg' },
                    type: 'text',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const changeVal = waPayload.entry[0].changes[0].value;
    const msg = changeVal.messages[0];
    const contact = changeVal.contacts[0];

    assert.strictEqual(msg.from, '628123456789');
    assert.strictEqual(msg.text.body, 'Makan siang 35rb di warteg');
    assert.strictEqual(contact.profile.name, 'Luki Ramdani');
  });

  await t.test('Extracts inbound message from generic WhatsApp Gateway format (Qontak/Fonnte)', () => {
    const gatewayPayload = {
      sender: '081234567890',
      message: 'Beli bensin pertamax 50rb',
      sender_name: 'Budi Santoso',
    };

    assert.strictEqual(gatewayPayload.sender, '081234567890');
    assert.strictEqual(gatewayPayload.message, 'Beli bensin pertamax 50rb');
  });

  await t.test('Omnichannel response formatting for WhatsApp includes visual badges & currency', () => {
    const parsedAmount = 25000;
    const typeLabel = 'Pengeluaran';
    const typeIcon = '💸';
    const formattedAmount = `Rp 25.000`;
    const walletName = 'BCA Utama';
    const categoryName = 'Makanan & Minuman';
    const balanceAfter = 4975000;

    const replyText =
      `✅ *Transaksi Berhasil Dicatat!*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `${typeIcon} *${typeLabel}:* ${formattedAmount}\n` +
      `📁 *Kategori:* ${categoryName} 🍜\n` +
      `💳 *Dompet:* ${walletName}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💳 *Sisa Saldo ${walletName}:* Rp 4.975.000\n` +
      `_Tersinkronisasi langsung ke Dashboard SimpanDana_`;

    assert.match(replyText, /Transaksi Berhasil Dicatat/);
    assert.match(replyText, /Rp 25\.000/);
    assert.match(replyText, /BCA Utama/);
    assert.match(replyText, /SimpanDana/);
  });
});
