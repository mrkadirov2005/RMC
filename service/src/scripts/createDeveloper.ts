// Creates the developer account, or makes an existing owner the developer, then signs the locks and
// developer accounts as they are (see modules/developer/seal.ts). Run on the server:
//   docker exec -it crm_backend node dist/scripts/createDeveloper.js <username>
// The password is asked for without echoing it, so it never lands in shell history. This is also
// the way back in when the seal itself was damaged: it shows what it is about to sign.
const readline = require('node:readline');
const pool = require('../db/pool');
const { hashPassword } = require('../shared/password');
const seal = require('../modules/developer/seal');

const askHidden = (question: string): Promise<string> =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output: any = rl;
    const write = output._writeToOutput?.bind(output);
    output._writeToOutput = (text: string) => {
      if (text.includes(question)) write?.(text);
    };
    rl.question(question, (answer: string) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });

const main = async () => {
  const username = String(process.argv[2] || '').trim();
  if (!username) {
    console.error('Usage: node dist/scripts/createDeveloper.js <username>');
    process.exit(1);
  }

  const existing = (await pool.query('SELECT owner_id FROM owners WHERE username = $1', [username])).rows[0];
  const password = await askHidden(existing ? 'New password (empty keeps the current one): ' : 'Password: ');
  if ((!existing || password) && password.length < 10) {
    console.error('The password must be at least 10 characters.');
    process.exit(1);
  }
  if (password && (await askHidden('Repeat the password: ')) !== password) {
    console.error('The passwords do not match.');
    process.exit(1);
  }

  if (existing) {
    await pool.query(
      `UPDATE owners SET is_developer = TRUE, can_hard_delete = TRUE, status = 'Active', is_locked = FALSE,
              login_attempts = 0, locked_at = NULL, password_hash = COALESCE($2, password_hash), updated_at = CURRENT_TIMESTAMP
        WHERE owner_id = $1`,
      [existing.owner_id, password ? hashPassword(password) : null]
    );
    console.log(`"${username}" is now the developer account.`);
  } else {
    await pool.query(
      `INSERT INTO owners (username, password_hash, first_name, status, is_developer, can_hard_delete, login_attempts, is_locked)
       VALUES ($1, $2, 'Tizim', 'Active', TRUE, TRUE, 0, FALSE)`,
      [username, hashPassword(password)]
    );
    console.log(`Developer account "${username}" created. Sign in on the owner login page.`);
  }
  const state = (await seal.check()).current;
  console.log(`Signing: ${state.locks.length} lock(s)${state.locks.some(([type]: [string]) => type === 'all') ? ', the system closed for everyone' : ''}; developer accounts: ${state.developers.map(([, name]: [number, string]) => name).join(', ')}.`);
  await seal.reseal();
  await pool.end?.();
};

main().catch((error) => {
  console.error('Could not create the developer account:', error.message || error);
  process.exit(1);
});

export {};
