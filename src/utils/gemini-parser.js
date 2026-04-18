import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
if (!API_KEY) {
  console.warn("No EXPO_PUBLIC_GEMINI_API_KEY found.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_NAME = "gemini-2.5-flash"; // extremely fast for vision and text

const CLASSIFIER_PROMPT = `You are a document classifier. Look at the image and determine the document type.
Return ONLY one word from the list, without explanations:
- receipt       (store cash receipt: list of items, total)
- invoice       (service invoice: Airbnb, Netflix, utilities — for a specific service)
- ticket        (ticket: flight, train, bus, concert — route or event)
- bank_transfer (bank transfer or payment confirmation: Revolut, Wise, mobile banking — sender, recipient, amount)
- unknown       (none of the above)`;

const PARSER_PROMPTS = {
  receipt: `You are a cash receipt parser. Return ONLY valid JSON without explanations or backticks.
Format:
{
  "type": "receipt",
  "store": "store name or null",
  "date": "YYYY-MM-DD or null",
  "items": [{"name": "item", "qty": 1, "price": 9.90}],
  "total": 19.80,
  "currency": "EUR"
}`,
  invoice: `You are an invoice parser. Return ONLY valid JSON without explanations or backticks.
Format:
{
  "type": "invoice",
  "provider": "service or company name or null",
  "date": "YYYY-MM-DD or null",
  "description": "what the payment is for or null",
  "total": 19.80,
  "currency": "EUR"
}`,
  ticket: `You are a ticket parser. Return ONLY valid JSON without explanations or backticks.
Format:
{
  "type": "ticket",
  "carrier": "carrier or event organizer or null",
  "from": "origin or null",
  "to": "destination or null",
  "departure": "YYYY-MM-DD HH:MM or null",
  "passenger": "passenger name or null",
  "total": 19.80,
  "currency": "EUR"
}`,
  bank_transfer: `You are a bank transfer parser. Return ONLY valid JSON without explanations or backticks.
Format:
{
  "type": "bank_transfer",
  "bank": "bank name or null",
  "date": "YYYY-MM-DD or null",
  "sender": "sender or null",
  "recipient": "recipient or null",
  "total": 19.80,
  "currency": "EUR"
}`
};

function extractJSON(rawText) {
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}') + 1;
  if (start === -1 || end === 0) {
    throw new Error("Model did not return JSON: " + rawText);
  }
  return JSON.parse(rawText.slice(start, end));
}

/**
 * Main function to upload the file to gemini and extract json.
 * @param {string} mimeType - e.g. "image/jpeg"
 * @param {string} base64Data - raw base64 string
 */
export async function processDocumentBase64(mimeType, base64Data) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType
    }
  };

  // 1. Classify
  console.log("[1] Classifying document...");
  const classResult = await model.generateContent([
    CLASSIFIER_PROMPT + "\n\nDetermine the document type:",
    imagePart
  ]);
  
  const docType = classResult.response.text().trim().toLowerCase();
  console.log("[1] Type:", docType);

  let targetType = 'unknown';
  for (const known of Object.keys(PARSER_PROMPTS)) {
    if (docType.includes(known)) {
      targetType = known;
      break;
    }
  }

  if (targetType === 'unknown') {
    return { type: "unknown", error: "Document type not supported or recognized" };
  }

  // 2. Parse
  console.log(`[2] Parsing as '${targetType}'...`);
  const parseResult = await model.generateContent([
    PARSER_PROMPTS[targetType] + "\n\nParse the document and return JSON:",
    imagePart
  ]);

  const output = extractJSON(parseResult.response.text());
  console.log("[2] Done");
  
  return output;
}
