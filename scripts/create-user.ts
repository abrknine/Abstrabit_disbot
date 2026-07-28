// Usage: npm run create-user -- <email> <password>
import bcrypt from "bcryptjs";
import { getRepository } from "../src/services/storage/interaction-repository";
import { getUserRepository } from "../src/services/storage/user-repository";

const [email, password] = process.argv.slice(2);

if (!email || !password || password.length < 8) {
  console.error("Usage: npm run create-user -- <email> <password>  (password min 8 chars)");
  process.exit(1);
}

await getRepository().init();

const repo = getUserRepository();
if (await repo.findByEmail(email)) {
  console.error(`User already exists: ${email}`);
  process.exit(1);
}

await repo.createUser(email, await bcrypt.hash(password, 10), "admin");
console.log(`Created admin user: ${email}`);
process.exit(0);
