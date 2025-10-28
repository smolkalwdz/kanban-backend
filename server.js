const express = require('express');
const fs = require('fs');
const cors = require('cors');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8244317187:AAEwq9k4EfY0-87mMTMmTrVmOPkzg_rTehE';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''; // Будет определен при первом запросе

// Функция отправки сообщения в Telegram
function sendTelegramMessage(chatId, message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });

    console.log('JSON для отправки:', data);

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data, 'utf8')
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Telegram API error: ${res.statusCode} - ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

const DATA_FILE = './data.json';

// Чтение данных
function readData() {
  if (!fs.existsSync(DATA_FILE)) return { bookings: [], zones: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Запись данных
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Получить все брони
app.get('/api/bookings', (req, res) => {
  const data = readData();
  res.json(data.bookings);
});

// Добавить бронь
app.post('/api/bookings', (req, res) => {
  const data = readData();
  const booking = { ...req.body, id: Date.now().toString() };
  data.bookings.push(booking);
  writeData(data);
  res.json(booking);
});

// Редактировать бронь
app.put('/api/bookings/:id', (req, res) => {
  const data = readData();
  const idx = data.bookings.findIndex(b => b.id === req.params.id);
  if (idx !== -1) {
    data.bookings[idx] = { ...data.bookings[idx], ...req.body };
    writeData(data);
    res.json(data.bookings[idx]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Удалить бронь
app.delete('/api/bookings/:id', (req, res) => {
  const data = readData();
  data.bookings = data.bookings.filter(b => b.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

// Получить все зоны
app.get('/api/zones', (req, res) => {
  const data = readData();
  res.json(data.zones);
});

// Добавить зону
app.post('/api/zones', (req, res) => {
  const data = readData();
  const zone = { ...req.body, id: Date.now().toString() };
  data.zones.push(zone);
  writeData(data);
  res.json(zone);
});

// Редактировать зону
app.put('/api/zones/:id', (req, res) => {
  const data = readData();
  const idx = data.zones.findIndex(z => z.id === req.params.id);
  if (idx !== -1) {
    data.zones[idx] = { ...data.zones[idx], ...req.body };
    writeData(data);
    res.json(data.zones[idx]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Удалить зону
app.delete('/api/zones/:id', (req, res) => {
  const data = readData();
  data.zones = data.zones.filter(z => z.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

// Отправить уведомление о неубранной зоне
app.post('/api/telegram/notify-dirty-zone', async (req, res) => {
  try {
    const { branch, zoneName, chatId } = req.body;
    
    console.log('Получены данные:', { branch, zoneName, chatId });
    
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }
    
    if (!branch || !zoneName) {
      return res.status(400).json({ error: 'Branch and zoneName are required' });
    }
    
    const message = `🚨 ${branch}, ${zoneName} — ⚠️ НЕ УБРАНА ⚠️`;
    
    console.log('Отправляю сообщение:', message);
    
    const result = await sendTelegramMessage(chatId, message);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Отправить произвольное сообщение в Telegram
app.post('/api/telegram/send-message', async (req, res) => {
  try {
    const { message, chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const result = await sendTelegramMessage(chatId, message);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить информацию о боте (для проверки)
app.get('/api/telegram/bot-info', async (req, res) => {
  try {
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/getMe`,
      method: 'GET'
    };

    const request = https.request(options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        res.json(JSON.parse(data));
      });
    });

    request.on('error', (error) => {
      res.status(500).json({ error: error.message });
    });

    request.end();
  } catch (error) {
    console.error('Error getting bot info:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
}); 