const [, , namesArg = 'Birds of Paradise', daysArg = '7'] = process.argv;
const cardNames = namesArg.split(',').map((name) => name.trim()).filter(Boolean);
const days = Number(daysArg) || 7;

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log(JSON.stringify({ dryRun: true, cardNames, days }, null, 2));
  process.exit(0);
}

const resp = await fetch(`${supabaseUrl}/functions/v1/mtgjson-price-history-sync`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ cardNames, days }),
});

const text = await resp.text();
console.log(text);
if (!resp.ok) process.exit(1);
