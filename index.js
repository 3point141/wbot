import 'dotenv/config';
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { MongoClient } from 'mongodb';
import { extractExpenseJSON, summarizeExpenses } from './lib/openrouter.js';
import { saveExpense, getAllExpenses } from './lib/expenseStore.js';

const BOT_NAME = process.env.BOT_NAME || '@bot';
const MONGO = new MongoClient(process.env.MONGODB_URI);
await MONGO.connect();
const db = MONGO.db();

const { state, saveCreds } = await useMultiFileAuthState('auth');
const { version } = await fetchLatestBaileysVersion();
const sock = makeWASocket({
  auth: state,
  version,
  printQRInTerminal: true
});
sock.ev.on('creds.update', saveCreds);

sock.ev.on('messages.upsert', async ({ messages }) => {
  const msg = messages[0];
  if (!msg.message || msg.key.fromMe || !msg.key.remoteJid.endsWith('@g.us')) return;

  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
  if (!text || !text.toLowerCase().includes(BOT_NAME)) return;

  const groupId = msg.key.remoteJid;
  const senderName = msg.pushName || 'Someone';

  if (/who owes what/i.test(text)) {
    const expenses = await getAllExpenses(db, groupId);
    const summary = await summarizeExpenses(expenses, senderName);
    await sock.sendMessage(groupId, { text: `🤖 ${summary}` }, { quoted: msg });
  } else {
    const parsed = await extractExpenseJSON(text, senderName);
    if (parsed) {
      await saveExpense(db, groupId, parsed);
      await sock.sendMessage(groupId, { text: `✅ Saved expense: ₹${parsed.amount} - ${parsed.description}` }, { quoted: msg });
    } else {
      await sock.sendMessage(groupId, { text: `❌ Couldn't parse the expense. Try again.` }, { quoted: msg });
    }
  }
});
